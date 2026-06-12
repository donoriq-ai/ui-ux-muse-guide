"""
ReductoExtractor — real document processing via Reducto API.

Two ingestion paths:
  1. Single-doc: extract_fields(content, ...) — upload raw bytes, extract.run_job, poll.
  2. Combined BT packet: prepare_combined(content, ...) — upload once, submit to the
     configured BT pipeline (pipeline.run_job), poll a single job until complete, then
     parse both split classifications and per-section extracted fields from the result.

Only active when REDUCTO_API_KEY is set and EXTRACTOR_BACKEND=reducto.
"""
import logging
import secrets
import time
from io import BytesIO

from app.adapters.extraction.base import DocumentExtractor
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Per-doc extraction schemas ────────────────────────────────────────────────

_EXTRACT_SCHEMAS: dict[str, dict] = {
    "authorization_consent": {
        "type": "object",
        "properties": {
            "donor_name": {"type": "string", "description": "Full legal name of the donor"},
            "consent_date": {"type": "string", "description": "Date consent was signed (ISO 8601)"},
            "next_of_kin_name": {"type": "string", "description": "Name of the next of kin who consented"},
            "next_of_kin_relationship": {"type": "string", "description": "Relationship of NOK to donor"},
            "consent_signature_present": {"type": "string", "enum": ["Yes", "No"], "description": "Whether a signature is present on the consent/authorization document"},
        }
    },
    "drai": {
        "type": "object",
        "properties": {
            "hiv_iv_drug_use": {"type": "string", "enum": ["Yes", "No"], "description": "IV drug use risk answer"},
            "hiv_msm": {"type": "string", "enum": ["Yes", "No"], "description": "MSM risk behavior answer"},
            "high_risk_sexual": {"type": "string", "enum": ["Yes", "No"], "description": "High-risk sexual behavior answer"},
            "recent_incarceration": {"type": "string", "enum": ["Yes", "No"], "description": "Incarceration within 12 months"},
            "drai_date": {"type": "string", "description": "Date DRAI was completed (ISO 8601)"},
            "high_risk_behavior_composite": {"type": "string", "enum": ["Yes", "No", "Inconsistent"], "description": "Overall composite high-risk flag based on all DRAI answers, physical, and medical records cross-check"},
            "source_inconsistency": {"type": "string", "enum": ["Yes", "No"], "description": "Whether DRAI, physical assessment, and medical records give inconsistent information about high-risk behaviors"},
        }
    },
    "idt_report": {
        "type": "object",
        "properties": {
            "hiv_result": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative"], "description": "HIV-1/2 serology result"},
            "hbsag_result": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative"], "description": "Hepatitis B surface antigen result"},
            "anti_hbc_total_result": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative"], "description": "Total anti-HBc (hepatitis B core antibody, IgG+IgM) result"},
            "hcv_result": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative"], "description": "Hepatitis C antibody result"},
            "syphilis_result": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative", "RPR Reactive", "RPR Non-Reactive"], "description": "Syphilis serology result"},
            "htlv_result": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative"], "description": "HTLV-I/II serology result (required for living donors per AATB §D1.100)"},
            "hiv1_nat": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative", "Not Detected", "Detected"], "description": "HIV-1 NAT (nucleic acid test) result"},
            "hcv_nat": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative", "Not Detected", "Detected"], "description": "HCV NAT result"},
            "hbv_nat": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative", "Not Detected", "Detected"], "description": "HBV NAT result"},
            "wnv_nat": {"type": "string", "enum": ["Reactive", "Non-Reactive", "Repeatedly Reactive", "Positive", "Negative", "Not Detected", "Detected", "Not Performed"], "description": "West Nile Virus NAT result (required Jun–Oct for living donors)"},
            "collection_month": {"type": "integer", "description": "Month of specimen collection (1=January through 12=December)"},
            "specimen_date": {"type": "string", "description": "Specimen collection date (ISO 8601)"},
        }
    },
    "medical_records": {
        "type": "object",
        "properties": {
            "cause_of_death": {"type": "string", "description": "Primary cause of death as documented"},
            "cause_of_death_documented": {"type": "string", "enum": ["Yes", "No"], "description": "Whether cause of death is documented in the record"},
            "dob": {"type": "string", "description": "Donor date of birth (ISO 8601)"},
            "dod": {"type": "string", "description": "Donor date of death (ISO 8601)"},
            "donor_age_years": {"type": "number", "description": "Donor age at time of death in years"},
            "blood_type": {"type": "string", "description": "ABO blood type"},
            "md_eligibility_statement_present": {"type": "string", "enum": ["Yes", "No"], "description": "Whether a signed Medical Director eligibility determination statement is present in the donor record"},
            "md_signature_date": {"type": "string", "description": "Date of Medical Director eligibility signature (ISO 8601)"},
        }
    },
    "birth_delivery_summary": {
        "type": "object",
        "properties": {
            "gestational_age_weeks": {"type": "number", "description": "Gestational age at delivery in completed weeks"},
            "delivery_date": {"type": "string", "description": "Date of delivery (ISO 8601)"},
            "birth_weight_g": {"type": "number", "description": "Birth weight in grams"},
            "apgar_1min": {"type": "number", "description": "APGAR score at 1 minute"},
            "apgar_5min": {"type": "number", "description": "APGAR score at 5 minutes"},
            "prenatal_care": {"type": "string", "enum": ["Yes", "No"], "description": "Prenatal care received"},
            "newborn_health_assessment_present": {"type": "string", "enum": ["Yes", "No"], "description": "Whether a newborn health assessment is documented"},
            "active_neonatal_infection": {"type": "string", "enum": ["Yes", "No"], "description": "Whether an active neonatal infection was present at delivery"},
            "birth_complications_noted": {"type": "string", "enum": ["Yes", "No"], "description": "Whether significant birth complications were noted"},
        }
    },
    "physical_assessment": {
        "type": "object",
        "properties": {
            # Common fields (BT birth-mother exam and MS postmortem assessment)
            "assessment_date": {"type": "string", "description": "Date of physical assessment or examination (ISO 8601)"},
            "visible_lesions": {"type": "string", "description": "Visible lesion observations"},
            "bmi": {"type": "number", "description": "Body mass index"},
            # BT-specific birth-mother exam fields (AATB §H11.300, §H11.310)
            "exam_performed": {"type": "string", "enum": ["Yes", "No"], "description": "Whether a physical examination of the birth mother was performed"},
            "exam_date": {"type": "string", "description": "Date of birth mother physical examination (ISO 8601)"},
            "delivery_date": {"type": "string", "description": "Date of delivery for birth tissue (ISO 8601), used to check 14-day exam window"},
            "findings_abnormal": {"type": "string", "enum": ["Yes", "No"], "description": "Whether abnormal findings were documented on the birth mother exam"},
            "rejection_signs_present": {"type": "string", "enum": ["Yes", "No"], "description": "Whether rejection signs are present (STI lesions, needle tracks, jaundice, signs of sepsis, etc.)"},
            # MS-specific postmortem assessment fields (AATB §H11.000–§H11.200, Appendix III)
            "assessment_performed": {"type": "string", "enum": ["Yes", "No"], "description": "Whether the postmortem physical assessment was performed before recovery"},
            "appendix_iii_form_completed": {"type": "string", "enum": ["Yes", "No"], "description": "Whether the AATB Appendix III mandatory physical assessment form was completed"},
            "rejection_findings_present": {"type": "string", "enum": ["Yes", "No"], "description": "Whether postmortem rejection findings were present (per AATB §H11.100 list)"},
            "assessment_findings_summary": {"type": "string", "description": "Summary of postmortem physical assessment findings"},
        }
    },
    "death_certificate": {
        "type": "object",
        "properties": {
            "dod": {"type": "string", "description": "Date of death (ISO 8601)"},
            "cause_of_death_immediate": {"type": "string", "description": "Immediate cause of death as stated on certificate"},
            "cause_of_death_documented": {"type": "string", "enum": ["Yes", "No"], "description": "Whether cause of death is documented"},
            "death_certificate_present": {"type": "string", "enum": ["Yes", "No"], "description": "Whether an official death certificate is present in the record"},
            "manner_of_death": {"type": "string", "enum": ["Natural", "Accident", "Homicide", "Suicide", "Undetermined"], "description": "Manner of death"},
        }
    },
    "autopsy_report": {
        "type": "object",
        "properties": {
            "autopsy_performed": {"type": "string", "enum": ["Yes", "No", "Unknown"], "description": "Whether an autopsy was performed"},
            "autopsy_reviewed_by_md": {"type": "string", "enum": ["Yes", "No"], "description": "Whether the autopsy report was reviewed by the Medical Director prior to release"},
            "autopsy_infectious_findings": {"type": "string", "enum": ["Yes", "No"], "description": "Whether infectious or concerning findings were noted on autopsy"},
            "pathological_findings": {"type": "string", "description": "Summary of pathological findings from autopsy"},
        }
    },
    "recovery_timing_record": {
        "type": "object",
        "properties": {
            # MS / cadaveric fields
            "time_of_death": {"type": "string", "description": "Time of death / asystole (ISO 8601) — for cadaveric/MS donors only"},
            "skin_prep_start_datetime": {"type": "string", "description": "Date and time skin preparation began (ISO 8601) — used for MS AATB §H15.450 timing check"},
            "body_cooled_within_12h": {"type": "string", "enum": ["Yes", "No"], "description": "Whether the body was cooled or refrigerated within 12 hours of asystole (MS §H15.450)"},
            "recovery_start": {"type": "string", "description": "Recovery start time (ISO 8601)"},
            "recovery_end": {"type": "string", "description": "Recovery end time (ISO 8601)"},
            # BT / living-donor fields
            "acquisition_datetime": {"type": "string", "description": "Date and time birth tissue was acquired/collected (ISO 8601) — for birth tissue donors"},
            "processing_start_datetime": {"type": "string", "description": "Date and time processing began (ISO 8601)"},
            # Site fields
            "recovery_site_documented": {"type": "string", "enum": ["Yes", "No"], "description": "Whether the recovery site is documented in the record"},
            "recovery_site_type": {"type": "string", "enum": ["OR", "Delivery Room", "Other"], "description": "Type of recovery site (OR and Delivery Room are exempt from separate site evaluation per AATB §D3.120)"},
            "site_qualification_documented": {"type": "string", "enum": ["Yes", "No", "Exempt"], "description": "Whether site qualification is documented or exempt (OR/Delivery Room)"},
        }
    },
    "transfusion_record": {
        "type": "object",
        "properties": {
            "transfusion_occurred_48h": {"type": "string", "enum": ["Yes", "No"], "description": "Whether any blood transfusion or fluid infusion occurred in the 48 hours before asystole or specimen collection"},
            "blood_colloid_volume_ml": {"type": "number", "description": "Total volume of blood and colloid products transfused (mL) in the 48 hours before asystole or collection"},
            "crystalloid_volume_ml": {"type": "number", "description": "Total volume of crystalloid solutions infused (mL) in the 1 hour before asystole or collection"},
            "donor_age_over_12": {"type": "string", "enum": ["Yes", "No"], "description": "Whether the donor is older than 12 years (AATB §H12.100 age split for dilution rules)"},
            "pre_transfusion_specimen_available": {"type": "string", "enum": ["Yes", "No"], "description": "Whether a pre-transfusion blood specimen is available for testing"},
            "plasma_dilution_algorithm_performed": {"type": "string", "enum": ["Yes", "No"], "description": "Whether a validated plasma dilution algorithm was performed and the specimen was determined acceptable"},
            # Legacy field — kept for backward compatibility
            "transfusion_48h": {"type": "string", "enum": ["Yes", "No"], "description": "Blood transfusion within 48h (legacy — use transfusion_occurred_48h)"},
            "units_transfused": {"type": "number", "description": "Number of blood product units transfused (legacy)"},
        }
    },
    "culture_results": {
        "type": "object",
        "properties": {
            "aerobic_culture": {"type": "string", "description": "Aerobic culture result (e.g. No Growth, Negative, or organism name)"},
            "anaerobic_culture": {"type": "string", "description": "Anaerobic culture result"},
            "clostridium_result": {"type": "string", "enum": ["Positive", "Negative", "No Growth", "Not Performed", "Detected", "Not Detected", "Growth"], "description": "Clostridium culture result (MS-specific mandatory pathogen per AATB §H24.100)"},
            "group_a_strep_result": {"type": "string", "enum": ["Positive", "Negative", "No Growth", "Not Performed", "Detected", "Not Detected", "Growth"], "description": "Group A Streptococcus (S. pyogenes) culture result (MS-specific mandatory pathogen per AATB §H24.100, §H25.210)"},
            "validated_sterilization_performed": {"type": "string", "enum": ["Yes", "No"], "description": "Whether validated sterilization or disinfection was performed after a positive Clostridium or GAS culture result"},
            "culture_date": {"type": "string", "description": "Date cultures were taken (ISO 8601)"},
            "culture_release_approved": {"type": "string", "enum": ["Yes", "No"], "description": "Whether Medical Director approved culture results for release"},
        }
    },
}

