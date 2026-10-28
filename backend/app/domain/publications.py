"""Saved output references and reusable view-context contracts."""

import uuid
from datetime import date
from typing import Literal, Self
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.parameters import ParameterDefinition, ParameterValues


class PublicationModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OutputReference(PublicationModel):
    node_id: uuid.UUID
    port: str = Field(min_length=1, max_length=100)


class ContextPoint(OutputReference):
    column_id: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=64)


class DataContext(PublicationModel):
    id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    timezone: str = "Europe/Moscow"
    roles: list[ParameterDefinition] = Field(default_factory=list, max_length=64)
    points: list[ContextPoint] = Field(default_factory=list, max_length=256)

    @model_validator(mode="after")
    def valid_context(self) -> Self:
        try:
            ZoneInfo(self.timezone)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Select a valid data timezone.") from exc
        names = [role.name for role in self.roles]
        if len(names) != len(set(names)) or "period" in names:
            raise ValueError("Context roles must be unique; period is reserved.")
        if any(point.role not in {*names, "period"} for point in self.points):
            raise ValueError("Declare every context role before assigning a field.")
        keys = [(point.node_id, point.port, point.role) for point in self.points]
        if len(keys) != len(set(keys)):
            raise ValueError("A context role can be bound once per table output.")
        return self


class MeasureDefinition(PublicationModel):
    id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    column_id: str = Field(min_length=1, max_length=200)
    grain_column_ids: list[str] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def distinct_grain(self) -> Self:
        if (
            len(set(self.grain_column_ids)) != len(self.grain_column_ids)
            or self.column_id in self.grain_column_ids
        ):
            raise ValueError("Measure and grain fields must be distinct.")
        return self


class PublishedOutput(OutputReference):
    id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    kind: Literal["dataset", "scalar"]
    context_ids: list[uuid.UUID] = Field(default_factory=list, max_length=64)
    ignored_roles: list[str] = Field(default_factory=list, max_length=64)
    semantic_fields: dict[str, str] = Field(default_factory=dict, max_length=64)
    measures: list[MeasureDefinition] = Field(
        default_factory=list, max_length=64, exclude_if=lambda value: not value
    )


class ResultCatalog(PublicationModel):
    outputs: list[PublishedOutput] = Field(default_factory=list, max_length=1000)
    contexts: list[DataContext] = Field(default_factory=list, max_length=64)

    @model_validator(mode="after")
    def unique_identifiers(self) -> Self:
        measure_ids = [m.id for output in self.outputs for m in output.measures]
        if len(set(measure_ids)) != len(measure_ids):
            raise ValueError("Measure identities must be unique within a workflow.")
        for items in (self.outputs, self.contexts):
            ids = [item.id for item in items]
            if len(ids) != len(set(ids)):
                raise ValueError("Published output and context identities must be unique.")
        known = {item.id for item in self.contexts}
        for output in self.outputs:
            if set(output.context_ids) - known:
                raise ValueError("Published output references an unavailable data context.")
            roles: dict[str, ParameterDefinition] = {}
            for context in self.contexts:
                if context.id not in output.context_ids:
                    continue
                for role in context.roles:
                    if role.name in roles and roles[role.name] != role:
                        raise ValueError("Shared context roles must have identical definitions.")
                    roles[role.name] = role
            if (set(output.ignored_roles) | set(output.semantic_fields)) - set(roles):
                raise ValueError("Publication settings reference an undeclared context role.")
        return self


class DatePeriod(PublicationModel):
    start: date
    end: date

    @model_validator(mode="after")
    def ordered(self) -> Self:
        if self.start > self.end or self.end == date.max:
            raise ValueError("Select a valid start and end date.")
        return self


class ViewContext(PublicationModel):
    period: DatePeriod | None = None
    values: ParameterValues = Field(default_factory=dict)
    highlight_only: list[str] = Field(default_factory=list, max_length=1)
