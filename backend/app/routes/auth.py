from datetime import UTC, datetime

from fastapi import APIRouter, status
from sqlalchemy import select

from app.core.deps import CurrentClaims, Db
from app.core.errors import AppError, not_found
from app.core.security import create_access_token, verify_password
from app.models import AuditEntryModel, UserModel
from app.schemas.domain import (
    LoginRequest,
    PasswordReset,
    PasswordResetRequest,
    User,
)

router = APIRouter()


def _user_to_schema(u: UserModel) -> User:
    return User(
        id=u.id,
        email=u.email,
        name=u.name,
        role=u.role,  # type: ignore[arg-type]
        tenantId=u.tenant_id,
    )


def _audit(db_obj: AuditEntryModel | None, tenant_id: str, actor: str, action: str, detail: str) -> AuditEntryModel:
    return AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-{action}",
        tenant_id=tenant_id,
        actor=actor,
        action=action,
        detail=detail,
        timestamp=datetime.now(UTC).isoformat(),
    )


@router.post("/login")
async def login(body: LoginRequest, db: Db) -> dict:
    result = await db.execute(select(UserModel).where(UserModel.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError(401, "UNAUTHENTICATED", "Invalid email or password")

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "tenant_id": user.tenant_id,
    })
    entry = _audit(None, user.tenant_id, user.name, "auth.login", user.email)
    db.add(entry)
    await db.commit()
    return {"token": token, **_user_to_schema(user).model_dump()}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(claims: CurrentClaims, db: Db) -> None:
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-logout",
        tenant_id=claims["tenant_id"],
        actor=claims["name"],
        action="auth.logout",
        detail="",
        timestamp=datetime.now(UTC).isoformat(),
    )
    db.add(entry)
    await db.commit()


@router.post("/password/reset-request", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(body: PasswordResetRequest, db: Db) -> None:
    # In production: send reset email via SES. For now: log and return 204.
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-pwreset-req",
        tenant_id="t-dev",
        actor=body.email,
        action="auth.password_reset_requested",
        detail=body.email,
        timestamp=datetime.now(UTC).isoformat(),
    )
    db.add(entry)
    await db.commit()


@router.post("/password/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(body: PasswordReset, db: Db) -> None:
    # In production: validate reset token from SES link. Stub for now.
    entry = AuditEntryModel(
        id=f"a-{datetime.now(UTC).timestamp()}-pwreset",
        tenant_id="t-dev",
        actor="system",
        action="auth.password_reset",
        detail="Password updated",
        timestamp=datetime.now(UTC).isoformat(),
    )
    db.add(entry)
    await db.commit()


@router.get("/me")
async def get_me(claims: CurrentClaims, db: Db) -> User:
    result = await db.execute(select(UserModel).where(UserModel.id == claims["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise not_found("User")
    return _user_to_schema(user)
