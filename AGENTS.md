# AGENTS.md — TissueQA

> Source of truth for any AI coding agent working on this repository. Read before any task.
> If anything here conflicts with a user request, **stop and ask** before acting.

---

## What this is — and what it MUST NOT do

TissueQA is a multi-tenant SaaS for tissue-bank donor coordinators. It ingests donor
documents, extracts data via Reducto, and matches the data against fixed AATB / FDA rules
for Birth Tissue (BT) and Musculoskeletal (MS) tissue.

It is **decision support only**. It outputs `ACCEPT` / `REJECT` / `INDETERMINATE` with
citations. The eligibility determination is made by a Medical Director **off-system**.
Do not add logic, language, or UI that implies the app makes the determination.

---

## Non-negotiable constraints

These are inviolable. Do not "improve", silently change, or work around any of them.

- **Three-state output only**: `ACCEPT` / `REJECT` / `INDETERMINATE`. Never binary.
  Missing or low-confidence data → `INDETERMINATE`, never a silent `REJECT`.
- **Citations are mandatory** on every finding (rule citation: `AATB §<number>` + `21 CFR
  §<number>`) and every extracted field (source citation: documentId + page + bbox +
  confidence). **No citation, no finding.**
- **Never fabricate** AATB standard numbers, CFR sections, test thresholds, or timeframes.
  If a value is not in `docs/api-contract.md` or `docs/2025-08 Standards rev2 Final.md`
  (AATB 15th Ed rev 2, already in repo), **stop and ask**.
- **Never reproduce AATB Standards text** in code, prompts, comments, UI strings, or logs.
  The Standards are copyrighted. Cite by reference (standard number only) and express
  requirements in your own words.
- **Rules are pre-encoded YAML** under `backend/rules/bt_ms/`. Claude (`claude-sonnet-4-6`
  locally, Bedrock on AWS) **matches** extracted data against the encoded rules — it must
  never free-read the Standards or invent criteria.
- **Version pinning is required** on every evaluation record: ruleset version, Reducto
  pipeline version, model + prompt version, evaluator timestamp. This is the 21 CFR
  Part 11 spine — do not skip, batch-update, or backfill.
- **Audit log is append-only and immutable.** No `UPDATE` or `DELETE` on audit rows ever.
- **No real PHI** in dev, fixtures, tests, logs, prompts, commits, or PR descriptions.
  Synthetic data only. If you encounter what looks like real PHI, stop.
- **Secrets** (AWS keys, Reducto keys, DB credentials) live only in environment variables
  or AWS Secrets Manager. Never commit them. Never log them. Never put them in prompts.

---

## Architecture & stack (locked unless noted)

Current repo state: **frontend + backend both scaffolded, running locally, and verified end-to-end. Full BT/MS ruleset rebuilt to v0.2.**

What is confirmed working locally:
- `frontend/` boots at `:3000` with `bun dev` (mock mode, no backend needed)
- `backend/` boots at `:8000`; health, auth, donors, audit endpoints all respond correctly
- Real Anthropic evaluation pipeline is **live**: `EVALUATOR_BACKEND=anthropic`, model `claude-sonnet-4-6`
- Real Reducto extraction pipeline is **live**: `EXTRACTOR_BACKEND=reducto`, deep split + deep extract + citations
- Combined donor-packet upload splits PDFs into sections, extracts per section asynchronously, then evaluates
- **25 rules encoded** (`BT-001`–`BT-015` + `MS-001`–`MS-010`; see directory layout below). `RULESET_VERSION=BT-MS-v0.2`
- Frontend wired to real backend (`VITE_USE_MOCK_API=false`); file upload, live polling, and evaluate gate all work

What is still pending / SME-required before encoding:
- BT-004 gestational age threshold (weeks) — not in AATB Standards; bank SOPM required
- BT-005 max acquisition-to-processing interval (birth tissue) — not in Standards; bank SOPM required
- MS recovery completion window from asystole (beyond H15.450 skin-prep start) — bank-validated
- MS-010 donor age criteria (min/max) — AATB §H9.600 delegates to MD/MAC
- BT-009 APGAR cutoff — not in Standards; no numeric threshold to encode
- CMV / HTLV universal requirement for BT/MS — only required for leukocyte-rich or per state law

