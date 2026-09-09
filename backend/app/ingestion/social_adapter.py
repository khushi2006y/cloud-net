import random
from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import BaseDataSource

INDIAN_CITIES_DATA = [
    ("Delhi", "Delhi", 28.6139, 77.2090),
    ("Mumbai", "Maharashtra", 19.0760, 72.8777),
    ("Chennai", "Tamil Nadu", 13.0827, 80.2707),
    ("Kolkata", "West Bengal", 22.5726, 88.3639),
    ("Bengaluru", "Karnataka", 12.9716, 77.5946),
    ("Hyderabad", "Telangana", 17.3850, 78.4867),
    ("Jaipur", "Rajasthan", 26.9124, 75.7873),
    ("Shimla", "Himachal Pradesh", 31.1048, 77.1734)
]

SOCIAL_TEMPLATES = [
    ("Heavy waterlogging on the main bypass road near {city}. Traffic completely halted! #Flood #{city}Rains #IMD", "flooding", "HIGH"),
    ("Intense thunder and lightning striking across {city} right now. Stay indoors! #Thunderstorm #Bijli #{city} #IMD", "thunderstorm", "HIGH"),
    ("Extreme scorching heat in {city}. Mercury crossed 44 degrees, severe loo blowing. #Heatwave #Loo #{city}", "heatwave", "HIGH"),
    ("Dense fog blinding morning flights and highway visibility near {city} airport. #DenseFog #Kohra #{city}", "fog", "MEDIUM"),
    ("Continuous moderate rainfall across {city} since early morning. Pleasant weather. #Rain #Monsoon #{city} #Weather", "rainfall", "LOW"),
    ("Terracotta dust storm blowing at high speed across {city} outskirts. #DustStorm #Andhi #{city}", "dust_storm", "MEDIUM")
]


class SocialMediaAdapter(BaseDataSource):
    """
    Simulated public social media adapter extracting posts tagged with
    official weather hashtags (#IMD, #Rain, #Flood, #Thunderstorm).
    Transparently labeled as SIMULATION mode.
    """
    def __init__(self):
        super().__init__(
            source_id="src-social-stream-sim",
            source_name="Public Social Stream [SIMULATION]",
            source_type="SOCIAL",
            reliability=58.0
        )
        self.status = "SIMULATION"

    async def fetch_or_normalize(self, count: int = 1) -> List[Dict[str, Any]]:
        events = []
        now = datetime.utcnow()

        for _ in range(count):
            city, state, lat, lng = random.choice(INDIAN_CITIES_DATA)
            template, category, severity = random.choice(SOCIAL_TEMPLATES)
            text = template.format(city=city)

            # Jitter coordinates slightly
            jitter_lat = lat + (random.random() - 0.5) * 0.04
            jitter_lng = lng + (random.random() - 0.5) * 0.04

            events.append({
                "source_id": self.source_id,
                "source_name": f"User_{random.randint(1000, 9999)} (Twitter/X)",
                "source_type": self.source_type,
                "source_record_id": f"tw-{int(now.timestamp())}-{random.randint(100, 999)}",
                "title": f"Social report: {category.title()} in {city}",
                "description": text,
                "raw_text": text,
                "event_type": category,
                "severity": severity,
                "latitude": round(jitter_lat, 4),
                "longitude": round(jitter_lng, 4),
                "country": "India",
                "state": state,
                "city": city,
                "event_time": now,
                "capture_time": now,
                "upload_time": now,
                "hashtags": ["#IMD", f"#{category.title().replace('_', '')}", f"#{city}Weather"],
                "root_origin_id": f"social-post-{random.randint(10000, 99999)}",
                "upstream_sources": ["twitter-scrape-stream", "cloudnet-social-adapter"]
            })

        return events