_FIELD_LABELS: dict[str, str] = {
    # authorization_consent
    "donor_name": "Donor Name",
    "consent_date": "Consent Date",
    "next_of_kin_name": "Next of Kin Name",
    "next_of_kin_relationship": "Next of Kin Relationship",
    "consent_signature_present": "Consent Signature Present",
    # drai
    "hiv_iv_drug_use": "High-Risk Behavior - IV Drug Use",
    "hiv_msm": "High-Risk Behavior - MSM",
    "high_risk_sexual": "High-Risk Sexual Behavior",
    "recent_incarceration": "Recent Incarceration (12 mo)",
    "drai_date": "DRAI Completion Date",
    "high_risk_behavior_composite": "Composite High-Risk Flag",
    "source_inconsistency": "Source Inconsistency (DRAI vs Physical vs Records)",
    # idt_report
    "hiv_result": "HIV-1/2 Serology Result",
    "hbsag_result": "Hepatitis B Surface Antigen (HBsAg)",
    "anti_hbc_total_result": "Total Anti-HBc (Hepatitis B Core Ab)",
    "hcv_result": "Hepatitis C Antibody (anti-HCV)",
    "syphilis_result": "Syphilis Serology",
    "htlv_result": "HTLV-I/II Serology Result",
    "hiv1_nat": "HIV-1 NAT",
    "hcv_nat": "HCV NAT",
    "hbv_nat": "HBV NAT",
    "wnv_nat": "West Nile Virus NAT",
    "collection_month": "Specimen Collection Month",
    "specimen_date": "Specimen Collection Date",
    # medical_records
    "cause_of_death": "Cause of Death",
    "cause_of_death_documented": "Cause of Death Documented",
    "dob": "Date of Birth",
    "dod": "Date of Death",
    "donor_age_years": "Donor Age at Death (years)",
    "blood_type": "Blood Type",
    "md_eligibility_statement_present": "MD Eligibility Statement Present",
    "md_signature_date": "MD Eligibility Signature Date",
    # birth_delivery_summary
    "gestational_age_weeks": "Gestational Age at Delivery (weeks)",
    "delivery_date": "Delivery Date",
    "birth_weight_g": "Birth Weight (grams)",
    "apgar_1min": "APGAR Score (1 min)",
    "apgar_5min": "APGAR Score (5 min)",
    "prenatal_care": "Prenatal Care Received",
    "newborn_health_assessment_present": "Newborn Health Assessment Documented",
    "active_neonatal_infection": "Active Neonatal Infection at Delivery",
    "birth_complications_noted": "Significant Birth Complications",
    # physical_assessment
    "assessment_date": "Physical Assessment Date",
    "visible_lesions": "Visible Lesions",
    "bmi": "Body Mass Index",
    "exam_performed": "Birth Mother Exam Performed",
    "exam_date": "Birth Mother Exam Date",
    "findings_abnormal": "Abnormal Findings on Exam",
    "rejection_signs_present": "Rejection Signs Present (BT)",
    "assessment_performed": "Postmortem Assessment Performed",
    "appendix_iii_form_completed": "AATB Appendix III Form Completed",
    "rejection_findings_present": "Rejection Findings Present (MS)",
    "assessment_findings_summary": "Assessment Findings Summary",
    # death_certificate
    "cause_of_death_immediate": "Cause of Death - Immediate",
    "death_certificate_present": "Death Certificate Present",
    "manner_of_death": "Manner of Death",
    # autopsy_report
    "autopsy_performed": "Autopsy Performed",
    "autopsy_reviewed_by_md": "Autopsy Reviewed by MD",
    "autopsy_infectious_findings": "Autopsy Infectious Findings",
    "pathological_findings": "Pathological Findings",
    # recovery_timing_record
    "time_of_death": "Time of Death / Asystole",
    "skin_prep_start_datetime": "Skin Prep Start Date/Time",
    "body_cooled_within_12h": "Body Cooled Within 12h of Asystole",
    "recovery_start": "Recovery Start Time",
    "recovery_end": "Recovery End Time",
    "acquisition_datetime": "Tissue Acquisition Date/Time",
    "processing_start_datetime": "Processing Start Date/Time",
    "recovery_site_documented": "Recovery Site Documented",
    "recovery_site_type": "Recovery Site Type",
    "site_qualification_documented": "Site Qualification Documented",
    # transfusion_record
    "transfusion_occurred_48h": "Transfusion in Prior 48h",
    "blood_colloid_volume_ml": "Blood/Colloid Volume (mL, 48h)",
    "crystalloid_volume_ml": "Crystalloid Volume (mL, 1h)",
    "donor_age_over_12": "Donor Age Over 12 Years",
    "pre_transfusion_specimen_available": "Pre-Transfusion Specimen Available",
    "plasma_dilution_algorithm_performed": "Plasma Dilution Algorithm Performed",
    "transfusion_48h": "Transfusion Within 48h (legacy)",
    "units_transfused": "Units Transfused (legacy)",
    # culture_results
    "aerobic_culture": "Aerobic Culture Result",
    "anaerobic_culture": "Anaerobic Culture Result",
    "clostridium_result": "Clostridium Culture Result",
    "group_a_strep_result": "Group A Strep (S. pyogenes) Result",
    "validated_sterilization_performed": "Validated Sterilization Post-Positive",
    "culture_date": "Culture Date",
    "culture_release_approved": "Culture Release Approved by MD",
}

