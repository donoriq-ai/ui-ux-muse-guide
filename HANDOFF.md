# TissueQA — Handoff to Cursor (FastAPI backend)

## What this is

TissueQA is a tissue-donor eligibility review prototype. Coordinators upload donor documents (consent, DRAI, IDT, medical records, etc.), the system extracts fields, evaluates them against a versioned ruleset (BT/MS), and produces an `ACCEPT | REJECT | INDETERMINATE` recommendation with citations. Medical Directors review and sign off.

Built in Lovable. Frontend is **feature-complete** against the original spec (`donoriq-prompt.md`). The backend is the next job — that's what you're picking up.

## Stack

- **Frontend**: React 19 + TanStack Start (Vite 7), Tailwind v4, shadcn/ui
- **Routing**: file-based under `src/routes/` (auto-generated `routeTree.gen.ts` — do not edit)
- **Data layer**: every component calls `src/lib/api/mockApi.ts`. In-memory store, ~400 ms simulated latency, seeded from `src/lib/api/seed.ts`.
- **Types**: `src/lib/api/types.ts` — these are the canonical schemas. Match them on the server.

## Your job

Replace `mockApi.ts` with a real HTTP client pointing at a FastAPI backend that implements **`docs/api-contract.md`**. That document is the single source of truth — endpoints, request/response shapes, JWT claims, error envelope, upload contract, audit vocabulary, ruleset versioning. Every function in `mockApi.ts` has a `// FastAPI: METHOD /path` comment matching the contract.

## Key files

| File                          | Why it matters                                            |
|-------------------------------|------------------------------------------------------------|
| `docs/api-contract.md`        | **Read this first.** Full API spec.                        |
| `src/lib/api/types.ts`        | Canonical TS types — mirror on the server.                 |
| `src/lib/api/mockApi.ts`      | The seam to replace. 23 functions, 1:1 with endpoints.     |
| `src/lib/api/seed.ts`         | Sample data shapes — useful for backend fixtures.          |
| `.lovable/plan.md`            | Build history / phase notes.                               |
| `docs/design-system.md`       | Design tokens (not relevant to backend work).              |

## Prototype-only — do NOT port

- `POST /auth/role` (`setRole`) — UI role switcher
- `nextDonorId()` — client-side ID generation; move to server sequence
- Hardcoded `RULESET_VERSION = "BT-MS-v0.1"` — server returns it on each evaluation
- "Synthetic data — prototype only" banner — gate on `VITE_USE_MOCK_API`
- `login` accepts any password — wire to real auth

## Running locally

```bash
bun install
bun dev
```

No `.env` required in mock mode. When the real backend is up, set:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_API=false
```

## Out of scope for v0.1

- Real PDF preview + bbox rendering in the Source sheet (placeholder stays)
- Webhook delivery for extraction jobs (client polls `documents[].status`)
- Tenant provisioning / billing
