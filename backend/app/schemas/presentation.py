"""Presentation references real graph endpoints; it never contains an inner graph."""

import uuid

from pydantic import BaseModel, ConfigDict, Field


class PresentationModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ContainerPosition(PresentationModel):
    x: float = Field(allow_inf_nan=False)
    y: float = Field(allow_inf_nan=False)


class PublicPort(PresentationModel):
    id: uuid.UUID
    label: str = Field(min_length=1, max_length=200)
    node_id: uuid.UUID
    port: str = Field(min_length=1, max_length=100)
    column_id: str | None = Field(default=None, min_length=1, max_length=200)


class Container(PresentationModel):
    id: uuid.UUID
    label: str = Field(min_length=1, max_length=200)
    node_ids: list[uuid.UUID] = Field(min_length=1, max_length=2000)
    position: ContainerPosition
    collapsed: bool = False


class WorkbookContainer(Container):
    source_id: uuid.UUID
    detached_node_ids: list[uuid.UUID] = Field(default_factory=list, max_length=2000)


class CompositeBlock(Container):
    inputs: list[PublicPort] = Field(default_factory=list, max_length=2000)
    outputs: list[PublicPort] = Field(default_factory=list, max_length=2000)


class WorkflowPresentation(PresentationModel):
    workbooks: list[WorkbookContainer] = Field(default_factory=list, max_length=200)
    blocks: list[CompositeBlock] = Field(default_factory=list, max_length=200)
