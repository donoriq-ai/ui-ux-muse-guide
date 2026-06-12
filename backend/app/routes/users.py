import secrets
from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentClaims, Db, require_role
from app.core.errors import conflict, not_found
from app.core.security import hash_password
from app.models import AuditEntryModel, UserModel
from app.schemas.domain import CreateUserRequest, PatchUserRoleRequest, User

router = APIRouter()

_admin_only = require_role("admin")


def _to_schema(u: UserModel) -> User:
    return User(id=u.id, email=u.email, name=u.name, role=u.role, tenantId=u.tenant_id)  # type: ignore[arg-type]


@router.get("", dependencies=[_admin_only])
async def list_users(claims: CurrentClaims, db: Db) -> list[User]:
    result = await db.execute(select(UserModel).where(UserModel.tenant_id == claims["tenant_id"]))
    return [_to_schema(u) for u in result.scalars().all()]


@router.post("", dependencies=[_admin_only])
async def create_user(body: CreateUserRequest, claims: CurrentClaims, db: Db) -> User:
    existing = await db.execute(select(UserModel).where(UserModel.email == body.email))
    if existing.scalar_one_or_none():
        raise conflict(f"Email {body.email} already registered")

    password = body.password or secrets.token_urlsafe(12)
    user = UserModel(
        id=f"u-{secrets.token_hex(6)}",
        tenant_id=claims["tenant_id"],
        email=body.email,
        name=body.name,
        role=body.role,
        password_hash=hash_password(password),
    )
    db.add(user)
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-user-created",
        tenant_id=claims["tenant_id"],
        actor=claims["name"],
        action="user.created",
        detail=f"{body.name} ({body.email}) as {body.role}",
        timestamp=datetime.now(UTC).isoformat(),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(user)
    return _to_schema(user)


@router.patch("/{user_id}/role", dependencies=[_admin_only])
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
