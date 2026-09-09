import httpx
from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import BaseDataSource

# Top Indian Cities coordinates
INDIAN_CITIES_COORDS = [
    {"name": "Delhi", "state": "Delhi", "lat": 28.6139, "lng": 77.2090},
    {"name": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
    {"name": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lng": 88.3639},
    {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
    {"name": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946},
    {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867},
    {"name": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lng": 72.5714},
    {"name": "Pune", "state": "Maharashtra", "lat": 18.5204, "lng": 73.8567},
    {"name": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lng": 75.7873},
    {"name": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lng": 80.9462},
    {"name": "Shimla", "state": "Himachal Pradesh", "lat": 31.1048, "lng": 77.1734},
    {"name": "Guwahati", "state": "Assam", "lat": 26.1445, "lng": 91.7362},
    {"name": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lng": 77.4126},
    {"name": "Patna", "state": "Bihar", "lat": 25.5941, "lng": 85.1376},
    {"name": "Srinagar", "state": "Jammu & Kashmir", "lat": 34.0837, "lng": 74.7973}
]


def map_wmo_to_category(wmo_code: int, temp_c: float, wind_kmh: float, precip_mm: float) -> tuple[str, str]:
    """Translates raw WMO numerical code and surface telemetry to CloudNet category and severity."""
    if temp_c >= 42.0:
        return "heatwave", "CRITICAL" if temp_c >= 45.0 else "HIGH"
    if wind_kmh >= 50.0:
        return "strong_wind", "HIGH"
    if wmo_code in [95, 96, 99]:
        return "thunderstorm", "HIGH"
    if wmo_code in [45, 48]:
        return "fog", "MEDIUM"
    if precip_mm > 25.0 or wmo_code in [65, 82]:
        return "heavy_rainfall", "HIGH"
    if precip_mm > 5.0 or wmo_code in [61, 63, 80, 81]:
        return "rainfall", "MEDIUM"
    if temp_c >= 38.0 and wind_kmh >= 28.0:
        return "dust_storm", "MEDIUM"
    return "rainfall", "LOW"


class WeatherAPIAdapter(BaseDataSource):
    """
    Ingests live meteorological observation data from Open-Meteo REST API.
    Fails gracefully if external network times out.
    """
    def __init__(self):
        super().__init__(
            source_id="src-open-meteo",
            source_name="Open-Meteo Synoptic API",
            source_type="WEATHER_API",
            reliability=96.0
        )

    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        events = []
        async with httpx.AsyncClient(timeout=8.0) as client:
            for city in INDIAN_CITIES_COORDS[:6]:  # Ingest top metros asynchronously
                try:
                    url = (
                        f"https://api.open-meteo.com/v1/forecast"
                        f"?latitude={city['lat']}&longitude={city['lng']}"
                        f"&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,wind_speed_10m"
                        f"&timezone=Asia%2FKolkata"
                    )
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        curr = data.get("current", {})
                        temp = curr.get("temperature_2m", 25.0)
                        wind = curr.get("wind_speed_10m", 10.0)
                        precip = curr.get("precipitation", 0.0)
                        wmo = curr.get("weather_code", 0)
                        pressure = curr.get("surface_pressure", 1012.0)
                        humidity = curr.get("relative_humidity_2m", 60.0)

                        cat, sev = map_wmo_to_category(wmo, temp, wind, precip)
                        now_iso = datetime.utcnow()

                        events.append({
                            "source_id": self.source_id,
                            "source_name": self.source_name,
                            "source_type": self.source_type,
                            "source_record_id": f"om-{city['name'].lower()}-{int(now_iso.timestamp())}",
                            "title": f"{cat.replace('_', ' ').title()} recorded in {city['name']}",
                            "description": (
                                f"Synoptic observation in {city['name']}, {city['state']}: "
                                f"Temp: {temp}°C, Precipitation: {precip}mm, Wind: {wind}km/h, Pressure: {pressure}hPa."
                            ),
                            "event_type": cat,
                            "severity": sev,
                            "latitude": city["lat"],
                            "longitude": city["lng"],
                            "country": "India",
                            "state": city["state"],
                            "city": city["name"],
                            "event_time": now_iso,
                            "capture_time": now_iso,
                            "upload_time": now_iso,
                            "hashtags": [f"#{city['name']}Weather", "#IMD", f"#{cat.title().replace('_', '')}"],
                            "telemetry": {
                                "temperature_c": temp,
                                "wind_speed_kmh": wind,
                                "precipitation_mm": precip,
                                "rainfall_mm": precip,
                                "pressure_hpa": pressure,
                                "humidity_pct": humidity,
                                "weather_code": wmo
                            }
                        })
                        self.last_fetch = now_iso
                        self.status = "HEALTHY"
                except Exception as e:
                    self.error_count += 1
                    self.status = "DEGRADED"

        return events
