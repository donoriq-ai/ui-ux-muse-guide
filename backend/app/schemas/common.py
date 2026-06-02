from typing import Literal

from pydantic import BaseModel, ConfigDict

TissueType = Literal["BT", "MS"]
EvalState = Literal["ACCEPT", "REJECT", "INDETERMINATE"]
CompletenessState = Literal["COMPLETE", "INCOMPLETE"]
Role = Literal["coordinator", "medical_director", "admin"]
DocumentType = Literal[
    "authorization_consent",
    "medical_records",
    "drai",
    "physical_assessment",
    "idt_report",
    "birth_delivery_summary",
    "death_certificate",
    "autopsy_report",
    "recovery_timing_record",
    "transfusion_record",
    "culture_results",
]


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
