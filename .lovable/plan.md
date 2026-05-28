
# Phase 2C — Extraction organization rework

The Extraction tab already has a document rail + filters + table. The pain you flagged is real but local: inside a doc with many fields (Serology, medical records "grays") the table becomes a long flat scroll, and within a doc all markers look equally weighted. Fix the **inside-a-document** layout — keep the rail and global filters intact.

## Goals

- Group fields inside each document by clinical category so Serology reads as "HIV / HBV / HCV / Syphilis / Other", not 12 stacked rows.
- Surface what needs attention first: flagged + unreviewed pinned at the top of each document; clean groups collapsed by default.
- Make long lists navigable: collapse / expand / "Expand all" / "Collapse all", with sticky group headers while scrolling.
- Add a compact density toggle so reviewers can fit more on screen when they want to.
- All changes stay in the Extraction tab — completeness/eligibility/audit untouched.

## Grouping model (UI-only, no schema change)

A small pure helper `src/lib/extraction/grouping.ts` maps each `ExtractedField` to a group based on `field.key` + parent document type. Deterministic, no AI.

```text
Serology (idt_report):
  HIV markers          anti_hiv_*, hiv_*_nat
  HBV markers          hbsag, hbv_*, anti_hbc
  HCV markers          anti_hcv, hcv_*
  Syphilis             syphilis*
  Other markers        anything else in idt_report

Medical records:       Demographics, Conditions, Medications, Other
DRAI:                  Interview, Dates, Other
Birth & delivery:      Pregnancy, Delivery, Newborn, Other
Physical assessment:   Findings, Examiner, Other
Transfusion / timing:  Events, Volumes, Other
default:               single "Fields" group (small docs stay flat)
```

Group order is fixed; "Other" always last. Empty groups don't render.

## Layout

Per-document panel (when a doc is selected OR per-doc section in "All documents" view):

```
┌ Serology — Serology_panel.pdf · 3p ─────────────── [Collapse all] [Expand all] ┐
│ ▼ Needs attention · 2 flagged · 3 unreviewed                                   │
│    HBsAg · 0.55 · low confidence              [chip] [✓]                       │
│    anti-HBc total · unreviewed                [chip] [✓]                       │
│                                                                                │
│ ▼ HIV markers · 3 fields · all reviewed                                        │
│    anti-HIV-1, anti-HIV-2, HIV-1 NAT                                           │
│                                                                                │
│ ▶ HBV markers · 3 fields · 1 flagged                                           │
│ ▶ HCV markers · 2 fields                                                       │
│ ▶ Syphilis · 1 field                                                           │
└────────────────────────────────────────────────────────────────────────────────┘
```

- "Needs attention" is a virtual pinned group: union of flagged + unreviewed for that doc. Always at top. Auto-expanded when non-empty. Hidden when empty.
- A category group is auto-expanded if it contains a flagged or unreviewed field, otherwise collapsed. User overrides persist per donor in `localStorage` (`tissueqa.extraction.collapsed.<donorId>`).
- Group header is sticky (`position: sticky; top: 0`) inside the scrollable doc panel so the title stays visible while scanning rows.
- Row height shrinks under a **Compact** density toggle (28px vs current 40px), tightening padding and confidence meter width.

### "All documents" view

Today this dumps every field into one table. Rework to render a stacked list of per-document panels (one per doc with fields), each using the same grouping layout, separated by a thin header strip with the document name + counts. Search/filter still applies and hides empty panels.

## Filter / search behavior

- Existing global chips (All / Flagged / Unreviewed) and search box stay.
- When a filter is active, all matching groups force-expand and non-matching ones hide (so "Flagged" never shows you a closed group hiding the thing you wanted).
- Search highlights matching text in field label/value.

## Field table tweaks

- Add `density: "comfortable" | "compact"` prop to `ExtractionFieldTable`. Compact ≈ `py-1`, smaller font for `Field` and `Source` columns, narrower Confidence column (icon + value, no bar).
- Remove the "Document" column when rendering inside a per-doc panel (it's redundant — the panel header already states the document). Keep it in fallback paths.

## Files

**New**
- `src/lib/extraction/grouping.ts` — `groupFields(fields, doc)` returns ordered `{ groupKey, label, fields[] }[]`.
- `src/components/extraction/ExtractionGroup.tsx` — collapsible group with sticky header, counts, pinned indicators.
- `src/components/extraction/DocumentExtractionPanel.tsx` — per-document panel: title strip + "Needs attention" pin + groups.
- `src/hooks/useCollapsedGroups.ts` — persisted collapsed-state map per donor.

**Edited**
- `src/routes/_authenticated.donors.$id.tsx` — `ExtractionTab` swaps the flat `ExtractionFieldTable` render for `DocumentExtractionPanel`(s). Adds density toggle next to the filter chips.
- `src/components/extraction/ExtractionFieldTable.tsx` — accept `density` prop, drop forced "Document" column when caller hides it, add subtle highlight for matched search terms.

**Untouched**
- `DocumentRail`, global filter chips, search input, citation sheet, audit / completeness / eligibility tabs.
- Mock API and types: zero changes.

## Consistency pass (rolled in)

- Group header type sized to match the new tab/section weight (text-[12px] uppercase tracking-wider, font-medium) — same scale as "Eligibility" / "Extractions" headers.
- Density toggle uses the same chip pattern as the filter chips so it doesn't introduce a new control idiom.

## Out of scope

- Editing extracted values inline (separate phase).
- Cross-document field deduping (e.g. HIV repeated across docs).
- Bulk "mark group reviewed" — easy to add later, deferred to keep the diff focused.

## Review point

When this lands, open `D-2026-0001` → Serology in the rail. You should see the 9 serology fields collapsed into 5 groups with a "Needs attention" pin if anything's flagged, sticky group headers while scrolling, and a compact density that fits all of Serology in one screen. Then we pick Phase 2D from: Report polish · Audit & Settings build-out · Inline value editing.
