# TissueQA design system — playbook

Phase 1.5: minimal flat. Warm paper, hairline borders, **no shadows anywhere**.

## Tokens (`src/styles.css`)

### Color
- **Surfaces** — `--background` warm paper `#FAFAF7`, `--surface` `#FFF`, `--surface-muted` `#F5F4EF` for table headers / inset zones.
- **Borders** — 1px hairline, `--border` `#EFEDE6` default, `--border-strong` `#E8E6DF` for emphasized edges (sticky-column divider, table header bottom).
- **Primary** — desaturated deep teal `oklch(0.45 0.06 200)`. Brand chrome only; states use their own palette.
- **States** — solid + foreground + soft for `--accept`, `--reject`, `--indeterminate`. Always paired with an icon + uppercase label — never color alone.

### Shadows
**None.** A global `@layer utilities` rule neutralizes every Tailwind shadow utility (`shadow-sm` → `shadow-2xl`, `shadow-card`, `shadow-elevated`). If you need separation, use a border.

### Radius
`--radius: 0.375rem` (6px). Chips/badges use 4px (`rounded`). No pill shapes except where the StatusBadge size variant calls for it.

### Typography
- UI: **Inter** 400/500/600. Headings default to `font-medium` (not `semibold`).
- Mono: **JetBrains Mono** for Donor IDs, criterion IDs, field values, bbox coords, timestamps in tables, all citation/rule chips.

### Layout
- `.page-pad` → `padding-inline: clamp(16px, 3vw, 32px); padding-block: clamp(16px, 2.5vw, 28px);`
- No `max-w-[1400px]` cap on data screens — they go edge-to-edge inside the sidebar shell.

## Primitives

| Component | Notes |
|---|---|
| `StatusBadge` | `sm` 20px (tables), `md` 24px (cards), `lg` 32px (headers). Tighter than v1. |
| `TissueTypeBadge` | 20px chip, hairline border, dot accent. |
| `CitationChip` / `RuleChip` | Mono, 24px, hairline borders. |
| `ConfidenceMeter` | 1.5px bar + threshold tick + mono % readout. |
| `SectionCard` | Hairline border, no shadow, 14px header padding. |
| `SourceSheet` | Right sheet, hairline left border, scrim only. |
| `FilterChip` | Toolbar-only dismissible filter token. |
| `DataTable` | Virtualized via `@tanstack/react-virtual`, headless state via `@tanstack/react-table`. Sticky header, sticky first column, comfortable (44px) or compact (32px). |
| `DataTableToolbar` + `ToolbarSelect` | Search + filter selects + density toggle + column visibility. |

## Donor list — URL contract

Search params on `/donors` are the source of truth. State is shareable + survives refresh.

| Param | Type | Default |
|---|---|---|
| `q` | string | `""` |
| `tissue` | `"BT" \| "MS" \| "all"` | `all` |
| `rec` | `"ACCEPT" \| "REJECT" \| "INDETERMINATE" \| "none" \| "all"` | `all` |
| `comp` | `"COMPLETE" \| "INCOMPLETE" \| "all"` | `all` |
| `sort` | column id | `createdAt` |
| `dir` | `"asc" \| "desc"` | `desc` |
| `page` | int | `1` |
| `density` | `"comfortable" \| "compact"` | `comfortable` |

Server-paginated (mocked) at 200 rows/page; virtualization renders only the visible window. Mock seed ships ~250 synthetic donors.

## Composition rules

- **Tables**: 10.5px uppercase header text on `surface-muted`, hairline row dividers, hover = `surface-muted/60`. First column sticky on horizontal scroll.
- **Cards**: hairline border, no shadow, header `bg-surface` separated by `border-b`.
- **Sheets / dialogs**: hairline border, scrim, no shadow.
- **Disclaimer** + AATB wording rules unchanged from v1.

## Accessibility
- Status uses icon + text + color (never color alone).
- All interactive chips/buttons have `focus-visible:ring-2 ring-ring`.
- Sticky table headers preserve scroll affordance; sortable headers are real `<button>`s.
- Confidence meter has aria-label with percentage.
