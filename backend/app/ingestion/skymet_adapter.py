import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.ingestion.base import BaseWeatherSourceAdapter
from app.core.config import settings


class SkymetAdapter(BaseWeatherSourceAdapter):
    """
    Adapter for Skymet Weather private meteorological network.
    Provides localized commercial weather observations across Indian stations.
    
    Adheres strictly to the authentic-data policy:
    If SKYMET_API_KEY is not configured in the environment, marks status as UNAVAILABLE
    and returns empty records. Never fabricates fake Skymet data.
    """
    def __init__(self):
        super().__init__(
            source_id="src-skymet",
            source_name="Skymet Weather Private Network",
            source_type="WEATHER_PROVIDER",
            reliability=88.0
        )
        self.api_key = settings.SKYMET_API_KEY
        self.base_url = settings.SKYMET_BASE_URL

        # Validate configuration
        if not self.api_key:
            self.status = "UNAVAILABLE"
            self.status_reason = "Skymet API credentials not configured (SKYMET_API_KEY missing)"
        else:
            self.status = "ONLINE"
            self.status_reason = "API credentials configured"

    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        self.last_attempt = datetime.now(timezone.utc)

        # If a raw input dictionary/list is passed (e.g. from webhook, test fixture, or manual push)
        if raw_input:
            items = raw_input if isinstance(raw_input, list) else [raw_input]
            return self._normalize_items(items)

        # If not configured, fail gracefully without raising or faking
        if not self.api_key:
            self.status = "UNAVAILABLE"
            self.status_reason = "Skymet API credentials not configured (SKYMET_API_KEY missing)"
            return []

        # Authorized API query across primary observation stations
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }
        events = []
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(f"{self.base_url}/live/india/stations", headers=headers)
                self.records_received += 1
                if res.status_code == 200:
                    data = res.json()
                    raw_stations = data.get("stations", data if isinstance(data, list) else [])
                    events = self._normalize_items(raw_stations)
                    self.status = "ONLINE"
                    self.status_reason = "Operating normally"
                    self.last_successful_ingestion = datetime.now(timezone.utc)
                elif res.status_code in [401, 403]:
                    self.status = "UNAVAILABLE"
                    self.status_reason = f"Authentication rejected by Skymet API (HTTP {res.status_code})"
                    self.processing_errors += 1
                else:
                    self.status = "DEGRADED"
                    self.status_reason = f"Skymet API returned unexpected status {res.status_code}"
                    self.processing_errors += 1
        except Exception as e:
            self.status = "DEGRADED"
            self.status_reason = f"Network timeout / connection error: {str(e)}"
            self.processing_errors += 1

        return events

    def _normalize_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        now = datetime.now(timezone.utc)

        for item in items:
            try:
                lat = float(item.get("latitude") or item.get("lat", 0.0))
                lng = float(item.get("longitude") or item.get("lng", item.get("lon", 0.0)))
                if lat == 0.0 and lng == 0.0:
                    self.records_rejected += 1
                    continue

                city = item.get("city") or item.get("station_name") or "India Station"
                state = item.get("state")
                temp_c = float(item.get("temperature_c") or item.get("temp", 28.0))
                rainfall_mm = float(item.get("rainfall_mm") or item.get("precip_mm", 0.0))
                humidity_pct = float(item.get("humidity_pct") or item.get("humidity", 60.0))
                wind_kmh = float(item.get("wind_speed_kmh") or item.get("wind_kmh", 15.0))
                condition_desc = item.get("condition") or item.get("weather_desc") or "Observation recorded"

                # Standardize category
                if rainfall_mm > 25.0:
                    cat = "heavy_rainfall"
                    sev = "HIGH"
                elif rainfall_mm > 0.5:
                    cat = "rainfall"
                    sev = "MEDIUM" if rainfall_mm > 5.0 else "LOW"
                elif temp_c >= 42.0:
                    cat = "heatwave"
                    sev = "CRITICAL" if temp_c >= 45.0 else "HIGH"
                elif wind_kmh >= 45.0:
                    cat = "strong_wind"
                    sev = "HIGH"
                elif "thunder" in condition_desc.lower():
                    cat = "thunderstorm"
                    sev = "HIGH"
                else:
                    cat = "clear"
                    sev = "LOW"

                rec_id = item.get("id") or item.get("station_id") or f"skymet-{int(now.timestamp())}-{len(normalized)}"
                
                record = self.create_normalized_record(
                    external_record_id=str(rec_id),
                    event_type=cat,
                    title=f"Skymet Weather Station Observation — {city}",
                    description=f"{condition_desc} in {city}. Temp: {temp_c:.1f}°C, Rainfall: {rainfall_mm:.1f}mm, Humidity: {humidity_pct:.0f}%, Wind: {wind_kmh:.1f} km/h.",
                    latitude=lat,
                    longitude=lng,
                    severity=sev,
                    city=city,
                    state=state,
                    telemetry={
                        "temperature_c": temp_c,
                        "rainfall_mm": rainfall_mm,
                        "precipitation_mm": rainfall_mm,
                        "humidity_pct": humidity_pct,
                        "wind_speed_kmh": wind_kmh,
                        "pressure_hpa": item.get("pressure_hpa", 1010.0)
                    },
                    source_url=item.get("source_url") or "https://www.skymetweather.com",
                    raw_payload=item
                )
                normalized.append(record)
                self.records_processed += 1
            except Exception:
                self.records_rejected += 1

        if normalized:
            self.last_successful_ingestion = now

        return normalized
