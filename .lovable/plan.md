# Phase 2E — Audit & Settings build-out

Replace the two `Phase2Stub` pages with real, role-aware screens reading from existing `mockApi`. UI-only; one small API extension (`updateUserRole`) needed for Settings.

## A. Audit (`/audit`)

Tenant-wide audit log. Lists every `AuditEntry` with filters, search, deep-links, and CSV export.

**Layout**

```text
┌─ Header: "Audit trail" · count · Export CSV ─┐
├─ Filter bar (sticky):                         │
│   [Search detail/actor]  [Donor ▾] [Actor ▾]  │
│   [Action group ▾] [From date] [To date]      │
│   [Reset]                                     │
├─ Table:                                       │
│   Timestamp · Actor · Action · Donor · Detail │
│   (rows: hover → row link to donor; action    │
│    cell shows colored category badge)         │
└─ Footer: pagination (50/page) · total count   │
```

**Filters**
- Free-text search (matches detail + actor, case-insensitive)
- Donor: select from distinct `donorId`s in audit, plus "All" and "Tenant-level (no donor)"
- Actor: distinct actors from audit
- Action group: derived from the prefix before `.` — `auth`, `donor`, `document`, `field`, `evaluation`, `settings`, `system`
- Date range: from/to (ISO date inputs; inclusive)
- All filters encoded into URL search params via `zodValidator` + `fallback` so views are shareable/refreshable.

**Sort**: newest first (default). Click `Timestamp` header to toggle.

**CSV export**: client-side. Honors current filters. Columns: `timestamp,actor,action,donorId,detail`. Filename `tissueqa-audit-YYYYMMDD.csv`. Triggered by a Blob + `URL.createObjectURL` download — no server.

**Components (new)**
- `src/components/audit/AuditFilters.tsx` — filter bar bound to search params.
- `src/components/audit/AuditTable.tsx` — table + row rendering + empty state.
- `src/components/audit/ActionBadge.tsx` — colored chip per category.
- `src/lib/audit/categories.ts` — `categoryOf(action)`, `CATEGORY_LABELS`, badge color tokens.
- `src/lib/audit/exportCsv.ts` — pure CSV builder + download trigger.

**Route**
- `src/routes/_authenticated.audit.tsx` — `validateSearch` with Zod schema (`q`, `donor`, `actor`, `group`, `from`, `to`, `page`); loader uses `auditQuery()`; component reads search params and filters in-memory.

## B. Settings (`/settings`)

Admin-only screen with three sections.

**Layout (single column, max-w 920px)**

```text
1. Profile card        — name, email (read-only), role chip
2. Organization card   — tenant name (editable)
3. Thresholds card     — confidence threshold (slider 0.5–1.0 step 0.01),
                         BT gestational-age policy weeks (number 20–42)
4. Users card          — table of users with role select (admin-only edit),
                         shows "you" pill on current user, role badge legend
```

Each editable card has its own Save button → mutation → toast → invalidate `qk.settings`/`qk.users`/`qk.currentUser`. Dirty-state disables Save unless changed.

**Role gating**
- Use existing `currentUserQuery()`. If `role !== 'admin'`, render a read-only view of Settings (inputs disabled, Save hidden, banner "Read-only — admin role required to edit").
- The Users card hides role selects for non-admins entirely.

**Components (new)**
- `src/components/settings/SettingsSection.tsx` — wraps SectionCard with save/dirty state.
- `src/components/settings/ProfileCard.tsx`
- `src/components/settings/OrganizationCard.tsx`
- `src/components/settings/ThresholdsCard.tsx`
- `src/components/settings/UsersCard.tsx`

**API (small extension to `mockApi.ts`)**
- Add `updateUserRole(userId, role)` → updates in-memory store, appends audit `user.role_changed`. Tenant/settings/user list queries already exist.

**Route**
- `src/routes/_authenticated.settings.tsx` — loader preloads `settingsQuery`, `usersQuery`, `currentUserQuery`; component composes the 4 cards.

## Out of scope
- Real auth/RBAC enforcement (gating is UI-only based on mock role).
- Server-side pagination/streaming for audit (in-memory + page slicing only).
- Multi-tenant management, SSO, password policy.
- Audit row drill-down sheet (deep-link to donor is enough for this pass).

## Verification
After build:
1. `/audit` — load with no filters (sees seeded entries), apply Donor + Action group filters, confirm URL updates, Reset works, Export CSV downloads with correct rows.
2. `/settings` — toggle role via existing TopBar role switcher: as `admin` all fields editable; as `coordinator` everything disabled with banner; save Tenant name and Threshold, verify toast + values persist after refresh (in-memory store), and a `settings.updated` row shows up at top of `/audit`.

## Files

New:
- `src/components/audit/AuditFilters.tsx`
- `src/components/audit/AuditTable.tsx`
- `src/components/audit/ActionBadge.tsx`
- `src/lib/audit/categories.ts`
- `src/lib/audit/exportCsv.ts`
- `src/components/settings/SettingsSection.tsx`
- `src/components/settings/ProfileCard.tsx`
- `src/components/settings/OrganizationCard.tsx`
- `src/components/settings/ThresholdsCard.tsx`
- `src/components/settings/UsersCard.tsx`

Edited:
- `src/routes/_authenticated.audit.tsx` (drop stub, real page)
- `src/routes/_authenticated.settings.tsx` (drop stub, real page)
- `src/lib/api/mockApi.ts` (add `updateUserRole`)
- `src/lib/api/queries.ts` (no change unless a key is needed)

Untouched: donor workspace, report, extraction grouping, types.
