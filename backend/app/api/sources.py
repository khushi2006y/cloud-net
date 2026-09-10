from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.models.source import Source
from app.models.user import User
from app.api.auth import require_roles
from app.ingestion.registry import source_registry
from app.workers.stream_processor import global_stream_processor
from app.api.websocket import ws_manager

router = APIRouter(prefix="/sources", tags=["Data Sources & Health"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_data_sources(db: AsyncSession = Depends(get_db)):
    """
    Returns the complete directory of trusted meteorological & disaster sources,
    including baseline reliability scores and active status.
    """
    stmt = select(Source).order_by(Source.reliability_score.desc())
    res = await db.execute(stmt)
    sources = res.scalars().all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "reliability_score": s.reliability_score,
            "active": s.active,
            "last_seen": s.last_seen.isoformat() if s.last_seen else None
        }
        for s in sources
    ]


@router.get("/health", response_model=List[Dict[str, Any]])
async def get_sources_health():
    """
    Live Operational Health & Diagnostic Telemetry for all ingestion adapters:
    Returns status (ONLINE, DEGRADED, UNAVAILABLE, STALE), latency, error counters,
    and last successful sync timestamps.
    """
    return source_registry.get_health_summary()


@router.post("/{source_id}/sync")
async def trigger_source_sync(
    source_id: str,
    current_user: User = Depends(require_roles(["ADMIN", "OPERATOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers an immediate on-demand ingestion cycle for the specified source.
    Normalizes records, runs through 12-gate verification, and broadcasts to WebSocket.
    """
    adapter = source_registry.get_adapter(source_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source adapter '{source_id}' not found in registry"
        )

    try:
        raw_events = await adapter.fetch_or_normalize()
        ingested = []
        for raw_event in raw_events:
            event = await global_stream_processor.process_normalized_event(
                event_dict=raw_event,
                db=db,
                ws_broadcast_callback=ws_manager.broadcast
            )
            ingested.append(event.id)

        return {
            "source_id": source_id,
            "status": adapter.status,
            "status_reason": adapter.status_reason,
            "fetched_count": len(raw_events),
            "processed_count": len(ingested),
            "event_ids": ingested
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync source '{source_id}': {str(e)}"
        )
