"""
Append-only audit log. No UPDATE or DELETE on this table — ever.
"""
from sqlalchemy import ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditEntryModel(Base):
    __tablename__ = "audit_entries"

    id: Mapped[str] = mapped_column(primary_key=True)
    tenant_id: Mapped[str] = mapped_column(index=True)
    donor_id: Mapped[str | None] = mapped_column(
        ForeignKey("donors.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    actor: Mapped[str]
    action: Mapped[str] = mapped_column(index=True)
    detail: Mapped[str]
    timestamp: Mapped[str] = mapped_column(index=True)
