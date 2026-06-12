from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DonorModel(Base):
    __tablename__ = "donors"

    id: Mapped[str] = mapped_column(primary_key=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    tissue_type: Mapped[str]  # BT | MS
    created_at: Mapped[str]
    created_by: Mapped[str]
    reviewed_by: Mapped[str | None] = mapped_column(nullable=True)
    reviewed_at: Mapped[str | None] = mapped_column(nullable=True)
    # Soft-delete marker. The audit log FK is ondelete=RESTRICT, so donors are never
    # hard-deleted; this timestamp hides the donor from list/get without losing history.
    deleted_at: Mapped[str | None] = mapped_column(nullable=True)
    # Denormalized for fast reads; evaluation written as immutable JSONB blob
    evaluation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class DonorDocumentModel(Base):
    __tablename__ = "donor_documents"

    id: Mapped[str] = mapped_column(primary_key=True)
    donor_id: Mapped[str] = mapped_column(ForeignKey("donors.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(index=True)
    type: Mapped[str]
    file_name: Mapped[str]
    page_count: Mapped[int] = mapped_column(default=0)
    uploaded_at: Mapped[str]
    status: Mapped[str] = mapped_column(default="processing")  # processing | extracted | error


class ExtractedFieldModel(Base):
    __tablename__ = "extracted_fields"

    id: Mapped[str] = mapped_column(primary_key=True)
    donor_id: Mapped[str] = mapped_column(ForeignKey("donors.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("donor_documents.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(index=True)
    label: Mapped[str]
    key: Mapped[str]
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float]
    citation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    flagged_low_confidence: Mapped[bool] = mapped_column(default=False)
    reviewed: Mapped[bool] = mapped_column(default=False)
