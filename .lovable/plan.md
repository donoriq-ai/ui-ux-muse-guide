
# Next up: Phase 2B — New Donor wizard

Auth shell is in. The biggest demo-value gap now is **creating a donor**. `/donors/new` exists but is a stub — clicking "New donor" from the workspace dead-ends. This phase makes intake feel real end-to-end, still on the mock API.

## Goals

- A guided multi-step wizard that produces a donor record matching the same shape Workspace renders.
- Same flat "warm paper" language: hairline borders, no shadows, compact type — consistent with the ID/badge sizing pass we just did.
- Zero backend work. Everything lands in `mockApi` and re-uses the existing seed types.

## Wizard steps

Single route `/_authenticated/donors/new`, stepper across the top, one panel visible at a time. Draft persisted to `localStorage` (`tissueqa.draft.newDonor`) so a refresh doesn't lose work.

1. **Identifiers** — Donor ID (auto-suggested next `2026-XXX`, editable), case/source ref, date received.
2. **Demographics & consent** — age, sex, cause of death, consent type, consent date.
3. **Tissues recovered** — multi-select chips (Bone, Skin, Cornea, Cardiovascular, Tendon…). Selection drives which extraction groups appear in the workspace later.
4. **Serology & screening** — required marker panel (HIV, HBV, HCV, Syphilis, HTLV) with result + date per row. Inline validation only — no scoring yet.
5. **Documents** — drag/drop zone (mock: just records filename + size + type). Required doc checklist (consent, medical history, serology report) with red/amber/green dots.
6. **Review & submit** — read-only summary using the same `SectionCard` components as the workspace, so the user sees exactly what they're about to create. Submit calls `mockApi.createDonor(draft)`, clears the draft, routes to `/donors/$id`.

Footer bar: Back / Save draft / Continue. Cancel returns to `/donors` and asks to discard if dirty.

## Mock API additions

- `createDonor(input)` — generates id, computes initial `eligibilityStatus = "intermediate"`, seeds empty extractions for the selected tissues, writes audit entry.
- `nextDonorId()` — `2026-NNN` based on current max.
- Draft helpers (`saveDraft`, `loadDraft`, `clearDraft`) — pure localStorage, no schema.

## Consistency pass (rolled in)

While we're touching intake-adjacent UI, fix the remaining size/weight inconsistencies you flagged:
- Audit page row meta type sized to match the workspace timeline.
- Settings page section headers down to the same `text-sm font-medium` we now use for "Eligibility" / "Extractions".
- Sidebar active-item weight matched to the new badge weight so nothing reads heavier than the donor ID.

## Files

**New**
- `src/components/donor-wizard/Stepper.tsx`
- `src/components/donor-wizard/WizardShell.tsx` (header + footer bar + draft hook)
- `src/components/donor-wizard/steps/Identifiers.tsx`
- `…/Demographics.tsx`, `…/Tissues.tsx`, `…/Serology.tsx`, `…/Documents.tsx`, `…/Review.tsx`
- `src/hooks/useDonorDraft.ts`

**Edited**
- `src/routes/_authenticated/donors.new.tsx` — replace stub with wizard shell.
- `src/lib/api/mockApi.ts` — `createDonor`, `nextDonorId`, draft helpers.
- `src/routes/_authenticated/audit.tsx`, `…/settings.tsx`, `src/components/AppSidebar.tsx` — type-size sweep.

## Out of scope

- Real file upload / storage.
- Auto-scoring eligibility from serology results (deferred to Phase 2C alongside the extraction grouping rework you asked about — long serology/grays lists need their own organize pass, best done once we have real intake data flowing).
- Lovable Cloud wiring.

## After this

Phase 2C candidate list, pick one when 2B lands:
1. **Extraction organization rework** — group/collapse/filter the long lists you flagged (serology, grays).
2. **Report screen polish** — `/donors/$id/report` is still skeletal.
3. **Audit & settings flesh-out**.

My recommendation: 2B now (unlocks the whole intake → workspace loop), then 2C = extraction organization (directly addresses your earlier feedback about long scrolls).
