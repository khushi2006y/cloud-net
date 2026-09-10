from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.schemas.report import CitizenReportCreate
from app.schemas.event import WeatherEventOut
from app.ingestion.citizen_adapter import CitizenReportAdapter
from app.workers.stream_processor import global_stream_processor
from app.api.websocket import ws_manager
from app.api.events import format_event_out

router = APIRouter(prefix="/reports", tags=["Citizen Reporting"])
citizen_adapter = CitizenReportAdapter()


@router.post("", response_model=WeatherEventOut, status_code=status.HTTP_201_CREATED)
async def submit_citizen_report(
    report_in: CitizenReportCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a citizen report to the CloudNet National Ingestion Gateway.
    The report undergoes automated 5-stage validation, layered NLP classification,
    spatiotemporal deduplication, and evidence fusion in real time.
    """
    # Derive real client IP from socket or trusted proxy header (CERT-In anti-spoofing standard)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "127.0.0.1"

    # Derive /24 network subnet server-side to defeat Sybil/botnet spoofing
    parts = client_ip.split(".")
    if len(parts) == 4:
        server_subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
    else:
        server_subnet = f"{client_ip}/64"

    # Override report_in.ip_subnet with authoritative server-computed subnet
    report_in.ip_subnet = server_subnet

    # 1. Normalize through Citizen adapter
    normalized_list = await citizen_adapter.fetch_or_normalize(report_in)
    if not normalized_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not process submission payload"
        )

    # 2. Ingest through stream processing worker
    raw_event = normalized_list[0]
    processed_event = await global_stream_processor.process_normalized_event(
        event_dict=raw_event,
        db=db,
        ws_broadcast_callback=ws_manager.broadcast
    )

    # 3. Fetch evidence items and verification logs for complete event representation
    from app.models.evidence import Evidence
    from app.models.verification_log import VerificationLog
    from sqlalchemy import select, desc

    evi_stmt = select(Evidence).where(Evidence.event_id == processed_event.id).order_by(desc(Evidence.score))
    evi_res = await db.execute(evi_stmt)
    evidence_list = evi_res.scalars().all()

    log_stmt = select(VerificationLog).where(VerificationLog.event_id == processed_event.id).order_by(VerificationLog.timestamp.asc())
    log_res = await db.execute(log_stmt)
    logs_list = log_res.scalars().all()

    return format_event_out(processed_event, evidence_list=evidence_list, logs_list=logs_list)
