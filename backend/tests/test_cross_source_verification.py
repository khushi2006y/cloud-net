import pytest
from datetime import datetime, timedelta
from app.intelligence.evidence_engine import evaluate_event_evidence


def test_sachet_corroboration_elevates_confidence():
    """
    Validates that a legitimate citizen report in Chennai is elevated to CORROBORATED/VERIFIED
    when backed by high source reliability and active temporal validity.
    """
    now = datetime.utcnow()
    valid_until = now + timedelta(hours=12)

    eval_result = evaluate_event_evidence(
        text="Heavy waterlogging and thunderstorm observed near Marina Beach, Chennai. Winds gusting over 50 km/h.",
        claimed_category="rainfall",
        severity="HIGH",
        latitude=13.0827,
        longitude=80.2707,
        event_time=now - timedelta(minutes=10),
        capture_time=now - timedelta(minutes=15),
        upload_time=now,
        source_type="OFFICIAL_GOVERNMENT_ALERT",
        source_reliability=98.0,
        effective_until=valid_until
    )

    assert eval_result.confidence_score >= 80.0
    assert eval_result.verification_status in ["VERIFIED", "CORROBORATED"]
    assert any(e["evidence_type"] == "ALERT_EXPIRATION" and e["direction"] == "SUPPORTING" for e in eval_result.evidence_items)
    assert any(e["evidence_type"] == "SOURCE_TRUST" and e["score"] >= 24.0 for e in eval_result.evidence_items)


def test_expired_alert_penalized_and_marked_stale():
    """
    Validates that an official alert past its effective_until window is penalized (-35)
    and assigned verification_status = STALE.
    """
    now = datetime.utcnow()
    expired_time = now - timedelta(hours=6)

    eval_result = evaluate_event_evidence(
        text="Flash flood warning issued for sub-basin catchment.",
        claimed_category="flooding",
        severity="MEDIUM",
        latitude=26.1445,
        longitude=91.7362,
        event_time=now - timedelta(hours=8),
        capture_time=now - timedelta(hours=8),
        upload_time=now,
        source_type="OFFICIAL_GOVERNMENT_ALERT",
        source_reliability=98.0,
        effective_until=expired_time
    )

    assert eval_result.verification_status == "STALE"
    assert any(e["evidence_type"] == "ALERT_EXPIRATION" and e["direction"] == "CONTRADICTING" and e["score"] == -35.0 for e in eval_result.evidence_items)


def test_high_source_trust_does_not_blind_invalid_geography():
    """
    Ensures that high source trust (e.g. 98%) does NOT blindly override
    an invalid coordinate outside India (Defense-in-depth).
    """
    now = datetime.utcnow()

    eval_result = evaluate_event_evidence(
        text="Severe cyclone advisory for coastal region.",
        claimed_category="cyclone",
        severity="CRITICAL",
        latitude=48.8566,  # Paris coordinates
        longitude=2.3522,
        event_time=now,
        capture_time=now,
        upload_time=now,
        source_type="OFFICIAL_GOVERNMENT_ALERT",
        source_reliability=98.0
    )

    # Anomaly penalties for outside India coordinate must be triggered
    assert eval_result.anomaly_score >= 40.0
    assert any(e["evidence_type"] == "GEO_CONSISTENCY" and e["direction"] == "CONTRADICTING" for e in eval_result.evidence_items)


def test_citizen_contradiction_with_telemetry():
    """
    Validates that a citizen report claiming massive flooding is CONTRADICTED
    when nearby synoptic telemetry indicates 0.0 mm rainfall.
    """
    now = datetime.utcnow()

    eval_result = evaluate_event_evidence(
        text="Extreme massive flooding submerged roads and cars everywhere!",
        claimed_category="flooding",
        severity="CRITICAL",
        latitude=28.6139,
        longitude=77.2090,
        event_time=now - timedelta(minutes=5),
        capture_time=now - timedelta(minutes=5),
        upload_time=now,
        source_type="CITIZEN",
        source_reliability=72.0,
        nearby_telemetry={
            "temperature_c": 35.0,
            "rainfall_mm": 0.0,
            "precipitation_mm": 0.0,
            "pressure_hpa": 1012.0,
            "wind_speed_kmh": 5.0
        }
    )

    assert eval_result.is_contradictory is True
    assert eval_result.verification_status == "CONTRADICTED"
    assert any(e["evidence_type"] == "TELEMETRY" and e["direction"] == "CONTRADICTING" for e in eval_result.evidence_items)
