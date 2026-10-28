"""Catalog metadata is editable; captured calculation definitions stay immutable."""

import uuid
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.analytical_templates import TemplateField

TemplateFamily = Literal["analytical", "report"]
TemplateState = Literal["active", "archived", "all"]


class TemplateCatalogEntry(BaseModel):
    id: uuid.UUID
    family: TemplateFamily
    name: str
    input_grain: str
    presentation: str
    revision: int
    archived: bool
    fields: list[TemplateField]


class TemplateCatalogPage(BaseModel):
    items: list[TemplateCatalogEntry]
    total: int
    active_count: int
    archived_count: int
    offset: int
    limit: int


class TemplateCatalogEdit(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    request_id: uuid.UUID
    expected_revision: int = Field(ge=1, strict=True)
    name: str | None = Field(default=None, min_length=1, max_length=200, pattern=r"\S")
    archived: bool | None = Field(default=None, strict=True)

    @model_validator(mode="after")
    def action_required(self) -> Self:
        if self.name is None and self.archived is None:
            raise ValueError("Choose a template name or archive action.")
        return self


class FrozenTemplateMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200, pattern=r"\S")
    archived: bool = False


class FrozenTemplateCatalog(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    analytical: list[FrozenTemplateMetadata] = Field(default_factory=list)
    report: list[FrozenTemplateMetadata] = Field(default_factory=list)