Frontend (`frontend/`) defaults to real backend (`VITE_USE_MOCK_API=false` in `frontend/.env.local`).
To switch back to mock: set `VITE_USE_MOCK_API=true` in `frontend/.env.local`.

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + TanStack Start (Vite 7) + TypeScript (strict) in `frontend/` | do **not** migrate to Next.js or Remix |
| Routing | TanStack Start file-based routing under `frontend/src/routes/` | `routeTree.gen.ts` is auto-generated — never edit by hand |
| UI kit | Tailwind v4 + shadcn/ui + Radix | preserve accessibility props |
| API selector | `frontend/src/lib/api/client.ts` — routes to `mockApi` or `httpApi` via `VITE_USE_MOCK_API` | all components import from `client`, never directly from `mockApi` or `httpApi` |
| Backend | Python 3.12 + FastAPI + Pydantic v2 in `backend/` | async I/O throughout; `uv` for deps |
| ORM | SQLAlchemy 2.0 async + Alembic in `backend/` | typed `Mapped[...]` style only |
| DB | PostgreSQL 16 in Docker (`docker compose up -d`, port 5433) | per-row tenant isolation via `tenant_id`; RLS for AWS |
| Extraction | Reducto — stub (no key) or real (`EXTRACTOR_BACKEND=reducto`) | Deep Split + Deep Extract + citations; BAA / zero PHI retention |
| LLM | `claude-sonnet-4-6` via Anthropic API (local) → AWS Bedrock in production | `temperature ≤ 0.2`; structured JSON output; `EVALUATOR_BACKEND=anthropic\|stub` |
| Auth | Local JWT (dev) → AWS Cognito (production, team handles) | `POST /auth/role` prototype switcher NOT implemented |
| Hosting | AWS, US region only | HIPAA-eligible services only |
| Compliance | HIPAA + SOC 2 (via Vanta) + 21 CFR Part 11 | all three apply, always |
| Package mgr | `bun` (JS, in `frontend/`), `uv` (Python, in `backend/`) | lock files committed (`frontend/bun.lock`, `backend/uv.lock`) |

Do not add new dependencies without asking — especially anything LLM-, auth-, crypto-, or
PII-adjacent.

---

## The contract — do not drift from it

- `docs/api-contract.md` is the **single source of truth** for the API — endpoints,
  request/response shapes, JWT claims, error envelope, upload contract, audit vocabulary,
  ruleset versioning. **Read it first** for any backend or data-layer work.
- `frontend/src/lib/api/types.ts` holds the **canonical TS types**. Backend Pydantic models must
  mirror these **exactly** (same field names, enums, shapes).
- `frontend/src/lib/api/mockApi.ts` is the **endpoint list** (23 functions, 1:1 with routes). Each
  `// FastAPI: METHOD /path` comment matches `docs/api-contract.md`.
- If either contract needs to change, surface it to the user first. **Drift is not
  allowed.**

---

## Commands

```bash
# Frontend (cwd: frontend/)
bun install
bun dev              # vite dev server on :3000
bun run build        # production build
bun run lint         # eslint
bun run format       # prettier --write .
bun run typecheck    # tsc --noEmit

# Backend (cwd: backend/)
uv sync                                # install deps from pyproject + uv.lock
uv run uvicorn app.main:app --reload   # dev server on :8000
uv run pytest -q                       # tests
uv run ruff check . && uv run ruff format --check .
uv run pyright                         # types
uv run alembic upgrade head            # migrations

# Database (cwd: repo root)
docker compose up -d                   # start Postgres 16 on :5433
```

---

## Code style

**Python**
- Ruff format + lint (line length 100). Black-compatible.
- Full type hints on every signature. `Annotated[]`, `Literal[]`, Pydantic v2 models at
  boundaries.
- No `Any` without an inline comment justifying it.
- Async by default for I/O (DB, HTTP, Bedrock, Reducto).
- Pydantic v2 idioms only: `model_validate`, `model_dump`, `Field(...)`, `ConfigDict`.
- SQLAlchemy 2.0 `Mapped[...]` style only. No legacy declarative `Column(...)`.
- Tests: `pytest` + `pytest-asyncio` + `factory-boy`. ≥80 % coverage on new code.

**TypeScript**
- `tsconfig` strict mode on. No `any`. No `@ts-ignore` without a justifying comment.
- ESLint + Prettier. Functional components only. shadcn primitives preferred.
- All data access through `frontend/src/lib/api/`. **No `fetch` inside components.**

---

## Working with rules & citations

### Rule directory layout (v0.2)

