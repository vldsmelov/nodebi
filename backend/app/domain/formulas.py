"""Parse allowlisted arithmetic; translate nodes directly to Polars, never host code."""

import ast
import io
import math
import re
import tokenize
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any, cast

import polars as pl

from app.domain.datasets import ColumnSchema, DatasetSchema, LogicalType
from app.domain.decimal_composition import common_decimal_metadata
from app.domain.expression_functions import extended_function


class FormulaValidationError(ValueError):
    pass


def remap_expression(expression: str, identities: dict[str, str]) -> str:
    """Restore generated field identities without rewriting quoted business literals."""
    offsets = [0]
    # Match StringIO.readline/tokenize: Unicode line separators inside literals are not lines.
    for line in expression.split("\n"):
        offsets.append(offsets[-1] + len(line) + 1)

    def remap(text: str) -> str:
        for old, new in identities.items():
            text = text.replace(old.replace("-", ""), new.replace("-", ""))
        return text

    parts: list[str] = []
    previous = 0
    # Field IDs are not Python numeric tokens (e.g. [0bba...]). Mask only their content
    # at equal length so the tokenizer can locate quoted literals at original offsets.
    token_source = re.sub(
        r"\[[^\[\]\r\n'\"\\]+\]",
        lambda match: "[" + "_" * (len(match.group(0)) - 2) + "]",
        expression,
    )
    try:
        for token in tokenize.generate_tokens(io.StringIO(token_source).readline):
            if token.type != tokenize.STRING:
                continue
            start = offsets[token.start[0] - 1] + token.start[1]
            end = offsets[token.end[0] - 1] + token.end[1]
            parts.extend((remap(expression[previous:start]), expression[start:end]))
            previous = end
    except (tokenize.TokenError, IndentationError) as exc:
        raise FormulaValidationError("Cannot restore an invalid formula expression.") from exc
    parts.append(remap(expression[previous:]))
    return "".join(parts)


@dataclass(frozen=True)
class CompiledFormula:
    expression: pl.Expr
    referenced_columns: tuple[str, ...]
    nullable: bool
    logical_type: LogicalType = LogicalType.FLOAT
    metadata: dict[str, Any] = field(default_factory=dict)


def parse_formula(
    expression: str, schema: DatasetSchema
) -> tuple[ast.Expression, str, dict[str, ColumnSchema]]:
    """Shared bounded syntax/field references; each version owns its arithmetic semantics."""
    if not expression.strip() or len(expression) > 4096:
        raise FormulaValidationError("Enter an arithmetic expression of at most 4096 characters.")
    if "__nodebi_" in expression:
        raise FormulaValidationError("Reserved expression identifier.")
    aliases: dict[str, ColumnSchema] = {}

    def bind(match: re.Match[str]) -> str:
        if not match.group(0).startswith("["):
            return match.group(0)
        reference = match.group(1)
        try:
            column = schema.by_id(reference)
        except StopIteration as exc:
            raise FormulaValidationError(f"Unknown column ID: {reference}.") from exc
        alias = f"__nodebi_{len(aliases)}"
        aliases[alias] = column
        return alias

    normalized = re.sub(r""""(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[([^\[\]]+)\]""", bind, expression)
    normalized = normalized.strip()
    try:
        tree = ast.parse(normalized, mode="eval")
    except (SyntaxError, RecursionError) as exc:
        raise FormulaValidationError("Invalid arithmetic expression.") from exc
    if sum(1 for _ in ast.walk(tree)) > 256:
        raise FormulaValidationError("Expression is too complex (maximum 256 syntax nodes).")
    return tree, normalized, aliases


