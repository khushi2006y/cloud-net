from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.intelligence.geo_validator import validate_geographic_bounds, calculate_haversine_km
from app.intelligence.timestamp_validator import validate_3tier_timestamps
from app.intelligence.nlp_classifier import global_nlp_classifier
from app.intelligence.contradiction_engine import check_semantic_contradictions, check_physical_invariants
from app.intelligence.anti_circularity import calculate_source_independence


class EvidenceEvaluationResult:
    def __init__(
        self,
        confidence_score: float,
        verification_status: str,
        category: str,
        severity: str,
        evidence_items: List[Dict[str, Any]],
        spam_score: float,
        anomaly_score: float,
        freshness_score: float,
        duplicate_of: Optional[str] = None,
        is_contradictory: bool = False,
        contradiction_reason: Optional[str] = None,
        ai_status: str = "OPERATIONAL"
    ):
        self.confidence_score = confidence_score
        self.verification_status = verification_status
        self.category = category
        self.severity = severity
        self.evidence_items = evidence_items
        self.spam_score = spam_score
        self.anomaly_score = anomaly_score
        self.freshness_score = freshness_score
        self.duplicate_of = duplicate_of
        self.is_contradictory = is_contradictory
        self.contradiction_reason = contradiction_reason
        self.ai_status = ai_status


