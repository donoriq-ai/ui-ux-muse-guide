# Backend Handoff Plan

Scope is locked to the pending items identified from `donoriq-prompt.md`. Nothing outside that list will be added.

## Highest priority — do first

**1. Generate `docs/api-contract.md`** (single source of truth for the Cursor/FastAPI team)

Source: the 23 `// FastAPI:` comments in `src/lib/api/mockApi.ts` + types in `src/lib/api/types.ts`.

Sections:
- Overview + base URL convention (`VITE_API_BASE_URL`)
- Auth: expected JWT header shape, role claims
- Endpoint reference — one entry per mock function, grouped by resource (Auth, Donors, Documents, Extraction, Eligibility, Audit, Settings). Each entry:
  - Method + path (from the `// FastAPI:` comment)
  - Request shape (path/query/body) referencing types
  - Response shape referencing types
  - Notes (pagination, async job pattern, side effects)
- Upload contract: multipart fields, max size, MIME allowlist, async classify+extract job pattern
- Ruleset versioning: server returns `rulesetVersion` on evaluation responses
- Errors: standard error envelope + status codes
- ID & timestamp generation: server-owned

Deliverable: one markdown file. No code changes.

## Follow-ups (planned, not executed yet)

**2. Env & config handoff**
- Add `.env.example` with `VITE_API_BASE_URL`, `VITE_USE_MOCK_API`
- Add `README.md` section: "Backend handoff" — how to flip mock → real API, run locally

**3. Network layer seam**
- Create `src/lib/api/client.ts` exporting a single `api` object
- Behind `VITE_USE_MOCK_API`, re-export either `mockApi` or a new `httpApi` (stub for now)
- Refactor component imports from `mockApi` → `client`
- No behavior change with flag on

**4. Auth handoff markers**
- Annotate `login` and `setRole` in `mockApi.ts` as prototype-only
- Document expected JWT shape + RBAC claims in `api-contract.md`

**5. Server-owned generators**
- Remove client-side `nextDonorId()`; mark as server responsibility in contract
- Same for timestamps on create/update

**6. Ruleset version surface**
- Replace hardcoded `"BT-MS-v0.1"` seed with value returned from eligibility endpoint
- Document in contract

**7. Synthetic-data flag**
- Gate "Synthetic data — prototype only" banner on `VITE_USE_MOCK_API`

**8. Known out-of-scope (document only, no code)**
- Real PDF preview in Source sheet stays placeholder
- Audit `actor` will be derived from session server-side

## Execution order on approval

Step 1 only this round. Steps 2–7 wait for explicit go-ahead so the contract can be reviewed first.