def compile_formula(
    expression: str,
    schema: DatasetSchema,
    *,
    bindings: dict[str, CompiledFormula] | None = None,
    allow_predicates: bool = False,
) -> CompiledFormula:
    tree, _, aliases = parse_formula(expression, schema)
    referenced: dict[str, ColumnSchema] = {}
    bound_references: dict[str, None] = {}

    types: dict[int, LogicalType] = {}
    metadata: dict[int, dict[str, Any]] = {}
    expressions: dict[int, pl.Expr] = {}

    def decimal_operands(args: Sequence[ast.AST]) -> tuple[list[pl.Expr], dict[str, Any]]:
        try:
            common = common_decimal_metadata(
                [metadata[id(arg)] for arg in args if types[id(arg)] == LogicalType.DECIMAL]
            )
        except ValueError as exc:
            raise FormulaValidationError(str(exc)) from exc
        return (
            [
                expressions[id(arg)].cast(pl.Decimal(38, common["scale"]), strict=True)
                for arg in args
            ],
            common,
        )

    def visit(node: ast.AST, depth: int = 0) -> pl.Expr:
        result = visit_inner(node, depth)
        types.setdefault(id(node), LogicalType.FLOAT)
        if types[id(node)] == LogicalType.DECIMAL:
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                name = node.func.id
                if name in {"coalesce", "if_else"}:
                    args = list(node.args[1:] if name == "if_else" else node.args)
                    values, metadata[id(node)] = decimal_operands(args)
                    result = (
                        pl.when(expressions[id(node.args[0])]).then(values[0]).otherwise(values[1])
                        if name == "if_else"
                        else pl.coalesce(values)
                    )
            try:
                common_decimal_metadata([metadata[id(node)]])
            except ValueError as exc:
                raise FormulaValidationError(str(exc)) from exc
        expressions[id(node)] = result
        return result

    def numeric(node: ast.AST, depth: int) -> pl.Expr:
        result = visit(node, depth)
        if types[id(node)] not in {LogicalType.INTEGER, LogicalType.FLOAT, LogicalType.UNKNOWN}:
            raise FormulaValidationError("Arithmetic requires numeric fields.")
        return result.cast(pl.Float64)

    def visit_inner(node: ast.AST, depth: int = 0) -> pl.Expr:
        if depth > 64:
            raise FormulaValidationError("Expression nesting is too deep.")
        if isinstance(node, ast.Constant) and node.value is None:
            types[id(node)] = LogicalType.UNKNOWN
            return pl.lit(None)
        if allow_predicates and isinstance(node, ast.Constant) and type(node.value) is bool:
            types[id(node)] = LogicalType.BOOLEAN
            return pl.lit(node.value)
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            types[id(node)] = LogicalType.STRING
            return pl.lit(node.value)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and not node.keywords:
            name = node.func.id
            try:
                extended = extended_function(node, name, lambda arg: visit(arg, depth + 1), types)
            except ValueError as exc:
                raise FormulaValidationError(str(exc)) from exc
            if extended is not None:
                result, logical_type = extended
                types[id(node)] = logical_type
                return result
            if name in {"trim", "lower"} and len(node.args) == 1:
                value = visit(node.args[0], depth + 1)
                if types[id(node.args[0])] not in {LogicalType.STRING, LogicalType.UNKNOWN}:
                    raise FormulaValidationError("String functions require a string field.")
                types[id(node)] = LogicalType.STRING
                return (
                    value.cast(pl.String).str.strip_chars()
                    if name == "trim"
                    else value.cast(pl.String).str.to_lowercase()
                )
            if name == "coalesce" and 2 <= len(node.args) <= 32:
                values = [visit(arg, depth + 1) for arg in node.args]
                logical_types = {types[id(arg)] for arg in node.args} - {LogicalType.UNKNOWN}
                if logical_types <= {LogicalType.INTEGER, LogicalType.FLOAT}:
                    types[id(node)] = LogicalType.FLOAT
                    return pl.coalesce([value.cast(pl.Float64) for value in values])
                if len(logical_types) > 1:
                    raise FormulaValidationError("Coalesce arguments require compatible types.")
                types[id(node)] = next(iter(logical_types), LogicalType.UNKNOWN)
                return pl.coalesce(values)
            if name == "nullif" and len(node.args) == 2:
                left, right = [visit(arg, depth + 1) for arg in node.args]
                if types[id(node.args[0])] != types[id(node.args[1])]:
                    raise FormulaValidationError("Nullif arguments require matching types.")
                types[id(node)] = types[id(node.args[0])]
                if types[id(node)] == LogicalType.DECIMAL:
                    (compared_left, compared_right), _ = decimal_operands(list(node.args))
                    metadata[id(node)] = dict(metadata[id(node.args[0])])
                    return pl.when(compared_left == compared_right).then(None).otherwise(left)
                return pl.when(left == right).then(None).otherwise(left)
            if name == "safe_divide" and len(node.args) == 3:
                left, right, fallback = [numeric(arg, depth + 1) for arg in node.args]
                return (
                    pl.when(right.is_null() | (right == 0)).then(fallback).otherwise(left / right)
                )
            raise FormulaValidationError("Unknown function or invalid argument count.")
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            try:
                numeric_value = float(cast(int | float, node.value))
            except OverflowError as exc:
                raise FormulaValidationError("Numeric constant is too large.") from exc
            if not math.isfinite(numeric_value):
                raise FormulaValidationError("Numeric constants must be finite.")
            return pl.lit(numeric_value, dtype=pl.Float64)
        if isinstance(node, ast.Name):
            bound = (bindings or {}).get(node.id)
            if bound is not None:
                bound_references.update(dict.fromkeys(bound.referenced_columns))
                types[id(node)] = bound.logical_type
                metadata[id(node)] = dict(bound.metadata)
                return bound.expression
            column = aliases.get(node.id)
            if column is None:
                candidates = [field for field in schema.columns if field.engine_name == node.id]
                if len(candidates) != 1:
                    raise FormulaValidationError(
                        f"Unknown field: {node.id}. Use [column_id] for unusual names."
                    )
                column = candidates[0]
            referenced[column.column_id] = column
            types[id(node)] = column.logical_type
            metadata[id(node)] = dict(column.metadata)
            return pl.col(column.engine_name)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            operand = numeric(node.operand, depth + 1)
            return operand if isinstance(node.op, ast.UAdd) else -operand
        if allow_predicates and isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            operand = visit(node.operand, depth + 1)
            if types[id(node.operand)] != LogicalType.BOOLEAN:
                raise FormulaValidationError("Logical operations require boolean fields.")
            types[id(node)] = LogicalType.BOOLEAN
            return ~operand
        if (
            allow_predicates
            and isinstance(node, ast.BoolOp)
            and isinstance(node.op, (ast.And, ast.Or))
        ):
            values = [visit(value, depth + 1) for value in node.values]
            if any(types[id(value)] != LogicalType.BOOLEAN for value in node.values):
                raise FormulaValidationError("Logical operations require boolean fields.")
            types[id(node)] = LogicalType.BOOLEAN
            result = values[0]
            for value in values[1:]:
                result = result & value if isinstance(node.op, ast.And) else result | value
            return result
        if allow_predicates and isinstance(node, ast.Compare) and len(node.ops) == 1:
            left = visit(node.left, depth + 1)
            right = visit(node.comparators[0], depth + 1)
            pair = {types[id(node.left)], types[id(node.comparators[0])]}
            if pair == {LogicalType.INTEGER, LogicalType.FLOAT}:
                left, right = left.cast(pl.Float64), right.cast(pl.Float64)
            elif pair == {LogicalType.DECIMAL}:
                (left, right), _ = decimal_operands([node.left, node.comparators[0]])
            elif len(pair) != 1 or LogicalType.UNKNOWN in pair:
                raise FormulaValidationError("Comparison requires compatible explicit types.")
            types[id(node)] = LogicalType.BOOLEAN
            operator = node.ops[0]
            if isinstance(operator, ast.Eq):
                return left == right
            if isinstance(operator, ast.NotEq):
                return left != right
            if isinstance(operator, ast.Lt):
                return left < right
            if isinstance(operator, ast.LtE):
                return left <= right
            if isinstance(operator, ast.Gt):
                return left > right
            if isinstance(operator, ast.GtE):
                return left >= right
            raise FormulaValidationError("Unsupported comparison operator.")
        if isinstance(node, ast.BinOp) and isinstance(
            node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)
        ):
            left, right = numeric(node.left, depth + 1), numeric(node.right, depth + 1)
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
    dtype = types[id(tree.body)]
    if dtype in {LogicalType.INTEGER, LogicalType.FLOAT}:
        result, dtype = result.cast(pl.Float64), LogicalType.FLOAT
    references = tuple(dict.fromkeys((*referenced, *bound_references)))
    return CompiledFormula(result, references, True, dtype, metadata.get(id(tree.body), {}))
