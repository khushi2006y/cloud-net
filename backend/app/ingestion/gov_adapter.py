from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import BaseDataSource


class GovernmentDataAdapter(BaseDataSource):
    """
    Adapter for official meteorological bulletins from IMD / data.gov.in.
    Assigned highest baseline reliability score.
    """
    def __init__(self):
        super().__init__(
            source_id="src-imd-official",
            source_name="India Meteorological Department (IMD)",
            source_type="IMD",
            reliability=98.0
        )

    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        return [{
            "source_id": self.source_id,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "source_record_id": f"imd-bulletin-{int(now.timestamp())}",
            "title": "IMD Synoptic Alert: Intense Convective Cell over NCR",
            "description": "IMD National Weather Forecasting Centre issues Orange Alert for thunderstorm and squall activity across Delhi NCR and western Uttar Pradesh.",
            "raw_text": "IMD Official Bulletin: Orange alert active. Thunderstorm with lightning and gusty winds (speed 45-55 km/h). #IMD #WeatherAlert",
            "event_type": "thunderstorm",
            "severity": "HIGH",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "country": "India",
            "state": "Delhi",
            "city": "Delhi",
            "event_time": now,
            "capture_time": now,
            "upload_time": now,
            "hashtags": ["#IMD", "#WeatherAlert", "#OrangeAlert"],
            "root_origin_id": "imd-nwfc-bulletin-active",
            "upstream_sources": ["imd-delhi-hq"]
        }]
