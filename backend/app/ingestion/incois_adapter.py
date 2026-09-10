import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.ingestion.base import BaseWeatherSourceAdapter
from app.core.config import settings

# Indian Coastal Boundary States and Maritime Zones
INDIAN_COASTAL_ZONES = [
    {"name": "Arabian Sea - Mumbai Coast", "state": "Maharashtra", "lat": 18.9220, "lng": 72.8347},
    {"name": "Arabian Sea - Kochi Coastal Belt", "state": "Kerala", "lat": 9.9312, "lng": 76.2673},
    {"name": "Bay of Bengal - Chennai Harbor", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
    {"name": "Bay of Bengal - Visakhapatnam Port", "state": "Andhra Pradesh", "lat": 17.6868, "lng": 83.2185},
    {"name": "Bay of Bengal - Paradip Coast", "state": "Odisha", "lat": 20.3165, "lng": 86.6114},
    {"name": "Gulf of Kutch - Kandla Port", "state": "Gujarat", "lat": 23.0134, "lng": 70.2173},
    {"name": "Arabian Sea - Mangaluru Coast", "state": "Karnataka", "lat": 12.9141, "lng": 74.8560},
    {"name": "Andaman Sea - Port Blair", "state": "Andaman & Nicobar", "lat": 11.6234, "lng": 92.7265}
]


class IncoisAdapter(BaseWeatherSourceAdapter):
    """
    Adapter for INCOIS (Indian National Centre for Ocean Information Services), MoES.
    Provides authoritative ocean state forecasts, coastal hazard warnings, high wave alerts,
    swell surge advisories, and tsunami early warning bulletins.
    
    Reliability: 96.0% (Official Government Marine).
    Geographically bounded to Indian coastal states, ports, and territorial maritime zones.
    """
    def __init__(self):
        super().__init__(
            source_id="src-incois-marine",
            source_name="INCOIS — Indian National Centre for Ocean Information Services",
            source_type="OFFICIAL_GOVERNMENT_MARINE",
            reliability=96.0
        )
        self.base_url = settings.INCOIS_BASE_URL

    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        self.last_attempt = datetime.now(timezone.utc)

        # 1. Direct input parsing (from webhook, message bus, or test fixture)
        if raw_input:
            items = raw_input if isinstance(raw_input, list) else [raw_input]
            return self._normalize_hazard_items(items)

        # 2. Live HTTP fetch from INCOIS ocean hazard bulletin endpoint
        events = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(f"{self.base_url}/bulletins/active", headers={"Accept": "application/json"})
                self.records_received += 1
                if res.status_code == 200:
                    data = res.json()
                    raw_bulletins = data.get("bulletins", data if isinstance(data, list) else [])
                    events = self._normalize_hazard_items(raw_bulletins)
                    self.status = "ONLINE"
                    self.status_reason = "Operating normally"
                    self.last_successful_ingestion = datetime.now(timezone.utc)
                elif res.status_code in [404, 503]:
                    self.status = "DEGRADED"
                    self.status_reason = f"INCOIS endpoint returned HTTP {res.status_code}"
                    self.processing_errors += 1
                else:
                    self.status = "ONLINE"
                    self.status_reason = "Operating normally (No active oceanic warnings)"
        except Exception as e:
            self.status = "DEGRADED"
            self.status_reason = f"INCOIS network connection unavailable: {str(e)}"
            self.processing_errors += 1

        return events

    def _normalize_hazard_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        now = datetime.now(timezone.utc)

        for item in items:
            try:
                hazard_type = (item.get("hazard_type") or item.get("type") or "High Wave Warning").upper()
                headline = item.get("headline") or f"INCOIS Marine Advisory: {hazard_type}"
                desc = item.get("description") or item.get("warning_text") or "Coastal ocean hazard alert active."
                state = item.get("state") or item.get("coastal_state")
                coastal_zone = item.get("coastal_zone") or item.get("region") or (f"{state} Coast" if state else "Indian Coastline")

                lat = float(item.get("latitude") or item.get("lat", 15.0))
                lng = float(item.get("longitude") or item.get("lng", 75.0))

                # If missing coordinates, fallback to representative coastal zone coordinate
                if lat == 0.0 or lng == 0.0:
                    matching = next((z for z in INDIAN_COASTAL_ZONES if state and state.lower() in z["state"].lower()), INDIAN_COASTAL_ZONES[0])
                    lat, lng = matching["lat"], matching["lng"]

                # Coastal territorial boundary filter: Indian maritime Exclusive Economic Zone (EEZ)
                if not (4.0 <= lat <= 26.0 and 65.0 <= lng <= 96.0):
                    self.records_rejected += 1
                    continue

                # Category mapping: map coastal hazards to standard CloudNet taxonomy
                if "TSUNAMI" in hazard_type:
                    cat = "cyclone"
                    sev = "CRITICAL"
                elif "SURGE" in hazard_type or "SWELL" in hazard_type:
                    cat = "flooding"
                    sev = "HIGH"
                elif "HIGH WAVE" in hazard_type or "ROUGH SEA" in hazard_type:
                    cat = "strong_wind"
                    sev = "HIGH" if "WARNING" in hazard_type else "MEDIUM"
                else:
                    cat = "heavy_rainfall"
                    sev = "MEDIUM"

                wave_height = item.get("wave_height_m") or item.get("wave_height")
                wind_speed = item.get("wind_speed_knots")

                rec_id = item.get("bulletin_id") or item.get("id") or f"incois-{int(now.timestamp())}-{len(normalized)}"

                record = self.create_normalized_record(
                    external_record_id=str(rec_id),
                    event_type=cat,
                    title=headline,
                    description=desc,
                    latitude=lat,
                    longitude=lng,
                    severity=sev,
                    country="India",
                    state=state,
                    city=coastal_zone,
                    source_url=item.get("url") or "https://incois.gov.in",
                    hashtags=["#INCOIS", "#OceanAlert", "#HighWaves", "#FishermenWarning"],
                    raw_payload=item,
                    telemetry={
                        "wave_height_m": wave_height,
                        "wind_speed_kmh": float(wind_speed) * 1.852 if wind_speed else None
                    },
                    metadata={
                        "marine_hazard": hazard_type,
                        "alert_level": item.get("alert_level", "ORANGE"),
                        "fishermen_advisory": item.get("fishermen_warning", "Advised not to venture into deep sea")
                    }
                )
                normalized.append(record)
                self.records_processed += 1
            except Exception:
                self.records_rejected += 1

        if normalized:
            self.last_successful_ingestion = now

        return normalized
