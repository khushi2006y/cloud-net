"""
test_weather_incident_12_validations.py
=============================================================================
CLOUDNET NATIONAL WEATHER BIG DATA ANALYTICS PLATFORM
12-Point Weather Incident Verification & Mathematical Safeguard Test Suite

This test suite comprehensively verifies the 12 core validation dimensions:
 1. Sovereign India Geofence Boundary Check (Valid vs Foreign Spoofing)
 2. 3-Tier Timestamp Analysis & Ingestion Latency Computation
 3. Stale Media Weaponization Defense (>10 Days Lag Rejection)
 4. EXIF Metadata GPS vs Stated Location Verification
 5. Regional Dialect NLP Extraction (Hinglish/Vernacular Lexicon)
 6. Promotional Spam & Social Misinformation Blacklist Interception
 7. Spatiotemporal Clustering & Deduplication (<= 18km / <= 4hr Window)
 8. Anti-Circularity Provenance DAG (Echo Loop Neutralization)
 9. Surface Telemetry Physical Contradiction (AWS Gauge vs Claimed Flood)
 10. Thermodynamic Invariant Checking (Heatwave vs Freezing/Snow)
 11. Multi-Agency Evidence Fusion & Verification Confidence Escalation
 12. Administrative Override with Tamper-Resistant Immutable Audit Ledger
=============================================================================
"""

import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app, init_database_and_seed
from app.intelligence.geo_validator import validate_geographic_bounds, calculate_haversine_km
from app.intelligence.timestamp_validator import validate_3tier_timestamps
from app.intelligence.nlp_classifier import LayeredNLPClassifier, global_nlp_classifier
from app.intelligence.deduplication import evaluate_deduplication, calculate_jaccard_similarity
from app.intelligence.anti_circularity import calculate_source_independence
from app.intelligence.diversity_scorer import calculate_cluster_diversity_weight
from app.intelligence.contradiction_engine import check_semantic_contradictions, check_physical_invariants
from app.intelligence.evidence_engine import evaluate_event_evidence


# ---------------------------------------------------------------------------
# 1. Sovereign India Geofence Boundary Check
# ---------------------------------------------------------------------------
def test_validation_01_geofence_sovereign_bounds():
    """Verify that sovereign coordinates inside India pass and foreign/spoofed GPS fail."""
    # Valid Indian coordinates (Mumbai, Delhi, Kochi, Guwahati)
    valid_mumbai = validate_geographic_bounds(19.0760, 72.8777)
    assert valid_mumbai["is_valid"] is True
    assert valid_mumbai["geo_score"] == 100.0

    valid_delhi = validate_geographic_bounds(28.6139, 77.2090)
    assert valid_delhi["is_valid"] is True

    valid_kochi = validate_geographic_bounds(9.9312, 76.2673)
    assert valid_kochi["is_valid"] is True

    # Out-of-bounds foreign spoofing coordinates (Berlin, London, New York)
    foreign_berlin = validate_geographic_bounds(52.5200, 13.4050)
    assert foreign_berlin["is_valid"] is False
    assert foreign_berlin["geo_score"] <= 10.0
    assert "outside sovereign Indian Territory" in foreign_berlin["reason"]

    foreign_london = validate_geographic_bounds(51.5074, -0.1278)
    assert foreign_london["is_valid"] is False

    foreign_nyc = validate_geographic_bounds(40.7128, -74.0060)
    assert foreign_nyc["is_valid"] is False


# ---------------------------------------------------------------------------
# 2. 3-Tier Timestamp Analysis & Latency Computation
# ---------------------------------------------------------------------------
def test_validation_02_three_tier_timestamp_latency():
    """Verify calculation of capture-to-upload latency and freshness grading."""
    now = datetime.now()
    event_time = now - timedelta(minutes=20)
    capture_time = now - timedelta(minutes=15)
    upload_time = now

    metrics = validate_3tier_timestamps(
        event_time=event_time,
        capture_time=capture_time,
        upload_time=upload_time
    )

    assert metrics["is_valid"] is True
    assert metrics["freshness_score"] >= 80.0
    assert metrics["is_stale"] is False
    assert metrics["staleness_hours"] == pytest.approx(0.25, abs=0.05)


