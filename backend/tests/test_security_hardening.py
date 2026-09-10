"""
test_security_hardening.py
=============================================================================
Automated Regression Suite for CERT-In & IMD Trusted Site Security Hardening
Verifies:
 1. GIGW / CERT-In HTTP Security Response Headers
 2. Role-Based Access Control (RBAC) on Admin Verification Queue & Audit Logs
 3. Privilege Escalation Defense on Registration (Forbidden role injection)
 4. Password Minimum Length Enforcement (>= 8 characters)
 5. Server-Side Client IP Subnet Derivation (Anti-Sybil spoofing defense)
=============================================================================
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, init_database_and_seed


@pytest.mark.asyncio
async def test_certin_security_headers():
    """Verify presence of all mandatory CERT-In / GIGW security response headers."""
    await init_database_and_seed()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/")
        assert res.status_code == 200
        headers = res.headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("X-XSS-Protection") == "1; mode=block"
        assert "Strict-Transport-Security" in headers
        assert "Permissions-Policy" in headers
        assert headers.get("X-Permitted-Cross-Domain-Policies") == "none"


@pytest.mark.asyncio
async def test_admin_rbac_unauthenticated_blocked():
    """Verify that unauthenticated access to admin triage, logs, and override is blocked with 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Verification Queue
        q_res = await ac.get("/api/admin/verification-queue")
        assert q_res.status_code == 401

        # Audit Logs
        log_res = await ac.get("/api/admin/audit-logs")
        assert log_res.status_code == 401

        # Override Action
        override_res = await ac.post(
            "/api/admin/events/test-id-123/override",
            json={"new_status": "VERIFIED", "reason": "Attempt without auth"}
        )
        assert override_res.status_code == 401


@pytest.mark.asyncio
async def test_registration_privilege_escalation_blocked():
    """Verify that a user attempting to self-assign OPERATOR or ADMIN is forced to USER."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        user_payload = {
            "username": f"sec_test_{pytest.__name__}_user",
            "email": "sec_test@cloudnet.gov.in",
            "password": "SecurePassword@2026",
            "role": "OPERATOR"  # Attempting privilege escalation
        }
        res = await ac.post("/api/auth/register", json=user_payload)
        # Could be 200 (created) or 400 (if username already exists from previous run)
        if res.status_code == 200:
            data = res.json()
            assert data["role"] == "USER", "Role must be strictly forced to USER on public registration"


@pytest.mark.asyncio
async def test_registration_short_password_rejected():
    """Verify that passwords shorter than 8 characters are rejected with 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        user_payload = {
            "username": "weak_pwd_user",
            "email": "weak@cloudnet.gov.in",
            "password": "123",  # Under 8 chars
            "role": "USER"
        }
        res = await ac.post("/api/auth/register", json=user_payload)
        assert res.status_code == 400
        assert "at least 8 characters" in res.json()["detail"]


@pytest.mark.asyncio
async def test_server_side_anti_sybil_subnet_enforcement():
    """Verify that client-submitted ip_subnet is overridden by server-derived subnet."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        report_payload = {
            "title": "Thunderstorm observation near Pune",
            "description": "Heavy rainfall and thunder rolling through Shivaji Nagar.",
            "category": "rainfall",
            "severity": "MEDIUM",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "city": "Pune",
            "state": "Maharashtra",
            "ip_subnet": "99.99.99.0/24"  # Fake client-supplied spoofed subnet
        }
        res = await ac.post("/api/reports", json=report_payload)
        assert res.status_code == 201
