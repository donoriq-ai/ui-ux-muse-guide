# Phase 2D — Report Polish

Replace the `Phase2Stub` at `/_authenticated/donors/$id/report` with a real, print-friendly A4 report assembled from existing `mockApi` data. UI-only; no schema or rules changes.

## Goals
- One screen that doubles as the canonical printable record for a donor.
- Reads exclusively from `getDonor(id)` + tenant settings — no new API.
- Looks clean on screen (matches flat design language) AND prints cleanly to A4.

## Layout (top → bottom)

```text
┌─────────────────────────────────────────────────┐
│ ReportHeader                                    │
│  Tenant name · Ruleset vX.Y · Generated at      │
│  Donor ID · Tissue type · Created/reviewed by   │
│  Recommendation badge (ACCEPT/REJECT/INDET.)    │
├─────────────────────────────────────────────────┤
│ Eligibility Summary                             │
│  Recommendation reasoning (1–2 lines)           │
│  Completeness: COMPLETE/INCOMPLETE + counts     │
├─────────────────────────────────────────────────┤
│ Findings (grouped by severity: HARD→GATE→COND)  │
│  Per finding: title, state pill, reasoning,     │
│  inputs table (label · value · citation ref),   │
│  rule citations (AATB / CFR chips)              │
├─────────────────────────────────────────────────┤
│ Completeness Checklist                          │
│  Required docs · status pill (present/missing/  │
│  low_confidence)                                │
├─────────────────────────────────────────────────┤
│ Extracted Fields Appendix                       │
│  Reuse grouping.ts; compact, non-interactive    │
│  table per document. Citations as "[Doc p.N]".  │
├─────────────────────────────────────────────────┤
│ Signature Block                                 │
│  Prepared by · Reviewed by · Date · Signature   │
│  lines (two: coordinator + medical director)    │
├─────────────────────────────────────────────────┤
│ Footer (print only)                             │
│  Page N · Donor ID · Ruleset version            │
└─────────────────────────────────────────────────┘
```

On-screen toolbar (hidden in print): Back · Print · density toggle is N/A here.

## Files

New:
- `src/components/report/ReportShell.tsx` — page frame, toolbar, print styles wrapper.
- `src/components/report/ReportHeader.tsx`
- `src/components/report/EligibilitySummary.tsx`
- `src/components/report/FindingsSection.tsx` (groups by severity, renders inputs + rule citations).
- `src/components/report/CompletenessSection.tsx`
- `src/components/report/FieldsAppendix.tsx` (reuses `groupFieldsForDoc`, read-only compact rows).
- `src/components/report/SignatureBlock.tsx`
- `src/lib/report/citationRefs.ts` — builds a `[Doc p.N]` short ref map so the report uses compact citation tokens instead of full bbox info.

Edited:
- `src/routes/_authenticated.donors.$id.report.tsx` — drop stub; load donor via existing `useQuery(['donor', id])` pattern; render `ReportShell` with sections; set `head()` title `Donor Report — {id}`.

Untouched: mockApi, types, rules engine, donor workspace, audit, extraction grouping logic.

## Print styles (in `src/styles.css`)
- `@page { size: A4; margin: 18mm 16mm; }`
- `@media print` block: hide app chrome (sidebar, topbar, toolbar), force white bg, black text, remove shadows, `break-inside: avoid` on every section card, `break-before: page` between Findings and Appendix when long.
- A `.report-root` class scopes screen styling to ~A4 width (`max-w-[210mm]`, centered, subtle border on screen only).

## Empty / edge states
- `evaluation === null` → show "Evaluation pending" card; hide Findings + Eligibility blocks but still render header, completeness checklist (derived from documents), and signature block.
- Findings with no inputs → render reasoning only.
- No reviewer yet → signature line empty with placeholder underscore.

## Verification
After build: navigate to `/donors/D-2026-0001/report` and `/donors/D-2026-0004/report`, confirm sections render with real data, then trigger browser print preview to check A4 pagination, hidden chrome, and that citation refs match across sections.

## Out of scope
- Editing values, exporting PDF server-side, e-signatures, multi-language, theming. Pure presentational polish on existing data.