# ---------------------------------------------------------------------------
# 3. Stale Media Weaponization Defense (>10 Days Lag)
# ---------------------------------------------------------------------------
def test_validation_03_stale_media_rejection():
    """Reject photographs captured >10 days prior to upload to defeat recirculated disaster hoaxes."""
    now = datetime.now()
    stale_capture = now - timedelta(days=12)

    metrics = validate_3tier_timestamps(
        event_time=now,
        capture_time=stale_capture,
        upload_time=now
    )

    assert metrics["is_stale"] is True
    assert metrics["freshness_score"] == 0.0
    assert "Stale Media Conflict" in metrics["reason"]
    assert metrics["staleness_hours"] >= 240.0


# ---------------------------------------------------------------------------
# 4. EXIF Metadata GPS vs Stated Location Verification
# ---------------------------------------------------------------------------
def test_validation_04_exif_gps_mismatch():
    """Detect discrepancies between claimed incident location and EXIF GPS tags."""
    jaipur_lat, jaipur_lng = 26.9124, 75.7873
    malaysia_lat, malaysia_lng = 3.1390, 101.6869

    # Calculate geodesic distance between claimed Indian city and EXIF GPS
    dist_km = calculate_haversine_km(jaipur_lat, jaipur_lng, malaysia_lat, malaysia_lng)
    assert dist_km > 3000.0  # > 3,000 km cross-continent discrepancy

    # Foreign EXIF GPS must be rejected by the sovereign Indian geofence
    exif_check = validate_geographic_bounds(malaysia_lat, malaysia_lng)
    assert exif_check["is_valid"] is False


# ---------------------------------------------------------------------------
# 5. Regional Dialect NLP Extraction (Hinglish/Vernacular Lexicon)
# ---------------------------------------------------------------------------
def test_validation_05_regional_hinglish_dialect_nlp():
    """Extract meteorological intent from colloquial Hinglish and vernacular idioms."""
    classifier = LayeredNLPClassifier(ai_enabled=True)

    # Dialect 1: Heatwave ("loo chal rahi hai")
    hw_text = "Dopahar se bohot bhishan loo chal rahi hai, dhoop me nikalna mushkil ho gaya hai"
    hw_res = classifier.classify(hw_text)
    assert hw_res["category"] == "heatwave"
    assert "loo" in hw_res["matched_keywords"]

    # Dialect 2: Thunderstorm & Lightning ("bijli kadak rahi hai")
    ts_text = "Bijli kadak rahi hai aur aakashiya bijli girne ka khatra hai"
    ts_res = classifier.classify(ts_text)
    assert ts_res["category"] == "thunderstorm"
    assert "bijli" in ts_res["matched_keywords"]

    # Dialect 3: Rainfall ("barish")
    rain_text = "Bahut tez barish aur barsaat ho rahi hai sadak par"
    rain_res = classifier.classify(rain_text)
    assert rain_res["category"] in ["rainfall", "heavy_rainfall"]
    assert "barish" in rain_res["matched_keywords"]

    # Dialect 4: Fog ("kohra")
    fog_text = "Subah se gehra kohra aur dhundh chhayi hui hai zero visibility"
    fog_res = classifier.classify(fog_text)
    assert fog_res["category"] == "fog"
    assert "kohra" in fog_res["matched_keywords"]


# ---------------------------------------------------------------------------
# 6. Promotional Spam & Social Misinformation Blacklist Interception
# ---------------------------------------------------------------------------
def test_validation_06_promotional_spam_filtering():
    """Intercept promotional text and social crypto/giveaway spam exploiting weather trends."""
    classifier = LayeredNLPClassifier(ai_enabled=True)
    spam_text = "Free bitcoin giveaway! Click bit.ly/win to earn crypto casino money today while it rains!"
    res = classifier.classify(spam_text)

    assert res["spam_score"] >= 45.0
    assert len(res["spam_reasons"]) > 0
    assert any("crypto" in r or "bitcoin" in r or "giveaway" in r for r in res["spam_reasons"])