# Per-doc verification criteria for the deep_extract agentic loop.
_VERIFICATION_CRITERIA: dict[str, str] = {
    "idt_report": (
        "Extract every serology and NAT test result explicitly documented. "
        "For each serological marker (HIV, HBsAg, anti-HBc total, anti-HCV, HTLV-I/II, syphilis) return the exact "
        "result word from the document (e.g. 'Reactive', 'Non-Reactive', 'Repeatedly Reactive'). "
        "HTLV-I/II (htlv_result) is a required field — look for 'HTLV I/II Ab', 'HTLV-I/II', or 'HTLV' in the test list. "
        "For NAT results (HIV-1, HCV, HBV, WNV) return the exact result word. "
        "Use enum values only: Reactive, Non-Reactive, Repeatedly Reactive, Positive, Negative, Not Detected, Detected, Not Performed. "
        "Extract collection_month as an integer (1–12). "
        "If a marker is not tested or result is absent from the document, return null — do not infer."
    ),
    "drai": (
        "Extract every documented behavioral risk question answer as 'Yes' or 'No' exactly. "
        "high_risk_behavior_composite should be 'Yes' if any risk factor is confirmed, 'No' if all are negative, "
        "or 'Inconsistent' if the document contains conflicting information. "
        "source_inconsistency should be 'Yes' only if the DRAI contains explicit notes of conflicting information "
        "from physical assessment or medical records. "
        "If an answer is not explicitly stated, return null. Verify the DRAI completion date is present."
    ),
    "authorization_consent": (
        "Confirm donor or next-of-kin name and consent/authorization date are explicitly present. "
        "consent_signature_present should be 'Yes' if a signature line is signed, 'No' if signature is absent or blank. "
        "Return null for any field not explicitly present in the document."
    ),
    "birth_delivery_summary": (
        "Extract gestational_age_weeks as a number (integer or decimal weeks). "
        "newborn_health_assessment_present: 'Yes' if a newborn assessment section exists and is completed, 'No' otherwise. "
        "active_neonatal_infection: 'Yes' only if explicitly documented; 'No' if explicitly negative; null if not mentioned. "
        "active_neonatal_infection and birth_complications_noted must use 'Yes' or 'No' exactly. "
        "Do not calculate or infer gestational age from dates. Return null for any absent field."
    ),
    "physical_assessment": (
        "For a birth tissue birth-mother exam: "
        "exam_performed must be 'Yes' or 'No'. "
        "rejection_signs_present: 'Yes' if any of the following are documented — STI lesions, genital lesions, "
        "needle track marks, jaundice, lymphadenopathy, signs of sepsis, unexplained bruising; 'No' if explicitly clear. "
        "findings_abnormal: 'Yes' if any abnormality is noted; 'No' if explicitly normal. "
        "For a postmortem MS assessment: "
        "assessment_performed must be 'Yes' or 'No'. "
        "appendix_iii_form_completed must be 'Yes' or 'No'. "
        "rejection_findings_present: 'Yes' if any rejection-level finding from AATB §H11.100 list is documented. "
        "All Yes/No fields must use exactly 'Yes' or 'No'. Return null if not explicitly documented."
    ),
    "culture_results": (
        "Extract aerobic, anaerobic, Clostridium, and Group A Strep results using exact enum values: "
        "Positive, Negative, No Growth, Not Performed, Detected, Not Detected, Growth. "
        "Do not paraphrase — match enum values exactly or return null. "
        "culture_release_approved: 'Yes' if Medical Director approval is documented, 'No' if refused, null if not mentioned. "
        "validated_sterilization_performed: 'Yes' if documented, 'No' if not."
    ),
    "recovery_timing_record": (
        "Extract all date/time fields as ISO 8601 strings. "
        "body_cooled_within_12h must be 'Yes' or 'No' based on documented refrigeration timing. "
        "recovery_site_type must be exactly 'OR', 'Delivery Room', or 'Other'. "
        "recovery_site_documented and site_qualification_documented must be 'Yes', 'No', or 'Exempt'. "
        "Return null for any field not explicitly present."
    ),
    "transfusion_record": (
        "transfusion_occurred_48h, donor_age_over_12, pre_transfusion_specimen_available, and "
        "plasma_dilution_algorithm_performed must be exactly 'Yes' or 'No'. "
        "Extract blood_colloid_volume_ml and crystalloid_volume_ml as numbers in milliliters. "
        "Return null for any field not explicitly documented."
    ),
    "death_certificate": (
        "Extract cause of death as stated on the certificate. "
        "manner_of_death must match one of: Natural, Accident, Homicide, Suicide, Undetermined. "
        "death_certificate_present must be 'Yes' or 'No'. "
        "cause_of_death_documented must be 'Yes' if a cause is written, 'No' if blank or 'pending'. "
        "Return null for any absent field."
    ),
    "autopsy_report": (
        "autopsy_performed must be exactly 'Yes', 'No', or 'Unknown'. "
        "autopsy_reviewed_by_md: 'Yes' if the document shows MD review signature or acknowledgment. "
        "autopsy_infectious_findings: 'Yes' if infectious or concerning pathological findings are noted; 'No' if explicitly clear. "
        "Return null for any field not explicitly documented."
    ),
}

