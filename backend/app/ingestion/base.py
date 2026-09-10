from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class BaseWeatherSourceAdapter(ABC):
    """
    Standard unified source adapter converting heterogeneous weather, ocean,
    and disaster alert feeds into the canonical CloudNet normalized event structure.
    Maintains live health telemetry, failure logging, and data provenance.
    """
    def __init__(
        self,
        source_id: str,
        source_name: str,
        source_type: str,
        reliability: float = 70.0
    ):
        self.source_id = source_id
        self.source_name = source_name
        self.source_type = source_type
        self.reliability = reliability
        
        # Operational Health & Lifecycle Tracking
        self.status: str = "ONLINE"  # ONLINE, DEGRADED, UNAVAILABLE, STALE
        self.status_reason: str = "Operating normally"
        self.last_successful_ingestion: Optional[datetime] = None
        self.last_attempt: Optional[datetime] = None
        
        # Health Counters
        self.records_received: int = 0
        self.records_processed: int = 0
        self.records_rejected: int = 0
        self.processing_errors: int = 0
        
        # Legacy compatibility attribute
        self.last_fetch: datetime = datetime.now(timezone.utc)
        self.error_count: int = 0

    @abstractmethod
    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        """Transforms source payload into standard normalized event dictionaries."""
        pass

    def get_health_status(self) -> Dict[str, Any]:
        """Returns standard operational health status for dashboard and monitoring."""
        # Calculate staleness if no ingestion in > 4 hours while online
        now = datetime.now(timezone.utc)
        effective_status = self.status
        if self.status == "ONLINE" and self.last_successful_ingestion:
            elapsed_hours = (now - self.last_successful_ingestion).total_seconds() / 3600.0
            if elapsed_hours > 4.0:
                effective_status = "STALE"

        return {
            "source_id": self.source_id,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "reliability": self.reliability,
            "status": effective_status,
            "status_reason": self.status_reason,
            "last_successful_ingestion": self.last_successful_ingestion.isoformat() if self.last_successful_ingestion else None,
            "last_attempt": self.last_attempt.isoformat() if self.last_attempt else None,
            "records_received": self.records_received,
            "records_processed": self.records_processed,
            "records_rejected": self.records_rejected,
            "processing_errors": self.processing_errors
        }

    def create_normalized_record(
        self,
        external_record_id: str,
        event_type: str,
        title: str,
        description: str,
        latitude: float,
        longitude: float,
        severity: str = "MEDIUM",
        country: str = "India",
        state: Optional[str] = None,
        district: Optional[str] = None,
        city: Optional[str] = None,
        event_time: Optional[datetime] = None,
        observation_time: Optional[datetime] = None,
        upload_time: Optional[datetime] = None,
        effective_from: Optional[datetime] = None,
        effective_until: Optional[datetime] = None,
        raw_payload: Optional[Any] = None,
        source_url: Optional[str] = None,
        hashtags: Optional[List[str]] = None,
        telemetry: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Ensures consistent canonical schema across all external weather/disaster sources."""
        now = datetime.now(timezone.utc)
        ev_time = event_time or observation_time or now
        obs_time = observation_time or ev_time
        up_time = upload_time or now

        return {
            "source_id": self.source_id,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "source_record_id": external_record_id,
            "event_type": event_type,
            "title": title,
            "description": description,
            "raw_text": description,
            "latitude": float(latitude),
            "longitude": float(longitude),
            "country": country,
            "state": state,
            "district": district,
            "city": city,
            "severity": severity.upper() if severity else "MEDIUM",
            "event_time": ev_time,
            "capture_time": obs_time,
            "upload_time": up_time,
            "effective_from": effective_from,
            "effective_until": effective_until,
            "hashtags": hashtags or [],
            "telemetry": telemetry,
            "raw_payload": raw_payload,
            "source_url": source_url,
            "metadata": metadata or {}
        }


# Backward compatibility alias
BaseDataSource = BaseWeatherSourceAdapter
