## TissueQA — Phased build plan

A multi-tenant donor-eligibility decision-support prototype. Client-only, synthetic data, mock API behind a typed boundary so a FastAPI backend can be swapped in later.

### Approach

Phase 1 establishes the visual + interaction language and the highest-stakes screen (Donor Workspace). You sign off, then Phase 2 builds the rest fast and consistent. No design rework loops.

---

### Phase 1 — Foundations + reference screen (this build)

**1. Design system (the "playbook")**
- Tokens in `src/styles.css`: deep teal primary, neutral surfaces, semantic state colors (`--accept` green, `--reject` red, `--indeterminate` amber, `--low-confidence` amber-soft), elevated card shadow, tight radius (clinical, not playful).
- Typography: Inter for UI, JetBrains Mono for citations / rule references / criterion IDs / bbox coords.
- Component primitives (wrapping shadcn):
  - `StatusBadge` (ACCEPT / REJECT / INDETERMINATE / COMPLETE / INCOMPLETE)
  - `CitationChip` (mono, document label · page, click → opens Source sheet)
  - `RuleChip` (mono, `§H12.600`, `21 CFR 1271.85`)
  - `ConfidenceMeter` (0–100 bar, amber under threshold)
  - `TissueTypeBadge` (BT / MS)
  - `SyntheticDataBadge` (top bar pill)
  - `SectionCard`, `EmptyState`, `LoadingSkeleton`
- One-page design playbook at `docs/design-system.md` documenting tokens, when to use which component, accessibility rules, and copy tone ("Insight (not a determination)" etc.).

**2. App shell**
- Left sidebar: Donors, Audit, Settings (role-gated).
- Top bar: tenant name, role switcher, current user menu, Synthetic-data badge, persistent disclaimer affordance.
- TanStack Router file-based routes for all pages (stubs for Phase 2 screens so navigation works end-to-end).

**3. Mock API layer (full, not stubbed — Phase 2 needs it)**
- `src/lib/api/types.ts` — exact types from the prompt.
- `src/lib/api/mockApi.ts` — every function with `// FastAPI: METHOD /path` comments, ~400ms simulated latency, in-memory store seeded with all 4 donors covering ACCEPT / REJECT / INDETERMINATE-missing-doc / INDETERMINATE-COND states + realistic synthetic serology values.
- `import.meta.env.VITE_API_BASE_URL` read but unused (handoff-ready).
- Synthetic PDF-like page images generated per document type so citation bboxes can be overlaid on something credible.

**4. Reference screen: Donor Workspace (`/donors/:id`)** — fully built
- Header: Donor ID, Tissue Type, Completeness + Recommendation badges, Mark Reviewed, Download Report.
- Tabs: Documents · Extraction · Completeness · Eligibility · Audit — all functional.
- Source sheet: right-side `Sheet` showing the synthetic page image with an overlaid highlighted rectangle at the bbox, document label, page, confidence.
- Persistent "Recommendation only. The Medical Director makes the eligibility determination." disclaimer on Eligibility tab.
- All interactions write audit entries via mockApi.

**5. Lightweight `/donors` list** so you can click into the workspace during review.

**→ Review gate.** You look at the shell, tokens, and Donor Workspace. We adjust tokens / component styles centrally if needed — no per-screen rework.

---

### Phase 2 — remaining screens (next build, after your sign-off)

- `/login`, `/signup` (UI only, mock sign-in routes to `/donors`)
- `/donors/new` (Donor ID + Auto-generate, Tissue Type select)
- `/donors` filters + search (full version)
- `/donors/:id/report` printable A4 view + `window.print()`
- `/audit` tenant-wide audit table with filters
- `/settings` (admin) — tenant name, users table, confidence threshold slider, BT gestational-age policy

All Phase 2 screens consume the Phase 1 component library and mockApi — no new tokens, no new primitives unless we discover a gap.

---

### Technical details

- **Stack:** TanStack Start (React 19 + Vite 7 + TS + Tailwind v4 + shadcn). File-based routes under `src/routes/`. No backend, no Lovable Cloud (explicit "client-only, do not implement real auth/db" from the prompt).
- **State:** TanStack Query for all mockApi reads/mutations; mock store is the source of truth. Role + current user kept in a React context backed by mockApi `getCurrentUser` / `setRole`.
- **Routing:** `/donors`, `/donors/new`, `/donors/$id`, `/donors/$id/report`, `/audit`, `/settings`, `/login`, `/signup`. Role gating via a layout route that reads current user.
- **Citations:** `CitationChip` opens a controlled `Sheet`; bbox rendered as an absolute-positioned div over the synthetic page image (coords normalized 0–1).
- **Synthetic page images:** generated once into `src/assets/docs/` (e.g. `serology-report.jpg`, `drai.jpg`, `birth-summary.jpg`, etc.) styled to look like medical forms. Reused across donors.
- **Print:** report route uses a print stylesheet (`@media print`) to hide nav/sidebar and fit A4.
- **Accessibility:** keyboard nav across tabs, focus rings on chips, ARIA labels on state badges, color is never the only signal (badges always include text).
- **No PHI:** seeded donor names/IDs are synthetic (D-2026-0001…); analyte values realistic but fictional.
- **No AATB text reproduction:** only standard numbers shown in chips.

---

### What I need from you

Nothing right now — answers from the previous questions are enough. After Phase 1 lands, you'll review and either approve or send token/component tweaks, then I run Phase 2.
