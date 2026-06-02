/**
 * httpApi — real HTTP client for the FastAPI backend.
 * Every function maps 1:1 to a FastAPI endpoint. This is the only API module.
 */
import type { AuditEntry, Donor, DonorDocument, DocumentType, Role, Tenant, User } from "./types";

export interface DonorListQuery {
  q?: string;
  tissue?: "BT" | "MS";
  rec?: "ACCEPT" | "REJECT" | "INDETERMINATE" | "none";
  comp?: "COMPLETE" | "INCOMPLETE";
  sort?:
    | "id"
    | "tissue"
    | "completeness"
    | "recommendation"
    | "createdAt"
    | "createdBy"
    | "documents";
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

export interface CreateDonorInput {
  id: string;
  tissueType: "BT" | "MS";
  documents?: { type: DocumentType; fileName: string; pageCount?: number }[];
}

export const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_API_BASE_URL) ||
  "http://localhost:8000";

const SESSION_KEY = "tissueqa.jwt";

function getToken(): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(SESSION_KEY, token);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSession(): boolean {
  return getToken() !== null;
}

/** Thrown when the backend returns 401. Caught by the root error boundary to redirect to login. */
export class UnauthenticatedError extends Error {
  constructor() {
    super("HTTP 401");
    this.name = "UnauthenticatedError";
  }
}

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData?: boolean,
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  if (res.status === 401) {
    // Token is missing, expired, or invalid. Clear it and go straight to login.
    // Using window.location bypasses React/router serialization so the redirect
    // is guaranteed regardless of which async context threw the 401.
    setToken(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new UnauthenticatedError();
  }

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ─────────────────────────── Auth / session ──────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  const data = await req<User & { token: string }>("POST", "/auth/login", { email, password });
  setToken(data.token);
  const { token: _t, ...user } = data;
  return user as User;
}

export async function signup(input: {
  email: string;
  name: string;
  password?: string;
}): Promise<User> {
  return req<User>("POST", "/auth/signup", {
    email: input.email,
    name: input.name,
    password: input.password ?? "changeme",
  });
}

export async function logout(): Promise<void> {
  await req<void>("POST", "/auth/logout");
  setToken(null);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await req<void>("POST", "/auth/password/reset-request", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await req<void>("POST", "/auth/password/reset", { token, newPassword });
}

export async function getCurrentUser(): Promise<User> {
  return req<User>("GET", "/auth/me");
}

// Prototype-only — not implemented on the server; no-op in HTTP mode.
export async function setRole(_role: Role): Promise<User> {
  return getCurrentUser();
}

export async function getTenant(): Promise<Tenant> {
  return req<Tenant>("GET", "/tenants/current");
}

// ─────────────────────────── Donors ──────────────────────────────────────────

export async function listDonors(): Promise<Donor[]> {
  const result = await req<DonorListResult>("GET", "/donors");
  return result.rows;
}

export async function listDonorsPage(query: DonorListQuery = {}): Promise<DonorListResult> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.tissue) params.set("tissue", query.tissue);
  if (query.rec) params.set("rec", query.rec);
  if (query.comp) params.set("comp", query.comp);
  if (query.sort) params.set("sort", query.sort);
  if (query.dir) params.set("dir", query.dir);
  if (query.page != null) params.set("page", String(query.page));
  if (query.pageSize != null) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return req<DonorListResult>("GET", `/donors${qs ? `?${qs}` : ""}`);
}

export async function getDonor(id: string): Promise<Donor> {
  return req<Donor>("GET", `/donors/${id}`);
}

export function nextDonorId(): string {
  // Client-side fallback — server provides the authoritative ID via GET /donors/next-id.
  // The new-donor form should call getNextDonorId() instead.
  const year = new Date().getFullYear();
  return `D-${year}-XXXX`;
}

export async function getNextDonorId(): Promise<string> {
  const data = await req<{ id: string }>("GET", "/donors/next-id");
  return data.id;
}

export async function createDonor(input: CreateDonorInput): Promise<Donor> {
  return req<Donor>("POST", "/donors", {
    id: input.id,
    tissueType: input.tissueType,
    documents: input.documents,
  });
}

// ─────────────────────────── Documents ───────────────────────────────────────

export async function uploadCombinedPdf(
  donorId: string,
  file: File | string,
): Promise<{
  classifications: { type: DocumentType; pageRange: [number, number]; confidence: number }[];
}> {
  if (!(file instanceof File)) throw new Error("A File object is required for HTTP upload");
  const form = new FormData();
  form.append("file", file, file.name);
  return req<{
    classifications: { type: DocumentType; pageRange: [number, number]; confidence: number }[];
  }>("POST", `/donors/${donorId}/documents:upload-combined`, form, true);
}

export async function uploadDocument(
  donorId: string,
  input: { type: DocumentType; fileName: string; pageCount?: number; file?: File },
): Promise<DonorDocument> {
  if (!input.file) throw new Error("File is required for HTTP upload");
  const form = new FormData();
  form.append("file", input.file, input.fileName);
  form.append("type", input.type);
  return req<DonorDocument>("POST", `/donors/${donorId}/documents`, form, true);
}

/**
 * Fetch a rendered citation page as an object URL (blob).
 * `<img>` cannot send the JWT header, so we fetch with auth then create a blob URL.
 * Returns null when there is no stored PDF (404) — the caller falls back to a
 * synthetic preview. The caller is responsible for URL.revokeObjectURL().
 */
export async function fetchDocumentPage(
  donorId: string,
  documentId: string,
  page: number,
): Promise<string | null> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(
      `${API_BASE_URL}/donors/${donorId}/documents/${documentId}/pages/${page}`,
      { headers },
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function runExtractionAndEvaluation(donorId: string): Promise<Donor> {
  return req<Donor>("POST", `/donors/${donorId}/evaluate`);
}

export async function setFieldReviewed(
  donorId: string,
  fieldId: string,
  reviewed: boolean,
): Promise<void> {
  await req<void>("PATCH", `/donors/${donorId}/fields/${fieldId}`, { reviewed });
}

export async function markDonorReviewed(donorId: string): Promise<Donor> {
  return req<Donor>("POST", `/donors/${donorId}:mark-reviewed`);
}

// ─────────────────────────── Audit / users / settings ────────────────────────

export async function getAuditTrail(donorId?: string): Promise<AuditEntry[]> {
  const qs = donorId ? `?donorId=${donorId}` : "";
  return req<AuditEntry[]>("GET", `/audit${qs}`);
}

export async function listUsers(): Promise<User[]> {
  return req<User[]>("GET", "/users");
}

export async function updateUserRole(userId: string, role: Role): Promise<User> {
  return req<User>("PATCH", `/users/${userId}/role`, { role });
}

export async function getSettings(): Promise<Tenant> {
  return req<Tenant>("GET", "/tenants/current/settings");
}

export async function saveSettings(input: Partial<Tenant>): Promise<Tenant> {
  return req<Tenant>("PATCH", "/tenants/current/settings", input);
}
