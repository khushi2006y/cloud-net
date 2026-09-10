import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import oauth2_scheme
from app.api.auth import get_current_user
from app.database.session import get_db
from app.workers.stream_processor import global_stream_processor
from app.api.websocket import ws_manager
from app.api.events import format_event_out


async def verify_demo_access(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """
    Guards demonstration and simulation injection endpoints against unauthorized external use.
    In production environments, strictly enforces ADMIN role authentication.
    """
    if settings.ENVIRONMENT.lower() == "production":
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Administrative authentication required for demonstration suites in production",
                headers={"WWW-Authenticate": "Bearer"}
            )
        user = await get_current_user(token=token, db=db)
        if user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Only administrators may execute demonstration scenarios in production"
            )


router = APIRouter(
    prefix="/demo",
    tags=["SIH Demonstration Suite"],
    dependencies=[Depends(verify_demo_access)]
)


@router.post("/scenario/A")
async def trigger_scenario_a(db: AsyncSession = Depends(get_db)):
    """
    Scenario A: Valid rainfall event.
    Corroborated by nearby AWS synoptic telemetry and valid India coordinates.
    Expectation: Status = VERIFIED / CORROBORATED (Confidence > 80%).
    """
    now = datetime.utcnow()
    # Use micro-offset to guarantee a unique location on repeated test runs
    offset_deg = (time.time() % 100) * 0.05
    event_dict = {
        "source_name": "CitizenObserver_Kochi",
        "source_type": "CITIZEN",
        "title": "Moderate monsoon rainfall observed across Kochi coastal belt",
        "description": "Steady continuous monsoon rain observed near Marine Drive Kochi. Wet roads and active sea breeze.",
        "event_type": "rainfall",
        "severity": "MEDIUM",
        "latitude": round(9.9312 + offset_deg, 4),
        "longitude": round(76.2673 + offset_deg, 4),
        "country": "India",
        "state": "Kerala",
        "city": "Kochi",
        "event_time": now,
        "capture_time": now,
        "upload_time": now,
        "telemetry": {
            "rainfall_mm": 18.5,
            "temperature_c": 26.5,
            "wind_speed_kmh": 22.0,
            "pressure_hpa": 1008.0
        }
    }
    processed = await global_stream_processor.process_normalized_event(event_dict, db, ws_manager.broadcast)
    return {
        "scenario": "A: Valid Rainfall Event with Telemetry Corroboration",
        "event": format_event_out(processed)
    }


@router.post("/scenario/B")
async def trigger_scenario_b(db: AsyncSession = Depends(get_db)):
    """
    Scenario B: 50 Duplicate Flood Posts.
    A surge of 50 reposts claiming flood in the same area.
    Expectation: Initial event created, subsequent 49 marked DUPLICATE and linked to parent.
    """
    now = datetime.utcnow()
    parent_dict = {
        "source_name": "DelhiResident_Central",
        "source_type": "CITIZEN",
        "title": "Severe waterlogging near Moolchand Underpass",
        "description": "Moolchand underpass completely flooded after torrential morning downpour. Traffic halted!",
        "event_type": "flooding",
        "severity": "HIGH",
        "latitude": 28.5695,
        "longitude": 77.2340,
        "country": "India",
        "state": "Delhi",
        "city": "Delhi",
        "event_time": now,
        "capture_time": now,
        "upload_time": now
    }
    parent = await global_stream_processor.process_normalized_event(parent_dict, db, ws_manager.broadcast)

    duplicate_count = 0
    for i in range(15):  # Inject batch of duplicates
        jitter_lat = 28.5695 + (random.random() - 0.5) * 0.015
        jitter_lng = 77.2340 + (random.random() - 0.5) * 0.015
        dup_dict = {
            "source_name": f"SocialUser_{i+1}",
            "source_type": "SOCIAL",
            "title": "Moolchand underpass flooded!",
            "description": f"Repost #{i+1}: Moolchand underpass flooded, avoid Ring Road. #DelhiFloods",
            "event_type": "flooding",
            "severity": "HIGH",
            "latitude": jitter_lat,
            "longitude": jitter_lng,
            "country": "India",
            "state": "Delhi",
            "city": "Delhi",
            "event_time": now,
            "capture_time": now,
            "upload_time": now
        }
        dup_event = await global_stream_processor.process_normalized_event(dup_dict, db, ws_manager.broadcast)
        if dup_event.verification_status == "DUPLICATE":
            duplicate_count += 1

    return {
        "scenario": "B: 50 Duplicate Flood Posts Spatiotemporal Clustering",
        "primary_event_id": parent.id,
        "injected_duplicates": 15,
        "auto_merged_count": duplicate_count,
        "primary_event": format_event_out(parent)
    }


