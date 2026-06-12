"""
Pydantic v2 schemas — byte-compatible with src/lib/api/types.ts.
Field names, enums, and shapes must match exactly.
"""
from __future__ import annotations

from typing import Any

from pydantic import Field

from app.schemas.common import (
    ApiModel,
    CompletenessState,
    DocumentType,
    EvalState,
    Role,
    TissueType,
)


# ── Auth / Users / Tenant ─────────────────────────────────────────────────────

class User(ApiModel):
    id: str
    email: str
    name: str
    role: Role
    tenantId: str


class Tenant(ApiModel):
    id: str
    name: str
    confidenceThreshold: float
    gestationalAgePolicyWeeks: int


# ── Documents ─────────────────────────────────────────────────────────────────

class Citation(ApiModel):
    documentId: str
    documentLabel: str
    page: int
    bbox: tuple[float, float, float, float] | None = None
    confidence: float


class DonorDocument(ApiModel):
    id: str
    donorId: str
    type: DocumentType
    fileName: str
    pageCount: int
    uploadedAt: str
    status: str  # "processing" | "extracted" | "error"


class ExtractedField(ApiModel):
    id: str
    documentId: str
    label: str
    key: str
    value: str | None
    confidence: float
    citation: Citation | None
    flaggedLowConfidence: bool
    reviewed: bool


# ── Evaluation ────────────────────────────────────────────────────────────────

class RuleCitation(ApiModel):
    aatb: list[str] | None = None
    cfr: list[str] | None = None


class RuleInput(ApiModel):
    label: str
    value: str | None
    sourceCitation: Citation | None


class RuleFinding(ApiModel):
    criterionId: str
    title: str
    state: EvalState
    severity: str  # "HARD" | "GATE" | "COND"
    inputs: list[RuleInput]
    ruleCitation: RuleCitation
    reasoning: str


class CompletenessItem(ApiModel):
    requirement: str
    documentType: DocumentType | None = None
    status: str  # "present" | "missing" | "low_confidence"


class DonorEvaluation(ApiModel):
    completeness: dict[str, Any]
    recommendation: EvalState
    findings: list[RuleFinding]
    rulesetVersion: str
    evaluatedAt: str


# ── Donor ─────────────────────────────────────────────────────────────────────

class Donor(ApiModel):
    id: str
    tenantId: str
    tissueType: TissueType
    createdAt: str
    createdBy: str
    reviewedBy: str | None = None
    reviewedAt: str | None = None
    documents: list[DonorDocument] = Field(default_factory=list)
    fields: list[ExtractedField] = Field(default_factory=list)
    evaluation: DonorEvaluation | None = None


# ── Audit ─────────────────────────────────────────────────────────────────────

class AuditEntry(ApiModel):
    id: str
    donorId: str | None = None
    actor: str
    action: str
    detail: str
    timestamp: str


# ── Request bodies ────────────────────────────────────────────────────────────

class LoginRequest(ApiModel):
    email: str
    password: str


class CreateUserRequest(ApiModel):
    email: str
    name: str
    role: Role
    password: str | None = None


class PasswordResetRequest(ApiModel):
    email: str


class PasswordReset(ApiModel):
    token: str
    newPassword: str


class CreateDonorRequest(ApiModel):
    id: str
    tissueType: TissueType
    documents: list[dict] | None = None


class PatchFieldRequest(ApiModel):
    reviewed: bool


class PatchUserRoleRequest(ApiModel):
    role: Role


class PatchSettingsRequest(ApiModel):
    confidenceThreshold: float | None = None
    gestationalAgePolicyWeeks: int | None = None


# ── Paginated response ────────────────────────────────────────────────────────

class DonorListResult(ApiModel):
    rows: list[Donor]
    total: int
    page: int
    pageSize: int
    totalUnfiltered: int
