/**
 * mockApi — single source of truth for all data access in prototype mode.
 *
 * Every function maps 1:1 to a future FastAPI endpoint (see // FastAPI: comments).
 * Components MUST call these functions — never hardcode data.
 *
 * Latency is simulated at ~400ms. Store is in-memory and resets on full reload.
 */
import type {
  AuditEntry,
  Donor,
  DonorDocument,
  DocumentType,
  Role,
  Tenant,
  User,
} from "./types";
import { buildSeedAudit, buildSeedDonors, seedTenant, seedUsers } from "./seed";

// Base URL is read but unused in mock mode; kept for handoff to the FastAPI backend.
export const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_API_BASE_URL) ||
  "/api";

interface Store {
  tenant: Tenant;
  users: User[];
  donors: Donor[];
  audit: AuditEntry[];
  currentUserId: string;
}

const donors = buildSeedDonors();
const SESSION_KEY = "tissueqa.session";

function readSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) window.localStorage.setItem(SESSION_KEY, userId);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

const initialSessionUserId = readSession();
const store: Store = {
  tenant: { ...seedTenant },
  users: seedUsers.map((u) => ({ ...u })),
  donors,
  audit: buildSeedAudit(donors),
  // currentUserId always points at a valid mock user so role-aware UI keeps
  // working; the actual sign-in state lives in localStorage (SESSION_KEY).
  currentUserId:
    (initialSessionUserId && seedUsers.find((u) => u.id === initialSessionUserId)?.id) ??
    seedUsers[0].id,
};

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function appendAudit(entry: Omit<AuditEntry, "id" | "timestamp">) {
  store.audit.unshift({
    ...entry,
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  });
}

function actorName(): string {
  return store.users.find((u) => u.id === store.currentUserId)?.name ?? "unknown";
}

// ─────────────────────────── Session (UI-only) ───────────────────────────────

/** Synchronous check used by route guards. Safe on the server (returns false). */
export function hasSession(): boolean {
  return readSession() !== null;
}

// ─────────────────────────── Auth / session ──────────────────────────────────

// FastAPI: POST /auth/login
export async function login(email: string, _password: string): Promise<User> {
  await wait(300);
  // Try to match an existing seeded user by email; otherwise stay as the
  // current mock identity. Either way, persist a session token.
  const match = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (match) store.currentUserId = match.id;
  writeSession(store.currentUserId);
  appendAudit({ actor: actorName(), action: "auth.login", detail: email });
  return clone(store.users.find((u) => u.id === store.currentUserId)!);
}

// FastAPI: POST /auth/signup
export async function signup(input: { email: string; name: string }): Promise<User> {
  await wait(300);
  const existing = store.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
  const user: User = existing ?? {
    id: `u-${Date.now()}`,
    email: input.email,
    name: input.name,
    role: "coordinator",
    tenantId: store.tenant.id,
  };
  if (!existing) store.users.push(user);
  store.currentUserId = user.id;
  writeSession(user.id);
  appendAudit({ actor: user.name, action: "auth.signup", detail: input.email });
  return clone(user);
}

// FastAPI: POST /auth/logout
export async function logout(): Promise<void> {
  await wait(120);
  appendAudit({ actor: actorName(), action: "auth.logout", detail: "" });
  writeSession(null);
}

// FastAPI: POST /auth/password/reset-request
export async function requestPasswordReset(email: string): Promise<void> {
  await wait(300);
  appendAudit({ actor: email, action: "auth.password_reset_requested", detail: email });
}

// FastAPI: POST /auth/password/reset
export async function resetPassword(_token: string, _newPassword: string): Promise<void> {
  await wait(300);
  appendAudit({ actor: actorName(), action: "auth.password_reset", detail: "Password updated" });
}

// FastAPI: GET /auth/me
export async function getCurrentUser(): Promise<User> {
  await wait(120);
  return clone(store.users.find((u) => u.id === store.currentUserId)!);
}

// FastAPI: POST /auth/role  (prototype-only role switcher)
export async function setRole(role: Role): Promise<User> {
  await wait(120);
  const target = store.users.find((u) => u.role === role);
  if (target) store.currentUserId = target.id;
  return clone(store.users.find((u) => u.id === store.currentUserId)!);
}

// FastAPI: GET /tenants/current
export async function getTenant(): Promise<Tenant> {
  await wait(120);
  return clone(store.tenant);
}

// ─────────────────────────── Donors ──────────────────────────────────────────

