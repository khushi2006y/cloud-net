import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc

from app.database.session import get_db
from app.models.weather_event import WeatherEvent
from app.models.evidence import Evidence
from app.models.verification_log import VerificationLog
from app.schemas.event import WeatherEventOut
from app.schemas.evidence import EvidenceOut, VerificationLogOut

router = APIRouter(prefix="/events", tags=["Weather Events"])


def format_event_out(event: WeatherEvent, evidence_list: List[Evidence] = None, logs_list: List[VerificationLog] = None) -> dict:
    hashtags = []
    if event.hashtags:
        try:
            hashtags = json.loads(event.hashtags)
        except Exception:
            hashtags = [h.strip() for h in event.hashtags.split(",") if h.strip()]

    return {
        "id": event.id,
        "source": {
            "id": event.source_id or "src-citizen",
            "type": event.source_type or "CITIZEN",
            "name": event.source_name,
            "reliability": 75.0
        },
        "timestamps": {
            "eventTime": event.event_time.isoformat() if event.event_time else None,
            "captureTime": event.capture_time.isoformat() if event.capture_time else None,
            "uploadTime": event.upload_time.isoformat()
        },
        "location": {
            "latitude": event.latitude,
            "longitude": event.longitude,
            "city": event.city,
            "district": event.district,
            "state": event.state,
            "country": event.country
        },
        "category": event.event_type,
        "severity": event.severity,
        "title": event.title,
        "text": event.description,
        "hashtags": hashtags,
        "verification": {
            "status": event.verification_status,
            "confidence": event.confidence_score
        },
        "processing": {
            "duplicateOf": event.duplicate_of,
            "spamScore": event.spam_score,
            "anomalyScore": event.anomaly_score,
            "freshnessScore": event.freshness_score
        },
        "media_url": event.media_url,
        "cluster_id": event.cluster_id,
        "evidence": [
            {
                "id": e.id,
                "event_id": e.event_id,
                "evidence_type": e.evidence_type,
                "direction": e.direction,
                "source_id": e.source_id,
                "value": e.value,
                "score": e.score,
                "explanation": e.explanation,
                "created_at": e.created_at
            }
            for e in (evidence_list or [])
        ],
        "audit_logs": [
            {
                "id": l.id,
                "event_id": l.event_id,
                "actor": l.actor,
                "action": l.action,
                "previous_status": l.previous_status,
                "new_status": l.new_status,
                "previous_confidence": l.previous_confidence,
                "new_confidence": l.new_confidence,
                "reason": l.reason,
                "rule_or_model": l.rule_or_model,
                "system_version": l.system_version,
                "timestamp": l.timestamp
            }
            for l in (logs_list or [])
        ],
        # Flatted properties for React UI convenience
        "city": event.city,
        "state": event.state,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "confidenceScore": event.confidence_score,
        "verificationStatus": event.verification_status
    }


@router.get("", response_model=List[WeatherEventOut])
async def list_events(
    category: Optional[str] = Query(None, description="Filter by event category"),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    state: Optional[str] = Query(None, description="Filter by state"),
    city: Optional[str] = Query(None, description="Filter by city"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WeatherEvent)

    conditions = []
    if category:
        conditions.append(WeatherEvent.event_type == category)
    if status and status.upper() != "ALL":
        conditions.append(WeatherEvent.verification_status == status.upper())
    if severity:
        conditions.append(WeatherEvent.severity == severity.upper())
    if state and state != "All States":
        conditions.append(WeatherEvent.state.ilike(f"%{state}%"))
    if city:
        conditions.append(WeatherEvent.city.ilike(f"%{city}%"))
    if search:
        search_pattern = f"%{search}%"
        conditions.append(
            or_(
                WeatherEvent.title.ilike(search_pattern),
                WeatherEvent.description.ilike(search_pattern),
                WeatherEvent.city.ilike(search_pattern)
            )
        )

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.order_by(desc(WeatherEvent.upload_time)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    events = res.scalars().all()

    return [format_event_out(evt) for evt in events]


@router.get("/{event_id}", response_model=WeatherEventOut)
async def get_event_detail(
    event_id: str,
    db: AsyncSession = Depends(get_db)
):
    # Fetch event
    stmt = select(WeatherEvent).where(WeatherEvent.id == event_id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found")

    # Fetch evidence items
    evi_stmt = select(Evidence).where(Evidence.event_id == event_id).order_by(desc(Evidence.score))
    evi_res = await db.execute(evi_stmt)
    evidence_list = evi_res.scalars().all()

    # Fetch audit history logs
    log_stmt = select(VerificationLog).where(VerificationLog.event_id == event_id).order_by(VerificationLog.timestamp.asc())
    log_res = await db.execute(log_stmt)
    logs_list = log_res.scalars().all()

    return format_event_out(event, evidence_list=evidence_list, logs_list=logs_list)


@router.get("/{event_id}/evidence", response_model=List[EvidenceOut])
async def get_event_evidence(
    event_id: str,
    db: AsyncSession = Depends(get_db)
):
    evi_stmt = select(Evidence).where(Evidence.event_id == event_id).order_by(desc(Evidence.score))
    res = await db.execute(evi_stmt)
    return res.scalars().all()


@router.get("/{event_id}/audit", response_model=List[VerificationLogOut])
async def get_event_audit_history(
    event_id: str,
    db: AsyncSession = Depends(get_db)
):
    log_stmt = select(VerificationLog).where(VerificationLog.event_id == event_id).order_by(VerificationLog.timestamp.asc())
    res = await db.execute(log_stmt)
    return res.scalars().all()
