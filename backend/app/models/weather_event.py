import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Index
from app.database.session import Base


class WeatherEvent(Base):
    __tablename__ = "weather_events"

    id = Column(String(64), primary_key=True, default=lambda: f"evt-{uuid.uuid4().hex[:12]}")
    source_id = Column(String(64), ForeignKey("sources.id"), nullable=True, index=True)
    source_record_id = Column(String(128), nullable=True)
    source_name = Column(String(128), default="Anonymous Reporter", nullable=False)
    source_type = Column(String(32), default="CITIZEN", index=True)

    # Classification & Content
    event_type = Column(String(32), nullable=False, index=True)  # rainfall, heavy_rainfall, thunderstorm, etc.
    title = Column(String(256), nullable=True)
    description = Column(Text, nullable=False)
    raw_text = Column(Text, nullable=True)
    hashtags = Column(Text, nullable=True)  # JSON array string

    # 3-Tier Timestamp Intelligence
    event_time = Column(DateTime, nullable=True, index=True)
    capture_time = Column(DateTime, nullable=True)
    upload_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Geospatial Location
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    country = Column(String(64), default="India", nullable=False)
    state = Column(String(64), nullable=True, index=True)
    district = Column(String(64), nullable=True, index=True)
    city = Column(String(64), nullable=True, index=True)

    # Assessment & Scores
    severity = Column(String(16), default="MEDIUM", nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    confidence_score = Column(Float, default=50.0, nullable=False, index=True)   # 0 to 100
    verification_status = Column(String(32), default="UNVERIFIED", nullable=False, index=True)  # UNVERIFIED, PROVISIONAL, CORROBORATED, VERIFIED, FLAGGED, DUPLICATE, STALE, CONTRADICTED

    # Specialized Analytical Scores
    spam_score = Column(Float, default=0.0, nullable=False)
    anomaly_score = Column(Float, default=0.0, nullable=False)
    freshness_score = Column(Float, default=100.0, nullable=False)

    # Relationship & Clustering
    duplicate_of = Column(String(64), nullable=True, index=True)
    cluster_id = Column(String(64), nullable=True, index=True)

    # Lineage / Anti-Circularity
    root_origin_id = Column(String(128), nullable=True, index=True)
    upstream_sources = Column(Text, nullable=True)  # JSON array string

    # Attachments & References
    media_url = Column(String(512), nullable=True)
    media_type = Column(String(32), nullable=True)
    source_url = Column(String(512), nullable=True)
    effective_until = Column(DateTime, nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_events_coords", "latitude", "longitude"),
        Index("idx_events_state_type", "state", "event_type"),
        Index("idx_events_status_conf", "verification_status", "confidence_score"),
    )
