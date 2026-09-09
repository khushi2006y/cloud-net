import math
from typing import Dict, Any, Optional

# Indian Meteorological Zone Bounding Box
INDIA_LAT_MIN = 5.0
INDIA_LAT_MAX = 38.0
INDIA_LNG_MIN = 67.0
INDIA_LNG_MAX = 99.0


def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic surface distance in kilometers using Haversine formula."""
    r = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def validate_geographic_bounds(
    latitude: float, 
    longitude: float, 
    claimed_country: str = "India"
) -> Dict[str, Any]:
    """
    Validates coordinates against Indian territorial boundaries.
    Detects impossible coordinates and out-of-bounds anomalies.
    """
    if math.isnan(latitude) or math.isnan(longitude):
        return {
            "is_valid": False,
            "reason": "Coordinates are not valid numbers (NaN)",
            "geo_score": 0.0
        }

    if latitude < -90.0 or latitude > 90.0 or longitude < -180.0 or longitude > 180.0:
        return {
            "is_valid": False,
            "reason": f"Coordinates [{latitude}, {longitude}] are outside planetary spherical limits",
            "geo_score": 0.0
        }

    # India Territorial Bounding Box
    if (
        latitude < INDIA_LAT_MIN or latitude > INDIA_LAT_MAX or
        longitude < INDIA_LNG_MIN or longitude > INDIA_LNG_MAX
    ):
        return {
            "is_valid": False,
            "reason": f"Coordinates [{latitude:.4f}, {longitude:.4f}] lie outside sovereign Indian Territory (5°-38°N, 67°-99°E)",
            "geo_score": 10.0
        }

    return {
        "is_valid": True,
        "reason": "Coordinates confirmed within Indian Meteorological Zone",
        "geo_score": 100.0
    }
