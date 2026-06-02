# TissueQA — Verified Ruleset Citation Map (v0.2)

> **Source of truth for rule encoding.** All AATB section numbers derived from
> `docs/2025-08 Standards rev2 Final.md` (AATB 15th Ed rev 2, August 2025).
> All CFR sections from eCFR 21 CFR Part 1271 (confirmed current May 2026).
> Items marked **SME-REQUIRED** lack a concrete numeric threshold in the Standards
> document; they must not be encoded with fabricated values — freeze at INDETERMINATE
> or await SME/Medical Director sign-off.
>
> **Do not encode any rule not listed here without user sign-off (AGENTS.md).**

---

## Part I — Existing rules (corrected + confirmed)

| ID | Title | Applies | Severity | Doc type | Key inputs | Reject logic | AATB | CFR |
|----|-------|---------|----------|----------|-----------|-------------|------|-----|
| BT-001 | IDT — Serology panel | BT, MS | HARD | idt_report | anti-HIV-1/2, HBsAg, total anti-HBc, anti-HCV, syphilis | Any reactive/positive | H12.000, H12.600, H19.700 | §1271.80, §1271.85(a) |
| BT-002 | DRAI — Behavioral risk screening | BT, MS | HARD | drai | IV drug use, MSM behavior, high-risk sexual, incarceration, DRAI date | Any "Yes" on risk items | H10.000, H10.100, H10.200, Appendix II | §1271.75(a)(b) |
| BT-003 | Authorization / Informed Consent | BT, MS | GATE | authorization_consent | Signed consent present, consent date | Missing → INDETERMINATE | H8.000–H8.400 (BT/LD), H15.100, B6.200 | §1271.60(a)(b) |
| BT-004 | Gestational Age at Delivery | BT only | HARD | birth_delivery_summary | gestational_age_weeks | Below facility policy threshold → REJECT; **SME-REQUIRED for default threshold** | H9.720, B6.310 | §1271.85(b) |
| BT-005 *(FIXED)* | Recovery Timing — Birth Tissue | BT only | GATE | recovery_timing_record | acquisition_datetime, processing_start_datetime | Interval not documented → INDETERMINATE; **SME-REQUIRED for max hours** | H15.410, H15.580, definitions | §1271.265(b) |
| MS-005-RT *(NEW)* | Recovery Timing — Musculoskeletal | MS only | GATE | recovery_timing_record | time_of_death (asystole), skin_prep_start, body_cooled | Skin prep >24h if cooled ≤12h after death; >15h if not cooled → REJECT (H15.450 proxy) | H15.310, H15.450, definitions: ASYSTOLE | §1271.265(b) |
| BT-006 | Culture Results | BT, MS | COND | culture_results | aerobic_culture, anaerobic_culture, culture_date | Positive culture → MD review required (not auto-REJECT) | H25.400, H25.000, H25.200 | §1271.230(a) |

### BT-005 correction note
The original BT-005 required `time_of_death` for BT donors. Per the AATB Standards
(ASYSTOLE definition, line 554), time-of-death/asystole is a cadaveric concept —
birth tissue comes from live births and there is no donor death. BT-005 now tracks
acquisition_datetime and processing_start_datetime instead. The MS recovery-timing
rule (MS-005-RT) is the correct location for asystole-based logic.

---

## Part II — New rules (Phase 1 encoding)

### BT-007 — Extended IDT Panel (NAT)
| Field | Value |
|-------|-------|
| Applies | BT, MS |
| Severity | HARD |
| Doc type | idt_report |
| Inputs | hiv_nat, hcv_nat, hbv_nat, wnv_nat (seasonal) |
| Reject logic | Any NAT positive/reactive → REJECT; WNV NAT required Jun 1–Oct 31 for living donors (BT birth mother is living); foreign establishments → year-round |
| On missing | INDETERMINATE |
| AATB | H12.600 (items 2–4, 7), H12.610, H19.700 (3) |
| CFR | §1271.80(a), §1271.85(a) |
| Notes | Anti-HBc total (H12.600 item 5) already in BT-001 serology inputs; confirm it is present there |

### BT-008 / MS-002 — Physical Assessment / Examination
| Field | Value |
|-------|-------|
| Applies | BT-008 = BT only; MS-002 = MS only |
| Severity | GATE |
| Doc type BT | physical_assessment (birth mother examination) |
| Doc type MS | physical_assessment (postmortem assessment) |
| Inputs BT | exam_date, findings_summary, exam_within_14_days_of_delivery |
| Inputs MS | assessment_date, rejection_findings_present, appendix_iii_completed |
| Reject logic BT | Exam >14 days before delivery and no delivery-admission exam documented → INDETERMINATE; positive signs (STI lesions, jaundice, needle tracks) → REJECT |
| Reject logic MS | Rejection findings present (signs per H11.100 list) → REJECT; form not completed → INDETERMINATE |
| AATB BT | H11.300, H11.310 |
| AATB MS | H11.000, H11.100, H11.200, Appendix III |
| CFR | §1271.75(a) |

