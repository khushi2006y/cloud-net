import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Index
from app.database.session import Base


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(String(64), primary_key=True, default=lambda: f"tel-{uuid.uuid4().hex[:12]}")
    source_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)

    # Observations
    rainfall_mm = Column(Float, nullable=True)
    precipitation_mm = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    wind_speed_kmh = Column(Float, nullable=True)
    pressure_hpa = Column(Float, nullable=True)
    weather_code = Column(Integer, nullable=True)

    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_telemetry_time_coords", "timestamp", "latitude", "longitude"),
    )
