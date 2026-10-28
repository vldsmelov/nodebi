"""Bounded exact arithmetic for calculated_column@2, with one final half-even rounding.

No eval/exec, Float64 conversion or ambient Decimal context. Rational intermediates
avoid implicit scale loss in Decimal128 multiplication/division. Only referenced
columns cross the Polars boundary; constants are evaluated once per dataset.
"""

import ast
import operator
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from fractions import Fraction
from typing import Literal, cast

from app.domain.datasets import ColumnSchema, DatasetSchema, LogicalType
from app.domain.formulas import FormulaValidationError, parse_formula

Operation = Literal[
    "literal",
    "field",
    "neg",
    "add",
    "sub",
    "mul",
    "div",
    "coalesce",
    "nullif",
    "safe_divide",
    "abs",
    "minimum",
    "maximum",
    "if_else",
]
MAX_INTERMEDIATE_BITS = 512
ExactInput = Fraction | str | bool | date | datetime | None
PredicateOperation = Literal[
    "boolean", "is_null", "not", "and", "or", "eq", "ne", "lt", "le", "gt", "ge"
]


def exact_input(value: object, logical_type: LogicalType) -> ExactInput:
    """Validate physical values consistently for table and field-wire expressions."""
    if value is None:
        return None
    expected = {
        LogicalType.STRING: str,
        LogicalType.BOOLEAN: bool,
        LogicalType.DATE: date,
        LogicalType.DATETIME: datetime,
    }.get(logical_type)
    if expected is not None:
        if type(value) is not expected:
            raise FormulaValidationError(
                "Exact condition input does not match its declared schema."
            )
        return cast(ExactInput, value)
    if type(value) is not int and not isinstance(value, Decimal):
        raise FormulaValidationError("Exact formula input does not match its numeric schema.")
    return bounded(Fraction(value))


def bounded(value: Fraction | None) -> Fraction | None:
    if (
        value is not None
        and max(abs(value.numerator).bit_length(), value.denominator.bit_length())
        > MAX_INTERMEDIATE_BITS
    ):
        raise FormulaValidationError(
            "Exact formula intermediate is too large. Simplify the expression."
        )
    return value


@dataclass(frozen=True)
class ExactTerm:
    operation: Operation
    args: tuple["ExactTerm", ...] = ()
    value: Fraction | None = None
    index: int = 0
    predicate: "ExactPredicate | None" = None

    def evaluate(self, row: tuple[ExactInput, ...]) -> Fraction | None:
        if self.operation == "literal":
            return self.value
        if self.operation == "field":
            value = row[self.index]
            if value is not None and not isinstance(value, Fraction):
                raise FormulaValidationError(
                    "Exact formula input does not match its numeric schema."
                )
            return value
        if self.operation == "if_else":
            assert self.predicate is not None
            # A null predicate selects otherwise, matching the existing if_else contract.
            return self.args[0 if self.predicate.evaluate(row) is True else 1].evaluate(row)
        if self.operation == "coalesce":
            for arg in self.args:
                value = arg.evaluate(row)
                if value is not None:
                    return value
            return None
        if self.operation == "safe_divide":
            denominator = self.args[1].evaluate(row)
            if denominator is None or denominator == 0:
                return self.args[2].evaluate(row)
            numerator = self.args[0].evaluate(row)
            return bounded(numerator / denominator) if numerator is not None else None
        left = self.args[0].evaluate(row)
        if left is None:
            return None
        if self.operation == "neg":
            return -left
        if self.operation == "abs":
            return abs(left)
        right = self.args[1].evaluate(row)
        if self.operation == "nullif":
            return None if left == right else left
        if right is None:
            return None
        if self.operation == "add":
            return bounded(left + right)
        if self.operation == "sub":
            return bounded(left - right)
        if self.operation == "mul":
            return bounded(left * right)
        if self.operation == "div":
            if right == 0:
                raise FormulaValidationError(
                    "Exact formula division by zero. Use safe_divide or nullif."
                )
            return bounded(left / right)
        if self.operation == "minimum":
            return min(left, right)
        if self.operation == "maximum":
            return max(left, right)
        raise AssertionError("Unknown compiled exact operation")


@dataclass(frozen=True)
class ExactValue:
    kind: LogicalType
    term: ExactTerm | None = None
    index: int | None = None
    value: ExactInput = None
    timezone: str | None = None

    def evaluate(self, row: tuple[ExactInput, ...]) -> ExactInput:
        if self.term is not None:
            return self.term.evaluate(row)
        return row[self.index] if self.index is not None else self.value