### BT-009 — Health of the Newborn
| Field | Value |
|-------|-------|
| Applies | BT only |
| Severity | GATE |
| Doc type | birth_delivery_summary |
| Inputs | newborn_health_assessment, apgar_1min, birth_complications |
| Reject logic | H9.200 requires review but gives no numeric APGAR cutoff → INDETERMINATE if assessment absent; active newborn infection at delivery → MD review required |
| On missing | INDETERMINATE |
| AATB | H9.200, H19.120, Appendix II item 6 |
| CFR | §1271.75(a) |
| Notes | **SME-REQUIRED for any APGAR threshold**; Appendix II item 6 governs infants ≤18 mo of age / breastfed ≤12 mo (maternal HIV/HBV/HCV risk), not a general APGAR cutoff |

### BT-010 / MS-003 — Medical Director Eligibility Determination
| Field | Value |
|-------|-------|
| Applies | BT, MS |
| Severity | GATE |
| Doc type | medical_records |
| Inputs | md_eligibility_statement_present, md_signature_date |
| Reject logic | No signed MD eligibility determination in donor record → INDETERMINATE (tissue must not be released per H10.400 / H19.000) |
| On missing | INDETERMINATE |
| AATB | H6.100, H19.000, H19.100, H19.200, B6.600, H10.400 |
| CFR | §1271.50(a), §1271.45(b) |

### BT-011 / MS-004 — Cause of Death Documentation
| Field | Value |
|-------|-------|
| Applies | MS (deceased donors); BT context = cause of any maternal complication; primary for MS |
| Severity | GATE |
| Doc type | death_certificate (MS) |
| Inputs | cause_of_death, death_certificate_present |
| Reject logic | COD cannot be determined AND no death certificate → INDETERMINATE; undetermined COD + exclusionary risk factors → INDETERMINATE pending MD review |
| On missing | INDETERMINATE |
| AATB | H19.300, B6.600, Appendix II item 26 |
| CFR | §1271.75(a) |
| Notes | Applies primarily to MS cadaveric donors; for BT this is a GATE on maternal COD documentation if applicable (e.g. maternal death) |

### BT-012 / MS-005 — Autopsy Report Review
| Field | Value |
|-------|-------|
| Applies | MS (deceased); BT if maternal death occurred |
| Severity | GATE |
| Doc type | autopsy_report |
| Inputs | autopsy_performed, autopsy_reviewed_by_md, concerning_findings |
| Reject logic | Autopsy performed but not reviewed by MD before inventory release → INDETERMINATE; concerning infectious findings on autopsy → MD review required |
| On missing | INDETERMINATE (provisional release allowed per B5.210 if not yet available) |
| AATB | H19.400, H19.410, H19.420, B5.210 |
| CFR | §1271.75(a) |

### BT-013 / MS-006 — Blood Transfusion / Plasma Dilution
| Field | Value |
|-------|-------|
| Applies | BT, MS |
| Severity | HARD |
| Doc type | transfusion_record |
| Inputs | transfusion_48h, units_transfused_blood_colloids, units_transfused_crystalloids, donor_age_over_12, pre_transfusion_specimen_available, dilution_algorithm_performed |
| Reject logic | Donor >12 yrs AND >2,000 mL blood/colloids in 48h before asystole/collection AND no pre-transfusion specimen AND no validated dilution algorithm → REJECT. Donor ≤12 yrs AND any transfusion/infusion AND no pre-transfusion specimen AND no algorithm → REJECT |
| On missing | INDETERMINATE |
| AATB | H12.100, H12.110, H12.120, H12.130, H19.100 item 6 |
| CFR | §1271.80(b) |
| Threshold | 2,000 mL blood/colloids in 48 h; 2,000 mL crystalloids in 1 h; age split at 12 years |

### BT-014 / MS-007 — Comprehensive High-Risk Behavior Review
| Field | Value |
|-------|-------|
| Applies | BT, MS |
| Severity | HARD |
| Doc type | drai (cross-referenced with physical_assessment + medical_records) |
| Inputs | high_risk_behavior_composite (derived from DRAI + physical + records) |
| Reject logic | Any Appendix II high-risk behavior identified across any source document → REJECT; inconsistency between sources → INDETERMINATE for MD review |
| On missing | INDETERMINATE |
| AATB | H19.500, H19.600, H10.100, H10.500, Appendix II |
| CFR | §1271.75(a)(b) |
| Notes | This is a cross-document consistency check, not a single-field rule; Claude must synthesize DRAI + physical + medical records. BT-002 checks DRAI fields individually; this rule checks overall composite risk |