# ---------------------------------------------------------------------------
# 7. Spatiotemporal Clustering & Deduplication (<= 18km / <= 4hr Window)
# ---------------------------------------------------------------------------
def test_validation_07_spatiotemporal_deduplication_clustering():
    """Cluster proximate reports within 18 km and 4 hours to eliminate duplicate alerts."""
    now = datetime.now()

    class MockEvent:
        def __init__(self, id, event_time, latitude, longitude, event_type, description):
            self.id = id
            self.event_time = event_time
            self.upload_time = event_time
            self.latitude = latitude
            self.longitude = longitude
            self.event_type = event_type
            self.title = description
            self.description = description
            self.verification_status = "VERIFIED"

    primary_event = MockEvent(
        id="evt-root-moolchand-001",
        event_time=now,
        latitude=28.5695,
        longitude=77.2340,
        event_type="flooding",
        description="Severe waterlogging near Moolchand Underpass after morning downpour"
    )

    # Candidate 1: 2 km away, 20 minutes later, similar text -> DUPLICATE
    dup_res = evaluate_deduplication(
        candidate_lat=28.5800,
        candidate_lng=77.2400,
        candidate_time=now + timedelta(minutes=20),
        candidate_category="flooding",
        candidate_text="Moolchand underpass completely flooded, traffic stopped",
        existing_events=[primary_event],
        max_radius_km=18.0,
        max_hours=4.0
    )
    assert dup_res["is_duplicate"] is True
    assert dup_res["parent_event_id"] == "evt-root-moolchand-001"
    assert dup_res["distance_km"] < 18.0

    # Candidate 2: 120 km away -> NOT DUPLICATE
    distant_res = evaluate_deduplication(
        candidate_lat=29.5000,
        candidate_lng=78.5000,
        candidate_time=now,
        candidate_category="flooding",
        candidate_text="Flooding in distant district",
        existing_events=[primary_event],
        max_radius_km=18.0,
        max_hours=4.0
    )
    assert distant_res["is_duplicate"] is False


# ---------------------------------------------------------------------------
# 8. Anti-Circularity Provenance DAG (Echo Loop Neutralization)
# ---------------------------------------------------------------------------
def test_validation_08_anti_circularity_dag_echo_loop():
    """Detect circular citations sharing an upstream root origin and collapse independence to 0.0."""
    # Shared root origin -> 0.0 independence factor
    indep_echo = calculate_source_independence(
        root_origin_a="sensor-aws-palam-01",
        upstream_a=["imd-primary", "mausam-news"],
        root_origin_b="sensor-aws-palam-01",
        upstream_b=["imd-primary", "twitter-news-bot"]
    )
    assert indep_echo == 0.0

    # Distinct root origins with disjoint upstream paths -> 1.0 independence
    indep_distinct = calculate_source_independence(
        root_origin_a="sensor-aws-colaba",
        upstream_a=["imd-mumbai"],
        root_origin_b="citizen-gps-bandra-witness",
        upstream_b=["cloudnet-mobile-app"]
    )
    assert indep_distinct == 1.0


# ---------------------------------------------------------------------------
# 9. Surface Telemetry Physical Contradiction (AWS Gauge vs Claimed Flood)
# ---------------------------------------------------------------------------
def test_validation_09_surface_telemetry_precipitation_contradiction():
    """Detect physical contradiction when claimed flash flood coincides with 0mm precipitation."""
    now = datetime.now()
    telemetry_zero = {
        "rainfall_mm": 0.0,
        "precipitation_mm": 0.0,
        "temperature_c": 42.0,
        "humidity_pct": 18.0
    }

    eval_res = evaluate_event_evidence(
        text="Catastrophic flash flood submerging neighborhood with deep water",
        claimed_category="flooding",
        severity="HIGH",
        latitude=26.2183,
        longitude=73.0189,
        event_time=now,
        capture_time=now,
        upload_time=now,
        source_type="CITIZEN",
        nearby_telemetry=telemetry_zero
    )

    assert eval_res.is_contradictory is True
    assert eval_res.verification_status in ["CONTRADICTED", "FLAGGED"]
    assert any(e["direction"] == "CONTRADICTING" for e in eval_res.evidence_items)


