import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Index
from app.database.session import Base


class VerificationLog(Base):
    """
    Append-only immutable audit ledger tracking all automated
    evaluations and human administrative overrides.
    """
    __tablename__ = "verification_logs"

    id = Column(String(64), primary_key=True, default=lambda: f"log-{uuid.uuid4().hex[:12]}")
    event_id = Column(String(64), ForeignKey("weather_events.id", ondelete="CASCADE"), nullable=False, index=True)
    actor = Column(String(64), default="SYSTEM", nullable=False)  # "SYSTEM" or username
    action = Column(String(64), nullable=False, index=True)       # AUTO_VERIFIED, STATUS_OVERRIDE, FLAGGED, etc.
    previous_status = Column(String(32), nullable=True)
    new_status = Column(String(32), nullable=False)
    previous_confidence = Column(Float, nullable=True)
    new_confidence = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    rule_or_model = Column(String(128), default="EvidenceFusionEngine-v2.0", nullable=False)
    system_version = Column(String(32), default="2.0.0", nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index("idx_audit_event_time", "event_id", "timestamp"),
    )
