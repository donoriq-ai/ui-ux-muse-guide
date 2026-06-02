"""
Assembles the Donor schema from DB rows (donor + documents + fields + evaluation).
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DonorDocumentModel, DonorModel, ExtractedFieldModel
from app.schemas.domain import (
    Citation,
    Donor,
    DonorDocument,
    DonorEvaluation,
    ExtractedField,
    RuleFinding,
)


def _doc_schema(d: DonorDocumentModel) -> DonorDocument:
    return DonorDocument(
        id=d.id,
        donorId=d.donor_id,
        type=d.type,  # type: ignore[arg-type]
        fileName=d.file_name,
        pageCount=d.page_count,
        uploadedAt=d.uploaded_at,
        status=d.status,
    )


def _field_schema(f: ExtractedFieldModel) -> ExtractedField:
    citation = None
    if f.citation:
        bbox = f.citation.get("bbox")
        citation = Citation(
            documentId=f.citation["documentId"],
            documentLabel=f.citation["documentLabel"],
            page=f.citation["page"],
            bbox=tuple(bbox) if bbox else None,  # type: ignore[arg-type]
            confidence=f.citation["confidence"],
        )
    return ExtractedField(
        id=f.id,
        documentId=f.document_id,
        label=f.label,
        key=f.key,
        value=f.value,
        confidence=f.confidence,
        citation=citation,
        flaggedLowConfidence=f.flagged_low_confidence,
        reviewed=f.reviewed,
    )


async def build_donor_schema(db: AsyncSession, d: DonorModel, tenant_id: str) -> Donor:
    docs_result = await db.execute(
        select(DonorDocumentModel).where(
            DonorDocumentModel.donor_id == d.id,
            DonorDocumentModel.tenant_id == tenant_id,
        )
    )
    docs = docs_result.scalars().all()

    fields_result = await db.execute(
        select(ExtractedFieldModel).where(
            ExtractedFieldModel.donor_id == d.id,
            ExtractedFieldModel.tenant_id == tenant_id,
        )
    )
    fields = fields_result.scalars().all()

    evaluation: DonorEvaluation | None = None
    if d.evaluation:
        evaluation = DonorEvaluation.model_validate(d.evaluation)

    return Donor(
        id=d.id,
        tenantId=d.tenant_id,
        tissueType=d.tissue_type,  # type: ignore[arg-type]
        createdAt=d.created_at,
        createdBy=d.created_by,
        reviewedBy=d.reviewed_by,
        reviewedAt=d.reviewed_at,
        documents=[_doc_schema(doc) for doc in docs],
        fields=[_field_schema(f) for f in fields],
        evaluation=evaluation,
    )
