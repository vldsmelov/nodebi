"""Allowlisted typed expression functions; no Python evaluation or dynamic imports."""

import ast
from collections.abc import Callable

import polars as pl

from app.domain.datasets import LogicalType as T


def extended_function(
    node: ast.Call, name: str, visit: Callable[[ast.AST], pl.Expr], types: dict[int, T]
) -> tuple[pl.Expr, T] | None:
    supported = {
        "if_else",
        "is_null",
        "contains",
        "replace",
        "extract",
        "to_number",
        "to_date",
        "year",
        "month",
        "round",
        "abs",
        "minimum",
        "maximum",
    }
    if name not in supported:
        return None
    args = node.args
    expected = {
        "if_else": 3,
        "is_null": 1,
        "contains": 2,
        "replace": 3,
        "extract": 2,
        "to_number": 1,
        "to_date": 2,
        "year": 1,
        "month": 1,
        "round": 2,
        "abs": 1,
        "minimum": 2,
        "maximum": 2,
    }
    if len(args) != expected[name]:
        raise ValueError("Invalid function argument count.")
    values = [visit(arg) for arg in args]
    kinds = [types[id(arg)] for arg in args]

    def literal(index: int) -> str:
        arg = args[index]
        if not isinstance(arg, ast.Constant) or not isinstance(arg.value, str):
            raise ValueError("Pattern and format arguments must be string constants.")
        return arg.value

    def numeric(index: int) -> pl.Expr:
        if kinds[index] not in {T.INTEGER, T.FLOAT, T.UNKNOWN}:
            raise ValueError("Numeric function requires numeric fields.")
        return values[index].cast(pl.Float64)

    if name == "is_null":
        return values[0].is_null(), T.BOOLEAN
    if name == "if_else":
        if kinds[0] != T.BOOLEAN:
            raise ValueError("If condition must be boolean.")
        branches = set(kinds[1:]) - {T.UNKNOWN}
        if branches <= {T.INTEGER, T.FLOAT}:
            return pl.when(values[0]).then(values[1].cast(pl.Float64)).otherwise(
                values[2].cast(pl.Float64)
            ), T.FLOAT
        if len(branches) > 1:
            raise ValueError("If branches require compatible types.")
        return pl.when(values[0]).then(values[1]).otherwise(values[2]), next(
            iter(branches), T.UNKNOWN
        )
    if name in {"contains", "replace", "extract", "to_date"}:
        if kinds[0] not in {T.STRING, T.UNKNOWN}:
            raise ValueError("String function requires a string field.")
        value = values[0].cast(pl.String)
        pattern = literal(1)
        if name == "contains":
            return value.str.contains(pattern, literal=True), T.BOOLEAN
        if name == "replace":
            return value.str.replace_all(pattern, literal(2), literal=True), T.STRING
        if name == "extract":
            # Polars uses bounded Rust regular expressions, not Python backtracking.
            return value.str.extract(pattern, group_index=0), T.STRING
        return value.str.strptime(pl.Date, format=pattern, strict=True), T.DATE
    if name == "to_number":
        if kinds[0] not in {T.STRING, T.INTEGER, T.FLOAT, T.UNKNOWN}:
            raise ValueError("Number conversion requires text or a numeric field.")
        return values[0].cast(pl.Float64, strict=True), T.FLOAT
    if name in {"year", "month"}:
        if kinds[0] not in {T.DATE, T.DATETIME}:
            raise ValueError("Date function requires a date or datetime field.")
        return (values[0].dt.year() if name == "year" else values[0].dt.month()), T.INTEGER
    if name == "round":
        arg = args[1]
        if (
            not isinstance(arg, ast.Constant)
            or type(arg.value) is not int
            or not 0 <= arg.value <= 8
        ):
            raise ValueError("Rounding decimals must be an integer from 0 to 8.")
        return numeric(0).round(arg.value), T.FLOAT
    if name == "abs":
        return numeric(0).abs(), T.FLOAT
    left, right = numeric(0), numeric(1)
    result = pl.min_horizontal(left, right) if name == "minimum" else pl.max_horizontal(left, right)
    return pl.when(left.is_null() | right.is_null()).then(None).otherwise(result), T.FLOAT
