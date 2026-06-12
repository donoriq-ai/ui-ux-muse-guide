"""
DocumentExtractor interface implemented by ReductoExtractor.
"""
from abc import ABC, abstractmethod


class DocumentExtractor(ABC):
    @abstractmethod
    async def prepare_combined(
        self, content: bytes, filename: str
    ) -> dict:
        """
        Upload the combined BT packet once and run it through the configured
        Reducto pipeline (split + extract in one job).
        Returns:
          {
            "fileId": str,
            "classifications": [
              {
                "type": str,
                "pages": [int, ...],
                "pageRange": [int, int],
                "confidence": float,
              },
              ...
            ],
            "pipeline_sections": {
              doc_type: raw_extract_result,  # keyed by split_name
              ...
            },
          }
        """

    @abstractmethod
    def parse_pipeline_section(
        self,
        raw: object,
        doc_type: str,
        doc_id: str,
        doc_label: str,
    ) -> list[dict]:
        """
        Convert a raw pipeline extract result for one section into our
        ExtractedField list. raw is the .result from the pipeline extract
        array entry for this section.
        Returns: list of ExtractedField dicts with citation JSONB.
        """

    @abstractmethod
    async def extract_fields(
        self, content: bytes, doc_type: str, doc_id: str, doc_label: str
    ) -> list[dict]:
        """
        Extract fields from a single-document PDF (raw bytes).
        Returns: list of ExtractedField dicts with citation JSONB.
        """
