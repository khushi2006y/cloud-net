from typing import Dict, List, Optional, Any
from app.ingestion.base import BaseWeatherSourceAdapter
from app.ingestion.weather_api_adapter import WeatherAPIAdapter
from app.ingestion.skymet_adapter import SkymetAdapter
from app.ingestion.sachet_adapter import SachetAdapter
from app.ingestion.incois_adapter import IncoisAdapter
from app.ingestion.citizen_adapter import CitizenReportAdapter
from app.ingestion.social_adapter import SocialMediaAdapter
from app.ingestion.gov_adapter import GovernmentDataAdapter


class SourceRegistry:
    """
    Central operational registry for all external weather and disaster data adapters.
    Maintains singleton lifecycle instances for health telemetry and background scheduling.
    """
    def __init__(self):
        self._adapters: Dict[str, BaseWeatherSourceAdapter] = {
            "src-sachet-ndma": SachetAdapter(),
            "src-incois-marine": IncoisAdapter(),
            "src-skymet": SkymetAdapter(),
            "src-open-meteo": WeatherAPIAdapter(),
            "src-imd-official": GovernmentDataAdapter(),
            "src-citizen-portal": CitizenReportAdapter(),
            "src-social-stream-real": SocialMediaAdapter()
        }

    def get_adapter(self, source_id: str) -> Optional[BaseWeatherSourceAdapter]:
        return self._adapters.get(source_id)

    def get_all_adapters(self) -> List[BaseWeatherSourceAdapter]:
        return list(self._adapters.values())

    def get_health_summary(self) -> List[Dict[str, Any]]:
        return [adapter.get_health_status() for adapter in self._adapters.values()]


# Global singleton registry
source_registry = SourceRegistry()
