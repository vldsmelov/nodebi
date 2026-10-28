import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.domain.ingestion import ReadOptions, SourceResource
from app.domain.publications import ViewContext
from app.domain.workbooks import WorksheetLayout
from app.schemas.file_exchange import FileExchangeRead
from app.schemas.workflows import ResolvedColumnRead, WorkflowRead


class VersionRead(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID
    filename: str
    file_size: int
    sha256: str
    created_at: datetime
    sheet_names: list[str] = Field(default_factory=list)
    resources: list[SourceResource] = Field(default_factory=list)
    read_options: ReadOptions | None = None


class RevisionRequest(BaseModel):
    expected_revision: int = Field(ge=1)


class RestoredView(BaseModel):
    dashboard_id: uuid.UUID
    name: str
    context: ViewContext


class ReportState(BaseModel):
    token: str
    restored_views: list[RestoredView] = Field(default_factory=list)
    last_update_name: str | None = None
    last_update_at: datetime | None = None
    pending_updates: int = 0
    check_status: Literal["missing", "outdated", "error", "warning", "passed"] = "missing"


class ColumnBinding(BaseModel):
    logical_id: str
    physical_id: str


class SheetBinding(BaseModel):
    sheet_name: str
    target_sheet: str
    layout: WorksheetLayout = Field(default_factory=WorksheetLayout)
    columns: list[ColumnBinding] = Field(default_factory=list)


class DatasetBinding(BaseModel):
    resource_id: str = Field(min_length=1, max_length=255)
    target_resource_id: str = Field(min_length=1, max_length=255)
    options: ReadOptions | None = None
    columns: list[ColumnBinding] = Field(default_factory=list, max_length=1024)


class UpdateItem(BaseModel):
    source_id: uuid.UUID
    version_id: uuid.UUID
    bindings: list[SheetBinding] = Field(default_factory=list)
    dataset_bindings: list[DatasetBinding] = Field(default_factory=list, max_length=1024)
    mode: Literal["replace", "append", "replace_period"] = "replace"
    period: str = Field(default="", max_length=100)
    baseline_period: str = Field(default="", max_length=100)


class UpdateSave(BaseModel):
    expected_revision: int = Field(ge=1)
    name: str = Field(default="Data update", min_length=1, max_length=200)
    items: list[UpdateItem] = Field(default_factory=list, max_length=100)


class MappingProfile(BaseModel):
    source_id: uuid.UUID
    sheet_name: str
    target_sheet: str
    layout: WorksheetLayout
    old_columns: list[ResolvedColumnRead]
    new_columns: list[ResolvedColumnRead]
    suggestions: list[ColumnBinding]
    old_rows: int
    new_rows: int
    old_examples: list[dict[str, Any]] = Field(default_factory=list)
    new_examples: list[dict[str, Any]] = Field(default_factory=list)


class CheckIssue(BaseModel):
    severity: Literal["error", "warning"]
    message: str
    node_id: str | None = None
    workflow_id: str | None = None
    count: int | None = None
    examples: list[dict[str, Any]] = Field(default_factory=list)


class DatasetMappingProfile(BaseModel):
    source_id: uuid.UUID
    version_id: uuid.UUID
    resource_id: str
    target_resource_id: str
    name: str
    options: ReadOptions
    old_columns: list[ResolvedColumnRead]
    new_columns: list[ResolvedColumnRead]
    suggestions: list[ColumnBinding]
    old_rows: int
    new_rows: int
    new_examples: list[dict[str, Any]] = Field(default_factory=list)


class ControlValue(BaseModel):
    workflow_id: str
    node_id: str
    port: str
    name: str
    value: float | None
    previous: float | None = None


class CheckResult(BaseModel):
    token: str
    issues: list[CheckIssue] = Field(default_factory=list)
    profiles: list[MappingProfile] = Field(default_factory=list)
    dataset_profiles: list[DatasetMappingProfile] = Field(default_factory=list)
    affected_workflows: list[str] = Field(default_factory=list)
    affected_visualizations: list[str] = Field(default_factory=list)
    metrics: list[ControlValue] = Field(default_factory=list)
    affected_reports: list[str] = Field(default_factory=list)


class UpdateRead(BaseModel):
    browser_editor_pending: bool = False
    file_exchange: FileExchangeRead | None = None
    id: uuid.UUID
    project_id: uuid.UUID
    revision: int
    status: str
    name: str
    items: list[UpdateItem]
    check: CheckResult | None = None
    created_at: datetime


class ApplyRequest(RevisionRequest):
    acknowledge_warnings: bool = False


class QualityRule(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str = Field(min_length=1, max_length=200)
    workflow_id: uuid.UUID
    node_id: uuid.UUID
    port: str = "dataset"
    kind: Literal["required", "unique", "compare", "change"]
    columns: list[str] = Field(default_factory=list)
    other_node_id: uuid.UUID | None = None
    other_port: str = "value"
    tolerance: float = Field(default=0, ge=0, allow_inf_nan=False)
    severity: Literal["error", "warning"] = "error"


class RulesSave(RevisionRequest):
    rules: list[QualityRule] = Field(default_factory=list, max_length=100)


class RulesRead(BaseModel):
    revision: int
    rules: list[QualityRule]


class JobRead(BaseModel):
    id: uuid.UUID
    revision: int
    status: str
    progress: int
    message: str
    result_id: uuid.UUID | None = None
    check: CheckResult | None = None


class ReleaseRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    period: str = Field(min_length=1, max_length=100)
    comment: str = Field(default="", max_length=2000)
    dashboard_ids: list[uuid.UUID] = Field(min_length=1, max_length=100)
    context: ViewContext = Field(default_factory=ViewContext)
    dashboard_contexts: dict[uuid.UUID, ViewContext] = Field(default_factory=dict, max_length=100)
    acknowledge_warnings: bool = False
    expected_token: str


class ReleaseRead(BaseModel):
    id: uuid.UUID
    name: str
    period: str
    comment: str
    created_at: datetime
    dashboard_ids: list[str]


class RestoreRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class LineageSource(BaseModel):
    source_id: uuid.UUID
    name: str
    files: list[str]
    periods: list[str]


class LineageRead(BaseModel):
    workflow: WorkflowRead
    target_node_id: uuid.UUID
    sources: list[LineageSource]
