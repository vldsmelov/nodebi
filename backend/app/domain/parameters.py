"""Typed view inputs. Definitions are saved; values belong to one execution."""

import math
from datetime import date, datetime
from typing import Annotated, Literal, Self

from pydantic import (
    BaseModel,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
    model_validator,
)

ParameterValue = StrictStr | StrictInt | StrictFloat | StrictBool | None
ParameterValues = Annotated[dict[str, ParameterValue], Field(max_length=64)]


class ParameterDefinition(BaseModel):
    name: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_]{0,63}$")
    label: str = Field(default="", max_length=200)
    logical_type: Literal["string", "integer", "float", "boolean", "date", "datetime"]
    default: ParameterValue = None

    def checked(self, value: ParameterValue) -> ParameterValue:
        valid = False
        if value is None:
            return None
        if self.logical_type == "string":
            valid = isinstance(value, str) and len(value) <= 2000
        elif self.logical_type == "integer":
            valid = type(value) is int and -(2**63) <= value < 2**63
        elif self.logical_type == "float":
            try:
                valid = (
                    isinstance(value, (int, float))
                    and not isinstance(value, bool)
                    and math.isfinite(value)
                )
            except OverflowError:
                valid = False
        elif self.logical_type == "boolean":
            valid = type(value) is bool
        elif isinstance(value, str):
            try:
                if self.logical_type == "date":
                    valid = date.fromisoformat(value).isoformat() == value
                else:
                    datetime.fromisoformat(value)
                    valid = "T" in value
            except ValueError:
                pass
        if not valid:
            raise ValueError(f"Parameter '{self.name}' requires {self.logical_type}.")
        return value

    @model_validator(mode="after")
    def valid_default(self) -> Self:
        self.checked(self.default)
        return self


def resolve_parameters(
    definitions: tuple[ParameterDefinition, ...], supplied: dict[str, ParameterValue]
) -> dict[str, ParameterValue]:
    known = {definition.name: definition for definition in definitions}
    if supplied.keys() - known.keys():
        raise ValueError("An undeclared workflow parameter was supplied.")
    return {
        name: definition.checked(supplied.get(name, definition.default))
        for name, definition in known.items()
    }