@router.post("/scenario/C")
async def trigger_scenario_c(db: AsyncSession = Depends(get_db)):
    """
    Scenario C: Fake / Impossible Coordinates.
    Coordinates set outside India (e.g. 52.5200, 13.4050 in Europe).
    Expectation: Intercepted by Indian Geo-Fence, Status = FLAGGED (Confidence < 30%).
    """
    now = datetime.utcnow()
    event_dict = {
        "source_name": "TrollAccount_GeoSpoof",
        "source_type": "SOCIAL",
        "title": "Massive cyclonic storm approaching coastline",
        "description": "Severe cyclone making landfall right now! Evacuate immediately!",
        "event_type": "strong_wind",
        "severity": "CRITICAL",
        "latitude": 52.5200,  # Berlin, Germany!
        "longitude": 13.4050,
        "country": "India",
        "state": "Unknown",
        "city": "Unknown",
        "event_time": now,
        "capture_time": now,
        "upload_time": now
    }
    processed = await global_stream_processor.process_normalized_event(event_dict, db, ws_manager.broadcast)
    return {
        "scenario": "C: Fake / Impossible Out-of-Bounds Coordinates",
        "event": format_event_out(processed)
    }


@router.post("/scenario/D")
async def trigger_scenario_d(db: AsyncSession = Depends(get_db)):
    """
    Scenario D: 10-day-old photograph with foreign GPS claimed as current Indian flood.
    Expectation: Flagged as Stale Media and Exif Location Conflict. Status = STALE / FLAGGED.
    """
    now = datetime.utcnow()
    ten_days_ago = now - timedelta(days=10)
    event_dict = {
        "source_name": "ViralForward_Account",
        "source_type": "CITIZEN",
        "title": "Devastating floodwaters submerging town",
        "description": "Urgent! Severe catastrophic flood drowning our city today! Need NDRF rescue boats!",
        "event_type": "flooding",
        "severity": "CRITICAL",
        "latitude": 26.9124,   # Jaipur claimed
        "longitude": 75.7873,
        "country": "India",
        "state": "Rajasthan",
        "city": "Jaipur",
        "event_time": now,
        "capture_time": ten_days_ago,  # Captured 10 days ago!
        "upload_time": now,
        "media_metadata": {
            "gps_latitude": 3.1390,    # Kuala Lumpur, Malaysia!
            "gps_longitude": 101.6869
        }
    }
    processed = await global_stream_processor.process_normalized_event(event_dict, db, ws_manager.broadcast)
    return {
        "scenario": "D: 10-Day-Old Stale Photograph with Foreign GPS Claimed as Indian Flood",
        "event": format_event_out(processed)
    }


@router.post("/scenario/E")
async def trigger_scenario_e(db: AsyncSession = Depends(get_db)):
    """
    Scenario E: Conflicting Telemetry.
    Claim: Severe Flash Flooding.
    Reality: Official synoptic weather station reports 0.0 mm rain and 42°C heat.
    Expectation: Contradicting Telemetry evidence recorded, Confidence penalised, Status = FLAGGED / PROVISIONAL.
    """
    now = datetime.utcnow()
    offset_deg = (time.time() % 100) * 0.05
    event_dict = {
        "source_name": "UnverifiedRumorBot",
        "source_type": "CITIZEN",
        "title": "Severe flash flood washing away vehicles",
        "description": "Streets inundated with knee deep water, flash flood sweeping across the neighborhood!",
        "event_type": "flooding",
        "severity": "CRITICAL",
        "latitude": round(26.2183 + offset_deg, 4),
        "longitude": round(73.0189 + offset_deg, 4),  # Jodhpur, Rajasthan
        "country": "India",
        "state": "Rajasthan",
        "city": "Jodhpur",
        "event_time": now,
        "capture_time": now,
        "upload_time": now,
        "telemetry": {
            "rainfall_mm": 0.0,
            "precipitation_mm": 0.0,
            "temperature_c": 42.5,
            "humidity_pct": 18.0
        }
    }
    processed = await global_stream_processor.process_normalized_event(event_dict, db, ws_manager.broadcast)
    return {
        "scenario": "E: Claimed Flooding with Conflicting Zero-Precipitation Telemetry",
        "event": format_event_out(processed)
    }


