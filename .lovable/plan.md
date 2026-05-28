
# Phase 1.5 — Minimal flat restyle + scalable Donors table

Reskin the existing shadcn primitives to a minimal flat look and rebuild the Donors list as a real data grid that scales to thousands of rows. No business logic changes. Sidebar shell stays.

## Design direction (locked)

- **Background**: warm paper — `#FAFAF7` app bg, `#FFFFFF` surfaces, `#1A1A1A` text.
- **Borders**: 1px hairline, light warm gray (`#E8E6DF` strong / `#EFEDE6` subtle). Used everywhere instead of shadows.
- **Shadows**: removed globally. `--shadow-card` and `--shadow-elevated` → `none`. Sheets/dialogs use a single hairline border + scrim only.
- **Radii**: tighten — `--radius: 6px`. Chips/badges `4px`. No pill shapes except status badges.
- **Typography**: Inter, slightly tighter. Headings drop to `font-medium` (was `font-semibold`). Mono for IDs/citations/values unchanged.
- **Primary**: keep deep teal but desaturate one notch so it reads as an accent on warm paper, not as brand chrome.
- **Density**: comfortable default (40px rows), compact toggle (32px).
- **Fluid layout**: drop the `max-w-[1400px]` cap on data pages. Page padding becomes fluid (`clamp(16px, 3vw, 32px)`). Sidebar stays fixed width and remains collapsible.

## Donors table — rebuild

Stack: **@tanstack/react-table** for headless table state + **@tanstack/react-virtual** for row virtualization. Both are tiny, headless, and compose with the new flat styling.

Behavior:
- Server-paginated (mocked) at 200 rows/page, virtualized within the page.
- Sticky header, sticky first column (Donor ID), horizontal scroll for overflow.
- Sortable columns: Donor ID, Tissue, Completeness, Recommendation, Created, Documents.
- Filter chips row above the table (Tissue, Recommendation, Completeness, search) — synced to URL via `validateSearch` so filter state is shareable and survives refresh.
- Column visibility menu + density toggle in the table toolbar.
- Row hover = subtle warm tint, no shadow. Click row = open workspace.
- Empty state and loading skeleton both use hairline borders, no shimmer.

URL contract (new search params on `/donors`):
- `q` (string), `tissue`, `rec`, `comp`, `page`, `sort`, `dir`, `density`, `cols`.

Seed data: expand mock seed from 4 → ~250 synthetic donors so virtualization and pagination are visibly real. Same shape, same tissue mix, same evaluation distribution. No PHI.

## Files

**New**
- `src/components/data-table/DataTable.tsx` — generic virtualized table built on tanstack/react-table + tanstack/react-virtual.
- `src/components/data-table/DataTableToolbar.tsx` — search + filter chips + density + column visibility.
- `src/components/data-table/columns.donors.tsx` — column defs for the donors grid.
- `src/components/FilterChip.tsx` — dismissible filter chip primitive.

**Edited**
- `src/styles.css` — new token values (warm paper, hairline borders, no shadows, tighter radius, desaturated primary). Print/dark adjusted in lockstep.
- `src/routes/donors.index.tsx` — replaced inline table with `<DataTable>`, search-param state via `validateSearch`.
- `src/routes/__root.tsx` / `src/components/AppSidebar.tsx` / `src/components/TopBar.tsx` — drop shadows, switch to hairline borders, fluid padding.
- `src/components/SectionCard.tsx`, `StatusBadge.tsx`, `TissueTypeBadge.tsx`, `CitationChip.tsx`, `RuleChip.tsx`, `ConfidenceMeter.tsx`, `SyntheticDataBadge.tsx` — restyled to flat tokens (border-only, no shadow, tighter radius).
- `src/components/SourceSheet.tsx` — flat sheet, hairline left border, no elevation.
- `src/lib/api/seed.ts` — generate ~250 synthetic donors deterministically.
- `docs/design-system.md` — updated to reflect flat tokens, table primitive, density rule.

**Dependencies (single install)**
- `@tanstack/react-table`
- `@tanstack/react-virtual`

## Out of scope (deferred to Phase 2)

- Donor workspace internal restyle beyond token inheritance (it picks up new tokens automatically; deeper layout work happens with the rest of Phase 2 screens).
- Login / signup / new donor / report / audit / settings screens.
- Real backend / Cloud — still mock API.

## Review point

After this ships I'll stop and you review the Donors list + sidebar shell at the new viewport, confirm the flat language, then I go into Phase 2.
