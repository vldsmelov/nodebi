"""Typed view inputs. Definitions are saved; values belong to one execution."""

import math
import re
from datetime import date, datetime
from decimal import Decimal
from fractions import Fraction
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

from app.domain.exact_formulas import round_exact

ParameterValue = StrictStr | StrictInt | StrictFloat | StrictBool | None
ParameterValues = Annotated[dict[str, ParameterValue], Field(max_length=64)]


class ParameterDefinition(BaseModel):
    name: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_]{0,63}$")
    label: str = Field(default="", max_length=200)
    logical_type: Literal["string", "integer", "float", "decimal", "boolean", "date", "datetime"]
    default: ParameterValue = None
    precision: int | None = Field(
        default=None, ge=1, le=38, strict=True, exclude_if=lambda v: v is None
    )
    scale: int | None = Field(
        default=None, ge=0, le=38, strict=True, exclude_if=lambda v: v is None
    )

    @property
    def decimal_metadata(self) -> dict[str, int]:
        if self.logical_type != "decimal":
            return {}
        if self.precision is None or self.scale is None or self.scale > self.precision:
            raise ValueError("Decimal parameters require explicit precision and scale.")
        return {"precision": self.precision, "scale": self.scale}

    def checked(self, value: ParameterValue) -> ParameterValue:
        valid = False
        if value is None:
            return None
        if self.logical_type == "decimal":
            metadata = self.decimal_metadata
            if (
                not isinstance(value, str)
                or len(value) > 80
                or not re.fullmatch(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)", value)
            ):
                raise ValueError(f"Parameter '{self.name}' requires a plain decimal string.")
            number = Decimal(value)
            checked = round_exact(Fraction(number), metadata["precision"], metadata["scale"])
            if checked != number:
                raise ValueError(f"Parameter '{self.name}' exceeds its declared decimal scale.")
            return format(checked, "f")
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
        if self.logical_type == "decimal":
            _ = self.decimal_metadata
        elif self.precision is not None or self.scale is not None:
            raise ValueError("Precision and scale are only valid for decimal parameters.")
        self.default = self.checked(self.default)
        return self


def compatible_parameters(source: ParameterDefinition, target: ParameterDefinition) -> bool:
    if source.logical_type != target.logical_type:
        return source.logical_type == "integer" and target.logical_type == "float"
    if source.logical_type != "decimal":
        return True
    left, right = source.decimal_metadata, target.decimal_metadata
    return (
        left["scale"] <= right["scale"]
        and left["precision"] - left["scale"] <= right["precision"] - right["scale"]
    )


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