@dataclass(frozen=True)
class ExactPredicate:
    operation: PredicateOperation
    values: tuple[ExactValue, ...] = ()
    args: tuple["ExactPredicate", ...] = ()

    def evaluate(self, row: tuple[ExactInput, ...]) -> bool | None:
        if self.operation == "boolean":
            value = self.values[0].evaluate(row)
            if value is not None and type(value) is not bool:
                raise FormulaValidationError(
                    "Exact condition input does not match its boolean schema."
                )
            return value
        if self.operation == "is_null":
            return self.values[0].evaluate(row) is None
        if self.operation == "not":
            value = self.args[0].evaluate(row)
            return None if value is None else not value
        if self.operation in {"and", "or"}:
            unknown = False
            decisive = self.operation == "or"
            for arg in self.args:
                value = arg.evaluate(row)
                if value is decisive:
                    return decisive
                unknown |= value is None
            return None if unknown else not decisive
        left, right = (value.evaluate(row) for value in self.values)
        if left is None or right is None:
            return None
        comparisons = {
            "eq": operator.eq,
            "ne": operator.ne,
            "lt": operator.lt,
            "le": operator.le,
            "gt": operator.gt,
            "ge": operator.ge,
        }
        try:
            return bool(comparisons[self.operation](left, right))
        except TypeError as exc:
            raise FormulaValidationError(
                "Exact comparison inputs require matching types and timezones."
            ) from exc


def round_exact(value: Fraction | None, precision: int, scale: int) -> Decimal | None:
    """Integer half-even rounding: exact even at ties, independent of decimal.getcontext()."""
    if value is None:
        return None
    coefficient, remainder = divmod(abs(value.numerator) * 10**scale, value.denominator)
    twice = 2 * remainder
    if twice > value.denominator or (twice == value.denominator and coefficient % 2):
        coefficient += 1
    if coefficient >= 10**precision:
        raise FormulaValidationError(
            "Exact formula exceeds output precision. Adjust precision or scale."
        )
    return Decimal((int(value < 0 and coefficient != 0), tuple(map(int, str(coefficient))), -scale))


@dataclass(frozen=True)
class ExactFormula:
    root: ExactTerm
    referenced_columns: tuple[str, ...]
    engine_names: tuple[str, ...]
    logical_types: tuple[LogicalType, ...]


