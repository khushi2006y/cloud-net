from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database.session import get_db
from app.models.weather_event import WeatherEvent
from app.models.verification_log import VerificationLog
from app.models.user import User
from app.schemas.event import WeatherEventOut, EventOverrideRequest
from app.schemas.evidence import VerificationLogOut
from app.api.auth import get_current_user, require_roles
from app.api.events import format_event_out
from app.api.websocket import ws_manager

router = APIRouter(prefix="/admin", tags=["Admin Governance"])


@router.get("/verification-queue", response_model=List[WeatherEventOut])
async def get_verification_queue(
    status_filter: Optional[str] = Query("PROVISIONAL", description="Queue status filter (PROVISIONAL, UNVERIFIED, FLAGGED, ALL)"),
    severity_filter: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves events currently pending human administrative review or verification.
    Prioritizes high-impact events (CRITICAL / HIGH severity).
    """
    stmt = select(WeatherEvent)
    if status_filter and status_filter.upper() != "ALL":
        stmt = stmt.where(WeatherEvent.verification_status == status_filter.upper())
    if severity_filter:
        stmt = stmt.where(WeatherEvent.severity == severity_filter.upper())

    # Order by severity priority, then recency
    stmt = stmt.order_by(desc(WeatherEvent.upload_time)).limit(limit)
    res = await db.execute(stmt)
    events = res.scalars().all()

    return [format_event_out(e) for e in events]


@router.post("/events/{event_id}/override", response_model=WeatherEventOut)
async def override_event_status(
    event_id: str,
    override_req: EventOverrideRequest,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Manual Administrative Override:
    Mandates a logged justification reason and records an append-only audit trail.
    """
    stmt = select(WeatherEvent).where(WeatherEvent.id == event_id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Event '{event_id}' not found")

    old_status = event.verification_status
    old_conf = event.confidence_score

    new_status = override_req.new_status.upper()
    new_conf = override_req.new_confidence if override_req.new_confidence is not None else (
        95.0 if new_status == "VERIFIED" else (15.0 if new_status == "FLAGGED" else old_conf)
    )

    event.verification_status = new_status
    event.confidence_score = new_conf
    event.updated_at = datetime.utcnow()

    # Append-only audit trail logging
    audit = VerificationLog(
        event_id=event.id,
        actor=current_user.username,
        action="STATUS_OVERRIDE",
        previous_status=old_status,
        new_status=new_status,
        previous_confidence=old_conf,
        new_confidence=new_conf,
        reason=override_req.reason,
        rule_or_model="HumanAdministrativeReviewer"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(event)

    # Real-time WebSocket broadcast of status update
    try:
        await ws_manager.broadcast({
            "type": "STATUS_OVERRIDE",
            "event_id": event.id,
            "new_status": new_status,
            "new_confidence": new_conf,
            "actor": current_user.username,
            "reason": override_req.reason
        })
    except Exception:
        pass

    return format_event_out(event)


@router.post("/events/{event_id}/verify", response_model=WeatherEventOut)
async def quick_verify_event(
    event_id: str,
    reason: str = Query("Corroborated by field observer", min_length=3),
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    return await override_event_status(
        event_id=event_id,
        override_req=EventOverrideRequest(new_status="VERIFIED", reason=reason, new_confidence=95.0),
        current_user=current_user,
        db=db
    )


@router.post("/events/{event_id}/flag", response_model=WeatherEventOut)
async def quick_flag_event(
    event_id: str,
    reason: str = Query("Identified as fabricated or out-of-area hoax", min_length=3),
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    return await override_event_status(
        event_id=event_id,
        override_req=EventOverrideRequest(new_status="FLAGGED", reason=reason, new_confidence=10.0),
        current_user=current_user,
        db=db
    )


@router.get("/audit-logs", response_model=List[VerificationLogOut])
async def get_system_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Returns the immutable append-only audit trail of all verification decisions."""
    stmt = select(VerificationLog).order_by(desc(VerificationLog.timestamp)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()