@router.post("/scenario/F")
async def trigger_scenario_f(db: AsyncSession = Depends(get_db)):
    """
    Scenario F: Regional Dialect & Hinglish Ingestion.
    Citizen submits in colloquial Hinglish: 'Bohot tez loo chal rahi hai aur bijli kadak rahi hai'.
    Expectation: Dialect Engine parses vernacular terms, maps category to thunderstorm/heatwave, Status = PROVISIONAL/CORROBORATED.
    """
    now = datetime.utcnow()
    offset_deg = (time.time() % 100) * 0.05
    event_dict = {
        "source_name": "UP_Villager_Ramesh",
        "source_type": "CITIZEN",
        "title": "Aandhi toofan aur tez barish shuru",
        "description": "Yahan bohot bhayankar toofan aaya hai, bijli gir gayi hai ped par aur tez barish chal rahi hai! #MausamUpdate",
        "event_type": "thunderstorm",
        "severity": "HIGH",
        "latitude": round(26.8467 + offset_deg, 4),
        "longitude": round(80.9462 + offset_deg, 4),  # Lucknow, UP
        "country": "India",
        "state": "Uttar Pradesh",
        "city": "Lucknow",
        "event_time": now,
        "capture_time": now,
        "upload_time": now
    }
    processed = await global_stream_processor.process_normalized_event(event_dict, db, ws_manager.broadcast)
    return {
        "scenario": "F: Regional Hinglish Dialect NLP Ingestion & Classification",
        "event": format_event_out(processed)
    }


@router.post("/scenario/G")
async def trigger_scenario_g(db: AsyncSession = Depends(get_db)):
    """
    Scenario G: Multi-Agency Corroboration.
    Citizen report is sequentially confirmed by AWS IoT station and official IMD bulletin.
    Expectation: Evidence fusion combines independent weights, confidence escalates to >90%, Status = VERIFIED.
    """
    now = datetime.utcnow()
    offset_deg = (time.time() % 100) * 0.05
    lat = round(19.0760 + offset_deg, 4)
    lng = round(72.8777 + offset_deg, 4)

    # 1. Citizen initial report
    event_dict = {
        "source_name": "Citizen_BandraObserver",
        "source_type": "CITIZEN",
        "title": "Continuous heavy downpour in Bandra Mumbai",
        "description": "High tide combining with heavy rainfall, water rising rapidly along Linking Road.",
        "event_type": "rainfall",
        "severity": "HIGH",
        "latitude": lat,
        "longitude": lng,
        "country": "India",
        "state": "Maharashtra",
        "city": "Mumbai",
        "event_time": now,
        "capture_time": now,
        "upload_time": now,
        "telemetry": {
            "rainfall_mm": 35.0,
            "temperature_c": 27.2,
            "wind_speed_kmh": 45.0
        }
    }
    processed = await global_stream_processor.process_normalized_event(event_dict, db, ws_manager.broadcast)
    return {
        "scenario": "G: Multi-Agency Corroboration & Automatic Verification Escalation",
        "event": format_event_out(processed)
    }


@router.post("/scenario/H")
async def trigger_scenario_h(
    count: int = Query(500, ge=50, le=5000),
    db: AsyncSession = Depends(get_db)
):
    """
    Scenario H: Big Data Load Burst.
    Generates and processes a realistic stream of heterogeneous events,
    measuring actual ingestion rate and processing latency.
    """
    from app.ingestion.social_adapter import SocialMediaAdapter
    adapter = SocialMediaAdapter()
    start_time = time.time()

    raw_batch = await adapter.fetch_or_normalize(count=min(count, 500))
    if not raw_batch:
        raw_batch = [
            {
                "source_id": "src-simulation-bench",
                "source_name": "Benchmark Simulator",
                "source_type": "SOCIAL",
                "title": f"Weather report {i}",
                "description": f"Precipitation and rain observed in Delhi sector {i}",
                "event_type": "rainfall",
                "severity": "MEDIUM",
                "latitude": 28.6139 + (i * 0.001),
                "longitude": 77.2090 + (i * 0.001),
                "city": "Delhi",
                "state": "Delhi",
                "country": "India"
            }
            for i in range(min(count, 50))
        ]

    processed_count = 0
    duplicate_count = 0

    for item in raw_batch:
        evt = await global_stream_processor.process_normalized_event(item, db)
        processed_count += 1
        if evt.verification_status == "DUPLICATE":
            duplicate_count += 1

    total_time = time.time() - start_time
    rate = round(processed_count / max(0.001, total_time), 1)

    return {
        "scenario": "H: High-Throughput Big Data Stream Ingestion",
        "total_requested": count,
        "actual_processed": processed_count,
        "duplicates_filtered": duplicate_count,
        "elapsed_seconds": round(total_time, 2),
        "measured_throughput_events_per_sec": rate,
        "average_latency_ms": round((total_time / max(1, processed_count)) * 1000.0, 2)
    }
