import hashlib
import json
import logging
import time
import uuid
from collections import OrderedDict, defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import StrEnum
from functools import lru_cache
from threading import Lock
from typing import Literal

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema
from app.domain.errors import NodeExecutionError
from app.domain.nodes import ExecutionContext, NodeRegistry, PortKind, TypedNodeExecutor
from app.domain.values import (
    ExecutionValue,
    FieldValue,
    RowContext,
    ScalarValue,
    TableValue,
    ValueConnectionError,
    dataset_outputs,
    project_field,
    validate_field,
)
from app.domain.workflows import NodeInstance, WorkflowEdge, WorkflowGraph
from app.services.workflow_validation import (
    GraphIssue,
    InvalidWorkflowError,
    WorkflowGraphValidator,
    topological_order,
)


class ExecutionStatus(StrEnum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class ExecutionFailure(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        category: str,
        execution_id: uuid.UUID,
        node_id: uuid.UUID | None = None,
        issues: tuple[GraphIssue, ...] = (),
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.category = category
        self.execution_id = execution_id
        self.node_id = node_id
        self.issues = issues


@dataclass(frozen=True)
class ExecutionPlan:
    target_node_id: uuid.UUID
    graph: WorkflowGraph
    ordered_node_ids: tuple[uuid.UUID, ...]


class ExecutionPlanner:
    def __init__(self, registry: NodeRegistry) -> None:
        self.registry = registry

    def plan(self, graph: WorkflowGraph, target_node_id: uuid.UUID) -> ExecutionPlan:
        nodes = {node.id: node for node in graph.nodes}
        if target_node_id not in nodes:
            raise InvalidWorkflowError(
                (GraphIssue("TARGET_NODE_NOT_FOUND", "Target node does not exist."),)
            )
        incoming: dict[uuid.UUID, list[WorkflowEdge]] = defaultdict(list)
        for edge in graph.edges:
            incoming[edge.target_node_id].append(edge)
        required = {target_node_id}
        pending = [target_node_id]
        while pending:
            current = pending.pop()
            for edge in incoming[current]:
                if edge.source_node_id not in required:
                    required.add(edge.source_node_id)
                    pending.append(edge.source_node_id)
        subgraph = WorkflowGraph(
            graph.id,
            graph.project_id,
            graph.name,
            graph.version,
            tuple(node for node in graph.nodes if node.id in required),
            tuple(
                edge
                for edge in graph.edges
                if edge.source_node_id in required and edge.target_node_id in required
            ),
        )
        validation = WorkflowGraphValidator(self.registry).validate(subgraph)
        if not validation.valid:
            raise InvalidWorkflowError(validation.issues)
        return ExecutionPlan(
            target_node_id, subgraph, topological_order(subgraph.nodes, subgraph.edges)
        )


class InMemoryExecutionCache:
    def __init__(self, capacity: int = 32, max_bytes: int = 256 * 1024 * 1024) -> None:
        if capacity < 1:
            raise ValueError("Cache capacity must be positive.")
        self.capacity = capacity
        if max_bytes < 1:
            raise ValueError("Cache memory budget must be positive.")
        self.max_bytes = max_bytes
        self.used_bytes = 0
        self._values: OrderedDict[str, Dataset] = OrderedDict()
        self._lock = Lock()
        self._source_load_lock = Lock()

    def get_or_load(self, key: str, loader: Callable[[], Dataset]) -> Dataset:
        """Serialize cold source loads, limiting peak memory and duplicate workbook reads.

        Loader must materialize a source directly, without recursively using this method.
        Warm reads and transformation execution do not acquire the source-load lock.
        """
        value = self.get(key)
        if value is not None:
            return value
        with self._source_load_lock:
            value = self.get(key)
            if value is None:
                value = loader()
                self.put(key, value)
            return value

    def get(self, key: str) -> Dataset | None:
        with self._lock:
            value = self._values.get(key)
            if value is not None:
                self._values.move_to_end(key)
            return value

    def put(self, key: str, value: Dataset) -> None:
        with self._lock:
            previous = self._values.pop(key, None)
            if previous is not None:
                self.used_bytes -= int(previous.frame.estimated_size())
            size = int(value.frame.estimated_size())
            if size > self.max_bytes:
                return
            self._values[key] = value
            self.used_bytes += size
            self._values.move_to_end(key)
            while len(self._values) > self.capacity or self.used_bytes > self.max_bytes:
                _, removed = self._values.popitem(last=False)
                self.used_bytes -= int(removed.frame.estimated_size())

    def clear(self) -> None:
        with self._lock:
            self._values.clear()
            self.used_bytes = 0


@lru_cache
def get_execution_cache() -> InMemoryExecutionCache:
    return InMemoryExecutionCache()


def cache_key(
    node: NodeInstance, upstream_keys: dict[str, str], *, scope: str = "", artifact: str = ""
) -> str:
    identity = {
        "type": node.type,
        "node_id": str(node.id),
        "scope": scope,
        "artifact": artifact,
        "version": node.version,
        "config": node.config,
        "upstream": sorted(upstream_keys.items()),
    }
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode()).hexdigest()


@dataclass(frozen=True)
class ExecutionResult:
    execution_id: uuid.UUID
    target_node_id: uuid.UUID
    status: ExecutionStatus
    output: Dataset
    schema: DatasetSchema
    duration_ms: float
    metadata: dict[str, object] = field(default_factory=dict)
    warnings: tuple[str, ...] = ()
    outputs: dict[str, ExecutionValue] = field(default_factory=dict)
    output_port: str | None = None
    value_kind: Literal["dataset", "field", "scalar"] = "dataset"


class WorkflowExecutionService:
    def __init__(self, registry: NodeRegistry) -> None:
        self.registry = registry

    def execute(
        self,
        graph: WorkflowGraph,
        target_node_id: uuid.UUID,
        context: ExecutionContext,
        *,
        output_port: str | None = None,
    ) -> ExecutionResult:
        started = time.perf_counter()
        try:
            plan = ExecutionPlanner(self.registry).plan(graph, target_node_id)
            if graph.version >= 2 and (
                any(edge.source_column_id is not None for edge in plan.graph.edges)
                or any(
                    isinstance(
                        self.registry.get(node.type, node.version).executor, TypedNodeExecutor
                    )
                    for node in plan.graph.nodes
                )
            ):
                from app.services.typed_schema import resolve_typed_schema

                preflight = resolve_typed_schema(self.registry, plan.graph, context)
                if not preflight.valid:
                    raise InvalidWorkflowError(preflight.issues)
            target_definition = self.registry.get(
                next(node.type for node in plan.graph.nodes if node.id == target_node_id),
                next(node.version for node in plan.graph.nodes if node.id == target_node_id),
            )
            if output_port is not None and output_port not in {
                port.id for port in target_definition.output_ports
            }:
                raise InvalidWorkflowError(
                    (
                        GraphIssue(
                            "INVALID_OUTPUT_PORT",
                            "Select an available output port.",
                            node_id=target_node_id,
                            field="output_port",
                        ),
                    )
                )
        except InvalidWorkflowError as exc:
            raise ExecutionFailure(
                "WORKFLOW_VALIDATION_FAILED",
                "Workflow validation failed before execution.",
                category="validation",
                execution_id=context.execution_id,
                issues=exc.issues,
            ) from exc
        nodes = {node.id: node for node in plan.graph.nodes}
        results: dict[uuid.UUID, dict[str, ExecutionValue]] = {}
        target_output: Dataset | None = None
        tables: dict[RowContext, TableValue] = {}
        identities: dict[uuid.UUID, str] = {}
        cache_hits = 0
        for node_id in plan.ordered_node_ids:
            node = nodes[node_id]
            definition = self.registry.get(node.type, node.version)
            typed = isinstance(definition.executor, TypedNodeExecutor)
            if not typed and (
                len(definition.output_ports) > 1
                or any(port.kind != PortKind.DATASET for port in definition.output_ports)
            ):
                raise ExecutionFailure(
                    "INVALID_NODE_OUTPUT",
                    "This executor requires typed output routing.",
                    category="type",
                    execution_id=context.execution_id,
                    node_id=node_id,
                )
            inbound = sorted(
                (edge for edge in plan.graph.edges if edge.target_node_id == node_id),
                key=lambda edge: (edge.target_port, str(edge.id)),
            )
            inputs: dict[str, Dataset] = {}
            values: dict[str, ExecutionValue] = {}
            for edge in inbound:
                value = results[edge.source_node_id].get(edge.source_port)
                if value is None:
                    raise ExecutionFailure(
                        "INVALID_NODE_OUTPUT",
                        "The connected output is missing.",
                        category="type",
                        execution_id=context.execution_id,
                        node_id=node_id,
                    )
                if edge.source_column_id is not None:
                    assert isinstance(value, TableValue)
                    value = project_field(value, edge.source_column_id)
                values[edge.target_port] = value
                if not typed and not isinstance(value, TableValue):
                    raise ExecutionFailure(
                        "INVALID_NODE_OUTPUT",
                        "The connected output is not a table.",
                        category="type",
                        execution_id=context.execution_id,
                        node_id=node_id,
                    )
                if isinstance(value, TableValue):
                    inputs[edge.target_port] = value.dataset
            upstream = {
                edge.target_port: json.dumps(
                    [identities[edge.source_node_id], edge.source_port, edge.source_column_id]
                )
                for edge in inbound
            }
            validation = None
            if not isinstance(definition.executor, TypedNodeExecutor):
                validation = definition.executor.validate(
                    node, {port: dataset.schema for port, dataset in inputs.items()}, context
                )
            if validation is not None and not validation.valid:
                raise ExecutionFailure(
                    "NODE_VALIDATION_FAILED",
                    validation.issues[0].message,
                    category="validation",
                    execution_id=context.execution_id,
                    node_id=node_id,
                    issues=tuple(
                        GraphIssue(i.code, i.message, node_id=node_id, field=i.field)
                        for i in validation.issues
                    ),
                )
            artifact = definition.cache_identity(node, context) if definition.cache_identity else ""
            key = cache_key(node, upstream, scope=str(context.project_id), artifact=artifact)
            cacheable = not typed or (
                len(definition.output_ports) == 1
                and definition.output_ports[0].kind == PortKind.DATASET
            )
            output = context.cache.get(key) if context.cache and cacheable else None
            named: dict[str, ExecutionValue] = {}
            if output is not None:
                cache_hits += 1
            else:
                try:
                    if isinstance(definition.executor, TypedNodeExecutor):
                        named = definition.executor.execute_outputs(node, values, context)
                        if named.keys() != {port.id for port in definition.output_ports}:
                            raise ValueConnectionError("Executor returned undeclared outputs.")
                        for port in definition.output_ports:
                            runtime_value = named[port.id]
                            runtime_kind = (
                                PortKind.DATASET
                                if isinstance(runtime_value, TableValue)
                                else PortKind.FIELD
                                if isinstance(runtime_value, FieldValue)
                                else PortKind.SCALAR
                                if isinstance(runtime_value, ScalarValue)
                                else None
                            )
                            if runtime_kind not in {port.kind, *port.accepted_kinds}:
                                raise ValueConnectionError(
                                    "Executor returned an incompatible output kind."
                                )
                        output = next(
                            (
                                value.dataset
                                for value in named.values()
                                if isinstance(value, TableValue)
                            ),
                            None,
                        )
                    else:
                        output = definition.executor.execute(node, inputs, context)
                except Exception as exc:
                    if context.logger:
                        context.logger.exception(
                            "Node execution failed",
                            extra={"workflow_id": str(graph.id), "node_id": str(node_id)},
                        )
                    category = (
                        "source" if definition.category.value == "source" else "transformation"
                    )
                    raise ExecutionFailure(
                        "NODE_EXECUTION_FAILED",
                        str(exc)
                        if isinstance(exc, (NodeExecutionError, ValueConnectionError))
                        else "The node could not run. Check its configuration and source data.",
                        category=category,
                        execution_id=context.execution_id,
                        node_id=node_id,
                    ) from exc
                if not typed and not isinstance(output, Dataset):
                    raise ExecutionFailure(
                        "INVALID_NODE_OUTPUT",
                        "Node executor returned an unsupported runtime value.",
                        category="type",
                        execution_id=context.execution_id,
                        node_id=node_id,
                    )
                if context.cache and output is not None and cacheable:
                    context.cache.put(key, output)
            if output is not None and not named:
                for port in definition.output_ports:
                    named.update(dataset_outputs(output, RowContext(graph.id, node_id, port.id)))
            results[node_id] = named
            tables.update(
                {value.context: value for value in named.values() if isinstance(value, TableValue)}
            )
            if node_id == target_node_id:
                target_output = output
            identities[node_id] = key
        selected_port = output_port or next(
            (port.id for port in target_definition.output_ports), None
        )
        selected = results[target_node_id].get(selected_port) if selected_port else None
        if isinstance(selected, TableValue):
            target_output = selected.dataset
        elif isinstance(selected, (FieldValue, ScalarValue)):
            try:
                if isinstance(selected, FieldValue):
                    table = tables[selected.context]
                    validate_field(table, selected)
                    frame = table.dataset.frame.select(selected.formula.expression.alias("value"))
                else:
                    frame = pl.select(selected.formula.expression.alias("value"))
                column = ColumnSchema(
                    f"value_{target_node_id.hex}",
                    "value",
                    "Value",
                    selected.formula.logical_type,
                    selected.formula.nullable,
                )
                target_output = Dataset(frame, DatasetSchema((column,)))
            except ValueConnectionError as exc:
                raise ExecutionFailure(
                    "NODE_EXECUTION_FAILED",
                    str(exc),
                    category="transformation",
                    execution_id=context.execution_id,
                    node_id=target_node_id,
                ) from exc
        assert target_output is not None
        target = target_output
        return ExecutionResult(
            context.execution_id,
            target_node_id,
            ExecutionStatus.SUCCEEDED,
            target,
            target.schema,
            (time.perf_counter() - started) * 1000,
            {"executed_nodes": len(plan.ordered_node_ids), "cache_hits": cache_hits},
            outputs=results[target_node_id],
            output_port=selected_port,
            value_kind="field"
            if isinstance(selected, FieldValue)
            else "scalar"
            if isinstance(selected, ScalarValue)
            else "dataset",
        )


def default_execution_logger() -> logging.Logger:
    return logging.getLogger("nodebi.execution")
