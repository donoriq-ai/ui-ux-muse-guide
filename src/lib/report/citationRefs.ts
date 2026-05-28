import type { Citation, DonorDocument } from "@/lib/api/types";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";

const SHORT: Partial<Record<DonorDocument["type"], string>> = {
  authorization_consent: "Consent",
  medical_records: "MedRec",
  drai: "DRAI",
  physical_assessment: "PhysAssess",
  idt_report: "IDT",
  birth_delivery_summary: "Birth",
  death_certificate: "DeathCert",
  autopsy_report: "Autopsy",
  recovery_timing_record: "Recovery",
  transfusion_record: "Transfusion",
  culture_results: "Culture",
};

export function shortDocLabel(doc: DonorDocument): string {
  return SHORT[doc.type] ?? DOCUMENT_TYPE_LABELS[doc.type];
}

/** Compact, print-friendly citation ref like "[DRAI p.3]". */
export function citationRef(
  citation: Citation | null,
  docsById: Map<string, DonorDocument>,
): string | null {
  if (!citation) return null;
  const doc = docsById.get(citation.documentId);
  const label = doc ? shortDocLabel(doc) : citation.documentLabel;
  return `[${label} p.${citation.page}]`;
}
