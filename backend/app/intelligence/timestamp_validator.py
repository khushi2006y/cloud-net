from datetime import datetime, timedelta
from typing import Dict, Any, Optional


def parse_iso_or_none(timestamp_str: Optional[str]) -> Optional[datetime]:
    if not timestamp_str:
        return None
    try:
        # Support ISO formats with or without Z
        clean_str = timestamp_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean_str)
    except Exception:
        try:
            return datetime.strptime(timestamp_str[:19], "%Y-%m-%dT%H:%M:%S")
        except Exception:
            return None


def validate_3tier_timestamps(
    event_time: Optional[datetime],
    capture_time: Optional[datetime],
    upload_time: datetime = datetime.utcnow()
) -> Dict[str, Any]:
    """
    Validates the 3-tier timestamp intelligence model:
      - event_time: When the meteorological event occurred
      - capture_time: When evidence was recorded (e.g. EXIF camera timestamp)
      - upload_time: When the report was submitted to CloudNet

    Detects:
      - Future timestamps
      - Stale / delayed evidence (e.g. 10-day-old photos claiming current floods)
      - Temporal inversion (capture after upload)
    """
    now = datetime.utcnow()
    ref_upload = upload_time if upload_time else now

    # Check 1: Future timestamp anomaly
    if event_time and event_time > ref_upload + timedelta(hours=2):
        return {
            "is_valid": False,
            "temporal_score": 10.0,
            "freshness_score": 0.0,
            "reason": f"Future event timestamp detected ({event_time.isoformat()} > {ref_upload.isoformat()})",
            "is_stale": False,
            "staleness_hours": 0.0
        }

    # If capture time is present (from image EXIF or video metadata)
    staleness_hours = 0.0
    if capture_time:
        age_delta = ref_upload - capture_time
        staleness_hours = max(0.0, age_delta.total_seconds() / 3600.0)

        # Scenario D: Evidence captured days before upload (e.g. 10 days old = 240 hours)
        if staleness_hours > 72.0:  # Older than 3 days
            days_old = staleness_hours / 24.0
            return {
                "is_valid": False,
                "temporal_score": 15.0,
                "freshness_score": max(0.0, 100.0 - (staleness_hours * 2)),
                "reason": f"Stale Media Conflict: Evidence was captured {days_old:.1f} days ago but uploaded as an active current incident",
                "is_stale": True,
                "staleness_hours": staleness_hours
            }
        elif staleness_hours > 6.0:
            return {
                "is_valid": True,
                "temporal_score": 60.0,
                "freshness_score": 40.0,
                "reason": f"Delayed Evidence: Captured {staleness_hours:.1f} hours prior to transmission",
                "is_stale": True,
                "staleness_hours": staleness_hours
            }

    # Measure freshness based on event_time or upload_time
    effective_time = event_time if event_time else ref_upload
    age_minutes = max(0.0, (now - effective_time).total_seconds() / 60.0)

    if age_minutes < 15:
        freshness_score = 100.0
        label = "FRESH INTELLIGENCE (< 15 min)"
    elif age_minutes < 60:
        freshness_score = 85.0
        label = "RECENT (15-60 min)"
    elif age_minutes < 360:
        freshness_score = 60.0
        label = "MODERATELY AGED (1-6 hours)"
    elif age_minutes < 1440:
        freshness_score = 30.0
        label = "HISTORICAL (6-24 hours)"
    else:
        freshness_score = 10.0
        label = f"ARCHIVED ({(age_minutes / 1440):.1f} days ago)"

    return {
        "is_valid": True,
        "temporal_score": 95.0 if not staleness_hours else 75.0,
        "freshness_score": freshness_score,
        "reason": f"Temporal consistency verified: {label}",
        "is_stale": staleness_hours > 12.0 or age_minutes > 720,
        "staleness_hours": staleness_hours
    }
