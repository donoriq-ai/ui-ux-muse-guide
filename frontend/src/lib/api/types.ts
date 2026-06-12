// Domain types for TissueQA. These mirror the future FastAPI schema.

export type TissueType = "BT" | "MS";
export type EvalState = "ACCEPT" | "REJECT" | "INDETERMINATE";
export type CompletenessState = "COMPLETE" | "INCOMPLETE";
export type Role = "admin" | "user";

export type DocumentType =
  | "authorization_consent"
  | "medical_records"
  | "drai"
  | "physical_assessment"
  | "idt_report"
  | "birth_delivery_summary"
  | "death_certificate"
  | "autopsy_report"
  | "recovery_timing_record"
  | "transfusion_record"
  | "culture_results";

export interface Citation {
  documentId: string;
  documentLabel: string;
  page: number;
  /** Normalized bounding box [x, y, w, h] in 0..1 coordinates of the page. */
  bbox?: [number, number, number, number];
  confidence: number;
}

export interface RuleCitation {
  aatb?: string[];
  cfr?: string[];
}

export interface ExtractedField {
  id: string;
  documentId: string;
  label: string;
  key: string;
  value: string | null;
  confidence: number;
  citation: Citation | null;
  flaggedLowConfidence: boolean;
  reviewed: boolean;
}

export interface DonorDocument {
  id: string;
  donorId: string;
  type: DocumentType;
  fileName: string;
  pageCount: number;
  uploadedAt: string;
  status: "processing" | "extracted" | "error";
}

export interface CompletenessItem {
  requirement: string;
  documentType?: DocumentType;
  status: "present" | "missing" | "low_confidence";
}

export interface RuleFinding {
  criterionId: string;
  title: string;
  state: EvalState;
  severity: "HARD" | "GATE" | "COND";
  inputs: { label: string; value: string | null; sourceCitation: Citation | null }[];
  ruleCitation: RuleCitation;
  reasoning: string;
}

export interface DonorEvaluation {
  completeness: { state: CompletenessState; items: CompletenessItem[] };
  recommendation: EvalState;
  findings: RuleFinding[];
  rulesetVersion: string;
  evaluatedAt: string;
}

export interface Donor {
  id: string;
  tenantId: string;
  tissueType: TissueType;
  createdAt: string;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  documents: DonorDocument[];
  fields: ExtractedField[];
  evaluation: DonorEvaluation | null;
}

export interface AuditEntry {
  id: string;
  donorId?: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  confidenceThreshold: number;
  gestationalAgePolicyWeeks: number;
}

export const RULESET_VERSION = "BT-MS-v0.1";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  authorization_consent: "Authorization & Consent",
  medical_records: "Medical Records",
  drai: "Donor Risk Assessment Interview (DRAI)",
  physical_assessment: "Physical Assessment",
  idt_report: "Infectious Disease Testing Report",
  birth_delivery_summary: "Birth & Delivery Summary",
  death_certificate: "Death Certificate",
  autopsy_report: "Autopsy Report",
  recovery_timing_record: "Recovery Timing Record",
  transfusion_record: "Transfusion Record",
  culture_results: "Culture Results",
};
