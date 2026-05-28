
# Phase 1.6 — Donor Workspace polish

Scoped UI-only pass on `/donors/$id`. No data, routing, or business-logic changes.

## 1. Typography & header

- **Donor ID**: drop from `text-2xl sm:text-[28px] font-semibold` → `text-lg sm:text-xl font-medium`, keep mono. Reads as a label, not a billboard.
- **Header card**: remove `shadow-card` class (it's already neutered by CSS, but the class is misleading). Tighten padding `p-5 sm:p-6` → `p-4 sm:p-5`.
- **Status badges in header**: switch from `size="lg"` → `size="sm"`. COMPLETE / INDETERMINATE / ACCEPT etc. become the same compact pill used in the donors table — consistent across the app.
- **Eligibility tab**: finding badges drop from `size="md"` → `size="sm"`. Completeness section badges (line 514) drop to `size="sm"` too.
- **Tissue badge** stays `expanded` next to the ID but visually rebalanced against the smaller ID.
- **Page container**: drop `max-w-[1400px] mx-auto`, switch to fluid padding `clamp(16px, 3vw, 32px)` to match the new Donors list.

## 2. Extraction tab — reorganize for long lists

Today: one `SectionCard` per document, each rendering a full table. Serology has a handful of fields; medical records can have dozens; combined view becomes a wall of scroll with no way to find anything.

Switch to a **two-pane layout** with the document list as the navigator:

```text
┌─────────── Extraction ─────────────────────────────────────┐
│ Toolbar: search · filter (All / Flagged / Unreviewed) · ⌄  │
├──────────────┬─────────────────────────────────────────────┤
│ Documents    │  Selected document                          │
│ ─────────    │  ─────────────────                          │
│ • Serology 4 │  Serology Report — serology_report.pdf · 3p │
│   IDT  ●2    │                                             │
│ • DRAI    12 │  [virtualized field table, sticky header]   │
│ • Med Rec 38 │   Field | Value | Conf | Source | ✓        │
│ • Phys As  6 │   …                                         │
│ • Birth    9 │                                             │
│ • Transf   3 │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

Details:
- **Left rail** (240px, sticky): list of documents that have extracted fields. Each row shows doc label, field count, and a small red dot + count if any field is flagged low-confidence. Selected row gets a hairline left accent and warm tint. "All documents" pseudo-entry at top.
- **Right pane**: only the selected document's fields. Reuses the existing `DataTable` primitive (tanstack/react-table + react-virtual) so any single doc with 100+ fields stays performant and gets sticky header for free. Columns: Field, Value, Confidence, Source, Reviewed (checkbox).
- **Toolbar above the pane**:
  - Search box (filters fields in the current pane by label/value).
  - Filter chips: `All` · `Flagged` · `Unreviewed` — same `FilterChip` component used on the Donors list.
  - Group toggle: `By document` (default) / `By field group` — field-group mode collapses across all docs and groups by `key` prefix (e.g. `serology.*`, `donor.*`); useful when reviewing a single criterion across sources. Stretch — implement if cheap, otherwise defer.
- **URL state**: `?doc=<id>&q=&filter=all|flagged|unreviewed` via `validateSearch` so the selected document and filters survive refresh and are shareable.
- **Counts strip** (existing: total / reviewed / flagged) moves into the toolbar as small inline counts, not a separate header line.
- **Mobile (<768px)**: left rail collapses to a horizontal scrolling chip row above the pane. No drawer needed.

## 3. Consistency pass

- All inline status pills in Documents tab (line 276-283) → replace ad-hoc badge with `StatusBadge`-style primitive or extract a `DocStatusBadge` so processing/extracted/error share one look and tokens.
- Tabs trigger height standardize to the same 36px chip the toolbar uses.
- Section card headers: standardize padding (`px-4 py-3`) and title size (`text-[13px] font-medium`) — currently mixes `text-sm` headings with `text-xs` descriptions inconsistently between Documents and Extraction.
- Remove remaining `shadow-card` className usages in donor workspace (header card, upload mode toggle line 303/311). The shadow is already off globally; removing the class avoids confusion.
- Confirm hairline `border-border` everywhere; no `border-border-strong` except dropzone.

## 4. Files

**Edited**
- `src/routes/donors.$id.tsx` — header typography, badge sizes, fluid container, extraction tab rewrite, URL search params, consistency cleanup.
- `src/components/SectionCard.tsx` — header padding/typography standardized.
- `src/components/StatusBadge.tsx` — minor: ensure `sm` is the canonical size; `lg` kept but unused in workspace.

**New**
- `src/components/extraction/DocumentRail.tsx` — left-rail navigator.
- `src/components/extraction/ExtractionPane.tsx` — virtualized field table for the selected document (wraps `DataTable`).
- `src/components/extraction/columns.fields.tsx` — column defs for the field table.
- `src/components/DocStatusBadge.tsx` — shared doc processing/extracted/error pill.

**Out of scope**
- Login, signup, new donor, report, audit, settings.
- Field-group toggle behavior beyond skeleton if time-constrained.
- Any data/API shape changes.

## 5. Review point

After this lands, you'll review the workspace at /donors/D-2026-0004. If the rail + pane reads well for both small (Serology 4 fields) and large (Medical Records 38) docs, we move into Phase 2.
