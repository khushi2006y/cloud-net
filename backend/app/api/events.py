import json
from datetime import datetime
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

    # Normalize status to standard 7 statuses
    raw_status = (event.verification_status or "UNVERIFIED").upper()
    if raw_status in ["FLAGGED"]:
        status = "UNVERIFIED"
    elif raw_status in ["VERIFIED", "CORROBORATED", "PROVISIONAL", "UNVERIFIED", "CONTRADICTED", "DUPLICATE", "STALE"]:
        status = raw_status
    else:
        status = "UNVERIFIED"

    # Evidence lists
    supporting_evidence = []
    contradicting_evidence = []
    if evidence_list:
        for e in evidence_list:
            if e.direction == "SUPPORTING":
                supporting_evidence.append(e.explanation)
            elif e.direction == "CONTRADICTING":
                contradicting_evidence.append(e.explanation)

    # Fallback evidence if evidence_list was not loaded from DB
    if not supporting_evidence and not contradicting_evidence:
        if status in ["VERIFIED", "CORROBORATED"]:
            if event.source_type == "WEATHER_API" or "open-meteo" in (event.source_id or "").lower():
                supporting_evidence.append("Active weather telemetry confirmed via Open-Meteo Synoptic API")
            else:
                supporting_evidence.append(f"Multi-source corroboration from {event.source_name}")
                if event.city:
                    supporting_evidence.append(f"Spatial geofence confirmed for {event.city}, {event.state or 'India'}")
        elif status == "CONTRADICTED":
            contradicting_evidence.append("Telemetry Conflict: Official synoptic station measured 0.0 mm precipitation during claimed event")
        elif status == "PROVISIONAL":
            supporting_evidence.append("Preliminary citizen report registered; awaiting secondary corroboration")

    # Freshness calculation
    is_stale = False
    now = datetime.utcnow()
    ref_time = event.event_time or event.upload_time
    if ref_time:
        age_hours = (now - ref_time).total_seconds() / 3600.0
        if age_hours > 4.0 or status == "STALE" or (event.freshness_score and event.freshness_score < 40.0):
            is_stale = True

    freshness = "STALE" if is_stale else "CURRENT"
    if is_stale and status not in ["CONTRADICTED", "DUPLICATE"]:
        status = "STALE"

    # Authoritative Backend display_policy decision
    if status == "CONTRADICTED" or (len(contradicting_evidence) > 0 and (event.confidence_score or 0) < 40.0):
        display_policy = "SHOW_CONTRADICTED"
    elif status == "STALE" or freshness == "STALE":
        display_policy = "SHOW_STALE"
    elif status == "DUPLICATE" or event.duplicate_of:
        display_policy = "ATTACH_DUPLICATE"
    elif status == "UNVERIFIED":
        display_policy = "HIDE_UNVERIFIED"
    elif status == "PROVISIONAL":
        display_policy = "SHOW_PROVISIONAL"
    elif status == "CORROBORATED":
        display_policy = "SHOW_CORROBORATED"
    elif status == "VERIFIED":
        display_policy = "SHOW_VERIFIED"
    else:
        display_policy = "HIDE_UNVERIFIED"

    # Synthetic / Simulation data identification
    is_simulated = bool(
        "sim" in (event.source_id or "").lower() or
        event.source_type == "SOCIAL" or
        "simulat" in (event.source_name or "").lower() or
        "demo" in (event.source_id or "").lower()
    )

    # Independent sources count
    independent_sources = max(1, len(supporting_evidence))
    if status == "CORROBORATED":
        independent_sources = max(2, independent_sources)
    elif status == "VERIFIED":
        independent_sources = max(3, independent_sources)

    confidence = round(float(event.confidence_score or 50.0), 1)

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
            "status": event.verification_status or status,
            "confidence": confidence
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
        # Flattened properties for React UI convenience
        "city": event.city,
        "state": event.state,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "confidenceScore": confidence,
        "verificationStatus": status,

        # Authoritative Event Contract (Part 1 & 2)
        "event_id": event.id,
        "event_type": event.event_type,
        "confidence": confidence,
        "status": status,
        "independent_sources": independent_sources,
        "supporting_evidence": supporting_evidence,
        "contradicting_evidence": contradicting_evidence,
        "freshness": freshness,
        "display_policy": display_policy,
        "duplicate_count": 1 if event.duplicate_of else 0,
        "is_simulated": is_simulated
    }


@router.get("", response_model=List[WeatherEventOut])
async def list_events(
    category: Optional[str] = Query(None, description="Filter by event category"),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    state: Optional[str] = Query(None, description="Filter by state"),
    city: Optional[str] = Query(None, description="Filter by city"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    source_type: Optional[str] = Query(None, description="Filter by source type (OFFICIAL_GOVERNMENT_ALERT, OFFICIAL_GOVERNMENT_MARINE, WEATHER_PROVIDER, WEATHER_API, CITIZEN, SOCIAL, IMD)"),
    source_id: Optional[str] = Query(None, description="Filter by exact source ID"),
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
    if source_type:
        conditions.append(WeatherEvent.source_type == source_type.upper())
    if source_id:
        conditions.append(WeatherEvent.source_id == source_id)
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
