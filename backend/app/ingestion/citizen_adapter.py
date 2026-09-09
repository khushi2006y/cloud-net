from datetime import datetime
from typing import Dict, Any, List
from app.ingestion.base import BaseDataSource
from app.schemas.report import CitizenReportCreate
from app.intelligence.timestamp_validator import parse_iso_or_none


class CitizenReportAdapter(BaseDataSource):
    """
    Normalizes crowdsourced citizen reports into the canonical CloudNet event schema.
    Extracts optional network metadata for Sybil defense.
    """
    def __init__(self):
        super().__init__(
            source_id="src-citizen-portal",
            source_name="Citizen Crowdsource Network",
            source_type="CITIZEN",
            reliability=72.0
        )

    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        if isinstance(raw_input, CitizenReportCreate):
            report_dict = raw_input.model_dump()
        elif isinstance(raw_input, dict):
            report_dict = raw_input
        else:
            return []

        now = datetime.utcnow()
        event_time = parse_iso_or_none(report_dict.get("event_time")) or now
        capture_time = parse_iso_or_none(report_dict.get("capture_time")) or now

        normalized = {
            "source_id": self.source_id,
            "source_name": report_dict.get("source_author") or "Citizen Reporter",
            "source_type": self.source_type,
            "title": report_dict.get("title") or f"Weather report near {report_dict.get('city') or 'India'}",
            "description": report_dict.get("description", ""),
            "raw_text": report_dict.get("description", ""),
            "event_type": report_dict.get("category") or "rainfall",
            "severity": report_dict.get("severity") or "MEDIUM",
            "latitude": float(report_dict.get("latitude")),
            "longitude": float(report_dict.get("longitude")),
            "country": "India",
            "state": report_dict.get("state"),
            "city": report_dict.get("city"),
            "event_time": event_time,
            "capture_time": capture_time,
            "upload_time": now,
            "media_url": report_dict.get("media_url"),
            "hashtags": report_dict.get("hashtags") or ["#CitizenReport", "#WeatherUpdate"],
            "root_origin_id": report_dict.get("root_origin_id"),
            "upstream_sources": report_dict.get("upstream_sources") or [],
            "ip_subnet": report_dict.get("ip_subnet"),
            "cell_tower_id": report_dict.get("cell_tower_id")
        }
        return [normalized]
