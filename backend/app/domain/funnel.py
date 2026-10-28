"""Ordered prepared-stage funnel contracts, independent of the renderer."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

MAX_STAGES = 50
PERCENT_SCALE = 12


class FunnelConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage_column_id: str = Field(min_length=1)
    order_column_id: str = Field(min_length=1)
    value_column_id: str = Field(min_length=1)

    @model_validator(mode="after")
    def distinct_fields(self) -> "FunnelConfig":
        if len({self.stage_column_id, self.order_column_id, self.value_column_id}) != 3:
            raise ValueError("Choose separate funnel stage, order and value fields.")
        return self


class FunnelRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    point_id: str
    stage: str
    order: str
    value: str
    previous_percent: str
    initial_percent: str
    loss: str
    previous_exact: str
    initial_exact: str


class FunnelSummaryRoles(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage_count: str
    initial_value: str
    final_value: str
    overall_percent: str
    overall_exact: str


class FunnelSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    type: Literal["funnel_chart"] = "funnel_chart"
    rows: FunnelRoles
    summary: FunnelSummaryRoles


def funnel_spec(node_id: UUID) -> FunnelSpec:
    prefix = f"funnel_{node_id.hex}_"
    return FunnelSpec(
        rows=FunnelRoles.model_validate({name: prefix + name for name in FunnelRoles.model_fields}),
        summary=FunnelSummaryRoles.model_validate(
            {name: prefix + name for name in FunnelSummaryRoles.model_fields}
        ),
    )


class FunnelPoint(BaseModel):
    id: str
    width: float
    zero: bool


class FunnelPresentation(BaseModel):
    points: list[FunnelPoint]
