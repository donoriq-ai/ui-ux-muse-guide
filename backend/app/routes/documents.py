"""
Document upload + extraction + evaluation endpoints.
Uses the adapter interfaces — real Reducto/Anthropic when keys are set, stub otherwise.

Two upload paths:
  1. POST /donors/{id}/documents:upload-combined
     - Accepts a combined BT donor packet (any page order).
     - Calls prepare_combined: upload once + run the BT Reducto pipeline (split + extract
       in a single async job). Returns {classifications: []} immediately; the background
       task _run_combined_pipeline writes all section fields once the pipeline completes.
     - Client polls GET /donors/{id} for document status.

  2. POST /donors/{id}/documents
     - Accepts a single-type PDF with an explicit type= form field.
     - Spawns one async _run_extraction.
"""
import asyncio
import logging
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger(__name__)

from fastapi import APIRouter, File, Form, Response, UploadFile
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import CurrentClaims, Db
from app.core.errors import AppError, not_found, rule_eval_failed
from app.models import AuditEntryModel, DonorDocumentModel, DonorModel, ExtractedFieldModel
from app.schemas.domain import DonorDocument
from app.adapters.extraction.factory import get_extractor
from app.adapters.evaluation.factory import get_evaluator

router = APIRouter()


def _require_donor(d: DonorModel | None, donor_id: str) -> DonorModel:
    if not d:
        raise not_found(f"Donor {donor_id}")
    return d


# ── PDF storage (dev-only local disk; PHI — never committed) ───────────────────


def _donor_storage_dir(tenant_id: str, donor_id: str) -> Path:
    return Path(settings.document_storage_dir) / tenant_id / donor_id


def _save_pdf(tenant_id: str, donor_id: str, name: str, content: bytes) -> None:
    """Persist an uploaded PDF so citation pages can be rendered later.

    TODO: production -> S3 + KMS (US region). Local disk is dev-only.
    """
    target_dir = _donor_storage_dir(tenant_id, donor_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / name).write_bytes(content)
    logger.info("stored pdf tenant=%s donor=%s name=%s bytes=%d", tenant_id, donor_id, name, len(content))


# ── Combined upload ───────────────────────────────────────────────────────────

@router.post("/{donor_id}/documents:upload-combined")
async def upload_combined(
    donor_id: str,
    claims: CurrentClaims,
    db: Db,
    file: UploadFile = File(...),
) -> dict:
    tenant_id = claims["tenant_id"]
    if file.content_type != "application/pdf":
        raise AppError(415, "UNSUPPORTED_MEDIA", "Only PDF files are accepted")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise AppError(413, "PAYLOAD_TOO_LARGE", "File exceeds 50 MB limit")

    result = await db.execute(
        select(DonorModel).where(DonorModel.id == donor_id, DonorModel.tenant_id == tenant_id)
    )
    _require_donor(result.scalar_one_or_none(), donor_id)

    # Persist the combined packet so citation pages (absolute) can be rendered later.
    _save_pdf(tenant_id, donor_id, "combined.pdf", content)

    # Deep split can take minutes. Record an immediate, queryable signal and run
    # the split + section creation in the background so this request returns fast
    # and the UI can mirror progress (documents + audit) across navigation.
    now = datetime.now(UTC).isoformat()
    db.add(
        AuditEntryModel(
            id=f"a-{datetime.now(UTC).timestamp()}-combined-upload-started",
            tenant_id=tenant_id,
            donor_id=donor_id,
            actor=claims["name"],
            action="document.upload_started",
            detail=f"{file.filename or 'upload.pdf'} — splitting packet",
            timestamp=now,
        )
    )
    await db.commit()

    asyncio.create_task(
        _run_combined_pipeline(
            donor_id=donor_id,
            tenant_id=tenant_id,
            content=content,
            filename=file.filename or "upload.pdf",
            actor=claims["name"],
        )
    )

    logger.info("combined upload accepted donor_id=%s bytes=%d", donor_id, len(content))

    # Sections are detected asynchronously; client polls GET /donors/{id} + /audit.
    return {"classifications": []}


# ── Single-document upload ────────────────────────────────────────────────────