_DEFAULT_VERIFICATION = (
    "Extract only values that are explicitly present in the document. "
    "If a field cannot be found verbatim, return null — do not infer or guess."
)

_SYSTEM_PROMPT_PREAMBLE = (
    "You are a precise medical document data extractor. Your output will be used for "
    "regulated tissue bank eligibility determinations under HIPAA and 21 CFR Part 11. "
    "CRITICAL RULES:\n"
    "1. Return null for any field whose value is absent, redacted, illegible, or cannot "
    "be found verbatim in the document — never infer, estimate, or default.\n"
    "2. For enum fields, return only one of the specified enum values exactly as written.\n"
    "3. For date/time fields, return ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ).\n"
    "4. Do not carry values forward from one section to another.\n"
    "5. Scanned/handwritten values: transcribe exactly as written; flag low confidence appropriately.\n"
)


def _build_system_prompt(doc_type: str) -> str:
    criteria = _VERIFICATION_CRITERIA.get(doc_type, _DEFAULT_VERIFICATION)
    doc_label = doc_type.replace("_", " ").title()
    return (
        f"{_SYSTEM_PROMPT_PREAMBLE}"
        f"\nDocument type: {doc_label}\n"
        f"Extraction instructions: {criteria}"
    )


# ── Citation / result parsing ─────────────────────────────────────────────────

