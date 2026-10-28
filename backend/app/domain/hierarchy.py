"""Exact hierarchy presentation. Business aggregation belongs to table_rollup."""

from pydantic import BaseModel, Field


class HierarchyPoint(BaseModel):
    id: str
    parent_id: str | None
    depth: int
    # Drawing weight only. Exact value and path remain in the matching dataset row.
    weight: float = Field(ge=0, le=1, allow_inf_nan=False)
    share_exact: str | None


class HierarchyPresentation(BaseModel):
    root_id: str
    total: str | None
    zero_count: int
    points: list[HierarchyPoint]
