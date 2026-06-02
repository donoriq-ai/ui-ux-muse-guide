# TissueQA — Ruleset Coverage and Gap Checklist

> Working document — not a YAML file. Encodes nothing. Use this to plan which rules to
> add next. All new YAML requires user sign-off before creation (see AGENTS.md "ask first").

---

## What is already encoded (`backend/rules/bt_ms/`)

| ID | Title | Applies | Severity | Document type |
|----|-------|---------|----------|---------------|
| BT-001 | Infectious Disease Testing required | BT, MS | HARD | idt_report |
| BT-002 | Donor Risk Assessment Interview required | BT, MS | HARD | drai |
| BT-003 | Authorization / Informed Consent required | BT, MS | GATE | authorization_consent |
| BT-004 | Gestational Age at Delivery | BT only | HARD | birth_delivery_summary |
| BT-005 | Recovery Timing Documentation | BT, MS | GATE | recovery_timing_record |
| BT-006 | Culture Results required | BT, MS | COND | culture_results |

Rules BT-001 through BT-003 and BT-005 through BT-006 apply to both BT and MS donors,
so MS has 5 of 6 topics covered at the field-check level. BT-004 is BT-only.

---

## Coverage note on BT-001 (IDT)

BT-001 checks only the 5 classic serological markers (HIV-1/2, HBsAg, HCV, HTLV, Syphilis).
The full required panel also includes:
- NAT for HIV-1
- NAT for HBV
- Total anti-HBc (IgG + IgM)
- NAT for HCV
- WNV NAT (seasonal — June–October for US establishments)

These are currently not checked because the stub extractor doesn't extract NAT fields.
When real Reducto extraction is active, BT-001 will need extended inputs or a BT-007 rule
for the NAT/extended panel.

---

## Gaps — BT (Birth Tissue)

| Priority | Topic | Description |
|----------|-------|-------------|
| HIGH | BT-007: Extended IDT panel (NAT) | NAT for HIV-1, NAT for HBV, anti-HBc total, NAT for HCV; WNV NAT seasonal |
| HIGH | BT-008: Physical Assessment | Documented physical assessment of birth mother: no signs of high-risk behavior, STIs, jaundice, lesions |
| HIGH | BT-009: Health of the Newborn | Review of newborn health status at delivery for birth tissue donors |
| HIGH | BT-010: Medical Director Eligibility Determination | Signed eligibility statement by MD before release; required prior to any tissue release |
| MEDIUM | BT-011: Cause of Death documentation | Death certificate or autopsy report required when no third-party records establish cause of death |
| MEDIUM | BT-012: Autopsy Review | MD must review autopsy findings (or document unavailability) before release |
| MEDIUM | BT-013: Blood Transfusion / Plasma Dilution | If transfused >2,000 mL within 48 h of asystole, must use pre-transfusion specimen or validated algorithm |
| MEDIUM | BT-014: High-Risk Behavior Review (comprehensive) | Cross-check DRAI + physical assessment + medical records for consistent high-risk finding |
| LOW | BT-015: Recovery Site Suitability | Documentation that recovery environment met controlled-access and aseptic requirements |

---

## Gaps — MS (Musculoskeletal)

Most BT/MS-shared rules (BT-001–003, BT-005–006) already cover MS at the field level.
The gaps below are MS-specific topics not covered by the shared rules.

| Priority | Topic | Description |
|----------|-------|-------------|
| HIGH | MS-001: Extended IDT panel (NAT) | Same NAT markers as BT-007 above; WNV NAT applies |
| HIGH | MS-002: Physical Assessment | Postmortem physical assessment required before tissue recovery |
| HIGH | MS-003: Medical Director Eligibility Determination | Same requirement as BT-010; signed eligibility statement |
| HIGH | MS-004: Cause of Death documentation | Same requirement as BT-011 |
| MEDIUM | MS-005: Autopsy Review | Same requirement as BT-012 |
| MEDIUM | MS-006: Blood Transfusion / Plasma Dilution | Same algorithm requirement as BT-013 |
| MEDIUM | MS-007: High-Risk Behavior Review (comprehensive) | Same cross-check requirement as BT-014 |
| MEDIUM | MS-008: Pre-sterilization Culture — Clostridium / Strep | MS-specific rule: tissues with Clostridium or Group A Strep must be discarded or treated with validated disinfection |
| LOW | MS-009: Recovery Site Suitability | Same requirement as BT-015 |
| LOW | MS-010: Age Criteria | MD-defined age limits for MS donors (no absolute limit but must be documented) |

---

## Suggested encoding order (once API keys arrive and you give the go-ahead)

1. BT-007 / MS-001 — Extended IDT panel (unblocks real Reducto extractions)
2. BT-008 / MS-002 — Physical Assessment (HARD/GATE; high clinical impact)
3. BT-009 — Health of the Newborn (BT-specific; needed for first real PDF test)
4. BT-010 / MS-003 — MD Eligibility Determination (required for any release)
5. BT-011–012 / MS-004–005 — Cause of Death + Autopsy
6. BT-013 / MS-006 — Plasma Dilution (complex logic; COND severity)
7. Remaining MEDIUM/LOW items after first real-PDF test confirms extraction quality

---

## How to encode a rule

See `backend/rules/bt_ms/bt_001_idt_required.yaml` as the canonical example.
Required fields: `id`, `version`, `title`, `applies`, `severity`, `document_type`,
`inputs`, `on_missing`, `citations`, `reasoning_template`.

**Do not start encoding without user sign-off** — per `AGENTS.md` "ask first" before
changing any rule, citation, threshold, or timeframe.