def _parse_citation_confidence(cit: dict) -> float:
    """
    Prefer numeric granular_confidence.extract_confidence on the leaf citation.
    Fall back to categorical confidence on the leaf, then parentBlock categorical.
    deep_extract sometimes returns confidence=None on the leaf with data on parentBlock.
    """
    granular = cit.get("granular_confidence") or {}
    if isinstance(granular, dict):
        val = granular.get("extract_confidence")
        if isinstance(val, (int, float)):
            return float(val)
    cat = cit.get("confidence")
    if cat:
        return 0.95 if cat == "high" else 0.50 if cat == "low" else 0.85
    parent = cit.get("parentBlock") or {}
    if isinstance(parent, dict):
        parent_gc = parent.get("granular_confidence") or {}
        if isinstance(parent_gc, dict):
            pval = parent_gc.get("extract_confidence")
            if isinstance(pval, (int, float)):
                return float(pval)
        parent_cat = parent.get("confidence")
        if parent_cat:
            return 0.95 if parent_cat == "high" else 0.50 if parent_cat == "low" else 0.85
    return 0.85


def _parse_citation_page(cit: dict) -> int:
    """Page lives inside bbox.page."""
    bbox = cit.get("bbox") or {}
    if isinstance(bbox, dict):
        page = bbox.get("page")
        if isinstance(page, int):
            return page
    return 1


