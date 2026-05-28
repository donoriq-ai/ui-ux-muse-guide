
# Phase 2A — Auth shell (UI only, mock API)

Scope: build the sign-in / sign-up / reset / sign-out UI on the existing mock API, and gate the app behind a real `_authenticated` layout. No Lovable Cloud, no real backend. Same flat language as Donors/Workspace.

After this lands I'll propose Phase 2B (New Donor wizard) — the next highest demo-value slice per the original plan.

## 1. Mock auth state

The mock API already exposes `login`, `signup`, `setRole`, `getCurrentUser`. We add the bits an auth shell needs:

- `logout()` — clears `currentUserId`, marks an audit entry.
- Persist the signed-in user id to `localStorage` (`tissueqa.session`) so a refresh keeps you signed in. Loaded once into `store.currentUserId` on module init; cleared on logout.
- Add `requestPasswordReset(email)` and `resetPassword(token, newPassword)` as fake-success endpoints (no email, no token validation — just the right shape).

No schema changes.

## 2. Router context auth gate

- Add `_authenticated.tsx` pathless layout. `beforeLoad` reads the mock current user (via the query client cache or a direct `mockApi.getCurrentUserSync()` helper) and `throw redirect({ to: "/login", search: { redirect: location.href } })` if not signed in.
- Move protected routes under `_authenticated/`:
  - `donors.index.tsx` → `_authenticated/donors.index.tsx`
  - `donors.$id.tsx` → `_authenticated/donors.$id.tsx`
  - `donors.$id.report.tsx` stays public (printable, accessed via link with token later — keep simple for now and put it under `_authenticated/` too; report is internal).
  - `donors.new.tsx`, `audit.tsx`, `settings.tsx` → all under `_authenticated/`.
- Public routes: `index.tsx` (currently redirects to /donors — keep), `login`, `signup`, `forgot-password`, `reset-password`.
- `__root.tsx`'s "bare layout" heuristic gets simpler: bare for any route under `/login`, `/signup`, `/forgot-password`, `/reset-password`, and the printable report.

## 3. Screens

Built with existing shadcn primitives + flat tokens. All use the same centered card on warm paper: hairline border, no shadow, ~360px wide.

- **`/login`** — email + password, "Forgot password?" link, "Need an account? Sign up". Submit calls `mockApi.login`, invalidates `currentUserQuery`, navigates to `search.redirect ?? "/donors"`.
- **`/signup`** — name, email, password. Submits to `mockApi.signup`, then redirects to `/donors`.
- **`/forgot-password`** — email field; on submit shows "If an account exists, we sent a link" (mock; doesn't actually send anything).
- **`/reset-password`** — new password + confirm; on submit calls mock, toasts success, redirects to `/login`.

Quality bar:
- Real `<form>` with proper labels, inline error states, disabled-while-pending button.
- Inline validation (email format, min 8 char password). No new libs — small custom validators.
- Branded header strip: same logo/wordmark used in the sidebar.
- Skip link / autofocus on first field.

## 4. Sidebar / top bar wiring

- `TopBar` user menu "Sign out" item is wired: calls `mockApi.logout()`, invalidates current-user query, `navigate({ to: "/login" })`.
- "Profile" stays disabled (no profile screen yet).
- Role switcher stays — useful for demoing role-gated UI later. Add a small "Demo" label so it doesn't read like a real account control.
- If the current-user query returns null (post-logout, mid-load) the sidebar still mounts but the user-menu shows a "Sign in" link instead of the avatar.

## 5. Seed-data SSR hydration fix (rolled into this pass)

`src/lib/api/seed.ts` calls `new Date()` at module load to compute `createdAt`/`evaluatedAt`. Server and client evaluate at different moments → hydration mismatch warnings on the workspace header. Fix: derive all seed timestamps from a single deterministic anchor (e.g. `BASE_TIME = new Date('2026-05-15T09:00:00Z').getTime()`) with per-donor offsets. Same data, no drift, removes the warnings without `suppressHydrationWarning` band-aids.

## 6. Files

**New**
- `src/routes/_authenticated.tsx` — layout + redirect gate.
- `src/routes/forgot-password.tsx`
- `src/routes/reset-password.tsx`
- `src/components/auth/AuthCard.tsx` — shared centered card shell with logo + title + slot.
- `src/components/auth/FormField.tsx` — label + input + inline error.

**Edited**
- `src/routes/login.tsx`, `src/routes/signup.tsx` — replace `Phase2Stub` with real forms.
- `src/routes/__root.tsx` — extend `bare` matcher, register `_authenticated` route.
- Move `donors.index.tsx`, `donors.$id.tsx`, `donors.$id.report.tsx`, `donors.new.tsx`, `audit.tsx`, `settings.tsx` into the `_authenticated/` segment. (TanStack flat naming: `_authenticated.donors.index.tsx`, etc.)
- `src/components/TopBar.tsx` — wire Sign out, conditional menu when signed out.
- `src/lib/api/mockApi.ts` — add `logout`, `requestPasswordReset`, `resetPassword`, `getCurrentUserSync`; localStorage persistence.
- `src/lib/api/seed.ts` — deterministic timestamps.

**Out of scope (deferred)**
- Real Lovable Cloud / Supabase wiring.
- Email delivery, real reset tokens.
- Profiles table, RBAC enforcement beyond the existing role switcher.
- Social login.

## 7. Review point

After this: try sign-out → bounce to /login → sign back in → redirected back to the page you were on. Donor workspace hydration warnings gone. Then we tackle Phase 2B (New Donor wizard).
