"""Parse allowlisted arithmetic; translate nodes directly to Polars, never host code."""

import ast
import math
import re
from dataclasses import dataclass
from typing import cast

import polars as pl

from app.domain.datasets import ColumnSchema, DatasetSchema, LogicalType


class FormulaValidationError(ValueError):
    pass


@dataclass(frozen=True)
class CompiledFormula:
    expression: pl.Expr
    referenced_columns: tuple[str, ...]
    nullable: bool


def compile_formula(expression: str, schema: DatasetSchema) -> CompiledFormula:
    if not expression.strip() or len(expression) > 4096:
        raise FormulaValidationError("Enter an arithmetic expression of at most 4096 characters.")
    if "__nodebi_" in expression:
        raise FormulaValidationError("Reserved expression identifier.")
    aliases: dict[str, ColumnSchema] = {}

    def bind(match: re.Match[str]) -> str:
        reference = match.group(1)
        try:
            column = schema.by_id(reference)
        except StopIteration as exc:
            raise FormulaValidationError(f"Unknown column ID: {reference}.") from exc
        alias = f"__nodebi_{len(aliases)}"
        aliases[alias] = column
        return alias

    normalized = re.sub(r"\[([^\[\]]+)\]", bind, expression)
    try:
        tree = ast.parse(normalized.strip(), mode="eval")
    except (SyntaxError, RecursionError) as exc:
        raise FormulaValidationError("Invalid arithmetic expression.") from exc
    if sum(1 for _ in ast.walk(tree)) > 256:
        raise FormulaValidationError("Expression is too complex (maximum 256 syntax nodes).")
    referenced: dict[str, ColumnSchema] = {}

    def visit(node: ast.AST, depth: int = 0) -> pl.Expr:
        if depth > 64:
            raise FormulaValidationError("Expression nesting is too deep.")
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            try:
                value = float(cast(int | float, node.value))
            except OverflowError as exc:
                raise FormulaValidationError("Numeric constant is too large.") from exc
            if not math.isfinite(value):
                raise FormulaValidationError("Numeric constants must be finite.")
            return pl.lit(value, dtype=pl.Float64)
        if isinstance(node, ast.Name):
            column = aliases.get(node.id)
            if column is None:
                candidates = [field for field in schema.columns if field.engine_name == node.id]
                if len(candidates) != 1:
                    raise FormulaValidationError(
                        f"Unknown field: {node.id}. Use [column_id] for unusual names."
                    )
                column = candidates[0]
            if column.logical_type not in {
                LogicalType.INTEGER,
                LogicalType.FLOAT,
                LogicalType.UNKNOWN,
            }:
                raise FormulaValidationError(f"Field {column.display_name} must be numeric.")
            referenced[column.column_id] = column
            return pl.col(column.engine_name).cast(pl.Float64)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            operand = visit(node.operand, depth + 1)
            return operand if isinstance(node.op, ast.UAdd) else -operand
        if isinstance(node, ast.BinOp) and isinstance(
            node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)
        ):
            left, right = visit(node.left, depth + 1), visit(node.right, depth + 1)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            return left / right
        raise FormulaValidationError(
            "Only numeric constants, fields, +, -, *, / and parentheses are allowed."
        )

    result = visit(tree.body)
    return CompiledFormula(result, tuple(referenced), any(c.nullable for c in referenced.values()))