@router.post("/{donor_id}/documents")
async def upload_document(
    donor_id: str,
    claims: CurrentClaims,
    db: Db,
    file: UploadFile = File(...),
    type: str = Form(...),
) -> DonorDocument:
    tenant_id = claims["tenant_id"]
    if file.content_type != "application/pdf":
        raise AppError(415, "UNSUPPORTED_MEDIA", "Only PDF files are accepted")

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise AppError(413, "PAYLOAD_TOO_LARGE", "File exceeds 25 MB limit")

    result = await db.execute(
        select(DonorModel).where(DonorModel.id == donor_id, DonorModel.tenant_id == tenant_id)
    )
    _require_donor(result.scalar_one_or_none(), donor_id)

    now = datetime.now(UTC).isoformat()
    doc = DonorDocumentModel(
        id=f"doc-{donor_id}-{type}-{int(datetime.now(UTC).timestamp())}",
        donor_id=donor_id,
        tenant_id=tenant_id,
        type=type,
        file_name=file.filename or "upload.pdf",
        page_count=0,
        uploaded_at=now,
        status="processing",
    )
    db.add(doc)

    # Persist this single document's PDF for later page rendering (keyed by doc id).
    _save_pdf(tenant_id, donor_id, f"{doc.id}.pdf", content)
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-doc-upload",
        tenant_id=tenant_id,
        donor_id=donor_id,
        actor=claims["name"],
        action="document.uploaded",
        detail=f"{file.filename} ({type})",
        timestamp=now,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(doc)

    asyncio.create_task(_run_extraction(doc.id, donor_id, tenant_id, content, type, db))

    return DonorDocument(
        id=doc.id,
        donorId=doc.donor_id,
        type=doc.type,  # type: ignore[arg-type]
        fileName=doc.file_name,
        pageCount=doc.page_count,
        uploadedAt=doc.uploaded_at,
        status=doc.status,
    )


# ── Citation page render ──────────────────────────────────────────────────────


def _render_pdf_page_png(path: Path, page: int) -> bytes:
    """Render a 1-indexed PDF page to PNG at 150 DPI. Sync — call via to_thread."""
    import fitz  # PyMuPDF

    with fitz.open(path) as pdf:
        if pdf.page_count == 0:
            raise ValueError("empty pdf")
        index = max(0, min(page - 1, pdf.page_count - 1))
        pix = pdf.load_page(index).get_pixmap(dpi=150)
        return pix.tobytes("png")


