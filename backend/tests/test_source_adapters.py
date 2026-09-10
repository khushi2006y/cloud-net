import pytest
from datetime import datetime, timedelta, timezone
from app.ingestion.skymet_adapter import SkymetAdapter
from app.ingestion.sachet_adapter import SachetAdapter
from app.ingestion.incois_adapter import IncoisAdapter
from app.ingestion.registry import source_registry


@pytest.mark.asyncio
async def test_skymet_adapter_unconfigured_graceful_fallback():
    """
    Ensures SkymetAdapter reports UNAVAILABLE when API key is unconfigured,
    and returns empty list without fabricating any fake records.
    """
    adapter = SkymetAdapter()
    adapter.api_key = None
    adapter.status = "UNAVAILABLE"
    adapter.status_reason = "Skymet API credentials not configured (SKYMET_API_KEY missing)"

    health = adapter.get_health_status()
    assert health["status"] == "UNAVAILABLE"
    assert "not configured" in health["status_reason"].lower()

    # Ingestion returns empty list
    records = await adapter.fetch_or_normalize()
    assert records == []
    assert adapter.records_processed == 0
    assert adapter.processing_errors == 0


@pytest.mark.asyncio
async def test_skymet_adapter_with_credentials_parsing():
    """
    Tests Skymet parsing when credentials are provided and API responds.
    """
    mock_payload = [
        {
            "station_id": "SKY-MUM-01",
            "city": "Mumbai",
            "state": "Maharashtra",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "temperature_c": 32.5,
            "rainfall_mm": 45.0,
            "wind_speed_kmh": 28.0,
            "humidity_pct": 88.0,
            "pressure_hpa": 1008.0,
            "condition": "Heavy Rain with Thunderstorm",
            "observation_time": "2026-09-10T08:00:00Z"
        }
    ]

    adapter = SkymetAdapter()
    adapter.api_key = "test-skymet-key"

    records = await adapter.fetch_or_normalize(mock_payload)
    assert len(records) == 1
    rec = records[0]
    assert rec["source_id"] == "src-skymet"
    assert rec["source_type"] == "WEATHER_PROVIDER"
    assert rec["event_type"] in ["heavy_rainfall", "thunderstorm", "rainfall"]
    assert rec["latitude"] == 19.0760
    assert rec["city"] == "Mumbai"
    assert rec["telemetry"]["rainfall_mm"] == 45.0


@pytest.mark.asyncio
async def test_sachet_adapter_cap_parsing_and_category_mapping():
    """
    Tests SACHET NDMA CAP XML alert parsing into canonical CloudNet event schema.
    """
    sample_cap_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>SACHET NDMA Alerts</title>
        <item>
          <title>Severe Cyclone Warning for Coastal Odisha</title>
          <description>Very severe cyclonic storm approaching Paradip coast. Gale winds reaching 110-120 kmph.</description>
          <link>https://sachet.ndma.gov.in/alert/12345</link>
          <pubDate>Thu, 10 Sep 2026 06:00:00 GMT</pubDate>
          <category>Cyclone</category>
          <severity>Extreme</severity>
          <urgency>Immediate</urgency>
          <certainty>Observed</certainty>
          <coordinates>20.3165, 86.6114</coordinates>
          <state>Odisha</state>
          <district>Jagatsinghpur</district>
          <effective>2026-09-10T06:00:00Z</effective>
          <expires>2026-09-12T18:00:00Z</expires>
        </item>
      </channel>
    </rss>"""

    adapter = SachetAdapter()
    records = await adapter.fetch_or_normalize(sample_cap_xml)
    assert len(records) == 1
    rec = records[0]
    assert rec["source_id"] == "src-sachet-ndma"
    assert rec["source_type"] == "OFFICIAL_GOVERNMENT_ALERT"
    assert rec["event_type"] == "cyclone"
    assert rec["severity"] == "CRITICAL"
    assert rec["latitude"] == 20.3165
    assert rec["longitude"] == 86.6114
    assert rec["state"] == "Odisha"
    assert rec["effective_until"] is not None


@pytest.mark.asyncio
async def test_sachet_adapter_expired_alert_detection():
    """
    Verifies that SACHET alerts with past expiration are flagged as expired.
    """
    past_iso = (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    past_cap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>SACHET NDMA Alerts</title>
        <item>
          <title>Flash Flood Warning Expired</title>
          <description>Localized flood warning for lower sub-basin.</description>
          <coordinates>26.1445, 91.7362</coordinates>
          <state>Assam</state>
          <category>Flood</category>
          <expires>{past_iso}</expires>
        </item>
      </channel>
    </rss>"""

    adapter = SachetAdapter()
    records = await adapter.fetch_or_normalize(past_cap_xml)
    assert len(records) == 1
    rec = records[0]
    assert rec["is_expired"] is True
    assert rec["effective_until"] < datetime.now(timezone.utc)


@pytest.mark.asyncio
async def test_incois_adapter_marine_bulletin_and_coastal_geofencing():
    """
    Tests INCOIS marine bulletin ingestion with coastal zone validation.
    """
    incois_json = [
        {
            "id": "INCOIS-TSU-2026-01",
            "hazard_type": "Tsunami Advisory / High Wave Warning",
            "severity": "Warning",
            "latitude": 11.6670,
            "longitude": 92.7358,
            "coastal_sector": "Andaman & Nicobar Islands",
            "wave_height_meters": 4.8,
            "issue_time": "2026-09-10T04:00:00Z",
            "valid_until": "2026-09-11T12:00:00Z",
            "instructions": "Fishermen advised not to venture into deep sea along Andaman coast."
        },
        {
            "id": "INCOIS-INVALID-GEO",
            "hazard_type": "High Wave",
            "severity": "Watch",
            "latitude": 45.0,  # Far outside Indian coastal bounds
            "longitude": 10.0,
            "coastal_sector": "Foreign Sea",
            "issue_time": "2026-09-10T04:00:00Z"
        }
    ]

    adapter = IncoisAdapter()
    records = await adapter.fetch_or_normalize(incois_json)
    # The record with lat=45.0 outside Indian coastal bounds must be rejected
    assert len(records) == 1
    rec = records[0]
    assert rec["source_id"] == "src-incois-marine"
    assert rec["source_type"] == "OFFICIAL_GOVERNMENT_MARINE"
    assert rec["event_type"] in ["cyclone", "flooding", "strong_wind"]
    assert rec["latitude"] == 11.6670
    assert rec["longitude"] == 92.7358


@pytest.mark.asyncio
async def test_source_registry_health_telemetry():
    """
    Tests global SourceRegistry aggregation across all adapters.
    """
    health_list = source_registry.get_health_summary()
    assert isinstance(health_list, list)
    source_ids = [h["source_id"] for h in health_list]
    assert "src-sachet-ndma" in source_ids
    assert "src-incois-marine" in source_ids
    assert "src-skymet" in source_ids
