"""
Run docs/birth_tissue.pdf through the Reducto BT pipeline
(k9768937hwbyzt7d8bmm199hes87zhve) and save results under
docs/reducto/bt/results/birth_tissue/.

Requires REDUCTO_API_KEY in backend/.env (or environment).

Usage (from backend/):
    uv run python scripts/run_birth_tissue_pipeline.py
    uv run python scripts/run_birth_tissue_pipeline.py --pdf ../docs/birth_tissue.pdf
    uv run python scripts/run_birth_tissue_pipeline.py --out-dir ../docs/reducto/bt/results/birth_tissue

WARNING: Extraction output may contain donor-identifying data. Do not commit
results to git or share outside authorized environments.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Allow `uv run python scripts/...` without installing the package.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.adapters.extraction.reducto import ReductoExtractor  # noqa: E402
from app.core.config import settings  # noqa: E402

logger = logging.getLogger(__name__)

_REPO_ROOT = _BACKEND_ROOT.parent
_DEFAULT_PDF = _REPO_ROOT / "docs" / "birth_tissue.pdf"
_DEFAULT_OUT = _REPO_ROOT / "docs" / "reducto" / "bt" / "results" / "birth_tissue"
BT_PIPELINE_ID = "k9768937hwbyzt7d8bmm199hes87zhve"


def _to_jsonable(obj: Any) -> Any:
    """Recursively convert Reducto SDK / Pydantic objects to JSON-serializable data."""
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {str(k): _to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_jsonable(v) for v in obj]
    if hasattr(obj, "model_dump"):
        return _to_jsonable(obj.model_dump(exclude_none=False))
    if hasattr(obj, "__dict__") and not isinstance(obj, type):
        return _to_jsonable({k: v for k, v in obj.__dict__.items() if not k.startswith("_")})
    return str(obj)


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    logger.info("wrote %s", path)


def run(pdf_path: Path, out_dir: Path, pipeline_id: str) -> None:
    if not settings.reducto_api_key:
        raise SystemExit("REDUCTO_API_KEY is not set. Add it to backend/.env or the environment.")

    if not pdf_path.is_file():
        raise SystemExit(f"PDF not found: {pdf_path}")

    content = pdf_path.read_bytes()
    logger.info(
        "running BT pipeline on %s (%d bytes), pipeline_id=%s",
        pdf_path,
        len(content),
        pipeline_id,
    )

    settings.reducto_pipeline_id = pipeline_id
    extractor = ReductoExtractor()
    prep = extractor._sync_prepare_combined(content, pdf_path.name)

    classifications = prep.get("classifications") or []
    pipeline_sections: dict[str, object] = prep.get("pipeline_sections") or {}
    file_id = prep.get("fileId")

    split_path = out_dir / "split.json"
    _write_json(split_path, classifications)

    extract_dir = out_dir / "extract"
    parsed_dir = out_dir / "parsed"
    extract_dir.mkdir(parents=True, exist_ok=True)
    parsed_dir.mkdir(parents=True, exist_ok=True)

    section_summary: list[dict[str, Any]] = []

    for doc_type, raw in sorted(pipeline_sections.items()):
        doc_id = f"birth-tissue-{doc_type}"
        doc_label = doc_type.replace("_", " ").title()

        raw_path = extract_dir / f"{doc_type}.json"
        _write_json(raw_path, _to_jsonable(raw))

        fields = extractor.parse_pipeline_section(raw, doc_type, doc_id, doc_label)
        parsed_path = parsed_dir / f"{doc_type}.json"
        _write_json(parsed_path, fields)

        section_summary.append(
            {
                "docType": doc_type,
                "fieldCount": len(fields),
                "rawFile": f"extract/{doc_type}.json",
                "parsedFile": f"parsed/{doc_type}.json",
            }
        )
        logger.info("section %s: %d fields", doc_type, len(fields))

    manifest = {
        "sourcePdf": str(pdf_path.relative_to(_REPO_ROOT)),
        "outputDir": str(out_dir.relative_to(_REPO_ROOT)),
        "pipelineId": pipeline_id,
        "reductoFileId": file_id,
        "runAt": datetime.now(UTC).isoformat(),
        "splitSectionCount": len(classifications),
        "extractedSectionCount": len(pipeline_sections),
        "sections": section_summary,
        "splitTypes": [c.get("type") for c in classifications],
        "extractedTypes": sorted(pipeline_sections.keys()),
    }
    _write_json(out_dir / "manifest.json", manifest)

    logger.info(
        "done — split=%d sections, extracted=%d sections, output=%s",
        len(classifications),
        len(pipeline_sections),
        out_dir,
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="Run birth_tissue.pdf through the Reducto BT pipeline.")
    parser.add_argument(
        "--pdf",
        type=Path,
        default=_DEFAULT_PDF,
        help="Path to the combined BT donor packet PDF (default: docs/birth_tissue.pdf)",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=_DEFAULT_OUT,
        help="Directory for pipeline results (default: docs/reducto/bt/results/birth_tissue)",
    )
    parser.add_argument(
        "--pipeline-id",
        default=BT_PIPELINE_ID,
        help=f"Reducto BT pipeline ID (default: {BT_PIPELINE_ID})",
    )
    args = parser.parse_args()

    pdf_path = args.pdf.resolve()
    out_dir = args.out_dir.resolve()

    run(pdf_path, out_dir, args.pipeline_id)


if __name__ == "__main__":
    main()
