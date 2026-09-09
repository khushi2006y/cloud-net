from fastapi import APIRouter, Depends, HTTPException, status
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
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a citizen report to the CloudNet National Ingestion Gateway.
    The report undergoes automated 5-stage validation, layered NLP classification,
    spatiotemporal deduplication, and evidence fusion in real time.
    """
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

    return format_event_out(processed_event)
