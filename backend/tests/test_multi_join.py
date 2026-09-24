from dataclasses import replace
from uuid import uuid4

import polars as pl
import pytest
from pydantic import ValidationError

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.workflows import NodeInstance, Position
from app.nodes import get_node_registry
from app.nodes.combine import MultiJoinConfig
from tests.test_combine_nodes import CONTEXT


def table(rows: list[tuple]) -> Dataset:
    return Dataset(
        pl.DataFrame(
            rows,
            schema={"product": pl.String, "month": pl.Int64, "amount": pl.Float64},
            orient="row",
        ),
        DatasetSchema(
            tuple(
                ColumnSchema(name, name, name, dtype, True)
                for name, dtype in [
                    ("product", LogicalType.STRING),
                    ("month", LogicalType.INTEGER),
                    ("amount", LogicalType.FLOAT),
                ]
            )
        ),
    )


def node(**settings: object) -> NodeInstance:
    return NodeInstance(
        uuid4(),
        "join",
        2,
        Position(0, 0),
        {
            "keys": [
                {"left_key": "product", "right_key": "product"},
                {"left_key": "month", "right_key": "month"},
            ],
            **settings,
        },
    )


def test_composite_join_does_not_cross_months_and_nulls_never_match() -> None:
    left = table([("A", 1, 10), ("A", 2, 20), ("A", None, 30), (None, 1, 40)])
    right = table([("A", 1, 100), ("A", 2, 200), ("A", None, 300), (None, 1, 400)])
    executor = get_node_registry().get("join", 2).executor
    instance = node(how="left", relationship="one_to_one")
    result = executor.execute(instance, {"left": left, "right": right}, CONTEXT)
    assert result.frame["amount__right"].to_list() == [100, 200, None, None]
    assert result.schema == executor.infer_schema(
        instance, {"left": left.schema, "right": right.schema}, CONTEXT
    )
    assert result.metadata["join_diagnostics"]["unmatched_left_rows"] == 2
    assert result.metadata["join_diagnostics"]["unmatched_right_rows"] == 2
    # Names may change; references to the same keys and joined fields remain stable.
    renamed = Dataset(
        right.frame.rename({"month": "period"}),
        DatasetSchema(
            tuple(
                replace(c, engine_name="period", display_name="Period")
                if c.column_id == "month"
                else c
                for c in right.schema.columns
            )
        ),
    )
    again = executor.execute(instance, {"left": left, "right": renamed}, CONTEXT)
    assert [c.column_id for c in again.schema.columns] == [
        c.column_id for c in result.schema.columns
    ]


@pytest.mark.parametrize(
    "side,relationship", [("right", "many_to_one"), ("right", "one_to_one"), ("left", "one_to_one")]
)
def test_relationship_rejects_duplicates_even_without_matching_other_side(
    side: str, relationship: str
) -> None:
    inputs = {"left": table([("A", 1, 10)]), "right": table([("B", 1, 10)])}
    inputs[side] = table([("C", 1, 10), ("C", 1, 20)])
    with pytest.raises(NodeExecutionError, match="not unique"):
        get_node_registry().get("join", 2).executor.execute(
            node(relationship=relationship), inputs, CONTEXT
        )


def test_composite_duplicates_and_size_guard() -> None:
    executor = get_node_registry().get("join", 2).executor
    left, right = table([("A", 1, 10)] * 2), table([("A", 1, 20)] * 3)
    result = executor.execute(node(), {"left": left, "right": right}, CONTEXT)
    assert result.row_count == 6
    stats = result.metadata["join_diagnostics"]
    assert stats["additional_rows"] == 4
    assert stats["left_duplicate_keys"] == stats["right_duplicate_keys"] == 1
    with pytest.raises(NodeExecutionError, match="limit"):
        executor.execute(
            node(),
            {"left": table([("A", 1, 10)] * 600), "right": table([("A", 1, 10)] * 600)},
            CONTEXT,
        )


def test_composite_config_rejects_empty_repeated_and_legacy_keys() -> None:
    for config in [
        {"keys": []},
        {"keys": [{"left_key": "x", "right_key": "a"}, {"left_key": "x", "right_key": "b"}]},
        {"left_key": "x", "right_key": "x"},
    ]:
        with pytest.raises(ValidationError):
            MultiJoinConfig.model_validate(config)
