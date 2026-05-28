# TissueQA — API Contract (v0.1)

Single source of truth for the FastAPI backend handoff. Mirrors `src/lib/api/mockApi.ts` 1:1. Every prototype call site (components, hooks, routes) goes through that module, so implementing this contract on the server is sufficient to swap the mock for real HTTP.

---

## 1. Overview

- **Base URL**: configured client-side via `VITE_API_BASE_URL` (default `/api`).
- **Format**: JSON request/response. `Content-Type: application/json` unless noted (file uploads use `multipart/form-data`).
- **Tenancy**: all resources are scoped to the caller's tenant via the JWT. The client never passes `tenantId`.
- **Time**: all timestamps are ISO‑8601 strings (UTC).
- **IDs & timestamps**: generated server-side. The client must not mint IDs or `createdAt`/`uploadedAt`/`evaluatedAt` values.
- **Pagination**: 1‑indexed `page` + `pageSize`. Responses include `total` and (where applicable) `totalUnfiltered`.

---

## 2. Authentication

JWT bearer in `Authorization: Bearer <token>`. Token issued by `POST /auth/login` or `POST /auth/signup`.

Expected claims:

```json
{
  "sub": "u-123",          // user id
  "email": "user@org.com",
  "name": "Jane Doe",
  "role": "coordinator | medical_director | admin",
  "tenant_id": "t-acme",
  "iat": 0,
  "exp": 0
}
```

RBAC is enforced server-side from `role`. The client uses it only for UI gating. `POST /auth/role` is a prototype-only role switcher and **must not ship** in the FastAPI backend.

---

## 3. Shared Types

See `src/lib/api/types.ts` for the canonical TypeScript definitions. Server schemas must be byte-compatible. Key shapes:

- `User { id, email, name, role, tenantId }`
- `Tenant { id, name, confidenceThreshold, gestationalAgePolicyWeeks }`
- `Donor { id, tenantId, tissueType: "BT"|"MS", createdAt, createdBy, reviewedBy?, reviewedAt?, documents[], fields[], evaluation }`
- `DonorDocument { id, donorId, type: DocumentType, fileName, pageCount, uploadedAt, status: "processing"|"extracted"|"error" }`
- `ExtractedField { id, documentId, label, key, value, confidence, citation, flaggedLowConfidence, reviewed }`
- `Citation { documentId, documentLabel, page, bbox?: [x,y,w,h], confidence }`
- `DonorEvaluation { completeness: { state, items[] }, recommendation, findings[], rulesetVersion, evaluatedAt }`
- `RuleFinding { criterionId, title, state, severity: "HARD"|"GATE"|"COND", inputs[], ruleCitation: { aatb?, cfr? }, reasoning }`
- `AuditEntry { id, donorId?, actor, action, detail, timestamp }`

`DocumentType` enum: `authorization_consent | medical_records | drai | physical_assessment | idt_report | birth_delivery_summary | death_certificate | autopsy_report | recovery_timing_record | transfusion_record | culture_results`.

---

## 4. Error Envelope

All non-2xx responses:

```json
{ "error": { "code": "DONOR_NOT_FOUND", "message": "Donor D-2026-0001 not found", "details": {} } }
```

Standard codes:

| HTTP | code                  | Used for                                     |
|------|-----------------------|----------------------------------------------|
| 400  | `VALIDATION_ERROR`    | Bad input / schema mismatch                  |
| 401  | `UNAUTHENTICATED`     | Missing/invalid token                        |
| 403  | `FORBIDDEN`           | RBAC denial                                  |
| 404  | `NOT_FOUND`           | Resource missing                             |
| 409  | `CONFLICT`            | Duplicate (e.g. donor ID already exists)     |
| 413  | `PAYLOAD_TOO_LARGE`   | Upload exceeds max size                      |
| 415  | `UNSUPPORTED_MEDIA`   | Bad MIME on upload                           |
| 422  | `RULE_EVAL_FAILED`    | Evaluation could not be produced             |
| 500  | `INTERNAL`            | Unhandled                                    |

---

## 5. Endpoints

### 5.1 Auth & Session

#### `POST /auth/login`
- **Body**: `{ email: string, password: string }`
- **200**: `User` + sets/returns JWT (header `Authorization` or body `{ token }` — pick one and document).
- **Audit**: `auth.login`.

#### `POST /auth/signup`
- **Body**: `{ email: string, name: string, password: string }`
- **200**: `User`. Default role: `coordinator`.
- **Audit**: `auth.signup`.

#### `POST /auth/logout`
- **204**. Invalidates the token server-side.
- **Audit**: `auth.logout`.

#### `POST /auth/password/reset-request`
- **Body**: `{ email: string }` → **204**. Sends reset email.
- **Audit**: `auth.password_reset_requested`.

#### `POST /auth/password/reset`
- **Body**: `{ token: string, newPassword: string }` → **204**.
- **Audit**: `auth.password_reset`.

#### `GET /auth/me`
- **200**: `User` for the bearer token.

#### `POST /auth/role` *(prototype-only — DO NOT IMPLEMENT)*
- Mock-only role switcher used by the prototype UI. Real RBAC comes from the JWT.

#### `GET /tenants/current`
- **200**: `Tenant`.

---

### 5.2 Donors

#### `GET /donors`
- **200**: `Donor[]` (full list, unpaginated). Prefer 5.2.2 for UI lists.

#### `GET /donors?q=&tissue=&rec=&comp=&sort=&dir=&page=&pageSize=`
- **Query**:
  - `q`: string — matches donor `id` or `createdBy`
  - `tissue`: `BT | MS`
  - `rec`: `ACCEPT | REJECT | INDETERMINATE | none` (`none` = no evaluation yet)
  - `comp`: `COMPLETE | INCOMPLETE`
  - `sort`: `id | tissue | completeness | recommendation | createdAt | createdBy | documents` (default `createdAt`)
  - `dir`: `asc | desc` (default `desc`)
  - `page`: integer ≥ 1 (default `1`)
  - `pageSize`: integer (default `200`)
