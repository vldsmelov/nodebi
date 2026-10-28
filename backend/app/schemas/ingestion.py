import uuid
from datetime import datetime
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.ingestion import ImportProfile, ReadOptions, SourceResource
from app.schemas.workflows import ResolvedColumnRead


class ImportedSourceRead(BaseModel):
    id: uuid.UUID
    name: str
    connector: str
    resources: list[SourceResource]
    active_snapshots: dict[str, str]
    revision: int
    has_draft: bool = False
    read_options: ReadOptions = Field(default_factory=ReadOptions)


class ImportDraftSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_revision: int = Field(ge=1)
    resource_id: str = Field(min_length=1, max_length=255)
    options: ReadOptions = Field(default_factory=ReadOptions)
    profile: ImportProfile | None = None

    @model_validator(mode="after")
    def consistent_profile(self) -> Self:
        if self.profile and (
            self.profile.resource_id != self.resource_id or self.profile.options != self.options
        ):
            raise ValueError("Draft table and reading options must match its field profile.")
        return self


class SaveImportDraft(ImportDraftSettings):
    expected_revision: int = Field(ge=0)


class ImportDraftRead(ImportDraftSettings):
    revision: int = Field(ge=0)
    status: Literal["draft", "applied"] = "draft"
    request_id: uuid.UUID
    snapshot_id: uuid.UUID | None = None


class ImportSessionRead(BaseModel):
    source: ImportedSourceRead
    draft: ImportDraftRead


class InspectResourceRequest(BaseModel):
    resource_id: str = Field(min_length=1, max_length=255)
    options: ReadOptions = Field(default_factory=ReadOptions)


class ApplyImportRequest(BaseModel):
    profile: ImportProfile
    expected_revision: int = Field(ge=1)
    request_id: uuid.UUID
    draft_revision: int | None = Field(default=None, ge=1)


class DatasetSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    source_id: uuid.UUID
    source_version_id: uuid.UUID
    resource_id: str
    row_count: int
    profile: ImportProfile
    columns: list[ResolvedColumnRead]
    created_at: datetime
