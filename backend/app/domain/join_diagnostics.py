"""Full-input Join statistics, independent of the preview row limit."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class JoinDiagnostics(BaseModel):
    node_id: UUID
    how: Literal["inner", "left"]
    left_rows: int = Field(ge=0)
    right_rows: int = Field(ge=0)
    matched_left_rows: int = Field(ge=0)
    unmatched_left_rows: int = Field(ge=0)
    matched_right_rows: int = Field(ge=0)
    unmatched_right_rows: int = Field(ge=0)
    left_duplicate_keys: int = Field(ge=0)
    right_duplicate_keys: int = Field(ge=0)
    multiplied_left_rows: int = Field(ge=0)
    additional_rows: int = Field(ge=0)
    dropped_left_rows: int = Field(ge=0)
    result_rows: int = Field(ge=0)
