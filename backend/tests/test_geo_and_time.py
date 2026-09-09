from datetime import datetime, timedelta
from app.intelligence.geo_validator import validate_geographic_bounds, calculate_haversine_km
from app.intelligence.timestamp_validator import validate_3tier_timestamps


def test_geo_boundary_validation():
    # Valid coordinates inside India (Delhi)
    valid = validate_geographic_bounds(28.6139, 77.2090)
    assert valid["is_valid"] is True
    assert valid["geo_score"] == 100.0

    # Coordinates outside India (London)
    foreign = validate_geographic_bounds(51.5074, -0.1278)
    assert foreign["is_valid"] is False
    assert foreign["geo_score"] <= 10.0

    # Impossible coordinate (> 90 lat)
    impossible = validate_geographic_bounds(120.0, 77.0)
    assert impossible["is_valid"] is False


def test_haversine_distance():
    # Distance between Delhi (28.6139, 77.2090) and Noida (28.5355, 77.3910) is ~20 km
    dist = calculate_haversine_km(28.6139, 77.2090, 28.5355, 77.3910)
    assert 15.0 < dist < 25.0


def test_3tier_timestamp_freshness_and_staleness():
    now = datetime.utcnow()

    # Fresh current report
    fresh = validate_3tier_timestamps(
        event_time=now - timedelta(minutes=5),
        capture_time=now - timedelta(minutes=6),
        upload_time=now
    )
    assert fresh["is_valid"] is True
    assert fresh["freshness_score"] >= 85.0
    assert fresh["is_stale"] is False

    # Scenario D: 10-day-old captured photo uploaded today
    stale_photo = validate_3tier_timestamps(
        event_time=now,
        capture_time=now - timedelta(days=10),
        upload_time=now
    )
    assert stale_photo["is_stale"] is True
    assert stale_photo["is_valid"] is False
    assert "Stale Media" in stale_photo["reason"]
