# TissueQA — Frontend → Backend Handoff Notes

## What this is

TissueQA is a tissue-donor eligibility review prototype. Coordinators upload donor
documents (consent, DRAI, IDT, medical records, etc.), the system extracts fields,
evaluates them against a versioned ruleset (BT/MS), and produces an
`ACCEPT | REJECT | INDETERMINATE` recommendation with citations.
Medical Directors review and sign off.

The frontend is **feature-complete**. The backend is scaffolded and running locally.

## Repo structure

```
/
├── frontend/          # React 19 + TanStack Start (Vite 7)
│   ├── src/
│   │   ├── routes/    # file-based routing (routeTree.gen.ts is auto-generated)
│   │   └── lib/api/   # mockApi.ts, httpApi.ts, client.ts, types.ts
│   ├── vite.config.ts
│   └── package.json
├── backend/           # Python 3.12 + FastAPI
│   ├── app/
│   ├── rules/
│   └── pyproject.toml
├── docs/              # api-contract.md, specs
└── docker-compose.yml # Postgres 16 on :5433
```

## Key files

| File | Why it matters |
|------|----------------|
| `docs/api-contract.md` | **Read this first.** Full API spec. |
| `frontend/src/lib/api/types.ts` | Canonical TS types — mirrored by backend Pydantic schemas. |
| `frontend/src/lib/api/mockApi.ts` | The in-memory mock (23 functions, 1:1 with endpoints). |
| `frontend/src/lib/api/httpApi.ts` | Real HTTP client for FastAPI — mirrors mockApi interface. |
| `frontend/src/lib/api/client.ts` | Selector: routes to mockApi or httpApi via `VITE_USE_MOCK_API`. |

## Prototype-only — do NOT port to production

- `POST /auth/role` (`setRole`) — UI role switcher; not a real auth endpoint
- `nextDonorId()` — client-side ID generation; server uses DB sequences
- Hardcoded `RULESET_VERSION = "BT-MS-v0.1"` — server returns it on each evaluation
- `login` accepts any password — must be wired to real auth

## Running locally

See `RUNBOOK.md` for full setup. Quick start:

```bash
# Database
docker compose up -d

# Backend (cwd: backend/)
uv sync && uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# Frontend (cwd: frontend/)
bun install && bun dev
```

## Out of scope for v0.1

- Real PDF preview + bbox rendering in the Source sheet (placeholder stays)
- Webhook delivery for extraction jobs (client polls `documents[].status`)
- Tenant provisioning / billing
