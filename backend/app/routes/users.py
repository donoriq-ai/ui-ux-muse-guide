from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentClaims, Db
from app.core.errors import not_found
from app.models import AuditEntryModel, UserModel
from app.schemas.domain import PatchUserRoleRequest, User

router = APIRouter()


def _to_schema(u: UserModel) -> User:
    return User(id=u.id, email=u.email, name=u.name, role=u.role, tenantId=u.tenant_id)  # type: ignore[arg-type]


@router.get("")
async def list_users(claims: CurrentClaims, db: Db) -> list[User]:
    result = await db.execute(select(UserModel).where(UserModel.tenant_id == claims["tenant_id"]))
    return [_to_schema(u) for u in result.scalars().all()]


@router.patch("/{user_id}/role")
async def update_role(user_id: str, body: PatchUserRoleRequest, claims: CurrentClaims, db: Db) -> User:
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise not_found("User")

    prev = user.role
    user.role = body.role
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-role",
        tenant_id=claims["tenant_id"],
        actor=claims["name"],
        action="user.role_changed",
        detail=f"{user.name}: {prev} → {body.role}",
        timestamp=datetime.now(UTC).isoformat(),
    )
    db.add(entry)
    await db.commit()
    return _to_schema(user)
