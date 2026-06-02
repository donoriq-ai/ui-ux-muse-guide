from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentClaims, Db
from app.core.errors import not_found
from app.models import AuditEntryModel, TenantModel
from app.schemas.domain import PatchSettingsRequest, Tenant

router = APIRouter()


def _to_schema(t: TenantModel) -> Tenant:
    return Tenant(
        id=t.id,
        name=t.name,
        confidenceThreshold=t.confidence_threshold,
        gestationalAgePolicyWeeks=t.gestational_age_policy_weeks,
    )


@router.get("/current")
async def get_tenant(claims: CurrentClaims, db: Db) -> Tenant:
    result = await db.execute(select(TenantModel).where(TenantModel.id == claims["tenant_id"]))
    t = result.scalar_one_or_none()
    if not t:
        raise not_found("Tenant")
    return _to_schema(t)


@router.get("/current/settings")
async def get_settings(claims: CurrentClaims, db: Db) -> Tenant:
    return await get_tenant(claims, db)


@router.patch("/current/settings")
async def patch_settings(body: PatchSettingsRequest, claims: CurrentClaims, db: Db) -> Tenant:
    result = await db.execute(select(TenantModel).where(TenantModel.id == claims["tenant_id"]))
    t = result.scalar_one_or_none()
    if not t:
        raise not_found("Tenant")

    changed: list[str] = []
    if body.confidenceThreshold is not None:
        t.confidence_threshold = body.confidenceThreshold
        changed.append("confidenceThreshold")
    if body.gestationalAgePolicyWeeks is not None:
        t.gestational_age_policy_weeks = body.gestationalAgePolicyWeeks
        changed.append("gestationalAgePolicyWeeks")

    if changed:
        entry = AuditEntryModel(
            id=f"a-{datetime.now(UTC).timestamp()}-settings",
            tenant_id=claims["tenant_id"],
            actor=claims["name"],
            action="settings.updated",
            detail=", ".join(changed),
            timestamp=datetime.now(UTC).isoformat(),
        )
        db.add(entry)
        await db.commit()

    return _to_schema(t)
