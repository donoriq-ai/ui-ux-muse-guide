# TissueQA design system — playbook

Phase 1 reference. Every Phase 2 screen consumes these tokens and primitives. Do not introduce ad-hoc colors, badges, or chips.

## Tokens (defined in `src/styles.css`)

### Color
- **Surfaces** — `--background` (near-white with cool tint), `--surface` (pure white card surface), `--surface-muted` (table headers, inset zones).
- **Primary** — deep teal (`oklch(0.46 0.08 200)`). Used for: branding, primary buttons, focus rings, rule chips, active sidebar items.
- **Primary soft** — used for rule chips, criterion ID pills, primary-tinted backgrounds.
- **States** — every state has solid + foreground + soft variants:
  - `--accept` (green) → ACCEPT, COMPLETE, "present", "extracted"
  - `--reject` (red) → REJECT, hard fails
  - `--indeterminate` (amber) → INDETERMINATE, INCOMPLETE, low confidence, "missing"

Color is **never the only signal**. Every status badge includes an icon and an uppercase text label.

### Typography
- UI: **Inter** (400/500/600/700)
- Citations, criterion IDs, donor IDs, field values, bbox coords, timestamps in tables: **JetBrains Mono** (`font-mono`)

### Radius & elevation
- `--radius: 0.5rem` (default `rounded-md` lands on this)
- `--shadow-card` for static cards, `--shadow-elevated` for sheets/dialogs

## Primitives (in `src/components/`)

| Component | When to use |
|---|---|
| `StatusBadge` | Any ACCEPT / REJECT / INDETERMINATE / COMPLETE / INCOMPLETE state. Size `sm` in tables, `md` in cards, `lg` in screen headers. |
| `TissueTypeBadge` | Donor's tissue type. Use `expanded` form on detail screens, short form in tables. |
| `CitationChip` | Every reference to a source document. Mono, clickable when interactive. Renders "no source" placeholder when null. |
| `RuleChip` | AATB and CFR references. Mono. Always render via this — never hand-roll the styling. |
| `ConfidenceMeter` | 0–100% bar with threshold tick. Amber when below threshold. |
| `SectionCard` | Standard card wrapper with optional title/description/action. Use for every grouped section. |
| `SourceSheet` | Right-side sheet showing synthetic page + bbox for a citation. Controlled by `(citation, setCitation)` state in the parent. |
| `SyntheticDataBadge` | Top bar only. Persistent reminder this is not production data. |

## Composition rules

- **Tables**: 11px uppercase-tracked headers on `surface-muted/40`, row dividers `divide-border`, hover `bg-accent/40`. Donor IDs and field keys always in `font-mono`.
- **Cards**: 1px `border-border`, `shadow-card`, header `bg-surface` separated by `border-b`.
- **Chips**: 24px tall (`h-6`), 2-unit horizontal padding, mono for citations/rules, sans for tags.
- **Disclaimer**: The "Recommendation only" disclaimer is rendered as an info-style row on the Eligibility tab and at the top of the report. Wording is fixed — do not paraphrase.
- **Audit-writing actions** (mark reviewed, field reviewed, upload, etc.) always toast on success and invalidate `qk.audit(donorId)` + the donor query.

## Copy tone

- Clinical, not chatty. No emoji, no exclamation marks.
- State labels are uppercase (`ACCEPT`, `INCOMPLETE`).
- Reasoning line on findings is prefixed with **"Insight (not a determination)"** — fixed wording.
- Never reproduce AATB standard text. Only show numbers like `§H12.600` and `21 CFR 1271.85`.

## Accessibility

- Every status uses icon + text + color (never color alone).
- All interactive chips have `focus-visible:ring-2 ring-ring`.
- Tabs, dialogs, sheets, dropdowns use shadcn primitives (Radix) — keyboard nav comes free.
- Confidence meter has an aria-label with the percentage.
