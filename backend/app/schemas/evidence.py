from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class EvidenceOut(BaseModel):
    id: str
    event_id: str
    evidence_type: str
    direction: str  # SUPPORTING, CONTRADICTING, NEUTRAL
    source_id: Optional[str] = None
    value: Optional[str] = None
    score: float
    explanation: str
    created_at: datetime

    class Config:
        from_attributes = True


class VerificationLogOut(BaseModel):
    id: str
    event_id: str
    actor: str
    action: str
    previous_status: Optional[str] = None
    new_status: str
    previous_confidence: Optional[float] = None
    new_confidence: float
    reason: str
    rule_or_model: str
    system_version: str
    timestamp: datetime

    class Config:
        from_attributes = True
