import type { DocumentType, ExtractedField } from "@/lib/api/types";

export interface FieldGroup {
  key: string;
  label: string;
  fields: ExtractedField[];
}

type Matcher = (key: string) => boolean;

interface GroupDef {
  key: string;
  label: string;
  match: Matcher;
}

const startsWithAny =
  (...prefixes: string[]): Matcher =>
  (k) =>
    prefixes.some((p) => k.startsWith(p));

const includesAny =
  (...needles: string[]): Matcher =>
  (k) =>
    needles.some((n) => k.includes(n));

// Order matters — first match wins. "Other" is implicit at the end.
const GROUPS_BY_DOC: Partial<Record<DocumentType, GroupDef[]>> = {
  idt_report: [
    { key: "hiv", label: "HIV markers", match: (k) => k.includes("hiv") },
    {
      key: "hbv",
      label: "HBV markers",
      match: (k) => k.startsWith("hbsag") || k.includes("hbv") || k.startsWith("anti_hbc"),
    },
    { key: "hcv", label: "HCV markers", match: (k) => k.includes("hcv") },
    { key: "syphilis", label: "Syphilis", match: (k) => k.startsWith("syphilis") },
    { key: "htlv", label: "HTLV", match: (k) => k.includes("htlv") },
  ],
  medical_records: [
    {
      key: "demographics",
      label: "Demographics",
      match: includesAny("age", "sex", "dob", "race", "ethnicity"),
    },
    {
      key: "conditions",
      label: "Conditions & history",
      match: includesAny("condition", "diagnosis", "history", "infection"),
    },
    {
      key: "meds",
      label: "Medications",
      match: includesAny("medication", "drug", "rx"),
    },
  ],
  drai: [
    {
      key: "interview",
      label: "Interview",
      match: includesAny("interview", "informant", "relationship", "respondent"),
    },
    {
      key: "dates",
      label: "Dates",
      match: includesAny("date", "completed"),
    },
  ],
  birth_delivery_summary: [
    {
      key: "pregnancy",
      label: "Pregnancy",
      match: includesAny("gestational", "pregnancy", "prenatal"),
    },
    {
      key: "delivery",
      label: "Delivery",
      match: includesAny("delivery", "labor", "rupture"),
    },
    {
      key: "newborn",
      label: "Newborn",
      match: includesAny("birth_weight", "apgar", "newborn"),
    },
  ],
  physical_assessment: [
    {
      key: "findings",
      label: "Findings",
      match: startsWithAny("physical_assessment", "finding", "exam"),
    },
    {
      key: "examiner",
      label: "Examiner",
      match: includesAny("examiner", "signed", "signature"),
    },
  ],
  transfusion_record: [
    {
      key: "events",
      label: "Events",
      match: includesAny("event", "window", "transfusion_date"),
    },
    {
      key: "volumes",
      label: "Volumes",
      match: includesAny("volume", "ml", "total"),
    },
  ],
  recovery_timing_record: [
    {
      key: "events",
      label: "Events",
      match: includesAny("recovery", "asystole", "death"),
    },
  ],
};

const OTHER: GroupDef = { key: "other", label: "Other", match: () => true };

/**
 * Group fields belonging to a single document by clinical category.
 * Returns groups in fixed order; empty groups are omitted.
 */
export function groupFieldsForDoc(
  fields: ExtractedField[],
  docType: DocumentType,
): FieldGroup[] {
  const defs = GROUPS_BY_DOC[docType];
  if (!defs || defs.length === 0) {
    // Small documents: keep as a single flat group.
    return fields.length > 0
      ? [{ key: "fields", label: "Fields", fields }]
      : [];
  }
  const buckets = new Map<string, ExtractedField[]>();
  const all = [...defs, OTHER];
  all.forEach((d) => buckets.set(d.key, []));

  for (const f of fields) {
    const k = f.key.toLowerCase();
    const hit = defs.find((d) => d.match(k)) ?? OTHER;
    buckets.get(hit.key)!.push(f);
  }

  return all
    .map((d) => ({ key: d.key, label: d.label, fields: buckets.get(d.key)! }))
    .filter((g) => g.fields.length > 0);
}
