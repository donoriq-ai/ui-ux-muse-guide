import type {
  AuditEntry,
  Donor,
  DonorDocument,
  ExtractedField,
  Tenant,
  User,
  Citation,
  RuleFinding,
} from "./types";
import { RULESET_VERSION } from "./types";

// All synthetic. No PHI. Citations point at real seed images bundled in src/assets/docs/.

export const seedTenant: Tenant = {
  id: "t-1",
  name: "Meridian Tissue Services",
  confidenceThreshold: 0.7,
  gestationalAgePolicyWeeks: 37,
};

export const seedUsers: User[] = [
  { id: "u-1", email: "casey.lin@example.org", name: "Casey Lin", role: "coordinator", tenantId: "t-1" },
  { id: "u-2", email: "dr.patel@example.org", name: "Dr. Anita Patel", role: "medical_director", tenantId: "t-1" },
  { id: "u-3", email: "morgan.admin@example.org", name: "Morgan Reyes", role: "admin", tenantId: "t-1" },
];

let _idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${++_idCounter}`;

function doc(
  donorId: string,
  type: DonorDocument["type"],
  fileName: string,
  pageCount: number,
  hoursAgo: number,
): DonorDocument {
  return {
    id: nextId("doc"),
    donorId,
    type,
    fileName,
    pageCount,
    uploadedAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    status: "extracted",
  };
}

function cite(d: DonorDocument, page: number, bbox: [number, number, number, number], confidence: number): Citation {
  return {
    documentId: d.id,
    documentLabel: d.fileName,
    page,
    bbox,
    confidence,
  };
}

function field(
  donorId: string,
  d: DonorDocument,
  key: string,
  label: string,
  value: string | null,
  confidence: number,
  bbox: [number, number, number, number],
  page = 1,
): ExtractedField {
  return {
    id: nextId("f"),
    documentId: d.id,
    label,
    key,
    value,
    confidence,
    citation: value !== null ? cite(d, page, bbox, confidence) : null,
    flaggedLowConfidence: confidence < seedTenant.confidenceThreshold,
    reviewed: false,
  };
}

// ───────────────────────────── BT donor — ACCEPT ─────────────────────────────
function buildDonor1(): Donor {
  const id = "D-2026-0001";
  const consent = doc(id, "authorization_consent", "Authorization_signed.pdf", 2, 26);
  const drai = doc(id, "drai", "DRAI_intake.pdf", 4, 25);
  const birth = doc(id, "birth_delivery_summary", "BirthDelivery_summary.pdf", 2, 24);
  const phys = doc(id, "physical_assessment", "Physical_assessment_birth_mother.pdf", 1, 24);
  const sero = doc(id, "idt_report", "Serology_panel.pdf", 3, 23);
  const med = doc(id, "medical_records", "MedRecords_summary.pdf", 6, 23);

  const fields: ExtractedField[] = [
    field(id, drai, "drai_completed_date", "DRAI completed", "2026-01-10", 0.97, [0.08, 0.86, 0.4, 0.04], 4),
    field(id, birth, "gestational_age_weeks", "Gestational age (weeks)", "39", 0.95, [0.6, 0.24, 0.18, 0.04]),
    field(id, birth, "delivery_type", "Delivery type", "Cesarean", 0.93, [0.6, 0.31, 0.22, 0.04]),
    field(id, phys, "physical_assessment_done", "Birth-mother physical assessment", "Completed", 0.98, [0.08, 0.6, 0.4, 0.05]),
    field(id, sero, "anti_hiv_1", "anti-HIV-1", "Non-Reactive", 0.96, [0.5, 0.32, 0.25, 0.04], 1),
    field(id, sero, "anti_hiv_2", "anti-HIV-2", "Non-Reactive", 0.96, [0.5, 0.38, 0.25, 0.04], 1),
    field(id, sero, "hiv_1_nat", "HIV-1 NAT", "Negative", 0.95, [0.5, 0.44, 0.25, 0.04], 1),
    field(id, sero, "hbsag", "HBsAg", "Non-Reactive", 0.96, [0.5, 0.5, 0.25, 0.04], 1),
    field(id, sero, "hbv_nat", "HBV NAT", "Negative", 0.94, [0.5, 0.56, 0.25, 0.04], 1),
    field(id, sero, "anti_hbc", "anti-HBc total", "Non-Reactive", 0.93, [0.5, 0.62, 0.25, 0.04], 1),
    field(id, sero, "anti_hcv", "anti-HCV", "Non-Reactive", 0.96, [0.5, 0.68, 0.25, 0.04], 1),
    field(id, sero, "hcv_nat", "HCV NAT", "Negative", 0.95, [0.5, 0.74, 0.25, 0.04], 1),
    field(id, sero, "syphilis", "Syphilis", "Non-Reactive", 0.97, [0.5, 0.8, 0.25, 0.04], 1),
  ];

  const findings: RuleFinding[] = [
    {
      criterionId: "TST-02",
      title: "Infectious disease testing panel — all required markers non-reactive",
      state: "ACCEPT",
      severity: "HARD",
      inputs: [
        { label: "anti-HIV-1", value: "Non-Reactive", sourceCitation: cite(sero, 1, [0.5, 0.32, 0.25, 0.04], 0.96) },
        { label: "HBsAg", value: "Non-Reactive", sourceCitation: cite(sero, 1, [0.5, 0.5, 0.25, 0.04], 0.96) },
        { label: "anti-HCV", value: "Non-Reactive", sourceCitation: cite(sero, 1, [0.5, 0.68, 0.25, 0.04], 0.96) },
        { label: "Syphilis", value: "Non-Reactive", sourceCitation: cite(sero, 1, [0.5, 0.8, 0.25, 0.04], 0.97) },
      ],
      ruleCitation: { aatb: ["§H12.600"], cfr: ["21 CFR 1271.85"] },
      reasoning: "All HARD markers in the required panel return non-reactive/negative interpretations within retention window.",
    },
    {
      criterionId: "DRAI-01",
      title: "DRAI completed within 14 days of recovery",
      state: "ACCEPT",
      severity: "GATE",
      inputs: [
        { label: "DRAI date", value: "2026-01-10", sourceCitation: cite(drai, 4, [0.08, 0.86, 0.4, 0.04], 0.97) },
      ],
      ruleCitation: { aatb: ["§H12.200"] },
      reasoning: "DRAI date falls within the 14-day pre-recovery window for the birth-mother donor.",
    },
    {
      criterionId: "PHY-01",
      title: "Birth-mother physical assessment on file",
      state: "ACCEPT",
      severity: "GATE",
      inputs: [
        { label: "Physical assessment", value: "Completed", sourceCitation: cite(phys, 1, [0.08, 0.6, 0.4, 0.05], 0.98) },
      ],
      ruleCitation: { aatb: ["§H12.300"] },
      reasoning: "Birth-mother physical assessment is present and signed by examiner.",
    },
  ];

  return {
    id,
    tenantId: seedTenant.id,
    tissueType: "BT",
    createdAt: new Date(Date.now() - 28 * 3600_000).toISOString(),
    createdBy: "Casey Lin",
    documents: [consent, drai, birth, phys, sero, med],
    fields,
    evaluation: {
      completeness: {
        state: "COMPLETE",
        items: [
          { requirement: "Authorization & Consent", documentType: "authorization_consent", status: "present" },
          { requirement: "DRAI", documentType: "drai", status: "present" },
          { requirement: "Birth & Delivery Summary", documentType: "birth_delivery_summary", status: "present" },
          { requirement: "Birth-mother Physical Assessment", documentType: "physical_assessment", status: "present" },
          { requirement: "Infectious Disease Testing Report", documentType: "idt_report", status: "present" },
          { requirement: "Medical Records Summary", documentType: "medical_records", status: "present" },
        ],
      },
      recommendation: "ACCEPT",
      findings,
      rulesetVersion: RULESET_VERSION,
      evaluatedAt: new Date(Date.now() - 22 * 3600_000).toISOString(),
    },
  };
}

// ──────────────────────────── MS donor — REJECT ──────────────────────────────
function buildDonor2(): Donor {
  const id = "D-2026-0002";
  const consent = doc(id, "authorization_consent", "Authorization_next_of_kin.pdf", 2, 50);
  const drai = doc(id, "drai", "DRAI_proxy_interview.pdf", 4, 50);
  const med = doc(id, "medical_records", "Hospital_records.pdf", 12, 49);
  const phys = doc(id, "physical_assessment", "Postmortem_physical.pdf", 1, 48);
  const sero = doc(id, "idt_report", "Serology_panel.pdf", 3, 48);
  const death = doc(id, "death_certificate", "Death_certificate.pdf", 1, 49);
  const timing = doc(id, "recovery_timing_record", "Recovery_timing.pdf", 1, 47);

  const fields: ExtractedField[] = [
    field(id, sero, "anti_hiv_1", "anti-HIV-1", "Repeatedly Reactive", 0.94, [0.5, 0.32, 0.25, 0.04], 1),
    field(id, sero, "anti_hiv_2", "anti-HIV-2", "Non-Reactive", 0.95, [0.5, 0.38, 0.25, 0.04], 1),
    field(id, sero, "hiv_1_nat", "HIV-1 NAT", "Negative", 0.93, [0.5, 0.44, 0.25, 0.04], 1),
    field(id, sero, "hbsag", "HBsAg", "Non-Reactive", 0.96, [0.5, 0.5, 0.25, 0.04], 1),
    field(id, sero, "anti_hcv", "anti-HCV", "Non-Reactive", 0.95, [0.5, 0.68, 0.25, 0.04], 1),
    field(id, sero, "syphilis", "Syphilis", "Non-Reactive", 0.96, [0.5, 0.8, 0.25, 0.04], 1),
    field(id, timing, "recovery_within_hours", "Recovery within 24h of asystole", "Yes (18h)", 0.92, [0.08, 0.5, 0.5, 0.05]),
    field(id, drai, "drai_completed_date", "DRAI completed", "2026-02-04", 0.9, [0.08, 0.86, 0.4, 0.04], 4),
  ];

  const findings: RuleFinding[] = [
    {
      criterionId: "TST-02",
      title: "Infectious disease testing — anti-HIV-1 repeatedly reactive",
      state: "REJECT",
      severity: "HARD",
      inputs: [
        { label: "anti-HIV-1", value: "Repeatedly Reactive", sourceCitation: cite(sero, 1, [0.5, 0.32, 0.25, 0.04], 0.94) },
      ],
      ruleCitation: { aatb: ["§H12.600", "§H19.700(1)"], cfr: ["21 CFR 1271.85"] },
      reasoning: "Repeatedly reactive HIV-1 antibody on the required panel constitutes a HARD-fail criterion. Donor ineligible.",
    },
    {
      criterionId: "TIM-01",
      title: "Recovery timing within allowable window",
      state: "ACCEPT",
      severity: "GATE",
      inputs: [
        { label: "Recovery interval", value: "18h", sourceCitation: cite(timing, 1, [0.08, 0.5, 0.5, 0.05], 0.92) },
      ],
      ruleCitation: { aatb: ["§H12.100"] },
      reasoning: "Tissue recovered within 24-hour window from asystole.",
    },
    {
      criterionId: "DRAI-01",
      title: "DRAI completed (proxy interview, antemortem records)",
      state: "ACCEPT",
      severity: "GATE",
      inputs: [
        { label: "DRAI date", value: "2026-02-04", sourceCitation: cite(drai, 4, [0.08, 0.86, 0.4, 0.04], 0.9) },
      ],
      ruleCitation: { aatb: ["§H12.200"] },
      reasoning: "Next-of-kin DRAI complete with supporting medical records.",
    },
  ];

  return {
    id,
    tenantId: seedTenant.id,
    tissueType: "MS",
    createdAt: new Date(Date.now() - 52 * 3600_000).toISOString(),
    createdBy: "Casey Lin",
    documents: [consent, drai, med, phys, sero, death, timing],
    fields,
    evaluation: {
      completeness: {
        state: "COMPLETE",
        items: [
          { requirement: "Authorization & Consent", documentType: "authorization_consent", status: "present" },
          { requirement: "DRAI", documentType: "drai", status: "present" },
          { requirement: "Medical Records Summary", documentType: "medical_records", status: "present" },
          { requirement: "Postmortem Physical Assessment", documentType: "physical_assessment", status: "present" },
          { requirement: "Infectious Disease Testing Report", documentType: "idt_report", status: "present" },
          { requirement: "Death Certificate", documentType: "death_certificate", status: "present" },
          { requirement: "Recovery Timing Record", documentType: "recovery_timing_record", status: "present" },
        ],
      },
      recommendation: "REJECT",
      findings,
      rulesetVersion: RULESET_VERSION,
      evaluatedAt: new Date(Date.now() - 46 * 3600_000).toISOString(),
    },
  };
}

// ──────────────────── BT donor — INDETERMINATE (missing doc) ─────────────────
function buildDonor3(): Donor {
  const id = "D-2026-0003";
  const consent = doc(id, "authorization_consent", "Authorization_signed.pdf", 2, 10);
  const birth = doc(id, "birth_delivery_summary", "BirthDelivery_summary.pdf", 2, 10);
  const phys = doc(id, "physical_assessment", "Physical_assessment_birth_mother.pdf", 1, 9);
  const sero = doc(id, "idt_report", "Serology_panel.pdf", 3, 9);
  const med = doc(id, "medical_records", "MedRecords_summary.pdf", 5, 9);

  const fields: ExtractedField[] = [
    field(id, birth, "gestational_age_weeks", "Gestational age (weeks)", "38", 0.93, [0.6, 0.24, 0.18, 0.04]),
    field(id, phys, "physical_assessment_done", "Birth-mother physical assessment", "Completed", 0.97, [0.08, 0.6, 0.4, 0.05]),
    field(id, sero, "anti_hiv_1", "anti-HIV-1", "Non-Reactive", 0.95, [0.5, 0.32, 0.25, 0.04], 1),
    field(id, sero, "hbsag", "HBsAg", "Non-Reactive", 0.55, [0.5, 0.5, 0.25, 0.04], 1), // low-confidence flag
    field(id, sero, "anti_hcv", "anti-HCV", "Non-Reactive", 0.92, [0.5, 0.68, 0.25, 0.04], 1),
    field(id, sero, "syphilis", "Syphilis", "Non-Reactive", 0.94, [0.5, 0.8, 0.25, 0.04], 1),
  ];

  const findings: RuleFinding[] = [
    {
      criterionId: "DRAI-01",
      title: "DRAI completed within 14 days of recovery",
      state: "INDETERMINATE",
      severity: "GATE",
      inputs: [{ label: "DRAI document", value: null, sourceCitation: null }],
      ruleCitation: { aatb: ["§H12.200"] },
      reasoning: "DRAI document is missing from this donor record. Cannot evaluate timing gate.",
    },
    {
      criterionId: "TST-02",
      title: "Infectious disease testing — HBsAg confidence below threshold",
      state: "INDETERMINATE",
      severity: "HARD",
      inputs: [
        { label: "HBsAg", value: "Non-Reactive (low confidence 0.55)", sourceCitation: cite(sero, 1, [0.5, 0.5, 0.25, 0.04], 0.55) },
      ],
      ruleCitation: { aatb: ["§H12.600"], cfr: ["21 CFR 1271.85"] },
      reasoning: "Extracted HBsAg value falls below the configured 0.70 confidence threshold. Coordinator review required to verify.",
    },
  ];

  return {
    id,
    tenantId: seedTenant.id,
    tissueType: "BT",
    createdAt: new Date(Date.now() - 12 * 3600_000).toISOString(),
    createdBy: "Casey Lin",
    documents: [consent, birth, phys, sero, med],
    fields,
    evaluation: {
      completeness: {
        state: "INCOMPLETE",
        items: [
          { requirement: "Authorization & Consent", documentType: "authorization_consent", status: "present" },
          { requirement: "DRAI", documentType: "drai", status: "missing" },
          { requirement: "Birth & Delivery Summary", documentType: "birth_delivery_summary", status: "present" },
          { requirement: "Birth-mother Physical Assessment", documentType: "physical_assessment", status: "present" },
          { requirement: "Infectious Disease Testing Report", documentType: "idt_report", status: "low_confidence" },
          { requirement: "Medical Records Summary", documentType: "medical_records", status: "present" },
        ],
      },
      recommendation: "INDETERMINATE",
      findings,
      rulesetVersion: RULESET_VERSION,
      evaluatedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    },
  };
}

// ────────────────── MS donor — INDETERMINATE / COND (dilution) ───────────────
function buildDonor4(): Donor {
  const id = "D-2026-0004";
  const consent = doc(id, "authorization_consent", "Authorization_next_of_kin.pdf", 2, 6);
  const drai = doc(id, "drai", "DRAI_proxy_interview.pdf", 4, 6);
  const med = doc(id, "medical_records", "Hospital_records.pdf", 14, 6);
  const sero = doc(id, "idt_report", "Serology_panel.pdf", 3, 5);
  const death = doc(id, "death_certificate", "Death_certificate.pdf", 1, 6);
  const timing = doc(id, "recovery_timing_record", "Recovery_timing.pdf", 1, 5);
  const trans = doc(id, "transfusion_record", "Transfusion_log.pdf", 2, 5);

  const fields: ExtractedField[] = [
    field(id, trans, "total_transfused_ml", "Total transfused volume (mL)", "2450", 0.94, [0.62, 0.74, 0.2, 0.05]),
    field(id, trans, "transfusion_window_hours", "Window from event to recovery (h)", "32", 0.91, [0.62, 0.8, 0.2, 0.05]),
    field(id, timing, "recovery_within_hours", "Recovery within 24h of asystole", "Yes (20h)", 0.93, [0.08, 0.5, 0.5, 0.05]),
    field(id, sero, "anti_hiv_1", "anti-HIV-1", "Non-Reactive", 0.95, [0.5, 0.32, 0.25, 0.04], 1),
    field(id, sero, "hbsag", "HBsAg", "Non-Reactive", 0.94, [0.5, 0.5, 0.25, 0.04], 1),
    field(id, sero, "anti_hcv", "anti-HCV", "Non-Reactive", 0.95, [0.5, 0.68, 0.25, 0.04], 1),
    field(id, sero, "syphilis", "Syphilis", "Non-Reactive", 0.96, [0.5, 0.8, 0.25, 0.04], 1),
  ];

  const findings: RuleFinding[] = [
    {
      criterionId: "DIL-01",
      title: "Plasma dilution assessment required",
      state: "INDETERMINATE",
      severity: "COND",
      inputs: [
        { label: "Transfused volume", value: "2450 mL", sourceCitation: cite(trans, 1, [0.62, 0.74, 0.2, 0.05], 0.94) },
        { label: "Window to recovery", value: "32 h", sourceCitation: cite(trans, 1, [0.62, 0.8, 0.2, 0.05], 0.91) },
        { label: "Plasma dilution calc", value: null, sourceCitation: null },
      ],
      ruleCitation: { aatb: ["§H12.100"] },
      reasoning: "Transfused volume exceeds 2000 mL within 48 hours pre-mortem. Plasma-dilution calculation is missing — coordinator must compute dilution ratio before serology can be relied upon.",
    },
    {
      criterionId: "TIM-01",
      title: "Recovery timing within allowable window",
      state: "ACCEPT",
      severity: "GATE",
      inputs: [
        { label: "Recovery interval", value: "20h", sourceCitation: cite(timing, 1, [0.08, 0.5, 0.5, 0.05], 0.93) },
      ],
      ruleCitation: { aatb: ["§H12.100"] },
      reasoning: "Tissue recovered within 24-hour window from asystole.",
    },
    {
      criterionId: "TST-02",
      title: "Infectious disease testing — all required markers non-reactive (pending dilution)",
      state: "INDETERMINATE",
      severity: "HARD",
      inputs: [
        { label: "anti-HIV-1", value: "Non-Reactive", sourceCitation: cite(sero, 1, [0.5, 0.32, 0.25, 0.04], 0.95) },
        { label: "HBsAg", value: "Non-Reactive", sourceCitation: cite(sero, 1, [0.5, 0.5, 0.25, 0.04], 0.94) },
      ],
      ruleCitation: { aatb: ["§H12.600"], cfr: ["21 CFR 1271.85"] },
      reasoning: "Serology results are non-reactive but cannot be considered conclusive until DIL-01 is resolved.",
    },
  ];

  return {
    id,
    tenantId: seedTenant.id,
    tissueType: "MS",
    createdAt: new Date(Date.now() - 7 * 3600_000).toISOString(),
    createdBy: "Casey Lin",
    documents: [consent, drai, med, sero, death, timing, trans],
    fields,
    evaluation: {
      completeness: {
        state: "COMPLETE",
        items: [
          { requirement: "Authorization & Consent", documentType: "authorization_consent", status: "present" },
          { requirement: "DRAI", documentType: "drai", status: "present" },
          { requirement: "Medical Records Summary", documentType: "medical_records", status: "present" },
          { requirement: "Infectious Disease Testing Report", documentType: "idt_report", status: "present" },
          { requirement: "Death Certificate", documentType: "death_certificate", status: "present" },
          { requirement: "Recovery Timing Record", documentType: "recovery_timing_record", status: "present" },
          { requirement: "Transfusion Record", documentType: "transfusion_record", status: "present" },
        ],
      },
      recommendation: "INDETERMINATE",
      findings,
      rulesetVersion: RULESET_VERSION,
      evaluatedAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
    },
  };
}

// Deterministic synthetic donors so virtualization/pagination is visibly real.
// No PHI, no real medical content — just enough shape for list-screen affordances.
const SYNTHETIC_DOC_TYPES = [
  "authorization_consent",
  "medical_records",
  "drai",
  "physical_assessment",
  "idt_report",
  "birth_delivery_summary",
  "death_certificate",
  "recovery_timing_record",
  "transfusion_record",
] as const;

const SYNTHETIC_CREATORS = ["Casey Lin", "Morgan Reyes", "Dr. Anita Patel", "Jordan Park", "Sam Diaz"];

function buildSyntheticDonor(n: number): Donor {
  const id = `D-2026-${String(5 + n).padStart(4, "0")}`;
  const tissueType: Donor["tissueType"] = n % 3 === 0 ? "MS" : "BT";
  const roll = (n * 31 + 7) % 100;
  const recommendation =
    roll < 55 ? "ACCEPT" : roll < 80 ? "INDETERMINATE" : "REJECT";
  const completeness =
    recommendation === "ACCEPT"
      ? "COMPLETE"
      : roll % 2 === 0
        ? "COMPLETE"
        : "INCOMPLETE";
  const hoursAgo = (n * 11) % 1400 + 4;
  const docCount = 3 + (n % 5);
  const documents = Array.from({ length: docCount }, (_, i): DonorDocument => {
    const type = SYNTHETIC_DOC_TYPES[(n + i) % SYNTHETIC_DOC_TYPES.length];
    return {
      id: `doc-syn-${n}-${i}`,
      donorId: id,
      type,
      fileName: `${type}_${i + 1}.pdf`,
      pageCount: 1 + ((n + i) % 8),
      uploadedAt: new Date(Date.now() - (hoursAgo - 1) * 3600_000).toISOString(),
      status: "extracted",
    };
  });

  return {
    id,
    tenantId: seedTenant.id,
    tissueType,
    createdAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    createdBy: SYNTHETIC_CREATORS[n % SYNTHETIC_CREATORS.length],
    documents,
    fields: [],
    evaluation: {
      completeness: { state: completeness, items: [] },
      recommendation,
      findings: [],
      rulesetVersion: RULESET_VERSION,
      evaluatedAt: new Date(Date.now() - Math.max(0, hoursAgo - 2) * 3600_000).toISOString(),
    },
  };
}

export function buildSeedDonors(): Donor[] {
  const headline = [buildDonor1(), buildDonor2(), buildDonor3(), buildDonor4()];
  const synthetic = Array.from({ length: 246 }, (_, i) => buildSyntheticDonor(i + 1));
  return [...headline, ...synthetic];
}

export function buildSeedAudit(donors: Donor[]): AuditEntry[] {
  const entries: AuditEntry[] = [];
  let n = 0;
  const push = (donorId: string | undefined, actor: string, action: string, detail: string, hoursAgo: number) =>
    entries.push({
      id: `a-${++n}`,
      donorId,
      actor,
      action,
      detail,
      timestamp: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    });

  for (const d of donors) {
    push(d.id, d.createdBy, "donor.created", `Donor ${d.id} created (${d.tissueType})`, 30);
    for (const doc of d.documents) {
      push(d.id, d.createdBy, "document.uploaded", `${doc.fileName}`, 28);
    }
    if (d.evaluation) {
      push(d.id, "system", "evaluation.completed", `Recommendation ${d.evaluation.recommendation}`, 22);
    }
  }
  return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
