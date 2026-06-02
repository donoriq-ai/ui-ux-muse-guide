from datetime import UTC, datetime

from fastapi import APIRouter, Query
from sqlalchemy import select, func

from app.core.deps import CurrentClaims, Db
from app.core.errors import conflict, not_found
from app.models import AuditEntryModel, DonorDocumentModel, DonorModel, ExtractedFieldModel
from app.schemas.domain import (
    CreateDonorRequest,
    Donor,
    DonorDocument,
    DonorListResult,
    ExtractedField,
    PatchFieldRequest,
)
from app.services.donor import build_donor_schema

router = APIRouter()


@router.get("")
async def list_donors_page(
    claims: CurrentClaims,
    db: Db,
    q: str | None = None,
    tissue: str | None = None,
    rec: str | None = None,
    comp: str | None = None,
    sort: str = "createdAt",
    dir: str = "desc",
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=200, ge=1, le=500),
) -> DonorListResult:
    tenant_id = claims["tenant_id"]
    stmt = select(DonorModel).where(DonorModel.tenant_id == tenant_id)

    total_unfiltered = (
        await db.execute(select(func.count()).select_from(DonorModel).where(DonorModel.tenant_id == tenant_id))
    ).scalar_one()

    if q:
        stmt = stmt.where(
            (DonorModel.id.ilike(f"%{q}%")) | (DonorModel.created_by.ilike(f"%{q}%"))
        )
    if tissue:
        stmt = stmt.where(DonorModel.tissue_type == tissue)

    donors_raw = (await db.execute(stmt)).scalars().all()

    rows: list[Donor] = []
    for d in donors_raw:
        ds = await build_donor_schema(db, d, tenant_id)
        if rec:
            if rec == "none" and ds.evaluation is not None:
                continue
            elif rec != "none" and (ds.evaluation is None or ds.evaluation.recommendation != rec):
                continue
        if comp:
            if ds.evaluation is None or ds.evaluation.completeness.get("state") != comp:
                continue
        rows.append(ds)

    # Sort
    def sort_key(d: Donor):
        match sort:
            case "id": return d.id
            case "tissue": return d.tissueType
            case "completeness": return d.evaluation.completeness.get("state", "") if d.evaluation else ""
            case "recommendation": return d.evaluation.recommendation if d.evaluation else ""
            case "createdBy": return d.createdBy
            case "documents": return len(d.documents)
            case _: return d.createdAt

    rows.sort(key=sort_key, reverse=(dir == "desc"))

    total = len(rows)
    start = (page - 1) * pageSize
    paged = rows[start: start + pageSize]

    return DonorListResult(rows=paged, total=total, page=page, pageSize=pageSize, totalUnfiltered=total_unfiltered)


@router.get("/next-id")
async def next_donor_id(claims: CurrentClaims, db: Db) -> dict:
    tenant_id = claims["tenant_id"]
    year = datetime.now(UTC).year
    prefix = f"D-{year}-"
    result = await db.execute(
        select(DonorModel.id)
        .where(DonorModel.tenant_id == tenant_id)
        .where(DonorModel.id.like(f"{prefix}%"))
    )
    existing_ids = result.scalars().all()
    max_n = 0
    for did in existing_ids:
        try:
            n = int(did[len(prefix):])
            if n > max_n:
                max_n = n
        except ValueError:
            pass
    return {"id": f"{prefix}{str(max_n + 1).zfill(4)}"}


@router.get("/{donor_id}")
async def get_donor(donor_id: str, claims: CurrentClaims, db: Db) -> Donor:
    tenant_id = claims["tenant_id"]
    result = await db.execute(
        select(DonorModel).where(DonorModel.id == donor_id, DonorModel.tenant_id == tenant_id)
    )
    d = result.scalar_one_or_none()
    if not d:
        raise not_found(f"Donor {donor_id}")
    return await build_donor_schema(db, d, tenant_id)


@router.post("")
async def create_donor(body: CreateDonorRequest, claims: CurrentClaims, db: Db) -> Donor:
    tenant_id = claims["tenant_id"]
    existing = await db.execute(
        select(DonorModel).where(DonorModel.id == body.id, DonorModel.tenant_id == tenant_id)
    )
    if existing.scalar_one_or_none():
        raise conflict(f"Donor ID {body.id} already exists")

    now = datetime.now(UTC).isoformat()
    donor = DonorModel(
        id=body.id,
        tenant_id=tenant_id,
        tissue_type=body.tissueType,
        created_at=now,
        created_by=claims["name"],
        evaluation=None,
    )
    db.add(donor)

    docs = []
    for doc_input in (body.documents or []):
        doc = DonorDocumentModel(
            id=f"doc-{donor.id}-{doc_input['type']}",
            donor_id=donor.id,
            tenant_id=tenant_id,
            type=doc_input["type"],
            file_name=doc_input.get("fileName", ""),
            page_count=doc_input.get("pageCount", 0),
            uploaded_at=now,
            status="extracted",
        )
        db.add(doc)
        docs.append(doc)

    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-donor-created",
        tenant_id=tenant_id,
        donor_id=donor.id,
        actor=claims["name"],
        action="donor.created",
        detail=f"Donor {donor.id} created ({donor.tissue_type})",
        timestamp=now,
    )
    # Flush the donor row first so the audit FK constraint is satisfied, then commit all.
    await db.flush()
    db.add(entry)
    await db.commit()
    await db.refresh(donor)
    return await build_donor_schema(db, donor, tenant_id)


@router.post("/{donor_id}:mark-reviewed")
async def mark_reviewed(donor_id: str, claims: CurrentClaims, db: Db) -> Donor:
    tenant_id = claims["tenant_id"]
    result = await db.execute(
        select(DonorModel).where(DonorModel.id == donor_id, DonorModel.tenant_id == tenant_id)
    )
    d = result.scalar_one_or_none()
    if not d:
        raise not_found(f"Donor {donor_id}")

    now = datetime.now(UTC).isoformat()
    d.reviewed_by = claims["name"]
    d.reviewed_at = now
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-reviewed",
        tenant_id=tenant_id,
        donor_id=donor_id,
        actor=claims["name"],
        action="donor.reviewed",
        detail=f"Marked reviewed by {claims['name']}",
        timestamp=now,
    )
    db.add(entry)
    await db.commit()
    return await build_donor_schema(db, d, tenant_id)


@router.patch("/{donor_id}/fields/{field_id}", status_code=204)
async def patch_field(donor_id: str, field_id: str, body: PatchFieldRequest, claims: CurrentClaims, db: Db) -> None:
    tenant_id = claims["tenant_id"]
    result = await db.execute(
        select(ExtractedFieldModel).where(
            ExtractedFieldModel.id == field_id,
            ExtractedFieldModel.donor_id == donor_id,
            ExtractedFieldModel.tenant_id == tenant_id,
        )
    )
    field = result.scalar_one_or_none()
    if not field:
        raise not_found("Field")

    field.reviewed = body.reviewed
    action = "field.reviewed" if body.reviewed else "field.unreviewed"
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-{action}",
        tenant_id=tenant_id,
        donor_id=donor_id,
        actor=claims["name"],
        action=action,
        detail=f"{field.label} = {field.value or '—'}",
        timestamp=datetime.now(UTC).isoformat(),
    )
    db.add(entry)
    await db.commit()