### BT-015 / MS-009 — Recovery Site Suitability
| Field | Value |
|-------|-------|
| Applies | BT, MS |
| Severity | GATE |
| Doc type | recovery_timing_record |
| Inputs | recovery_site_documented, recovery_environment_controlled |
| Reject logic | No documentation of recovery site suitability → INDETERMINATE; recovery at non-qualified site without OR/delivery-room exception → INDETERMINATE |
| On missing | INDETERMINATE |
| AATB | D3.000, D3.100, D3.110, D3.120, H15.300, H15.310, Appendix IV |
| CFR | §1271.265(b) |
| Notes | OR / hospital delivery room is explicitly exempt from separate site evaluation per D3.120 |

### MS-001 — Extended IDT Panel (NAT) — Musculoskeletal
| Field | Value |
|-------|-------|
| Applies | MS only (BT-007 covers BT) |
| Severity | HARD |
| Doc type | idt_report |
| Inputs | hiv_nat, hcv_nat, hbv_nat |
| Reject logic | Any NAT positive → REJECT; WNV NAT not required for deceased MS donors per H12.610 (LD-focused) unless bank policy extends it |
| On missing | INDETERMINATE |
| AATB | H12.600 (items 2–4), H19.700 (3) |
| CFR | §1271.80(a), §1271.85(b) |
| Notes | WNV NAT is living-donor-focused in Standards; MS = deceased → WNV NAT by behavioral screen only (H12.610, Appendix II item 19) unless facility adds per §1271.85(d) discretion |

### MS-008 — Culture — Clostridium / Group A Streptococcus
| Field | Value |
|-------|-------|
| Applies | MS only |
| Severity | HARD |
| Doc type | culture_results |
| Inputs | clostridium_result, group_a_strep_result |
| Reject logic | Either Clostridium or Group A Strep (Streptococcus pyogenes) positive → REJECT unless validated sterilization/disinfection performed; cross-contaminated co-recovered tissues → same reject rule |
| On missing | INDETERMINATE |
| AATB | H24.100, H25.210 |
| CFR | §1271.230(a) |

### MS-010 — Donor Age Criteria
| Field | Value |
|-------|-------|
| Applies | MS only |
| Severity | GATE |
| Doc type | medical_records |
| Inputs | donor_age_years |
| Reject logic | **SME-REQUIRED — no absolute numeric age cap in AATB Rev 2 (H9.600 delegates to MD/MAC)** |
| On missing | INDETERMINATE |
| AATB | H9.600 |
| CFR | §1271.50(a) |
| Notes | Standards require bank SOPM to define age criteria; encode only after facility policy is provided |

---

## Part III — SME-REQUIRED items (do not encode thresholds until confirmed)

| Item | Standards reference | What is missing |
|------|---------------------|-----------------|
| BT-004 gestational age default | H9.720 | No numeric weeks — bank writes its own policy. Current YAML has "default 20 weeks" which is NOT in Standards. Must be replaced with "per facility policy / INDETERMINATE if below bank threshold". |
| BT-005 cord-clamp to acquisition hours | H15.410, H15.580 | No numeric BT acquisition interval in Standards. |
| MS recovery completion hours from asystole | H15.450, H16.300 | H15.450 is skin-prep start only; full recovery completion = bank-validated. |
| MS-010 age criteria | H9.600 | Numeric limits = bank SOPM. |
| BT-009 APGAR cutoff | H9.200 | No APGAR threshold in Standards. |
| CMV / HTLV for non-reproductive BT/MS | H12.600, H12.700 | Not in universal panel; only reproductive / leukocyte-rich tissue. Removed from BT-001 to be standards-accurate. |

---

## Part IV — CFR section reference (21 CFR Part 1271)

| Section | Topic |
|---------|-------|
| §1271.45 | Donor eligibility determination required |
| §1271.50 | How to determine donor eligibility; MD sign-off requirement |
| §1271.60 | Consent; authorization |
| §1271.75 | Donor screening (behavioral, medical records) |
| §1271.80 | General donor testing requirements |
| §1271.85 | Specific testing per tissue type (serology, NAT) |
| §1271.90 | Exceptions to donor eligibility requirements |
| §1271.230 | Processing and process controls (culture) |
| §1271.265 | Records; documentation retention |

---

## Sign-off gate

**Before any YAML is encoded or modified, the following require user/SME confirmation:**
1. BT-004 default gestational age threshold (current "20 weeks" is not AATB-specified).
2. BT-005 max acquisition-to-processing interval for birth tissue.
3. MS recovery completion window from asystole (beyond H15.450 skin-prep proxy).
4. MS-010 age range (min/max).
5. BT-009 APGAR or newborn health numeric cutoff.
6. HTLV-I/II and CMV scope for BT/MS (currently in BT-001 — only required if product is leukocyte-rich or required by state law).

Items 1, 3, 4, 5 are SME-required. Items 2 and 6 are clarification questions the implementation team can answer.
