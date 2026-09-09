import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.weather_event import WeatherEvent
from app.models.evidence import Evidence
from app.models.verification_log import VerificationLog
from app.models.alert import Alert
from app.models.cluster import EventCluster
from app.models.source import Source
from app.intelligence.deduplication import evaluate_deduplication
from app.intelligence.evidence_engine import evaluate_event_evidence


class StreamProcessor:
    """
    Asynchronous ingestion worker executing the complete intelligence pipeline:
    Validate -> Classify -> Deduplicate -> Corroborate -> Contradiction -> Confidence -> Persist -> Alert -> Broadcast.
    """
    def __init__(self):
        self.processed_count: int = 0
        self.error_count: int = 0
        self.total_latency_ms: float = 0.0

    async def process_normalized_event(
        self,
        event_dict: Dict[str, Any],
        db: AsyncSession,
        ws_broadcast_callback = None
    ) -> WeatherEvent:
        start_time = datetime.utcnow()

        # 1. Fetch recent events for deduplication (last 200 events within 6 hours)
        recent_stmt = select(WeatherEvent).order_by(WeatherEvent.created_at.desc()).limit(200)
        res = await db.execute(recent_stmt)
        recent_events = res.scalars().all()

        # 2. Evaluate spatiotemporal deduplication
        dedup_res = evaluate_deduplication(
            candidate_lat=event_dict["latitude"],
            candidate_lng=event_dict["longitude"],
            candidate_time=event_dict.get("event_time") or datetime.utcnow(),
            candidate_category=event_dict.get("event_type", "rainfall"),
            candidate_text=event_dict.get("description", ""),
            existing_events=recent_events
        )

        # 3. Fetch source reliability score if known
        source_id = event_dict.get("source_id")
        reliability = 70.0
        if source_id:
            src_stmt = select(Source).where(Source.id == source_id)
            src_res = await db.execute(src_stmt)
            src_obj = src_res.scalar_one_or_none()
            if src_obj:
                reliability = src_obj.reliability_score

        # 4. Extract telemetry cross-check payload if present
        nearby_telemetry = event_dict.get("telemetry")

        # 5. Execute Multi-Factor Evidence Fusion Engine
        eval_result = evaluate_event_evidence(
            text=event_dict.get("description", ""),
            claimed_category=event_dict.get("event_type"),
            severity=event_dict.get("severity", "MEDIUM"),
            latitude=event_dict["latitude"],
            longitude=event_dict["longitude"],
            event_time=event_dict.get("event_time"),
            capture_time=event_dict.get("capture_time"),
            upload_time=event_dict.get("upload_time", datetime.utcnow()),
            source_type=event_dict.get("source_type", "CITIZEN"),
            source_reliability=reliability,
            nearby_telemetry=nearby_telemetry,
            duplicate_info=dedup_res,
            media_metadata=event_dict.get("media_metadata"),
            root_origin_id=event_dict.get("root_origin_id"),
            upstream_sources=event_dict.get("upstream_sources")
        )

        # 6. Construct WeatherEvent entity
        new_event = WeatherEvent(
            id=event_dict.get("id") or f"evt-{uuid.uuid4().hex[:12]}",
            source_id=source_id,
            source_record_id=event_dict.get("source_record_id"),
            source_name=event_dict.get("source_name", "Anonymous Reporter"),
            source_type=event_dict.get("source_type", "CITIZEN"),
            title=event_dict.get("title") or f"{eval_result.category.replace('_', ' ').title()} near {event_dict.get('city') or 'India'}",
            description=event_dict.get("description", ""),
            raw_text=event_dict.get("raw_text", ""),
            hashtags=json.dumps(event_dict.get("hashtags", [])),
            event_type=eval_result.category,
            severity=eval_result.severity,
            latitude=event_dict["latitude"],
            longitude=event_dict["longitude"],
            country=event_dict.get("country", "India"),
            state=event_dict.get("state"),
            district=event_dict.get("district"),
            city=event_dict.get("city"),
            event_time=event_dict.get("event_time"),
            capture_time=event_dict.get("capture_time"),
            upload_time=event_dict.get("upload_time", datetime.utcnow()),
            confidence_score=eval_result.confidence_score,
            verification_status=eval_result.verification_status,
            spam_score=eval_result.spam_score,
            anomaly_score=eval_result.anomaly_score,
            freshness_score=eval_result.freshness_score,
            duplicate_of=eval_result.duplicate_of,
            root_origin_id=event_dict.get("root_origin_id"),
            upstream_sources=json.dumps(event_dict.get("upstream_sources", [])),
            media_url=event_dict.get("media_url")
        )

        db.add(new_event)
        await db.flush()

        # 7. Persist individual Evidence items
        for item in eval_result.evidence_items:
            evi = Evidence(
                event_id=new_event.id,
                evidence_type=item["evidence_type"],
                direction=item["direction"],
                score=item["score"],
                explanation=item["explanation"]
            )
            db.add(evi)

        # 8. Append-Only Verification Log (Audit Trail)
        audit_log = VerificationLog(
            event_id=new_event.id,
            actor="SYSTEM",
            action="AUTO_EVALUATED",
            previous_status=None,
            new_status=new_event.verification_status,
            previous_confidence=None,
            new_confidence=new_event.confidence_score,
            reason=f"Evidence Engine fused {len(eval_result.evidence_items)} signals: Confidence {new_event.confidence_score}/100",
            rule_or_model=eval_result.ai_status
        )
        db.add(audit_log)

        # 9. Alert Generation if Critical Severity or High Confidence Disaster
        if new_event.severity == "CRITICAL" or (new_event.confidence_score >= 75.0 and new_event.severity in ["HIGH", "CRITICAL"]):
            alert_msg = f"WEATHER ALERT: {new_event.event_type.replace('_', ' ').upper()} in {new_event.city or new_event.state or 'India'} (Confidence: {new_event.confidence_score:.0f}%, Status: {new_event.verification_status})"
            alert = Alert(
                event_id=new_event.id,
                severity=new_event.severity,
                confidence=new_event.confidence_score,
                status="ACTIVE",
                message=alert_msg
            )
            db.add(alert)

        await db.commit()
        await db.refresh(new_event)

        # Performance metric tracking
        latency = (datetime.utcnow() - start_time).total_seconds() * 1000.0
        self.processed_count += 1
        self.total_latency_ms += latency

        # 10. Real-time WebSocket Broadcast
        if ws_broadcast_callback:
            try:
                await ws_broadcast_callback({
                    "type": "NEW_EVENT",
                    "event": {
                        "id": new_event.id,
                        "category": new_event.event_type,
                        "title": new_event.title,
                        "description": new_event.description,
                        "latitude": new_event.latitude,
                        "longitude": new_event.longitude,
                        "city": new_event.city,
                        "state": new_event.state,
                        "severity": new_event.severity,
                        "confidenceScore": new_event.confidence_score,
                        "verificationStatus": new_event.verification_status,
                        "source": {
                            "id": new_event.source_id or "src-citizen",
                            "name": new_event.source_name,
                            "type": new_event.source_type,
                            "reliability": reliability
                        },
                        "timestamps": {
                            "uploadTime": new_event.upload_time.isoformat()
                        }
                    }
                })
            except Exception:
                pass

        return new_event


# Global processor instance
global_stream_processor = StreamProcessor()
