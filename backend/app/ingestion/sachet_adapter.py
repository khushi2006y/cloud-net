import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.ingestion.base import BaseWeatherSourceAdapter
from app.core.config import settings


# CAP XML Namespaces
CAP_NAMESPACES = {
    "cap": "urn:oasis:names:tc:emergency:cap:1.2",
    "atom": "http://www.w3.org/2005/Atom"
}


class SachetAdapter(BaseWeatherSourceAdapter):
    """
    Adapter for SACHET — National Disaster Alert Portal (NDMA).
    Ingests official Common Alerting Protocol (CAP 1.2 XML / RSS) alerts
    issued by national and state disaster management authorities.
    
    Reliability: 98.0% (Official Government Alert).
    Preserves provenance, affected district/polygon, and effective/expiry periods.
    Expired alerts are marked as STALE/EXPIRED.
    """
    def __init__(self):
        super().__init__(
            source_id="src-sachet-ndma",
            source_name="SACHET — National Disaster Alert Portal (NDMA)",
            source_type="OFFICIAL_GOVERNMENT_ALERT",
            reliability=98.0
        )
        self.feed_url = settings.SACHET_FEED_URL

    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        self.last_attempt = datetime.now(timezone.utc)

        # 1. Direct payload input (XML string, dict, or list of dicts)
        if raw_input is not None:
            if isinstance(raw_input, str):
                return self._parse_cap_xml(raw_input)
            elif isinstance(raw_input, list):
                return self._normalize_json_alerts(raw_input)
            elif isinstance(raw_input, dict):
                return self._normalize_json_alerts([raw_input])

        # 2. Live HTTP fetch from SACHET NDMA RSS / CAP feed
        events = []
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                res = await client.get(self.feed_url)
                self.records_received += 1
                if res.status_code == 200:
                    content_type = res.headers.get("content-type", "")
                    if "json" in content_type:
                        events = self._normalize_json_alerts(res.json())
                    else:
                        events = self._parse_cap_xml(res.text)
                    self.status = "ONLINE"
                    self.status_reason = "Operating normally"
                    self.last_successful_ingestion = datetime.now(timezone.utc)
                else:
                    self.status = "DEGRADED"
                    self.status_reason = f"SACHET feed returned HTTP {res.status_code}"
                    self.processing_errors += 1
        except Exception as e:
            self.status = "DEGRADED"
            self.status_reason = f"Feed connection timeout / unreachable: {str(e)}"
            self.processing_errors += 1

        return events

    def _map_disaster_category(self, event_name: str, desc: str) -> str:
        text = f"{event_name} {desc}".lower()
        if any(k in text for k in ["flood", "inundation", "waterlogging", "deluge"]):
            return "flooding"
        if any(k in text for k in ["heavy rain", "downpour", "torrential"]):
            return "heavy_rainfall"
        if any(k in text for k in ["cyclone", "depression", "super cyclonic"]):
            return "cyclone"
        if any(k in text for k in ["thunder", "lightning", "bijli", "squall"]):
            return "thunderstorm"
        if any(k in text for k in ["heat wave", "heatwave", "loo"]):
            return "heatwave"
        if any(k in text for k in ["gale", "strong wind", "gusty wind"]):
            return "strong_wind"
        if any(k in text for k in ["dust storm", "aandhi"]):
            return "dust_storm"
        return "rainfall"

    def _normalize_json_alerts(self, alerts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        now = datetime.now(timezone.utc)

        for a in alerts:
            try:
                alert_id = a.get("identifier") or a.get("id") or f"sachet-{int(now.timestamp())}-{len(normalized)}"
                event_name = a.get("event") or a.get("category") or "Disaster Advisory"
                desc = a.get("description") or a.get("instruction") or a.get("headline") or "Official NDMA warning."
                headline = a.get("headline") or f"NDMA / SACHET Alert: {event_name}"
                state = a.get("state") or a.get("area_desc")
                district = a.get("district")
                city = district or state or "India"

                lat = float(a.get("latitude") or a.get("lat", 20.5937))
                lng = float(a.get("longitude") or a.get("lng", 78.9629))

                # Parse temporal validity
                effective_from = self._parse_dt(a.get("effective")) or self._parse_dt(a.get("sent")) or now
                effective_until = self._parse_dt(a.get("expires")) or self._parse_dt(a.get("expiry"))

                is_expired = False
                if effective_until and effective_until < now:
                    is_expired = True

                category = self._map_disaster_category(event_name, desc)
                raw_sev = (a.get("severity") or "Severe").upper()
                sev = "CRITICAL" if raw_sev in ["EXTREME", "CRITICAL"] else "HIGH" if raw_sev in ["SEVERE", "HIGH"] else "MEDIUM"

                record = self.create_normalized_record(
                    external_record_id=str(alert_id),
                    event_type=category,
                    title=headline,
                    description=desc,
                    latitude=lat,
                    longitude=lng,
                    severity=sev,
                    country="India",
                    state=state,
                    district=district,
                    city=city,
                    event_time=effective_from,
                    observation_time=effective_from,
                    effective_from=effective_from,
                    effective_until=effective_until,
                    source_url=a.get("url") or "https://sachet.ndma.gov.in",
                    hashtags=["#SACHET", "#NDMA", "#DisasterAlert", f"#{category.title()}"],
                    raw_payload=a,
                    metadata={
                        "alert_status": "EXPIRED" if is_expired else "ACTIVE",
                        "urgency": a.get("urgency", "Immediate"),
                        "certainty": a.get("certainty", "Observed"),
                        "source_agency": a.get("sender_name", "NDMA SACHET")
                    }
                )
                record["is_expired"] = is_expired
                normalized.append(record)
                self.records_processed += 1
            except Exception:
                self.records_rejected += 1

        if normalized:
            self.last_successful_ingestion = now

        return normalized

    def _parse_cap_xml(self, xml_text: str) -> List[Dict[str, Any]]:
        alerts = []
        try:
            root = ET.fromstring(xml_text)
            # Support RSS <item> tags and direct <alert> root
            items = root.findall(".//item")
            if not items:
                items = [root] if "alert" in root.tag.lower() else root.findall(".//alert")

            for item in items:
                title = item.findtext("title") or item.findtext(".//headline") or "SACHET Disaster Alert"
                desc = item.findtext("description") or item.findtext(".//description") or ""
                link = item.findtext("link") or "https://sachet.ndma.gov.in"
                pub_date = item.findtext("pubDate") or item.findtext(".//sent")

                # Look for geo elements
                lat_text = (
                    item.findtext(".//coordinates") or
                    item.findtext("coordinates") or
                    item.findtext(".//point") or
                    item.findtext("point") or
                    item.findtext(".//circle") or
                    item.findtext("circle")
                )
                lat, lng = 20.5937, 78.9629
                if lat_text:
                    parts = lat_text.replace(",", " ").split()
                    if len(parts) >= 2:
                        try:
                            lat, lng = float(parts[0]), float(parts[1])
                        except Exception:
                            pass

                category_text = (
                    item.findtext(".//category") or
                    item.findtext("category") or
                    item.findtext(".//event") or
                    item.findtext("event") or
                    "Disaster Alert"
                )
                severity_text = item.findtext(".//severity") or item.findtext("severity") or "Severe"
                effective_text = item.findtext(".//effective") or item.findtext("effective")
                expires_text = item.findtext(".//expires") or item.findtext("expires")
                state_text = item.findtext(".//state") or item.findtext("state")
                district_text = item.findtext(".//district") or item.findtext("district")

                alerts.append({
                    "identifier": item.findtext("guid") or item.findtext(".//identifier"),
                    "headline": title,
                    "description": desc,
                    "url": link,
                    "sent": pub_date,
                    "effective": effective_text,
                    "expires": expires_text,
                    "state": state_text,
                    "district": district_text,
                    "latitude": lat,
                    "longitude": lng,
                    "severity": severity_text,
                    "event": category_text
                })
        except Exception:
            self.processing_errors += 1

        return self._normalize_json_alerts(alerts)

    def _parse_dt(self, val: Any) -> Optional[datetime]:
        if not val:
            return None
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        try:
            # ISO 8601 parsing
            clean = str(val).replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None
