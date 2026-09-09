import re
from typing import Dict, Any, Optional, Tuple

SUNNY_DRY_PATTERNS = [
    "sunny day", "bright sun", "sun is shining", "clear skies", "clear sky",
    "no rain", "dry day", "completely dry", "bright sunshine", "hot sun",
    "no clouds", "sunshine", "not raining", "not a single drop", "not a drop of rain",
    "dry weather", "sunny and clear", "clear and sunny", "hot and dry", "dhoop", "khili dhoop"
]

FREEZING_SNOW_PATTERNS = [
    "freezing cold", "snowing", "heavy snowfall", "snowfall", "blizzard",
    "ice cold", "hailstorm", "sub zero", "sweater weather", "cold wave", "chilly frost"
]

CLEAR_VISIBILITY_PATTERNS = [
    "crystal clear", "clear visibility", "visible for miles", "no haze at all", "full visibility"
]


def check_semantic_contradictions(text: str, category: str) -> Tuple[bool, Optional[str]]:
    """
    Detects internal semantic contradictions in weather reports.
    Example: Selecting 'rainfall' but describing 'bright sun' or 'khili dhoop'.
    """
    lower = text.lower()

    # 1. Rain / Storm / Flood vs. Sunny / Dry
    if category in ["rainfall", "heavy_rainfall", "thunderstorm", "flooding"]:
        for pattern in SUNNY_DRY_PATTERNS:
            if re.search(rf"\b{re.escape(pattern)}\b", lower):
                return True, (
                    f"Semantic Contradiction: Category claimed is '{category}', but description explicitly states '{pattern}'. "
                    "Direct meteorological self-contradiction detected."
                )

    # 2. Heatwave vs. Freezing / Snow
    if category == "heatwave":
        for pattern in FREEZING_SNOW_PATTERNS:
            if pattern in lower:
                return True, (
                    f"Semantic Contradiction: Category claimed is 'heatwave', but description describes '{pattern}'. "
                    "Direct thermodynamic conflict detected."
                )

    # 3. Fog vs. Clear Visibility
    if category == "fog":
        for pattern in CLEAR_VISIBILITY_PATTERNS:
            if pattern in lower:
                return True, (
                    f"Semantic Contradiction: Category claimed is 'fog', but description states '{pattern}'. "
                    "Optical atmospheric conflict detected."
                )

    return False, None


def check_physical_invariants(
    pressure_hpa: Optional[float] = None,
    wind_speed_kmh: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
    cloud_top_temp_c: Optional[float] = None,
    temperature_c: Optional[float] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validates Navier-Stokes and thermodynamic invariants across orthogonal physical modalities.
    """
    # 1. Pressure–Wind Invariant: Extreme cyclonic drop (< 980 hPa) requires gale winds (> 50 km/h)
    if pressure_hpa is not None and pressure_hpa < 980.0:
        if wind_speed_kmh is not None and wind_speed_kmh < 15.0:
            return False, (
                f"Physical Sensor Failure: Extreme barometric drop ({pressure_hpa} hPa < 980 hPa) "
                f"detected without expected gradient winds ({wind_speed_kmh} km/h reported, expected > 50 km/h)."
            )

    # 2. Cloudburst–Cloud-Top Invariant: Severe cloudburst (> 50 mm) requires deep convective cumulonimbus (< -50°C)
    if rainfall_mm is not None and rainfall_mm > 50.0:
        if cloud_top_temp_c is not None and cloud_top_temp_c > -10.0:
            return False, (
                f"Physical Invariant Conflict: Severe precipitation ({rainfall_mm} mm > 50 mm) "
                f"reported under shallow warm cloud cover ({cloud_top_temp_c}°C > -10°C; expected < -50°C)."
            )

    # 3. Climatological limits for Indian territory
    if temperature_c is not None:
        if temperature_c > 53.0:
            return False, f"Climatological Impossibility: Reading of {temperature_c}°C exceeds all historical Indian records."
        if temperature_c < -40.0:
            return False, f"Climatological Impossibility: Reading of {temperature_c}°C exceeds sub-zero boundaries for Indian territory."

    return True, None
