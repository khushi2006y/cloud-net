import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text
from app.database.session import Base


class Source(Base):
    __tablename__ = "sources"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    source_type = Column(String(32), nullable=False, index=True)  # IMD, WEATHER_API, SOCIAL, CITIZEN, WEBSITE, DATASET
    reliability_score = Column(Float, default=70.0, nullable=False)  # 0 to 100
    historical_reliability = Column(Float, default=70.0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    configuration = Column(Text, nullable=True)  # JSON config / credentials / endpoints
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