def evaluate_event_evidence(
    text: str,
    claimed_category: Optional[str],
    severity: str,
    latitude: float,
    longitude: float,
    event_time: Optional[datetime],
    capture_time: Optional[datetime],
    upload_time: datetime,
    source_type: str,
    source_reliability: float = 70.0,
    nearby_telemetry: Optional[Dict[str, Any]] = None,
    duplicate_info: Optional[Dict[str, Any]] = None,
    media_metadata: Optional[Dict[str, Any]] = None,
    root_origin_id: Optional[str] = None,
    upstream_sources: Optional[List[str]] = None
) -> EvidenceEvaluationResult:
    """
    Core Evidence Fusion Engine:
    Transforms heterogeneous raw inputs into a multi-factor corroborated decision
    with an explainable Evidence Confidence Score (0-100) and auditable evidence log.
    """
    evidence_items: List[Dict[str, Any]] = []
    penalties: float = 0.0

    # 1. Geospatial Consistency Check
    geo_res = validate_geographic_bounds(latitude, longitude)
    if geo_res["is_valid"]:
        evidence_items.append({
            "evidence_type": "GEO_CONSISTENCY",
            "direction": "SUPPORTING",
            "score": 20.0,
            "explanation": f"Geographic validity verified: Coordinates [{latitude:.4f}, {longitude:.4f}] fall within Indian Territory."
        })
        geo_score = 100.0
    else:
        evidence_items.append({
            "evidence_type": "GEO_CONSISTENCY",
            "direction": "CONTRADICTING",
            "score": -45.0,
            "explanation": f"Geospatial Anomaly: {geo_res['reason']}"
        })
        geo_score = 0.0
        penalties += 40.0

    # 2. 3-Tier Timestamp & Freshness Evaluation
    time_res = validate_3tier_timestamps(event_time, capture_time, upload_time)
    freshness_score = time_res["freshness_score"]
    if time_res["is_valid"] and not time_res["is_stale"]:
        evidence_items.append({
            "evidence_type": "TEMPORAL_CONSISTENCY",
            "direction": "SUPPORTING",
            "score": 20.0,
            "explanation": f"Temporal consistency confirmed: {time_res['reason']}"
        })
        temporal_score = 100.0
    else:
        evidence_items.append({
            "evidence_type": "TEMPORAL_CONSISTENCY",
            "direction": "CONTRADICTING",
            "score": -30.0,
            "explanation": f"Temporal Inconsistency: {time_res['reason']}"
        })
        temporal_score = 25.0
        penalties += 25.0

    # 3. Layered NLP Classification & Spam Detection
    nlp_res = global_nlp_classifier.classify(text, claimed_category=claimed_category)
    final_category = nlp_res["category"]
    spam_score = nlp_res["spam_score"]
    ai_status = nlp_res.get("ai_status", "OPERATIONAL")

    if spam_score >= 50.0:
        penalties += 45.0
        evidence_items.append({
            "evidence_type": "CONTENT_CONSISTENCY",
            "direction": "CONTRADICTING",
            "score": -35.0,
            "explanation": f"Spam/Hoax Trigger: {'; '.join(nlp_res['spam_reasons'])}"
        })
    elif nlp_res["confidence"] >= 70.0:
        evidence_items.append({
            "evidence_type": "CONTENT_CONSISTENCY",
            "direction": "SUPPORTING",
            "score": 10.0,
            "explanation": f"Lexicon & NLP alignment confirmed for '{final_category}' ({nlp_res['layer_used']})."
        })

    # 4. Semantic Contradiction Check
    is_contradictory, contradiction_reason = check_semantic_contradictions(text, final_category)
    if is_contradictory:
        penalties += 60.0
        evidence_items.append({
            "evidence_type": "CONTRADICTION",
            "direction": "CONTRADICTING",
            "score": -60.0,
            "explanation": contradiction_reason
        })

    # 5. Source Reliability Evaluation
    evidence_items.append({
        "evidence_type": "SOURCE_TRUST",
        "direction": "SUPPORTING" if source_reliability >= 70.0 else "NEUTRAL",
        "score": round((source_reliability / 100.0) * 25.0, 1),
        "explanation": f"Source Type '{source_type}' rated at {source_reliability:.0f}% operational reliability."
    })

    # 6. Physical & Telemetry Cross-Verification
    telemetry_score = 50.0  # Neutral baseline if no nearby sensor
    if nearby_telemetry:
        temp = nearby_telemetry.get("temperature_c")
        pressure = nearby_telemetry.get("pressure_hpa")
        wind = nearby_telemetry.get("wind_speed_kmh")
        rain = nearby_telemetry.get("rainfall_mm") or nearby_telemetry.get("precipitation_mm")

        # Physical Invariant check
        is_phys_valid, phys_reason = check_physical_invariants(
            pressure_hpa=pressure,
            wind_speed_kmh=wind,
            rainfall_mm=rain,
            temperature_c=temp
        )

        if not is_phys_valid:
            penalties += 40.0
            evidence_items.append({
                "evidence_type": "TELEMETRY",
                "direction": "CONTRADICTING",
                "score": -35.0,
                "explanation": phys_reason
            })
            telemetry_score = 10.0
        else:
            # Check meteorological corroboration
            if final_category in ["rainfall", "heavy_rainfall", "flooding"]:
                if rain is not None and rain > 2.0:
                    evidence_items.append({
                        "evidence_type": "TELEMETRY",
                        "direction": "SUPPORTING",
                        "score": 15.0,
                        "explanation": f"Open-Meteo Telemetry Corroboration: Nearby station recorded active precipitation ({rain} mm)."
                    })
                    telemetry_score = 95.0
                elif rain is not None and rain == 0.0:
                    is_contradictory = True
                    contradiction_reason = "Open-Meteo Telemetry Conflict: Official station in proximity measured 0.0 mm precipitation during claimed flood."
                    evidence_items.append({
                        "evidence_type": "TELEMETRY",
                        "direction": "CONTRADICTING",
                        "score": -35.0,
                        "explanation": contradiction_reason
                    })
                    telemetry_score = 10.0
                    penalties += 35.0
            elif final_category == "heatwave":
                if temp is not None and temp >= 40.0:
                    evidence_items.append({
                        "evidence_type": "TELEMETRY",
                        "direction": "SUPPORTING",
                        "score": 15.0,
                        "explanation": f"Open-Meteo Telemetry Corroboration: Severe surface heat ({temp}°C) recorded by regional station."
                    })
                    telemetry_score = 95.0

    # 7. Deduplication & Cluster Corroboration
    is_duplicate = False
    parent_id = None
    corroboration_score = 50.0

    if duplicate_info and duplicate_info.get("is_duplicate"):
        is_duplicate = True
        parent_id = duplicate_info.get("parent_event_id")
        evidence_items.append({
            "evidence_type": "INDEPENDENT_REPORT",
            "direction": "NEUTRAL",
            "score": 0.0,
            "explanation": f"Duplicate Incident: Merged into existing event '{parent_id}' to prevent alert fatigue."
        })
    else:
        evidence_items.append({
            "evidence_type": "INDEPENDENT_REPORT",
            "direction": "SUPPORTING",
            "score": 15.0,
            "explanation": "Independent Geospatial Incident: Verified non-duplicate origin."
        })
        corroboration_score = 80.0

    # 8. Foreign Location / Reused Media Metadata (Scenario D)
    if media_metadata:
        media_lat = media_metadata.get("gps_latitude")
        media_lng = media_metadata.get("gps_longitude")
        if media_lat is not None and media_lng is not None:
            media_geo = validate_geographic_bounds(media_lat, media_lng)
            if not media_geo["is_valid"]:
                penalties += 45.0
                evidence_items.append({
                    "evidence_type": "MEDIA_METADATA",
                    "direction": "CONTRADICTING",
                    "score": -40.0,
                    "explanation": f"Exif Location Conflict: Photograph hardware metadata places capture outside India ({media_lat:.2f}, {media_lng:.2f})."
                })

    # Composite Confidence Equation (0 - 100)
    base_confidence = (
        (source_reliability * settings.WEIGHT_SOURCE_RELIABILITY) +
        (temporal_score * settings.WEIGHT_TEMPORAL_CONSISTENCY) +
        (geo_score * settings.WEIGHT_GEOGRAPHIC_CONSISTENCY) +
        (corroboration_score * settings.WEIGHT_INDEPENDENT_CORROBORATION) +
        (telemetry_score * settings.WEIGHT_TELEMETRY_AGREEMENT) +
        (nlp_res["confidence"] * settings.WEIGHT_CONTENT_CONSISTENCY)
    )

    final_confidence = max(5.0, min(99.0, base_confidence - penalties))

    # Verification Status Assignment
    if is_contradictory:
        status = "CONTRADICTED"
    elif time_res.get("is_stale"):
        status = "STALE"
    elif final_confidence < 40.0:
        status = "FLAGGED"
    elif is_duplicate:
        status = "DUPLICATE"
    elif final_confidence < 60.0:
        status = "PROVISIONAL"
    elif final_confidence < 80.0:
        status = "CORROBORATED"
    else:
        status = "VERIFIED"

    anomaly_score = round(penalties, 1)

    return EvidenceEvaluationResult(
        confidence_score=round(final_confidence, 1),
        verification_status=status,
        category=final_category,
        severity=severity,
        evidence_items=evidence_items,
        spam_score=round(spam_score, 1),
        anomaly_score=anomaly_score,
        freshness_score=round(freshness_score, 1),
        duplicate_of=parent_id,
        is_contradictory=is_contradictory,
        contradiction_reason=contradiction_reason,
        ai_status=ai_status
    )
