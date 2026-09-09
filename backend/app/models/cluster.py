import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Index
from app.database.session import Base


class EventCluster(Base):
    """
    Spatiotemporal cluster aggregating multiple corroborating or duplicate
    reports into a single real-world physical event entity.
    """
    __tablename__ = "event_clusters"

    id = Column(String(64), primary_key=True, default=lambda: f"cls-{uuid.uuid4().hex[:12]}")
    cluster_name = Column(String(256), nullable=False)
    category = Column(String(32), nullable=False, index=True)
    primary_event_id = Column(String(64), nullable=True, index=True)
    
    total_reports = Column(Integer, default=1, nullable=False)
    independent_sources_count = Column(Integer, default=1, nullable=False)
    duplicate_count = Column(Integer, default=0, nullable=False)

    centroid_latitude = Column(Float, nullable=False)
    centroid_longitude = Column(Float, nullable=False)
    average_confidence = Column(Float, default=50.0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_cluster_coords", "centroid_latitude", "centroid_longitude"),
    )