def compile_exact_formula(expression: str, schema: DatasetSchema) -> ExactFormula:
    tree, normalized, aliases = parse_formula(expression, schema)
    referenced: list[str] = []
    names: list[str] = []
    logical_types: list[LogicalType] = []
    binary: dict[type[ast.operator], Operation] = {
        ast.Add: "add",
        ast.Sub: "sub",
        ast.Mult: "mul",
        ast.Div: "div",
    }
    functions: dict[str, tuple[Operation, int, int]] = {
        "coalesce": ("coalesce", 2, 32),
        "nullif": ("nullif", 2, 2),
        "safe_divide": ("safe_divide", 3, 3),
        "abs": ("abs", 1, 1),
        "minimum": ("minimum", 2, 2),
        "maximum": ("maximum", 2, 2),
    }

    def field(node: ast.Name) -> ColumnSchema:
        column = aliases.get(node.id)
        if column is None:
            column = next((c for c in schema.columns if c.engine_name == node.id), None)
        if column is None:
            raise FormulaValidationError("Unknown field in exact formula.")
        if column.column_id not in referenced:
            referenced.append(column.column_id)
            names.append(column.engine_name)
            logical_types.append(column.logical_type)
        return column

    def scalar(node: ast.AST, depth: int) -> ExactValue:
        if depth > 64:
            raise FormulaValidationError("Expression nesting is too deep.")
        if isinstance(node, ast.Constant) and type(node.value) in {str, bool}:
            return ExactValue(
                LogicalType.STRING if type(node.value) is str else LogicalType.BOOLEAN,
                value=cast(str | bool, node.value),
            )
        if isinstance(node, ast.Name):
            column = field(node)
            if column.logical_type in {
                LogicalType.STRING,
                LogicalType.BOOLEAN,
                LogicalType.DATE,
                LogicalType.DATETIME,
            }:
                return ExactValue(
                    column.logical_type,
                    index=referenced.index(column.column_id),
                    timezone=column.metadata.get("timezone"),
                )
        return ExactValue(
            LogicalType.UNKNOWN
            if isinstance(node, ast.Constant) and node.value is None
            else LogicalType.DECIMAL,
            term=visit(node, depth),
        )

    def predicate(node: ast.AST, depth: int) -> ExactPredicate:
        if depth > 64:
            raise FormulaValidationError("Expression nesting is too deep.")
        if isinstance(node, ast.BoolOp) and isinstance(node.op, (ast.And, ast.Or)):
            return ExactPredicate(
                "and" if isinstance(node.op, ast.And) else "or",
                args=tuple(predicate(n, depth + 1) for n in node.values),
            )
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            return ExactPredicate("not", args=(predicate(node.operand, depth + 1),))
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "is_null"
            and len(node.args) == 1
            and not node.keywords
        ):
            return ExactPredicate("is_null", values=(scalar(node.args[0], depth + 1),))
        if isinstance(node, ast.Compare) and len(node.ops) == 1:
            left, right = scalar(node.left, depth + 1), scalar(node.comparators[0], depth + 1)
            kinds = {left.kind, right.kind} - {LogicalType.UNKNOWN}
            if not (kinds <= {LogicalType.INTEGER, LogicalType.DECIMAL} or len(kinds) <= 1):
                raise FormulaValidationError(
                    "Exact comparisons require compatible types; no implicit conversions."
                )
            if (
                LogicalType.DATETIME in kinds
                and left.kind == right.kind
                and left.timezone != right.timezone
            ):
                raise FormulaValidationError(
                    "Exact comparison inputs require matching types and timezones."
                )
            comparison_ops: dict[type[ast.cmpop], PredicateOperation] = {
                ast.Eq: "eq",
                ast.NotEq: "ne",
                ast.Lt: "lt",
                ast.LtE: "le",
                ast.Gt: "gt",
                ast.GtE: "ge",
            }
            comparison = comparison_ops.get(type(node.ops[0]))
            if comparison is None or (
                LogicalType.BOOLEAN in kinds and comparison not in {"eq", "ne"}
            ):
                raise FormulaValidationError("Unsupported exact comparison operator.")
            return ExactPredicate(comparison, values=(left, right))
        value = scalar(node, depth + 1)
        if value.kind != LogicalType.BOOLEAN:
            raise FormulaValidationError("If condition must be boolean.")
        return ExactPredicate("boolean", values=(value,))

    def visit(node: ast.AST, depth: int = 0) -> ExactTerm:
        if depth > 64:
            raise FormulaValidationError("Expression nesting is too deep.")
        if isinstance(node, ast.Constant):
            if node.value is None:
                return ExactTerm("literal")
            if type(node.value) in {int, float}:
                # AST float values have already lost precision; use the original token instead.
                token = ast.get_source_segment(normalized, node) or ""
                try:
                    number = Decimal(token.replace("_", ""))
                except InvalidOperation as exc:
                    raise FormulaValidationError(
                        "Use decimal numeric literals in exact formulas."
                    ) from exc
                if (
                    not number.is_finite()
                    or len(number.as_tuple().digits) > 38
                    or not -38 <= number.adjusted() <= 37
                    or not -38 <= int(number.as_tuple().exponent) <= 38
                ):
                    raise FormulaValidationError(
                        "Exact numeric literals support at most 38 digits and 38 decimal places."
                    )
                return ExactTerm("literal", value=Fraction(number))
        if isinstance(node, ast.Name):
            column = field(node)
            if column.logical_type not in {
                LogicalType.INTEGER,
                LogicalType.DECIMAL,
                LogicalType.UNKNOWN,
            }:
                raise FormulaValidationError(
                    "Exact formulas require decimal or integer fields. "
                    "Configure decimal at import; "
                    "Float64 is not converted automatically."
                )
            return ExactTerm("field", index=referenced.index(column.column_id))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = visit(node.operand, depth + 1)
            return value if isinstance(node.op, ast.UAdd) else ExactTerm("neg", (value,))
        if isinstance(node, ast.BinOp) and type(node.op) in binary:
            return ExactTerm(
                binary[type(node.op)], (visit(node.left, depth + 1), visit(node.right, depth + 1))
            )
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and not node.keywords:
            if node.func.id == "if_else" and len(node.args) == 3:
                condition = predicate(node.args[0], depth + 1)
                return ExactTerm(
                    "if_else",
                    (visit(node.args[1], depth + 1), visit(node.args[2], depth + 1)),
                    predicate=condition,
                )
            function = functions.get(node.func.id)
            if function and function[1] <= len(node.args) <= function[2]:
                return ExactTerm(function[0], tuple(visit(arg, depth + 1) for arg in node.args))
        raise FormulaValidationError(
            "Exact formulas support +, -, *, /, abs, minimum, maximum, coalesce, nullif, "
            "safe_divide and if_else with typed conditions only."
        )

    root = visit(tree.body)
    return ExactFormula(root, tuple(referenced), tuple(names), tuple(logical_types))
