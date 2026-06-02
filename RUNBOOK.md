# TissueQA — Local Run Book

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [uv](https://docs.astral.sh/uv/getting-started/installation/) installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)

---

## Phase 1 — Stub mode (no API keys needed)

Everything works with synthetic data. This is the default.

### 1. Start the database

```bash
# From repo root
docker compose up -d
```

### 2. Run migrations (first time only)

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run python -m app.seed
```

### 3. Start the backend

```bash
# From backend/
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend is live at: http://localhost:8000  
API docs: http://localhost:8000/api/docs  
Health check: http://localhost:8000/health

### 4. Start the frontend (mock mode, default)

```bash
# From frontend/ — .env.local has VITE_USE_MOCK_API=true
bun install
bun dev
```

Frontend runs at http://localhost:3000.

### 5. Switch frontend to real backend

```bash
# From frontend/
cp .env.local.real-backend.example .env.local
bun dev
```

Login credentials (from seed):
- `coordinator@acme.dev` / `dev-password`
- `medical.director@acme.dev` / `dev-password`
- `admin@acme.dev` / `dev-password`

---

## Phase 2 — Real Reducto + Anthropic (keys required)

### 1. Add keys to `backend/.env`

```
EXTRACTOR_BACKEND=reducto
REDUCTO_API_KEY=<your key>

EVALUATOR_BACKEND=anthropic
ANTHROPIC_API_KEY=<your key>
```

### 2. Restart the backend

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The health endpoint will confirm:
```json
{"extractor": "reducto", "evaluator": "anthropic", ...}
```

### 3. Upload a synthetic test PDF

Use the "New Donor" flow in the frontend, upload any PDF, and trigger evaluation.
Reducto will classify + extract with Deep Split and Deep Extract, then Claude will
evaluate against the encoded BT/MS ruleset.

---

## Key files

| File | Purpose |
|---|---|
| `backend/.env` | Backend secrets (never commit) |
| `frontend/.env.local` | Frontend mode switch |
| `backend/rules/bt_ms/*.yaml` | Encoded BT/MS eligibility rules |
| `docs/api-contract.md` | API contract (source of truth) |
| `HANDOFF.md` | Repo structure + what NOT to port to production |
| `AGENTS.md` | AI agent rules (non-negotiables) |

---

## Handing off to the AWS team

The team needs to:
1. Replace `AuthProvider` stub with AWS Cognito JWT validation.
2. Point `DATABASE_URL` at the RDS Postgres instance.
3. Swap `EVALUATOR_BACKEND=anthropic` → use `BedrockEvaluator` (same `RuleEvaluator` interface).
4. Set `EXTRACTOR_BACKEND=reducto` with the production Reducto key under BAA/zero-retention config.
5. Wire `POST /auth/password/reset-request` to AWS SES.
6. Set `VITE_API_BASE_URL` to the production API gateway/load balancer URL.

No business logic or rule changes required for the handoff.
