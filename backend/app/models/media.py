import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from app.database.session import Base


class Media(Base):
    __tablename__ = "media"

    id = Column(String(64), primary_key=True, default=lambda: f"med-{uuid.uuid4().hex[:12]}")
    event_id = Column(String(64), ForeignKey("weather_events.id", ondelete="CASCADE"), nullable=False, index=True)
    object_path = Column(String(512), nullable=False)
    media_type = Column(String(32), default="image", nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    phash = Column(String(64), nullable=True, index=True)
    
    # Metadata extracted from EXIF / hardware
    capture_time = Column(DateTime, nullable=True)
    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)
    processing_status = Column(String(32), default="COMPLETED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
