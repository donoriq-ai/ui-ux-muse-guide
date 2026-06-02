"""
DocumentExtractor interface implemented by ReductoExtractor.
"""
from abc import ABC, abstractmethod


class DocumentExtractor(ABC):
    @abstractmethod
    async def classify_combined(
        self, content: bytes, filename: str
    ) -> list[dict]:
        """
        Upload a combined PDF, split and classify it.
        Returns: list of {type: DocumentType, pageRange: [start, end], confidence: float}
        """

    @abstractmethod
    async def prepare_combined(
        self, content: bytes, filename: str
    ) -> dict:
        """
        Upload the combined PDF once and split it.
        Returns:
          {
            "fileId": str,          # reducto:// ref reusable for section extraction
            "classifications": [
              {
                "type": str,         # detected document type
                "pages": [int, ...], # full list of 1-indexed pages for that section
                "pageRange": [int, int],  # [first, last] for display
                "confidence": float,
              },
              ...
            ]
          }
        """

    @abstractmethod
    async def extract_fields(
        self, content: bytes, doc_type: str, doc_id: str, doc_label: str
    ) -> list[dict]:
        """
        Extract fields from a single-document PDF (raw bytes).
        Returns: list of ExtractedField dicts with citation JSONB.
        """

    @abstractmethod
    async def extract_section(
        self,
        file_id: str,
        doc_type: str,
        doc_id: str,
        doc_label: str,
        pages: list[int],
    ) -> list[dict]:
        """
        Extract fields from one section of an already-uploaded combined PDF.
        file_id: the reducto:// URL returned by prepare_combined.
        pages: the 1-indexed page list for this section from deep_split.
        Returns: list of ExtractedField dicts with citation JSONB.
        """
