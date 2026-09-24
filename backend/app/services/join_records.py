"""Diagnostic inputs use the common executor/cache, without materializing the Join."""

from dataclasses import replace
from uuid import UUID

import polars as pl

from app.domain.datasets import Dataset, logical_to_polars
from app.domain.errors import ApplicationError
from app.domain.nodes import ExecutionContext, NodeRegistry
from app.domain.workflows import WorkflowGraph
from app.nodes.combine import compatible, join_config
from app.services.execution import ExecutionResult, WorkflowExecutionService


def _join_records(
    graph: WorkflowGraph,
    node_id: UUID,
    kind: str,
    context: ExecutionContext,
    registry: NodeRegistry,
) -> ExecutionResult:
    node = next((item for item in graph.nodes if item.id == node_id), None)
    if node is None or node.type != "join":
        raise ApplicationError("INVALID_JOIN_DIAGNOSTIC", "Select a Join node.", 422)
    config = join_config(node)
    results = {}
    for port in ("left", "right"):
        edges = [
            edge
            for edge in graph.edges
            if edge.target_node_id == node_id and edge.target_port == port
        ]
        if len(edges) != 1:
            raise ApplicationError("INVALID_JOIN_DIAGNOSTIC", "Connect both Join inputs.", 422)
        edge = edges[0]
        results[port] = WorkflowExecutionService(registry).execute(
            graph, edge.source_node_id, context, output_port=edge.source_port
        )
    left, right = results["left"].output, results["right"].output
    names = [f"key_{i}" for i in range(len(config.keys))]
    types = [
        logical_to_polars(
            compatible(
                left.schema.by_id(key.left_key).logical_type,
                right.schema.by_id(key.right_key).logical_type,
            )
        )
        for key in config.keys
    ]
    side = "left" if kind.startswith("left") else "right"
    source = results[side].output

    def keys(port: str) -> pl.DataFrame:
        data = results[port].output
        return data.frame.select(
            [
                pl.col(data.schema.by_id(getattr(key, f"{port}_key")).engine_name)
                .cast(dtype)
                .alias(name)
                for key, dtype, name in zip(config.keys, types, names, strict=True)
            ]
        )

    own = keys(side)
    complete = pl.all_horizontal([pl.col(name).is_not_null() for name in names])
    if kind.endswith("duplicates"):
        selected = own.with_row_index("row").filter(complete & own.is_duplicated())["row"]
    else:
        other = keys("right" if side == "left" else "left")
        selected = own.with_row_index("row").join(
            other, on=names, how="anti", nulls_equal=False, maintain_order="left"
        )["row"]
    frame = source.frame[selected]
    return replace(
        results[side],
        target_node_id=node_id,
        output=Dataset(frame, source.schema),
        schema=source.schema,
        outputs={},
        value_kind="dataset",
        metadata={"diagnostic": kind},
    )


def join_records(
    graph: WorkflowGraph,
    node_id: UUID,
    kind: str,
    context: ExecutionContext,
    registry: NodeRegistry,
) -> ExecutionResult:
    try:
        return _join_records(graph, node_id, kind, context, registry)
    except StopIteration as exc:
        raise ApplicationError(
            "INVALID_JOIN_DIAGNOSTIC",
            "A Join key field is unavailable. Select its replacement.",
            422,
            node_id=str(node_id),
        ) from exc
    except (ValueError, KeyError) as exc:
        raise ApplicationError(
            "INVALID_JOIN_DIAGNOSTIC", str(exc), 422, node_id=str(node_id)
        ) from exc
