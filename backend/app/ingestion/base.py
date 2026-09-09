from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime


class BaseDataSource(ABC):
    """
    Abstract base adapter converting source-specific payloads
    into the canonical CloudNet normalized event structure.
    """
    def __init__(self, source_id: str, source_name: str, source_type: str, reliability: float = 70.0):
        self.source_id = source_id
        self.source_name = source_name
        self.source_type = source_type
        self.reliability = reliability
        self.last_fetch: datetime = datetime.utcnow()
        self.status: str = "HEALTHY"
        self.error_count: int = 0

    @abstractmethod
    async def fetch_or_normalize(self, raw_input: Any = None) -> List[Dict[str, Any]]:
        """Transforms source payload into standard normalized event dictionaries."""
        pass