// FastAPI: GET /donors
export async function listDonors(): Promise<Donor[]> {
  await wait();
  return clone(store.donors);
}

export interface DonorListQuery {
  q?: string;
  tissue?: "BT" | "MS";
  rec?: "ACCEPT" | "REJECT" | "INDETERMINATE" | "none";
  comp?: "COMPLETE" | "INCOMPLETE";
  sort?: "id" | "tissue" | "completeness" | "recommendation" | "createdAt" | "createdBy" | "documents";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface DonorListResult {
  rows: Donor[];
  total: number;
  page: number;
  pageSize: number;
  totalUnfiltered: number;
}

// FastAPI: GET /donors?q=&tissue=&rec=&comp=&sort=&dir=&page=&pageSize=
export async function listDonorsPage(query: DonorListQuery = {}): Promise<DonorListResult> {
  await wait(250);
  const { q, tissue, rec, comp, sort = "createdAt", dir = "desc", page = 1, pageSize = 200 } = query;

  let rows = store.donors.slice();
  const totalUnfiltered = rows.length;

  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (d) => d.id.toLowerCase().includes(needle) || d.createdBy.toLowerCase().includes(needle),
    );
  }
  if (tissue) rows = rows.filter((d) => d.tissueType === tissue);
  if (rec) {
    if (rec === "none") rows = rows.filter((d) => d.evaluation === null);
    else rows = rows.filter((d) => d.evaluation?.recommendation === rec);
  }
  if (comp) rows = rows.filter((d) => d.evaluation?.completeness.state === comp);

  const sortGet = (d: Donor): string | number => {
    switch (sort) {
      case "id":
        return d.id;
      case "tissue":
        return d.tissueType;
      case "completeness":
        return d.evaluation?.completeness.state ?? "";
      case "recommendation":
        return d.evaluation?.recommendation ?? "";
      case "createdBy":
        return d.createdBy;
      case "documents":
        return d.documents.length;
      case "createdAt":
      default:
        return d.createdAt;
    }
  };
  rows.sort((a, b) => {
    const av = sortGet(a);
    const bv = sortGet(b);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return { rows: clone(paged), total, page, pageSize, totalUnfiltered };
}

// FastAPI: GET /donors/{id}
export async function getDonor(id: string): Promise<Donor> {
  await wait();
  const d = store.donors.find((x) => x.id === id);
  if (!d) throw new Error(`Donor ${id} not found`);
  return clone(d);
}

// FastAPI: GET /donors/next-id
export function nextDonorId(): string {
  const year = new Date().getFullYear();
  const prefix = `D-${year}-`;
  let max = 0;
  for (const d of store.donors) {
    if (!d.id.startsWith(prefix)) continue;
    const n = parseInt(d.id.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export interface CreateDonorInput {
  id: string;
  tissueType: "BT" | "MS";
  documents?: { type: DocumentType; fileName: string; pageCount?: number }[];
}

// FastAPI: POST /donors
export async function createDonor(input: CreateDonorInput): Promise<Donor> {
  await wait();
  if (store.donors.some((d) => d.id === input.id)) {
    throw new Error(`Donor ID ${input.id} already exists`);
  }
  const createdAt = new Date().toISOString();
  const docs: DonorDocument[] = (input.documents ?? []).map((doc, i) => ({
    id: `doc-${Date.now()}-${i}`,
    donorId: input.id,
    type: doc.type,
    fileName: doc.fileName,
    pageCount: doc.pageCount ?? 2,
    uploadedAt: createdAt,
    status: "extracted",
  }));
  const donor: Donor = {
    id: input.id,
    tenantId: store.tenant.id,
    tissueType: input.tissueType,
    createdAt,
    createdBy: actorName(),
    documents: docs,
    fields: [],
    evaluation: null,
  };
  store.donors.unshift(donor);
  appendAudit({
    donorId: donor.id,
    actor: actorName(),
    action: "donor.created",
    detail: `Donor ${donor.id} created (${donor.tissueType})${docs.length ? ` with ${docs.length} document${docs.length === 1 ? "" : "s"}` : ""}`,
  });
  return clone(donor);
}

// ─────────────────────────── Documents ───────────────────────────────────────

// FastAPI: POST /donors/{id}/documents:upload-combined
export async function uploadCombinedPdf(
  donorId: string,
  fileName: string,
): Promise<{ classifications: { type: DocumentType; pageRange: [number, number]; confidence: number }[] }> {
  await wait(700);
  const classifications: { type: DocumentType; pageRange: [number, number]; confidence: number }[] = [
    { type: "authorization_consent", pageRange: [1, 2], confidence: 0.95 },
    { type: "drai", pageRange: [3, 6], confidence: 0.92 },
    { type: "idt_report", pageRange: [7, 9], confidence: 0.94 },
    { type: "medical_records", pageRange: [10, 15], confidence: 0.9 },
  ];
  appendAudit({ donorId, actor: actorName(), action: "document.combined_uploaded", detail: fileName });
  return { classifications };
}

// FastAPI: POST /donors/{id}/documents
export async function uploadDocument(
  donorId: string,
  input: { type: DocumentType; fileName: string; pageCount?: number },
): Promise<DonorDocument> {
  await wait(500);
  const donor = store.donors.find((d) => d.id === donorId);
  if (!donor) throw new Error("Donor not found");
  const newDoc: DonorDocument = {
    id: `doc-${Date.now()}`,
    donorId,
    type: input.type,
    fileName: input.fileName,
    pageCount: input.pageCount ?? 2,
    uploadedAt: new Date().toISOString(),
    status: "extracted",
  };
  donor.documents.push(newDoc);
  appendAudit({ donorId, actor: actorName(), action: "document.uploaded", detail: `${input.fileName} (${input.type})` });
  return clone(newDoc);
}

// FastAPI: POST /donors/{id}/evaluate
export async function runExtractionAndEvaluation(donorId: string): Promise<Donor> {
  await wait(900);
  const d = store.donors.find((x) => x.id === donorId);
  if (!d) throw new Error("Donor not found");
  appendAudit({ donorId, actor: "system", action: "evaluation.completed", detail: d.evaluation ? `Recommendation ${d.evaluation.recommendation}` : "Evaluation run" });
  return clone(d);
}

// FastAPI: PATCH /donors/{donorId}/fields/{fieldId}
export async function setFieldReviewed(donorId: string, fieldId: string, reviewed: boolean): Promise<void> {
  await wait(200);
  const d = store.donors.find((x) => x.id === donorId);
  const f = d?.fields.find((x) => x.id === fieldId);
  if (!d || !f) throw new Error("Field not found");
  f.reviewed = reviewed;
  appendAudit({
    donorId,
    actor: actorName(),
    action: reviewed ? "field.reviewed" : "field.unreviewed",
    detail: `${f.label} = ${f.value ?? "—"}`,
  });
}

// FastAPI: POST /donors/{id}:mark-reviewed
export async function markDonorReviewed(donorId: string): Promise<Donor> {
  await wait(300);
  const d = store.donors.find((x) => x.id === donorId);
  if (!d) throw new Error("Donor not found");
  d.reviewedBy = actorName();
  d.reviewedAt = new Date().toISOString();
  appendAudit({ donorId, actor: actorName(), action: "donor.reviewed", detail: `Marked reviewed by ${actorName()}` });
  return clone(d);
}

// ─────────────────────────── Audit / users / settings ────────────────────────

// FastAPI: GET /audit?donorId=...
export async function getAuditTrail(donorId?: string): Promise<AuditEntry[]> {
  await wait();
  const rows = donorId ? store.audit.filter((a) => a.donorId === donorId) : store.audit;
  return clone(rows);
}

// FastAPI: GET /users
export async function listUsers(): Promise<User[]> {
  await wait();
  return clone(store.users);
}

// FastAPI: PATCH /users/{id}/role
export async function updateUserRole(userId: string, role: Role): Promise<User> {
  await wait(250);
  const u = store.users.find((x) => x.id === userId);
  if (!u) throw new Error("User not found");
  const prev = u.role;
  u.role = role;
  appendAudit({
    actor: actorName(),
    action: "user.role_changed",
    detail: `${u.name}: ${prev} → ${role}`,
  });
  return clone(u);
}

// FastAPI: GET /tenants/current/settings
export async function getSettings(): Promise<Tenant> {
  await wait(200);
  return clone(store.tenant);
}

// FastAPI: PATCH /tenants/current/settings
export async function saveSettings(input: Partial<Tenant>): Promise<Tenant> {
  await wait(400);
  store.tenant = { ...store.tenant, ...input };
  appendAudit({ actor: actorName(), action: "settings.updated", detail: Object.keys(input).join(", ") });
  return clone(store.tenant);
}
