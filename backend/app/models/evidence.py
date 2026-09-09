import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Index
from app.database.session import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(64), primary_key=True, default=lambda: f"evi-{uuid.uuid4().hex[:12]}")
    event_id = Column(String(64), ForeignKey("weather_events.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(32), nullable=False, index=True)  # TELEMETRY, INDEPENDENT_REPORT, SOURCE_TRUST, GEO_CONSISTENCY, MEDIA_METADATA, CONTRADICTION
    direction = Column(String(16), nullable=False, index=True)      # SUPPORTING, CONTRADICTING, NEUTRAL
    source_id = Column(String(64), nullable=True)
    value = Column(String(256), nullable=True)
    score = Column(Float, default=0.0, nullable=False)              # Impact weight (+15, -30, etc.)
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_evidence_event_dir", "event_id", "direction"),
    )
