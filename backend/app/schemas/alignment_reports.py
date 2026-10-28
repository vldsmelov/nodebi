import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.join_diagnostics import AlignmentDiagnostics
from app.nodes.align_measures import AlignMeasuresConfig
from app.schemas.report_builder import ReportBuildPreview, ReportFormula, ReportStep
from app.schemas.workflows import ResolvedColumnRead


class AlignmentSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=200)
    alignment: AlignMeasuresConfig
    formulas: list[ReportFormula] = Field(default_factory=list, max_length=16)

    @model_validator(mode="after")
    def distinct_formulas(self) -> "AlignmentSettings":
        if len({f.node_id for f in self.formulas}) != len(self.formulas):
            raise ValueError("Formula identities must be unique.")
        return self


class AlignmentReportRequest(AlignmentSettings):
    request_id: uuid.UUID
    workflow_id: uuid.UUID
    left_publication_id: uuid.UUID
    right_publication_id: uuid.UUID
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")


class AlignmentEditRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: uuid.UUID
    expected_token: str = Field(pattern="^[0-9a-f]{64}$")
    settings: AlignmentSettings
    rebind_fields: bool = False
    acknowledge_shared: bool = False


class AlignmentEditRead(BaseModel):
    workflow_id: uuid.UUID
    visualization_id: uuid.UUID
    expected_token: str
    name: str
    editable: bool = False
    reason: str | None = None
    settings: AlignmentSettings | None = None
    left_columns: list[ResolvedColumnRead] = Field(default_factory=list)
    right_columns: list[ResolvedColumnRead] = Field(default_factory=list)
    steps: list[ReportStep] = Field(default_factory=list)
    widget_count: int = 0


class AlignmentReportFields(BaseModel):
    columns: list[ResolvedColumnRead]
    formula_outputs: dict[str, list[ResolvedColumnRead]] = Field(default_factory=dict)


class AlignmentReportPreview(ReportBuildPreview):
    alignment_diagnostics: AlignmentDiagnostics
    formula_fields: AlignmentReportFields
