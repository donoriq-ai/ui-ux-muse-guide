from app.adapters.extraction.base import DocumentExtractor
from app.adapters.extraction.reducto import ReductoExtractor

_instance: DocumentExtractor | None = None


def get_extractor() -> DocumentExtractor:
    global _instance
    if _instance is None:
        _instance = ReductoExtractor()
    return _instance
