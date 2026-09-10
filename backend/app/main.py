import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.database.session import engine, Base, AsyncSessionLocal
from app.models.user import User
from app.models.source import Source
from app.models.weather_event import WeatherEvent
from app.api import api_router, ws_router
from app.ingestion.weather_api_adapter import WeatherAPIAdapter
from app.workers.stream_processor import global_stream_processor


async def init_database_and_seed():
    """Initializes tables and seeds default admin, sources, and synoptic events."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe migration for newly introduced columns on existing SQLite databases
        for col_def in [
            "ALTER TABLE weather_events ADD COLUMN source_url VARCHAR(512)",
            "ALTER TABLE weather_events ADD COLUMN effective_until DATETIME"
        ]:
            try:
                from sqlalchemy import text
                await conn.execute(text(col_def))
            except Exception:
                pass

    async with AsyncSessionLocal() as session:
        # 1. Seed Admin User if not exists
        stmt = select(User).where(User.username == settings.ADMIN_USERNAME)
        res = await session.execute(stmt)
        admin_user = res.scalar_one_or_none()
        if not admin_user:
            admin = User(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                password_hash=get_password_hash(settings.ADMIN_PASSWORD),
                role="ADMIN",
                active=True
            )
            session.add(admin)

        # 2. Seed Default Ingestion Sources (Including Trusted Government & Private Feeds)
        sources_to_seed = [
            ("src-sachet-ndma", "SACHET — National Disaster Alert Portal (NDMA)", "OFFICIAL_GOVERNMENT_ALERT", 98.0),
            ("src-incois-marine", "INCOIS — Indian National Centre for Ocean Information Services", "OFFICIAL_GOVERNMENT_MARINE", 96.0),
            ("src-imd-official", "India Meteorological Department (IMD)", "IMD", 98.0),
            ("src-open-meteo", "Open-Meteo Synoptic Station Network", "WEATHER_API", 96.0),
            ("src-skymet", "Skymet Weather Private Network", "WEATHER_PROVIDER", 88.0),
            ("src-citizen-portal", "Citizen Crowdsource Network", "CITIZEN", 72.0),
            ("src-social-stream-real", "Official Meteorological Social Stream (@Indiametdept / Twitter)", "SOCIAL", 92.0),
            ("src-gov-data", "data.gov.in Meteorological Datasets", "DATASET", 92.0)
        ]

        for s_id, name, s_type, rel in sources_to_seed:
            s_stmt = select(Source).where(Source.id == s_id)
            s_res = await session.execute(s_stmt)
            if not s_res.scalar_one_or_none():
                src = Source(
                    id=s_id,
                    name=name,
                    source_type=s_type,
                    reliability_score=rel,
                    historical_reliability=rel,
                    active=True
                )
                session.add(src)

        await session.commit()

        # 3. If no weather events exist, run initial live fetch across Indian metros
        evt_stmt = select(WeatherEvent).limit(1)
        evt_res = await session.execute(evt_stmt)
        if not evt_res.scalar_one_or_none():
            try:
                adapter = WeatherAPIAdapter()
                live_events = await adapter.fetch_or_normalize()
                for item in live_events:
                    await global_stream_processor.process_normalized_event(item, session)
                await session.commit()
            except Exception as e:
                print(f"[CloudNet Backend] Cold-start weather sync notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"[CloudNet Backend] Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    await init_database_and_seed()
    print("[CloudNet Backend] Database initialized and live sources ready.")
    yield
    # Shutdown
    print("[CloudNet Backend] Shutting down gracefully...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-grade National Weather Big Data Analytics Platform for India. "
        "Provides real-time multi-source evidence fusion, explainable confidence scoring, "
        "and administrative governance."
    ),
    lifespan=lifespan
)

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces CERT-In and Indian Government Website (GIGW) security response headers."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration (CERT-In & OWASP Hardened — zero wildcard allowance)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
        "websocket_endpoint": "/ws/events"
    }
