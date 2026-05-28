# Polish donor report for grouped extraction

The report page already uses `groupFieldsForDoc` in `FieldsAppendix`, but the visual rhythm hasn't been retuned for the grouped layout: group headers are weak, tables run edge-to-edge per group with no breathing room, "Other" gets an awkward label when it's the only bucket, and page-break hints don't follow group boundaries. Tighten the appendix and a few adjacent details so the printed report reads as a single, calm document.

## Scope

Frontend / presentation only. No API, mock data, or business-logic changes.

## Changes

### 1. `FieldsAppendix.tsx` — grouped layout polish

- **Group header**: render each group with a small left-aligned heading row above the table — `text-[10.5px] uppercase tracking-wider text-muted-foreground` + the field count (`· 4 fields`), separated by a hairline. Always show it (even when there's only one group) so the doc looks consistent. Hide only when the single group's key is `"fields"` (the small-doc fallback) or `"other"` (don't print "Other" as a label when it's the sole bucket — fall back to no header).
- **Group spacing**: bump inter-group gap from `space-y-1` to `space-y-3`; bump inter-doc gap from `space-y-4` to `space-y-6`.
- **Table polish**:
  - Add `thead` with `Field / Value / Source` column headers (`bg-surface-muted/40`, same `[11px]` muted styling as `CompletenessSection`) so the appendix matches the rest of the report.
  - Use `tabular-nums` on the value cell; right-align the source ref column header to match cells.
  - Fixed widths: `40% / auto / 22%` (slightly tighter source column).
  - Add `align-top` to rows so multi-line values don't shift the source ref.
- **Print breaks**:
  - Keep `report-break-before` on the appendix section itself (forces page break before the appendix).
  - Add `report-avoid-break` to each *group* block (not just each doc), so a group + its table stays together. Remove `report-avoid-break` from the wrapping doc block (a long doc with many groups should be allowed to split between groups).
  - Wrap the doc header in a `report-avoid-break` of its own so the doc title doesn't orphan at the bottom of a page.
- **Empty value**: replace the italic em-dash with `text-muted-foreground` "—" (no italic — italic in mono looks noisy when many fields are missing).

### 2. `FindingsSection.tsx` — minor alignment with appendix

- Add `thead` column widths matching the appendix (`40% / auto / 22%`) and `align-top` on rows for consistency.
- Change `report-break-before` to a plain section: only the appendix needs a forced page break. Findings should flow naturally after the summary; keep `report-avoid-break` per finding card.

### 3. `ReportShell.tsx` + `styles.css` — print rhythm

- In `@media print`, add:
  - `.report-root h2 { break-after: avoid; }` so section titles don't get separated from their content.
  - `.report-root table { break-inside: auto; }` and `tr { break-inside: avoid; }` so long appendix tables can split across pages cleanly without splitting a single row.
- Tighten the shell padding under `@media print` (`p-8` → `p-0`, and let the `@page` margin handle whitespace) so printed PDFs don't waste a 32 px inner pad on top of the page margin.

### 4. `EligibilitySummary.tsx` — small consistency tweak

- Ensure the `Stat` numeric value uses `tabular-nums` (already mono; add `tabular-nums` so the `/ total` aligns when present).

## Files touched

- `src/components/report/FieldsAppendix.tsx` (main rework)
- `src/components/report/FindingsSection.tsx` (minor)
- `src/components/report/ReportShell.tsx` (print padding)
- `src/components/report/EligibilitySummary.tsx` (tabular-nums)
- `src/styles.css` (print rules for h2/table/tr)

## Out of scope

- Workspace Extraction tab (its "Needs attention" + grouped duplication is a separate issue).
- Any change to `groupFieldsForDoc` definitions or mock data.
- New report sections, signatures workflow, or PDF export pipeline.

## Verification

1. Load `/donors/D-2026-0004/report` — appendix shows clear group headers (HIV markers, HBV markers, …), consistent column headers across Findings/Completeness/Appendix, and tight but readable spacing between groups.
2. Trigger Print preview — appendix starts on a new page; no group is split across pages; long appendix tables (if any) split between rows, not mid-row; section titles never orphan.
3. Load a donor with a single small document (no group defs) — appendix renders one flat table with no redundant "Fields" or "Other" label.
