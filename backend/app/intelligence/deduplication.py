import math
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from app.intelligence.geo_validator import calculate_haversine_km


def calculate_jaccard_similarity(text1: str, text2: str) -> float:
    """Computes word token Jaccard similarity coefficient (0.0 to 1.0)."""
    tokenize = lambda t: set(
        w.lower() for w in "".join(c if c.isalnum() else " " for c in t).split() if len(w) > 2
    )
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)

    if not tokens1 or not tokens2:
        return 0.0

    intersection = len(tokens1.intersection(tokens2))
    union = len(tokens1.union(tokens2))
    return float(intersection) / float(union) if union > 0 else 0.0


def evaluate_deduplication(
    candidate_lat: float,
    candidate_lng: float,
    candidate_time: datetime,
    candidate_category: str,
    candidate_text: str,
    existing_events: List[Any],
    max_radius_km: float = 18.0,
    max_hours: float = 4.0
) -> Dict[str, Any]:
    """
    Spatiotemporal Deduplication Engine:
    Evaluates whether a new candidate report represents an existing physical incident.
    """
    for event in existing_events:
        # Don't merge with flagged hoaxes
        if getattr(event, "verification_status", "") == "FLAGGED":
            continue

        # Check time window (within 4 hours)
        evt_time = getattr(event, "event_time", None) or getattr(event, "upload_time", None)
        if not evt_time:
            continue

        time_diff_hours = abs((candidate_time - evt_time).total_seconds()) / 3600.0
        if time_diff_hours > max_hours:
            continue

        # Check spatial distance (within 18 km)
        evt_lat = getattr(event, "latitude", 0.0)
        evt_lng = getattr(event, "longitude", 0.0)
        dist_km = calculate_haversine_km(candidate_lat, candidate_lng, evt_lat, evt_lng)

        if dist_km <= max_radius_km:
            evt_category = getattr(event, "event_type", "")
            evt_text = getattr(event, "description", "") or getattr(event, "title", "")
            text_sim = calculate_jaccard_similarity(candidate_text, evt_text)

            # Match if category is identical or high lexical similarity
            if evt_category == candidate_category or text_sim >= 0.45:
                return {
                    "is_duplicate": True,
                    "parent_event_id": str(getattr(event, "id")),
                    "distance_km": round(dist_km, 2),
                    "time_diff_hours": round(time_diff_hours, 2),
                    "text_similarity": round(text_sim, 2),
                    "reason": (
                        f"Spatiotemporal cluster match: Co-located within {dist_km:.1f} km "
                        f"and {time_diff_hours:.1f}h of primary event '{getattr(event, 'id')}'"
                    )
                }

    return {
        "is_duplicate": False,
        "parent_event_id": None,
        "distance_km": None,
        "time_diff_hours": None,
        "text_similarity": None,
        "reason": "Unique spatiotemporal footprint confirmed"
    }
