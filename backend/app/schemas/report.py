from typing import Optional, List
from pydantic import BaseModel, Field


class CitizenReportCreate(BaseModel):
    title: Optional[str] = None
    description: str = Field(..., min_length=5, description="Observation description")
    category: Optional[str] = None  # If omitted, Layered NLP auto-classifies
    severity: Optional[str] = "MEDIUM"
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    city: Optional[str] = None
    state: Optional[str] = None
    event_time: Optional[str] = None
    capture_time: Optional[str] = None
    media_url: Optional[str] = None
    source_author: Optional[str] = "Citizen Reporter"
    hashtags: Optional[List[str]] = []
    
    # Optional metadata for Sybil & Diversity checks
    ip_subnet: Optional[str] = None
    cell_tower_id: Optional[str] = None
    root_origin_id: Optional[str] = None
    # Forensic Media & Hardware EXIF Metadata (Scenario D)
    media_metadata: Optional[dict] = None
    exif_metadata: Optional[dict] = None


class IngestionPayload(BaseModel):
    source_id: str
    source_type: str  # IMD, WEATHER_API, SOCIAL, CITIZEN, WEBSITE, DATASET
    source_name: str
    reports: List[CitizenReportCreate]
