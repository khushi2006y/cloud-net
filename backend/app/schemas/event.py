from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.evidence import EvidenceOut, VerificationLogOut


class SourceMeta(BaseModel):
    id: str
    type: str  # IMD, WEATHER_API, SOCIAL, CITIZEN, WEBSITE, DATASET
    name: str
    reliability: float


class TimestampsMeta(BaseModel):
    eventTime: Optional[str] = None
    captureTime: Optional[str] = None
    uploadTime: str


class LocationMeta(BaseModel):
    latitude: float
    longitude: float
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"


class VerificationMeta(BaseModel):
    status: str  # UNVERIFIED, PROVISIONAL, CORROBORATED, VERIFIED, FLAGGED, DUPLICATE, STALE, CONTRADICTED
    confidence: float


class ProcessingMeta(BaseModel):
    duplicateOf: Optional[str] = None
    spamScore: Optional[float] = 0.0
    anomalyScore: Optional[float] = 0.0
    freshnessScore: Optional[float] = 100.0


class WeatherEventOut(BaseModel):
    id: str
    source: SourceMeta
    timestamps: TimestampsMeta
    location: LocationMeta
    category: str
    severity: str
    title: Optional[str] = None
    text: Optional[str] = None
    hashtags: List[str] = []
    verification: VerificationMeta
    processing: ProcessingMeta
    media_url: Optional[str] = None
    cluster_id: Optional[str] = None
    evidence: List[EvidenceOut] = []
    audit_logs: List[VerificationLogOut] = []

    # Flattened properties for easy React consumption
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    confidenceScore: Optional[float] = None
    verificationStatus: Optional[str] = None


class EventOverrideRequest(BaseModel):
    new_status: str
    reason: str = Field(..., min_length=3, description="Mandatory reason for administrative override")
    new_confidence: Optional[float] = None
