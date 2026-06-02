"""
Seed script — populates the DB with the dev tenant and users.
No synthetic donors or documents are created; all donor data must come
from real uploads through the application.

Usage:
    uv run python -m app.seed
"""
import asyncio

from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models import TenantModel, UserModel

TENANT = TenantModel(
    id="t-dev",
    name="Acme Tissue Bank (Dev)",
    confidence_threshold=0.80,
    gestational_age_policy_weeks=20,
)

USERS = [
    UserModel(
        id="u-coord-1",
        tenant_id="t-dev",
        email="coordinator@acme.dev",
        name="Alice Coordinator",
        role="coordinator",
        password_hash=hash_password("dev-password"),
    ),
    UserModel(
        id="u-md-1",
        tenant_id="t-dev",
        email="medical.director@acme.dev",
        name="Dr. Bob Director",
        role="medical_director",
        password_hash=hash_password("dev-password"),
    ),
    UserModel(
        id="u-admin-1",
        tenant_id="t-dev",
        email="admin@acme.dev",
        name="Carol Admin",
        role="admin",
        password_hash=hash_password("dev-password"),
    ),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(text("SELECT id FROM tenants WHERE id = 't-dev'"))
        if existing.scalar_one_or_none():
            print("Seed data already present — skipping.")
            return

        db.add(TENANT)
        await db.flush()
        for u in USERS:
            db.add(u)

        await db.commit()
        print("Seed complete.")
        print("  Tenant:   t-dev / Acme Tissue Bank (Dev)")
        print("  Users:    coordinator@acme.dev")
        print("            medical.director@acme.dev")
        print("            admin@acme.dev")
        print("  Password: dev-password (all users)")


if __name__ == "__main__":
    asyncio.run(seed())