def _parse_bbox(cit: dict) -> list[float] | None:
    bbox = cit.get("bbox") or {}
    if not isinstance(bbox, dict):
        return None
    left = bbox.get("left")
    top = bbox.get("top")
    width = bbox.get("width")
    height = bbox.get("height")
    if all(v is not None for v in (left, top, width, height)):
        return [float(left), float(top), float(width), float(height)]  # type: ignore[arg-type]
    return None


def _extract_fields_from_result(result_obj: object, schema: dict, doc_id: str, doc_label: str) -> list[dict]:
    """
    Parse a Reducto result object into our ExtractedField list.

    result_obj may be:
      - V3Extract (Pydantic model): schema fields are in .result (a dict keyed by field name
        with {value, citations} wrappers when citations=enabled).
      - dict: schema fields directly at the top level.
      - list: list of dicts (chunked without citations). Take first element.
    """
    res = result_obj

    # Unwrap V3Extract or PipelineResponse — schema data lives in .result
    if hasattr(res, "result"):
        res = res.result  # type: ignore[union-attr]

    if isinstance(res, list):
        result_dict: dict = res[0] if res else {}
    elif isinstance(res, dict):
        result_dict = res
    elif hasattr(res, "model_dump"):
        result_dict = res.model_dump(exclude_none=False)  # type: ignore[union-attr]
    else:
        logger.warning("reducto: unexpected result type %s, returning empty fields", type(res).__name__)
        result_dict = {}

    schema_props = schema.get("properties") or {}
    fields: list[dict] = []

    for key, wrapped in result_dict.items():
        if key not in schema_props:
            continue

        if isinstance(wrapped, dict):
            value = wrapped.get("value")
            citations: list[dict] = wrapped.get("citations") or []
        else:
            value = wrapped
            citations = []

        first_cit = citations[0] if citations else None
        confidence = _parse_citation_confidence(first_cit) if first_cit else 0.85
        page = _parse_citation_page(first_cit) if first_cit else 1
        bbox = _parse_bbox(first_cit) if first_cit else None

        citation_obj = None
        if first_cit:
            citation_obj = {
                "documentId": doc_id,
                "documentLabel": doc_label,
                "page": page,
                "bbox": bbox,
                "confidence": confidence,
            }

        fields.append({
            "id": f"f-{doc_id}-{key}-{secrets.token_hex(4)}",
            "documentId": doc_id,
            "label": _FIELD_LABELS.get(key, key.replace("_", " ").title()),
            "key": key,
            "value": str(value) if value is not None else None,
            "confidence": confidence,
            "citation": citation_obj,
            "flaggedLowConfidence": confidence < 0.85,
        })

    return fields