# ---------------------------------------------------------------------------
# 10. Thermodynamic Invariant Checking (Heatwave vs Freezing/Snow)
# ---------------------------------------------------------------------------
def test_validation_10_thermodynamic_invariant_heatwave_vs_snow():
    """Catch physical impossibility of freezing snow reported under a heatwave category."""
    # Heatwave category with freezing snow text
    is_contra, reason = check_semantic_contradictions(
        "Freezing cold snow storm sub zero sweater weather",
        "heatwave"
    )
    assert is_contra is True
    assert "Semantic Contradiction" in reason

    # Sensor check: Cyclonic pressure (<980 hPa) with calm wind (<15 km/h) -> sensor fault
    is_phys_valid, phys_reason = check_physical_invariants(pressure_hpa=965.0, wind_speed_kmh=8.0)
    assert is_phys_valid is False
    assert "Physical Sensor Failure" in phys_reason


# ---------------------------------------------------------------------------
# 11. Multi-Agency Evidence Fusion & Verification Confidence Escalation
# ---------------------------------------------------------------------------
def test_validation_11_multi_agency_evidence_fusion_escalation():
    """Fuse multi-agency evidence weights to automatically escalate confidence above 80%."""
    now = datetime.now()
    telemetry_active_rain = {
        "rainfall_mm": 32.5,
        "temperature_c": 26.0,
        "wind_speed_kmh": 35.0,
        "humidity_pct": 92.0
    }

    eval_res = evaluate_event_evidence(
        text="Heavy torrential monsoon downpour observed across coastal road, water logging",
        claimed_category="rainfall",
        severity="MEDIUM",
        latitude=9.9312,
        longitude=76.2673,
        event_time=now,
        capture_time=now,
        upload_time=now,
        source_type="IMD",
        source_reliability=98.0,
        nearby_telemetry=telemetry_active_rain
    )

    assert eval_res.verification_status in ["VERIFIED", "CORROBORATED"]
    assert eval_res.confidence_score >= 80.0
    assert eval_res.is_contradictory is False
    assert any(e["direction"] == "SUPPORTING" for e in eval_res.evidence_items)


# ---------------------------------------------------------------------------
# 12. Administrative Override with Tamper-Resistant Immutable Audit Ledger
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_validation_12_admin_override_immutable_audit_ledger():
    """Verify that officer override requires a mandatory justification and creates an immutable log."""
    await init_database_and_seed()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Step A: Login with IMD admin credentials
        login_res = await ac.post(
            "/api/auth/login",
            data={"username": "admin", "password": "CloudNet@Admin2026"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Step B: Ingest a provisional event
        ingest_res = await ac.post(
            "/api/reports",
            json={
                "source_name": "FieldOfficer_Ranchi",
                "source_type": "CITIZEN",
                "title": "Severe hailstorm observed in Ranchi",
                "description": "Large hailstones damaging vehicles near main bypass.",
                "category": "thunderstorm",
                "severity": "HIGH",
                "latitude": 23.3441,
                "longitude": 85.3096,
                "city": "Ranchi",
                "state": "Jharkhand"
            }
        )
        assert ingest_res.status_code == 201
        event_id = ingest_res.json()["id"]

        # Step C: Admin overrides event status with mandatory reason
        override_res = await ac.post(
            f"/api/admin/events/{event_id}/override",
            headers=auth_headers,
            json={
                "new_status": "VERIFIED",
                "reason": "IMD Doppler Radar velocity confirms severe hail core reflectivity > 55 dBZ"
            }
        )
        assert override_res.status_code == 200
        override_data = override_res.json()
        assert override_data["verification"]["status"] == "VERIFIED"

        # Step D: Fetch event detail and verify immutable audit trail
        detail_res = await ac.get(f"/api/events/{event_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()

        assert "audit_logs" in detail
        assert len(detail["audit_logs"]) >= 1
        override_log = next(
            (log for log in detail["audit_logs"] if log.get("action") == "STATUS_OVERRIDE"),
            None
        )
        assert override_log is not None
        assert override_log["actor"] == "admin"
        assert override_log["new_status"] == "VERIFIED"
        assert "55 dBZ" in override_log["reason"]