@router.get("/{donor_id}/documents/{document_id}/pages/{page}")
async def render_document_page(
    donor_id: str,
    document_id: str,
    page: int,
    claims: CurrentClaims,
    db: Db,
) -> Response:
    """Render the cited page of the stored source PDF as a PNG.

    Combined uploads share one `combined.pdf` (citation pages are absolute);
    single-document uploads have a per-document `{document_id}.pdf`.
    404 when no stored file exists (e.g. donors created before storage existed);
    the client falls back to a synthetic preview in that case.
    """
    tenant_id = claims["tenant_id"]

    result = await db.execute(
        select(DonorDocumentModel).where(
            DonorDocumentModel.id == document_id,
            DonorDocumentModel.donor_id == donor_id,
            DonorDocumentModel.tenant_id == tenant_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise not_found(f"Document {document_id}")

    base = _donor_storage_dir(tenant_id, donor_id)
    per_doc = base / f"{document_id}.pdf"
    combined = base / "combined.pdf"
    path = per_doc if per_doc.exists() else combined
    if not path.exists():
        raise not_found(f"Source PDF for document {document_id}")

    try:
        png = await asyncio.to_thread(_render_pdf_page_png, path, page)
    except Exception as exc:
        logger.error("render: failed doc_id=%s page=%d error=%s", document_id, page, type(exc).__name__)
        raise AppError(500, "RENDER_FAILED", "Could not render the requested page") from exc

    return Response(content=png, media_type="image/png")


# ── Background extraction tasks ───────────────────────────────────────────────

async def _run_extraction(doc_id: str, donor_id: str, tenant_id: str, content: bytes, doc_type: str, db) -> None:
    """
    Background task for single-document upload.
    Status flow: processing -> extracted (success) | error (failure).
    """
    from app.core.database import AsyncSessionLocal

    logger.info("extraction: starting doc_id=%s doc_type=%s", doc_id, doc_type)

    async with AsyncSessionLocal() as session:
        try:
            extractor = get_extractor()
            fields = await extractor.extract_fields(
                content, doc_type, doc_id, doc_type.replace("_", " ").title()
            )
            await _write_fields_and_complete(session, doc_id, donor_id, tenant_id, fields)

        except (RuntimeError, TimeoutError) as exc:
            logger.error("extraction: reducto error doc_id=%s error=%s", doc_id, str(exc))
            await _mark_error(session, doc_id)

        except Exception as exc:
            logger.exception("extraction: unexpected error doc_id=%s error_type=%s", doc_id, type(exc).__name__)
            await _mark_error(session, doc_id)


async def _run_combined_pipeline(
    donor_id: str,
    tenant_id: str,
    content: bytes,
    filename: str,
    actor: str,
) -> None:
    """Submit combined BT packet to the Reducto pipeline, then write all fields.

    Runs in the background so the upload request returns immediately and the UI
    can mirror progress from backend state (documents + audit) regardless of
    client-side navigation.

    prepare_combined uploads the PDF and submits a single pipeline job that handles
    split + extract. This task blocks on the poll loop inside prepare_combined, then
    writes all section fields inline once the pipeline completes — no sub-tasks.

    Audit lifecycle: ``document.upload_started`` (written by the request) ->
    ``document.combined_uploaded`` on success | ``document.upload_failed`` on error.
    """
    from app.core.database import AsyncSessionLocal

    logger.info("combined pipeline: starting donor_id=%s", donor_id)
    try:
        extractor = get_extractor()
        prep = await extractor.prepare_combined(content, filename)
        classifications: list[dict] = prep["classifications"]
        pipeline_sections: dict[str, object] = prep.get("pipeline_sections") or {}

        now = datetime.now(UTC).isoformat()

        # Create document records and collect sections that have pipeline results.
        section_writes: list[dict] = []

        async with AsyncSessionLocal() as session:
            for cls in classifications:
                doc_type: str = cls["type"]
                pages: list[int] = cls.get("pages") or []
                page_range = cls.get("pageRange", [1, 1])

                doc = DonorDocumentModel(
                    id=f"doc-{donor_id}-{doc_type}-{int(datetime.now(UTC).timestamp())}",
                    donor_id=donor_id,
                    tenant_id=tenant_id,
                    type=doc_type,
                    file_name=filename,
                    page_count=page_range[1] - page_range[0] + 1
                    if len(page_range) == 2
                    else len(pages),
                    uploaded_at=now,
                    status="processing" if doc_type in pipeline_sections else "uploaded",
                )
                session.add(doc)

                if doc_type in pipeline_sections:
                    section_writes.append({
                        "doc_id": doc.id,
                        "doc_type": doc_type,
                        "doc_label": doc_type.replace("_", " ").title(),
                        "raw": pipeline_sections[doc_type],
                    })

            session.add(
                AuditEntryModel(
                    id=f"a-{datetime.now(UTC).timestamp()}-combined-upload",
                    tenant_id=tenant_id,
                    donor_id=donor_id,
                    actor=actor,
                    action="document.combined_uploaded",
                    detail=f"{filename} ({len(classifications)} sections detected)",
                    timestamp=now,
                )
            )
            await session.commit()

        # Write extracted fields for each section — pipeline already did the work.
        async with AsyncSessionLocal() as session:
            for s in section_writes:
                try:
                    fields = extractor.parse_pipeline_section(
                        s["raw"], s["doc_type"], s["doc_id"], s["doc_label"]
                    )
                    await _write_fields_and_complete(session, s["doc_id"], donor_id, tenant_id, fields)
                except Exception as exc:
                    logger.error(
                        "combined pipeline: field write failed doc_id=%s doc_type=%s error=%s",
                        s["doc_id"], s["doc_type"], type(exc).__name__,
                    )
                    await _mark_error(session, s["doc_id"])

        logger.info(
            "combined pipeline: completed donor_id=%s sections=%d written=%d",
            donor_id, len(classifications), len(section_writes),
        )

    except Exception as exc:
        logger.exception(
            "combined pipeline: failed donor_id=%s error_type=%s", donor_id, type(exc).__name__
        )
        try:
            async with AsyncSessionLocal() as session:
                session.add(
                    AuditEntryModel(
                        id=f"a-{datetime.now(UTC).timestamp()}-combined-upload-failed",
                        tenant_id=tenant_id,
                        donor_id=donor_id,
                        actor="system",
                        action="document.upload_failed",
                        detail="Pipeline processing failed. Re-upload to retry.",
                        timestamp=datetime.now(UTC).isoformat(),
                    )
                )
                await session.commit()
        except Exception:
            logger.error("combined pipeline: could not write failure audit donor_id=%s", donor_id)


async def _write_fields_and_complete(session, doc_id: str, donor_id: str, tenant_id: str, fields: list[dict]) -> None:
    """Write extracted fields and mark the document as extracted."""
    from sqlalchemy import select as _select

    doc_result = await session.execute(
        _select(DonorDocumentModel).where(DonorDocumentModel.id == doc_id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        logger.warning("extraction: doc_id=%s not found after extract, skipping write", doc_id)
        return

    for f in fields:
        session.add(ExtractedFieldModel(
            id=f["id"],
            donor_id=donor_id,
            document_id=doc_id,
            tenant_id=tenant_id,
            label=f["label"],
            key=f["key"],
            value=f.get("value"),
            confidence=f["confidence"],
            citation=f.get("citation"),
            flagged_low_confidence=f.get("flaggedLowConfidence", False),
            reviewed=False,
        ))

    unique_pages = {
        f["citation"]["page"]
        for f in fields
        if f.get("citation") and isinstance(f["citation"].get("page"), int)
    }
    doc.status = "extracted"
    doc.page_count = len(unique_pages) or doc.page_count or 1
    await session.commit()

    logger.info(
        "extraction: completed doc_id=%s fields=%d pages=%d",
        doc_id, len(fields), doc.page_count,
    )


async def _mark_error(session, doc_id: str) -> None:
    try:
        from sqlalchemy import select as _select
        doc_result = await session.execute(
            _select(DonorDocumentModel).where(DonorDocumentModel.id == doc_id)
        )
        doc = doc_result.scalar_one_or_none()
        if doc and doc.status != "error":
            doc.status = "error"
            await session.commit()
    except Exception as inner:
        logger.error("extraction: failed to mark error status doc_id=%s: %s", doc_id, type(inner).__name__)


# ── Evaluate ──────────────────────────────────────────────────────────────────

@router.post("/{donor_id}/evaluate")
async def evaluate(donor_id: str, claims: CurrentClaims, db: Db) -> dict:
    """Start a background evaluation. Returns immediately; poll GET /donors/{id} + /audit."""
    tenant_id = claims["tenant_id"]
    result = await db.execute(
        select(DonorModel).where(DonorModel.id == donor_id, DonorModel.tenant_id == tenant_id)
    )
    donor = _require_donor(result.scalar_one_or_none(), donor_id)

    docs_result = await db.execute(
        select(DonorDocumentModel).where(
            DonorDocumentModel.donor_id == donor_id,
            DonorDocumentModel.status == "extracted",
        )
    )
    extracted_docs = docs_result.scalars().all()
    if not extracted_docs:
        raise rule_eval_failed("No extracted documents found. Wait for extraction to complete.")

    fields_result = await db.execute(
        select(ExtractedFieldModel).where(ExtractedFieldModel.donor_id == donor_id)
    )
    fields_snapshot = [
        {
            "id": f.id,
            "label": f.label,
            "key": f.key,
            "value": f.value,
            "confidence": f.confidence,
            "citation": f.citation,
            "flaggedLowConfidence": f.flagged_low_confidence,
        }
        for f in fields_result.scalars().all()
    ]

    now = datetime.now(UTC).isoformat()
    db.add(
        AuditEntryModel(
            id=f"a-{datetime.now(UTC).timestamp()}-eval-started",
            tenant_id=tenant_id,
            donor_id=donor_id,
            actor=claims["name"],
            action="evaluation.started",
            detail="Evaluation started",
            timestamp=now,
        )
    )
    await db.commit()

    asyncio.create_task(
        _run_evaluation(
            donor_id=donor_id,
            tenant_id=tenant_id,
            tissue_type=donor.tissue_type,
            fields_snapshot=fields_snapshot,
            actor=claims["name"],
        )
    )

    logger.info("evaluate: accepted donor_id=%s", donor_id)
    return {"status": "evaluating"}


async def _run_evaluation(
    donor_id: str,
    tenant_id: str,
    tissue_type: str,
    fields_snapshot: list[dict],
    actor: str,
) -> None:
    """Background task: call Claude, persist result, write audit."""
    from app.core.database import AsyncSessionLocal

    logger.info("evaluate: starting donor_id=%s", donor_id)
    try:
        evaluator = get_evaluator()
        evaluation_result = await evaluator.evaluate(
            tissue_type=tissue_type,
            extracted_fields=fields_snapshot,
            ruleset_version=settings.ruleset_version,
        )

        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(DonorModel).where(
                    DonorModel.id == donor_id, DonorModel.tenant_id == tenant_id
                )
            )
            donor = res.scalar_one_or_none()
            if donor is None:
                logger.error("evaluate: donor not found donor_id=%s", donor_id)
                return
            donor.evaluation = evaluation_result
            now = datetime.now(UTC).isoformat()
            session.add(
                AuditEntryModel(
                    id=f"a-{datetime.now(UTC).timestamp()}-eval",
                    tenant_id=tenant_id,
                    donor_id=donor_id,
                    actor="system",
                    action="evaluation.completed",
                    detail=f"Recommendation: {evaluation_result.get('recommendation', 'UNKNOWN')}",
                    timestamp=now,
                )
            )
            await session.commit()
            logger.info(
                "evaluate: completed donor_id=%s recommendation=%s",
                donor_id,
                evaluation_result.get("recommendation"),
            )

    except Exception as exc:
        logger.exception("evaluate: failed donor_id=%s error_type=%s", donor_id, type(exc).__name__)
        try:
            async with AsyncSessionLocal() as session:
                session.add(
                    AuditEntryModel(
                        id=f"a-{datetime.now(UTC).timestamp()}-eval-failed",
                        tenant_id=tenant_id,
                        donor_id=donor_id,
                        actor="system",
                        action="evaluation.failed",
                        detail="Evaluation failed. Try again.",
                        timestamp=datetime.now(UTC).isoformat(),
                    )
                )
                await session.commit()
        except Exception:
            logger.error("evaluate: could not write failure audit donor_id=%s", donor_id)
