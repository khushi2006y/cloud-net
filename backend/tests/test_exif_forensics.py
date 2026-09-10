import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta
from app.main import app


@pytest.mark.asyncio
async def test_exif_valid_indian_hardware_geotag():
    """
    Test 2A: Citizen report with authentic Indian camera hardware EXIF metadata.
    Must pass without EXIF location deduction.
    """
    import time
    # Dynamic unique coordinate within Central India to prevent deduplication collision with previous test runs
    unique_lat = round(21.50 + ((time.time() * 1000) % 500) * 0.01, 4)
    unique_lng = round(78.50 + ((time.time() * 1000) % 500) * 0.01, 4)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "title": "Thunderstorm and gusty winds near Nagpur Ring Road",
            "description": f"Heavy overcast skies with sudden high velocity wind squalls at timestamp {time.time()}.",
            "category": "thunderstorm",
            "severity": "HIGH",
            "latitude": unique_lat,
            "longitude": unique_lng,
            "city": "Nagpur",
            "state": "Maharashtra",
            "media_url": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0",
            "source_author": "NagpurCitizen_Observer",
            "media_metadata": {
                "camera_model": "Apple iPhone 15 Pro (Hardware Geotagged)",
                "gps_latitude": unique_lat,
                "gps_longitude": unique_lng,
                "capture_timestamp": datetime.utcnow().isoformat()
            }
        }
        res = await ac.post("/api/reports", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["display_policy"] in ["SHOW_PROVISIONAL", "SHOW_CORROBORATED", "SHOW_VERIFIED"]
        # Ensure no EXIF Location Conflict in evidence
        for e in data.get("evidence", []):
            if e.get("evidence_type") == "MEDIA_METADATA":
                assert "Conflict" not in e.get("explanation", "")


@pytest.mark.asyncio
async def test_exif_foreign_spoof_detection_and_quarantine():
    """
    Test 2B (Scenario D): Citizen report claiming disaster in Pune but
    embedded camera hardware EXIF places capture in London, UK (51.5074, -0.1278).
    Must penalize by -45 pts, record MEDIA_METADATA contradiction, and enforce quarantine display policy.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "title": "Severe tropical gale hitting Pune expressway",
            "description": "Massive squall tearing through streets with intense wind blowing debris everywhere.",
            "category": "strong_wind",
            "severity": "CRITICAL",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "city": "Pune",
            "state": "Maharashtra",
            "media_url": "https://images.unsplash.com/photo-1527482797697-8795b05a13fe",
            "source_author": "Disinfo_Actor_Spoofed",
            "media_metadata": {
                "camera_model": "Sony Alpha A7 (Foreign Captured)",
                "gps_latitude": 51.5074,  # London, UK
                "gps_longitude": -0.1278,
                "capture_timestamp": datetime.utcnow().isoformat()
            }
        }
        res = await ac.post("/api/reports", json=payload)
        assert res.status_code == 201
        data = res.json()

        # Authoritative display policy must quarantine out-of-bounds media
        assert data["display_policy"] in ["SHOW_CONTRADICTED", "HIDE_UNVERIFIED"]
        assert data["verification"]["status"] in ["CONTRADICTED", "UNVERIFIED", "FLAGGED"]

        # Check evidence log contains explicit EXIF Location Conflict
        evidence = data.get("evidence", [])
        exif_evidence = [e for e in evidence if e.get("evidence_type") == "MEDIA_METADATA"]
        assert len(exif_evidence) > 0
        assert "Exif Location Conflict" in exif_evidence[0]["explanation"]
        assert exif_evidence[0]["direction"] == "CONTRADICTING"


@pytest.mark.asyncio
async def test_exif_stale_media_timestamp_penalty():
    """
    Test 2C: Citizen report claiming active incident but camera EXIF timestamp
    is older than 72 hours (4 days old). Must trigger Stale Media Conflict penalty.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        stale_time = (datetime.utcnow() - timedelta(days=4)).isoformat()
        payload = {
            "title": "Waterlogging on Bengaluru Ring Road",
            "description": "Vehicles stranded as underpass fills with runoff rainwater from overnight storm.",
            "category": "rainfall",
            "severity": "MEDIUM",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "city": "Bengaluru",
            "state": "Karnataka",
            "media_url": "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17",
            "source_author": "RecycledNews_Uploader",
            "media_metadata": {
                "camera_model": "Canon EOS R5",
                "gps_latitude": 12.9716,
                "gps_longitude": 77.5946,
                "capture_timestamp": stale_time
            }
        }
        res = await ac.post("/api/reports", json=payload)
        assert res.status_code == 201
        data = res.json()

        evidence = data.get("evidence", [])
        stale_evidence = [e for e in evidence if "Stale Media Conflict" in e.get("explanation", "")]
        assert len(stale_evidence) > 0
        assert stale_evidence[0]["direction"] == "CONTRADICTING"
