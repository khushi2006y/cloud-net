import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, init_database_and_seed


@pytest.mark.asyncio
async def test_api_root_and_health():
    await init_database_and_seed()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/")
        assert res.status_code == 200
        assert res.json()["status"] == "OPERATIONAL"

        health = await ac.get("/api/system/health")
        assert health.status_code == 200
        assert health.json()["database"] == "CONNECTED"


@pytest.mark.asyncio
async def test_api_events_and_analytics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        events = await ac.get("/api/events")
        assert events.status_code == 200
        assert isinstance(events.json(), list)

        analytics = await ac.get("/api/analytics")
        assert analytics.status_code == 200
        data = analytics.json()
        assert "total_events" in data
        assert data["total_events"] > 0


@pytest.mark.asyncio
async def test_admin_auth_and_queue():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login with seed admin credentials
        login_res = await ac.post(
            "/api/auth/login",
            data={"username": "admin", "password": "CloudNet@Admin2026"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        assert token is not None

        # Verify unauthenticated request to verification queue is blocked (CERT-In / OWASP compliance)
        unauth_queue = await ac.get("/api/admin/verification-queue")
        assert unauth_queue.status_code == 401

        # Fetch verification queue with valid Bearer token
        queue = await ac.get(
            "/api/admin/verification-queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert queue.status_code == 200


@pytest.mark.asyncio
async def test_adversarial_scenarios_a_through_e():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Scenario A: Valid rainfall
        sc_a = await ac.post("/api/demo/scenario/A")
        assert sc_a.status_code == 200
        assert sc_a.json()["event"]["verification"]["status"] in ["VERIFIED", "CORROBORATED"]

        # Scenario B: 50 Duplicate flood posts
        sc_b = await ac.post("/api/demo/scenario/B")
        assert sc_b.status_code == 200
        assert sc_b.json()["auto_merged_count"] > 0

        # Scenario C: Fake coordinates outside India
        sc_c = await ac.post("/api/demo/scenario/C")
        assert sc_c.status_code == 200
        assert sc_c.json()["event"]["verification"]["status"] == "FLAGGED"

        # Scenario D: 10-day-old photo with foreign GPS
        sc_d = await ac.post("/api/demo/scenario/D")
        assert sc_d.status_code == 200
        assert sc_d.json()["event"]["verification"]["status"] in ["STALE", "FLAGGED", "CONTRADICTED"]

        # Scenario E: Conflicting zero-precipitation telemetry
        sc_e = await ac.post("/api/demo/scenario/E")
        assert sc_e.status_code == 200
        assert sc_e.json()["event"]["verification"]["status"] in ["FLAGGED", "PROVISIONAL", "CONTRADICTED"]

        # Scenario F: Regional Hinglish Dialect (Aandhi toofan, bijli, barish)
        sc_f = await ac.post("/api/demo/scenario/F")
        assert sc_f.status_code == 200
        assert sc_f.json()["event"]["category"] in ["thunderstorm", "rainfall"]

        # Scenario G: Multi-Agency Corroboration
        sc_g = await ac.post("/api/demo/scenario/G")
        assert sc_g.status_code == 200
        assert sc_g.json()["event"]["category"] in ["rainfall", "heavy_rainfall"]

        # Scenario H: High-Throughput Burst
        sc_h = await ac.post("/api/demo/scenario/H?count=50")
        assert sc_h.status_code == 200
        assert sc_h.json()["actual_processed"] > 0


@pytest.mark.asyncio
async def test_display_policy_contract():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/events?limit=10")
        assert res.status_code == 200
        events = res.json()
        assert isinstance(events, list)
        valid_policies = {
            "SHOW_VERIFIED",
            "SHOW_CORROBORATED",
            "SHOW_PROVISIONAL",
            "HIDE_UNVERIFIED",
            "SHOW_CONTRADICTED",
            "ATTACH_DUPLICATE",
            "SHOW_STALE"
        }
        for ev in events:
            assert "display_policy" in ev, "Every event must include authoritative display_policy"
            assert ev["display_policy"] in valid_policies, f"Invalid display_policy: {ev['display_policy']}"
            assert "event_id" in ev
            assert "confidence" in ev
            assert "status" in ev
            assert "supporting_evidence" in ev
            assert "contradicting_evidence" in ev
            assert "freshness" in ev
            assert ev["freshness"] in ["CURRENT", "STALE"]
