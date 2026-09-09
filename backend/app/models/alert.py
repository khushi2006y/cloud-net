import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Index
from app.database.session import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, default=lambda: f"alt-{uuid.uuid4().hex[:12]}")
    event_id = Column(String(64), ForeignKey("weather_events.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(String(16), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, nullable=False)
    status = Column(String(32), default="ACTIVE", nullable=False, index=True)  # ACTIVE, ACKNOWLEDGED, RESOLVED
    message = Column(Text, nullable=False)
    generated_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    acknowledged_time = Column(DateTime, nullable=True)
    reviewer_id = Column(String(64), nullable=True)

    __table_args__ = (
        Index("idx_alert_status_time", "status", "generated_time"),
    )
