import serology from "@/assets/docs/serology-report.jpg";
import drai from "@/assets/docs/drai.jpg";
import birth from "@/assets/docs/birth-summary.jpg";
import transfusion from "@/assets/docs/transfusion-record.jpg";
import physical from "@/assets/docs/physical-assessment.jpg";
import medical from "@/assets/docs/medical-records.jpg";
import type { DocumentType } from "./api/types";

/**
 * Maps document type / file name keywords to one of the synthetic page images.
 * Falls back to a generic medical record. In production each citation would
 * fetch a real page render from the backend.
 */
export function resolveDocImage(input: { type?: DocumentType; fileName?: string }): string {
  const t = input.type;
  const name = (input.fileName ?? "").toLowerCase();
  if (t === "idt_report" || name.includes("serology")) return serology;
  if (t === "drai" || name.includes("drai")) return drai;
  if (t === "birth_delivery_summary" || name.includes("birth")) return birth;
  if (t === "transfusion_record" || name.includes("transfusion")) return transfusion;
  if (t === "physical_assessment" || name.includes("physical")) return physical;
  return medical;
}
