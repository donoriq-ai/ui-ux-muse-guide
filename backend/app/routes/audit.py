from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentClaims, Db
from app.models import AuditEntryModel
from app.schemas.domain import AuditEntry

router = APIRouter()


@router.get("")
async def get_audit(claims: CurrentClaims, db: Db, donorId: str | None = None) -> list[AuditEntry]:
    tenant_id = claims["tenant_id"]
    stmt = select(AuditEntryModel).where(AuditEntryModel.tenant_id == tenant_id)
    if donorId:
        stmt = stmt.where(AuditEntryModel.donor_id == donorId)
    stmt = stmt.order_by(AuditEntryModel.timestamp.desc())
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        AuditEntry(
            id=r.id,
            donorId=r.donor_id,
            actor=r.actor,
            action=r.action,
            detail=r.detail,
            timestamp=r.timestamp,
        )
        for r in rows
    ]
