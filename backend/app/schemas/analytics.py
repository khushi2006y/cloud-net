from typing import Dict, List, Any
from datetime import datetime
from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_events: int
    verified_count: int
    provisional_count: int
    corroborated_count: int
    unverified_count: int
    flagged_count: int
    duplicate_count: int
    stale_count: int
    contradicted_count: int
    critical_events_count: int
    
    events_by_type: Dict[str, int]
    events_by_state: Dict[str, int]
    events_by_severity: Dict[str, int]
    confidence_distribution: Dict[str, int]  # "0-39", "40-59", "60-79", "80-100"
    
    average_confidence: float
    ingestion_rate_per_min: float
    processing_latency_ms: float
    queue_depth: int


class SourceHealth(BaseModel):
    source_id: str
    name: str
    source_type: str
    status: str  # HEALTHY, DEGRADED, OFFLINE, SIMULATION
    reliability_score: float
    last_seen: datetime
    error_count: int = 0
    latency_ms: float = 45.0


class SystemHealth(BaseModel):
    status: str  # HEALTHY, DEGRADED
    version: str
    uptime_seconds: float
    database: str
    ai_engine: str  # OPERATIONAL, FALLBACK_RULES
    admin_mode: str  # ACTIVE, UNAVAILABLE_PROVISIONAL_QUEUE
    sources: List[SourceHealth]
    timestamp: datetime