- **200**: `{ rows: Donor[], total, page, pageSize, totalUnfiltered }`.

#### `GET /donors/{id}`
- **200**: `Donor`. **404** `NOT_FOUND` if missing.

#### `GET /donors/next-id`
- **200**: `{ id: "D-YYYY-NNNN" }`. Server allocates the next sequence for the current year & tenant. Client no longer computes this.

#### `POST /donors`
- **Body**: `{ id: string, tissueType: "BT"|"MS", documents?: [{ type: DocumentType, fileName, pageCount? }] }`
- **200**: `Donor` (with any seeded documents in `status: "extracted"` after async processing).
- **Errors**: **409** `CONFLICT` if `id` already exists.
- **Audit**: `donor.created`.

#### `POST /donors/{id}:mark-reviewed`
- **200**: updated `Donor` (sets `reviewedBy`, `reviewedAt`).
- **Audit**: `donor.reviewed`.

---

### 5.3 Documents & Extraction

#### `POST /donors/{id}/documents:upload-combined`
- **Request**: `multipart/form-data`
  - `file`: PDF (required)
  - Max size: **50 MB** (suggested). Returns **413** above.
  - Allowed MIME: `application/pdf` only. Otherwise **415**.
- **200**:
  ```json
  {
    "classifications": [
      { "type": "authorization_consent", "pageRange": [1,2], "confidence": 0.95 },
      { "type": "drai",                  "pageRange": [3,6], "confidence": 0.92 }
    ]
  }
  ```
- **Audit**: `document.combined_uploaded`.
- **Async job pattern**: classification runs inline (fast). Per-document extraction then runs asynchronously — clients poll `GET /donors/{id}` and read `documents[].status` (`processing → extracted | error`). Webhook delivery is out of scope for v0.1.

#### `POST /donors/{id}/documents`
- **Request**: `multipart/form-data`
  - `file`: PDF (required, ≤ 25 MB, `application/pdf`)
  - `type`: `DocumentType` (required)
- **200**: `DonorDocument` (initial `status: "processing"`; flips to `"extracted"` once the async job completes).
- **Audit**: `document.uploaded`.

#### `POST /donors/{id}/evaluate`
- **Body**: none.
- **200**: `Donor` with fully populated `fields[]` and `evaluation` (`completeness`, `findings`, `recommendation`, `rulesetVersion`, `evaluatedAt`).
- **Errors**: **422** `RULE_EVAL_FAILED` if extraction is incomplete.
- **Audit**: `evaluation.completed`. Actor is `"system"`.

#### `PATCH /donors/{donorId}/fields/{fieldId}`
- **Body**: `{ reviewed: boolean }`
- **204**.
- **Audit**: `field.reviewed` | `field.unreviewed`.

---

### 5.4 Audit

#### `GET /audit?donorId=...`
- **Query**: `donorId?` (optional). Without it, returns the full tenant trail (most recent first).
- **200**: `AuditEntry[]`.
- **Server-derived `actor`**: must come from the JWT (`name` claim) or system jobs, **never** from the client.

Action vocabulary (extend as needed, but keep stable for filtering):
`auth.login`, `auth.signup`, `auth.logout`, `auth.password_reset_requested`, `auth.password_reset`,
`donor.created`, `donor.reviewed`,
`document.uploaded`, `document.combined_uploaded`,
`evaluation.completed`,
`field.reviewed`, `field.unreviewed`,
`user.role_changed`, `settings.updated`.

---

### 5.5 Users

#### `GET /users`
- **200**: `User[]` (tenant-scoped).

#### `PATCH /users/{id}/role`
- **Body**: `{ role: Role }`
- **200**: updated `User`.
- **Audit**: `user.role_changed`.

---

### 5.6 Settings

#### `GET /tenants/current/settings`
- **200**: `Tenant`.

#### `PATCH /tenants/current/settings`
- **Body**: `Partial<Tenant>` (typically `{ confidenceThreshold?, gestationalAgePolicyWeeks? }`; `id` & `name` are read-only here).
- **200**: updated `Tenant`.
- **Audit**: `settings.updated` (detail = changed keys).

---

## 6. Ruleset Versioning

The hardcoded `RULESET_VERSION = "BT-MS-v0.1"` in `src/lib/api/types.ts` exists only for prototype seeds. In production:

- The server owns the active ruleset version.
- Every `DonorEvaluation` response includes `rulesetVersion` (already in the type).
- The client must display the version returned by the server — never the constant.

---

## 7. Upload Contract Summary

| Field         | Combined upload                       | Per-document upload          |
|---------------|---------------------------------------|------------------------------|
| Endpoint      | `POST /donors/{id}/documents:upload-combined` | `POST /donors/{id}/documents` |
| Encoding      | `multipart/form-data`                 | `multipart/form-data`        |
| File field    | `file` (required)                     | `file` (required)            |
| Extra fields  | —                                     | `type: DocumentType`         |
| MIME allowed  | `application/pdf`                     | `application/pdf`            |
| Max size      | 50 MB                                 | 25 MB                        |
| Side effects  | Classifies pages, kicks off async extraction per detected doc | Stores file, kicks off async extraction |
| Polling       | `GET /donors/{id}` → `documents[].status` | same                         |

---

## 8. Out of Scope for v0.1

- Real PDF preview / bbox rendering in the Source sheet (UI placeholder remains).
- Webhook delivery for extraction completion (poll only).
- Tenant provisioning / billing.
- File download endpoints (not used by the current UI).