# ── ReductoExtractor ──────────────────────────────────────────────────────────

class ReductoExtractor(DocumentExtractor):
    def __init__(self) -> None:
        from reducto import Reducto
        self._client = Reducto(api_key=settings.reducto_api_key)

    # ── Shared submit+poll helper ─────────────────────────────────────────────

    def _submit_and_poll(
        self,
        input_ref: str,
        schema: dict,
        doc_type: str,
        parsing_override: dict | None = None,
    ) -> object:
        """
        Submit an async extract job to /extract_async and poll until terminal.
        Returns the raw job.result object (V3Extract or similar).
        Raises RuntimeError on Reducto-reported failure, TimeoutError on deadline.
        """
        parsing: dict = {
            "enhance": {
                "agentic": [{"scope": "table"}, {"scope": "text"}],
                "intelligent_ordering": True,
            },
        }
        if parsing_override:
            parsing.update(parsing_override)

        submit_response = self._client.extract.run_job(
            input=input_ref,
            instructions={
                "schema": schema,
                "system_prompt": _build_system_prompt(doc_type),
            },
            settings={
                "deep_extract": True,
                "citations": {"enabled": True, "numerical_confidence": True},
            },
            parsing=parsing,
            async_={"priority": False},
            timeout=settings.reducto_submit_timeout_seconds,
        )

        job_id: str = submit_response.job_id
        logger.info("reducto: submitted job_id=%s doc_type=%s input=%s", job_id, doc_type, input_ref[:60])

        deadline = time.monotonic() + settings.reducto_max_wait_seconds
        interval = settings.reducto_poll_interval_seconds
        attempt = 0

        while True:
            job = self._client.job.get(job_id, timeout=30)
            status = (job.status or "").lower()
            attempt += 1
            logger.info(
                "reducto: poll attempt=%d job_id=%s status=%s progress=%s",
                attempt, job_id, status, job.progress,
            )

            if status == "completed":
                logger.info("reducto: job_id=%s completed", job_id)
                return job.result

            if status == "failed":
                reason = getattr(job, "reason", None) or "Reducto extraction failed (no reason provided)"
                logger.error("reducto: job_id=%s FAILED reason=%s", job_id, reason)
                raise RuntimeError(f"Reducto job failed: {reason}")

            if time.monotonic() > deadline:
                logger.error("reducto: job_id=%s TIMED OUT after %.0fs", job_id, settings.reducto_max_wait_seconds)
                try:
                    self._client.job.cancel(job_id)
                    logger.info("reducto: cancelled timed-out job_id=%s", job_id)
                except Exception as cancel_err:
                    logger.warning("reducto: cancel failed for job_id=%s: %s", job_id, cancel_err)
                raise TimeoutError(
                    f"Reducto job {job_id} timed out after {settings.reducto_max_wait_seconds:.0f}s"
                )

            time.sleep(interval)

    # ── prepare_combined (BT pipeline path) ──────────────────────────────────

    async def prepare_combined(self, content: bytes, filename: str) -> dict:
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, self._sync_prepare_combined, content, filename
        )

    def _sync_prepare_combined(self, content: bytes, filename: str) -> dict:
        """
        Upload the combined BT packet once, then submit it to the configured
        pipeline (pipeline.run_job → /pipeline_async). A single Reducto job
        handles split + extract for all BT sections. Poll job.get() until
        terminal, then parse both the split classifications and the per-section
        extraction results.

        Returns:
          {
            "fileId": str,
            "classifications": [{"type", "pages", "pageRange", "confidence"}, ...],
            "pipeline_sections": {doc_type: raw_extract_result, ...},
          }
        """
        upload = self._client.upload(file=BytesIO(content))
        file_id: str = upload.file_id
        logger.info("reducto: combined upload file_id=%s filename=%s", file_id, filename)

        submission = self._client.pipeline.run_job(
            input=file_id,
            pipeline_id=settings.reducto_pipeline_id,
        )
        job_id: str = submission.job_id
        logger.info("reducto: pipeline job submitted job_id=%s file_id=%s", job_id, file_id[:60])

        deadline = time.monotonic() + settings.reducto_max_wait_seconds
        interval = settings.reducto_poll_interval_seconds
        attempt = 0

        while True:
            job = self._client.job.get(job_id, timeout=30)
            status = (job.status or "").lower()
            attempt += 1
            logger.info(
                "reducto: pipeline poll attempt=%d job_id=%s status=%s",
                attempt, job_id, status,
            )

            if status == "completed":
                logger.info("reducto: pipeline job_id=%s completed", job_id)
                break

            if status == "failed":
                reason = getattr(job, "reason", None) or "Pipeline job failed (no reason provided)"
                logger.error("reducto: pipeline job_id=%s FAILED reason=%s", job_id, reason)
                raise RuntimeError(f"Reducto pipeline job failed: {reason}")

            if time.monotonic() > deadline:
                logger.error("reducto: pipeline job_id=%s TIMED OUT after %.0fs", job_id, settings.reducto_max_wait_seconds)
                try:
                    self._client.job.cancel(job_id)
                    logger.info("reducto: cancelled timed-out pipeline job_id=%s", job_id)
                except Exception as cancel_err:
                    logger.warning("reducto: cancel failed for pipeline job_id=%s: %s", job_id, cancel_err)
                raise TimeoutError(
                    f"Reducto pipeline job {job_id} timed out after {settings.reducto_max_wait_seconds:.0f}s"
                )

            time.sleep(interval)

        pipeline_result = job.result

        # The pipeline envelope nests the actual parse/split/extract body one level
        # deeper under `.result` (job.result.result). Descend if that hop exists;
        # fall back to the top object in case the SDK ever flattens it.
        inner = getattr(pipeline_result, "result", None) or pipeline_result

        # ── Parse split classifications ────────────────────────────────────────
        _CAT_CONF = {"high": 0.95, "medium": 0.80, "low": 0.60}
        classifications: list[dict] = []

        try:
            splits_raw = inner.split.result.splits
        except AttributeError:
            splits_raw = []
            logger.warning("reducto: pipeline result missing split.result.splits job_id=%s", job_id)

        for split in splits_raw:
            pages_raw = split.pages
            page_ints: list[int] = []
            page_confidences: list[float] = []

            for p in pages_raw:
                if isinstance(p, int):
                    page_ints.append(p)
                else:
                    pn = getattr(p, "page_number", None)
                    if isinstance(pn, int):
                        page_ints.append(pn)
                    cat = getattr(p, "confidence", None)
                    if cat in _CAT_CONF:
                        page_confidences.append(_CAT_CONF[cat])

            if not page_ints:
                continue

            if page_confidences:
                confidence = min(page_confidences)
            else:
                conf_raw = getattr(split, "conf", None)
                confidence = 0.95 if conf_raw == "high" else 0.70 if conf_raw == "low" else 0.90

            classifications.append({
                "type": split.name,
                "pages": page_ints,
                "pageRange": [page_ints[0], page_ints[-1]],
                "confidence": confidence,
            })

        # ── Parse per-section extraction results ──────────────────────────────
        pipeline_sections: dict[str, object] = {}

        try:
            extract_list = inner.extract or []
        except AttributeError:
            extract_list = []
            logger.warning("reducto: pipeline result missing extract list job_id=%s", job_id)

        for section in extract_list:
            name = getattr(section, "split_name", None)
            raw = getattr(section, "result", None)
            if name and raw is not None:
                pipeline_sections[name] = raw

        logger.info(
            "reducto: pipeline completed job_id=%s file_id=%s sections=%d extracted=%d",
            job_id, file_id[:40], len(classifications), len(pipeline_sections),
        )
        return {
            "fileId": file_id,
            "classifications": classifications,
            "pipeline_sections": pipeline_sections,
        }

    # ── parse_pipeline_section ────────────────────────────────────────────────

    def parse_pipeline_section(
        self,
        raw: object,
        doc_type: str,
        doc_id: str,
        doc_label: str,
    ) -> list[dict]:
        """
        Convert a raw pipeline extract result for one section into our
        ExtractedField list. raw is the .result object from the pipeline
        extract array entry for this section.
        """
        schema = _EXTRACT_SCHEMAS.get(doc_type)
        if not schema:
            logger.warning("reducto: no schema for doc_type=%s in pipeline section", doc_type)
            return []
        return _extract_fields_from_result(raw, schema, doc_id, doc_label)

    # ── extract_fields (single-doc path) ─────────────────────────────────────

    async def extract_fields(self, content: bytes, doc_type: str, doc_id: str, doc_label: str) -> list[dict]:
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, self._run_extract_fields, content, doc_type, doc_id, doc_label
        )

    def _run_extract_fields(self, content: bytes, doc_type: str, doc_id: str, doc_label: str) -> list[dict]:
        schema = _EXTRACT_SCHEMAS.get(doc_type)
        if not schema:
            logger.warning("reducto: no schema for doc_type=%s, returning empty fields", doc_type)
            return []
        upload = self._client.upload(file=BytesIO(content))
        logger.info("reducto: single-doc upload file_id=%s doc_type=%s", upload.file_id, doc_type)
        result_obj = self._submit_and_poll(upload.file_id, schema, doc_type)
        return _extract_fields_from_result(result_obj, schema, doc_id, doc_label)