```
backend/rules/
  bt_ms/      # Shared rules that apply to both BT and MS
    bt_001_idt_required.yaml          # Serology panel (BT+MS)
    bt_002_drai_required.yaml         # DRAI behavioral screening (BT+MS)
    bt_003_consent_required.yaml      # Authorization/consent (BT+MS)
    bt_004_gestational_age.yaml       # Gestational age (BT only; SME threshold)
    bt_006_culture_results.yaml       # Culture results general (BT+MS)
    bt_010_md_eligibility.yaml        # MD eligibility sign-off (BT+MS)
    bt_013_transfusion_dilution.yaml  # Plasma dilution algorithm (BT+MS)
    bt_014_high_risk_composite.yaml   # Cross-doc high-risk synthesis (BT+MS)
    bt_015_recovery_site.yaml         # Recovery site suitability (BT+MS)
  bt/         # BT-only rules
    bt_005_recovery_timing.yaml       # BT acquisition/processing timing (NO time_of_death)
    bt_007_nat_panel.yaml             # NAT + WNV seasonal (BT living donor)
    bt_008_physical_assessment.yaml   # Birth mother exam ≤14 days (BT)
    bt_009_newborn_health.yaml        # Newborn health assessment (BT)
  ms/         # MS-only rules
    ms_001_nat_panel.yaml             # NAT panel for MS (no WNV universal)
    ms_002_physical_assessment.yaml   # Postmortem assessment + Appendix III (MS)
    ms_003_md_eligibility.yaml        # MD eligibility for MS
    ms_004_cause_of_death.yaml        # COD documentation (MS)
    ms_005_autopsy_review.yaml        # Autopsy reviewed by MD before release (MS)
    ms_005rt_recovery_timing.yaml     # Asystole → skin-prep ≤24h/15h (MS)
    ms_008_culture_clostridium_gas.yaml # Clostridium + GAS → REJECT (MS)
    ms_010_age_criteria.yaml          # Age criteria (MS; SME-REQUIRED)
```

**Critical rule constraint for BT-005:** Birth tissue donors are living donors — there is no
`time_of_death` or asystole for BT. BT-005 uses `acquisition_datetime` +
`processing_start_datetime` only. The MS asystole rule is `ms_005rt_recovery_timing.yaml`.

### Rule YAML record fields
Each record: `id`, `version`, `applies` (`[BT|MS]`), `severity` (`HARD|GATE|COND`), `inputs`,
`logic`, `on_missing`, `citations.aatb`, `citations.cfr`, `reasoning_template`.

### Ruleset loader
`backend/app/adapters/evaluation/anthropic_eval.py` loads from three directories
(`bt_ms/`, `bt/`, `ms/`) in that order; deduplication by rule `id` prevents double-loading.

### Verified citation map
`docs/ruleset-map.md` is the authoritative mapping of every rule to verified AATB sections
(from `docs/2025-08 Standards rev2 Final.md`) and CFR sections (from eCFR 21 CFR Part 1271).
All AATB section numbers in rule YAMLs must be traceable to this map.

### Evaluator
`backend/app/adapters/evaluation/anthropic_eval.py` loads YAML rules, builds a strengthened
rule-by-rule prompt (temperature ≤ 0.2), validates the JSON response schema before persisting
(state ∈ {ACCEPT, REJECT, INDETERMINATE}; citations copied verbatim from rule YAML), and
writes an immutable evaluation record with all pinned versions. Stub mode: `stub.py`.

The `reasoning` string Claude returns is **insight only**. UI labels it as such; do not
reword that label.

`docs/2025-08 Standards rev2 Final.md` is the licensed AATB 15th Edition rev 2 source
in this repo. Never reproduce its text — cite section numbers only.

---

## PHI & secrets — strict

- Never put PHI in: logs, errors, prompts, exception messages, telemetry, fixtures,
  tests, commit messages, PR descriptions.
- Field-level dev logging masks values; log keys + types only.
- Load secrets via `pydantic-settings` from env. Never echo to logs or error responses.
- Reducto requests must use the BAA / zero-retention configuration.

---

## When to ask vs proceed

**Proceed without asking** for: in-file refactors, adding tests, fixing types, formatting,
adding docstrings, fixing lint errors.

**Ask first** before:
- Adding / removing endpoints in `frontend/src/lib/api/mockApi.ts` or fields/enums in `frontend/src/lib/api/types.ts`.
- Changing any encoded rule, citation, threshold, or timeframe.
- Adding new dependencies (especially LLM / auth / crypto / PII-adjacent).
- DB schema changes or running migrations.
- Touching auth, RBAC, audit-log, encryption, or KMS code.
- Changing the model (currently `claude-sonnet-4-6`), temperature, or prompt template.
- Adding a tissue type or rule outside BT / MS scope.

If a clinical / regulatory rule is ambiguous, ask the named SME owner
(`<TBD-md-signoff>` — placeholder until set). **Never guess. Never fabricate citations.**

---

## PR & commit conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- Every PR must: pass `bun run lint` + `bun run typecheck` (frontend) and `uv run ruff check .` + `uv run pytest -q` (backend); include tests for new logic; contain no PHI; update **this file** in the same PR if a convention changes.
- For rule / citation changes: link the relevant section of `docs/api-contract.md` in the PR body and tag the SME owner.

---

## Tool-specific notes

- **Cursor** reads this file natively at repo root. Scoped overrides may live in
  `.cursor/rules/*.mdc`; defaults here always apply.
- **Claude Code** — see `CLAUDE.md` (points back here).
- This file is **the** source of truth; tool-specific files defer to it.
