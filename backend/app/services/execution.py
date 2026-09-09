import hashlib
import json
import logging
import time
import uuid
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from enum import StrEnum
from functools import lru_cache
from threading import Lock

from app.domain.datasets import Dataset, DatasetSchema
from app.domain.nodes import ExecutionContext, NodeRegistry
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
    def __init__(self, capacity: int = 32) -> None:
        if capacity < 1:
            raise ValueError("Cache capacity must be positive.")
        self.capacity = capacity
        self._values: OrderedDict[str, Dataset] = OrderedDict()
        self._lock = Lock()

    def get(self, key: str) -> Dataset | None:
        with self._lock:
            value = self._values.get(key)
            if value is not None:
                self._values.move_to_end(key)
            return value

    def put(self, key: str, value: Dataset) -> None:
        with self._lock:
            self._values[key] = value
            self._values.move_to_end(key)
            while len(self._values) > self.capacity:
                self._values.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._values.clear()


@lru_cache
def get_execution_cache() -> InMemoryExecutionCache:
    return InMemoryExecutionCache()


def cache_key(node: NodeInstance, upstream_keys: dict[str, str]) -> str:
    identity = {
        "type": node.type,
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


class WorkflowExecutionService:
    def __init__(self, registry: NodeRegistry) -> None:
        self.registry = registry

    def execute(
        self,
        graph: WorkflowGraph,
        target_node_id: uuid.UUID,
        context: ExecutionContext,
    ) -> ExecutionResult:
        started = time.perf_counter()
        try:
            plan = ExecutionPlanner(self.registry).plan(graph, target_node_id)
        except InvalidWorkflowError as exc:
            raise ExecutionFailure(
                "WORKFLOW_VALIDATION_FAILED",
                "Workflow validation failed before execution.",
                category="validation",
                execution_id=context.execution_id,
                issues=exc.issues,
            ) from exc
        nodes = {node.id: node for node in plan.graph.nodes}
        results: dict[uuid.UUID, Dataset] = {}
        identities: dict[uuid.UUID, str] = {}
        cache_hits = 0
        for node_id in plan.ordered_node_ids:
            node = nodes[node_id]
            definition = self.registry.get(node.type, node.version)
            inbound = sorted(
                (edge for edge in plan.graph.edges if edge.target_node_id == node_id),
                key=lambda edge: (edge.target_port, str(edge.id)),
            )
            inputs = {edge.target_port: results[edge.source_node_id] for edge in inbound}
            upstream = {edge.target_port: identities[edge.source_node_id] for edge in inbound}
            key = cache_key(node, upstream)
            output = context.cache.get(key) if context.cache else None
            if output is not None:
                cache_hits += 1
            else:
                validation = definition.executor.validate(
                    node, {port: dataset.schema for port, dataset in inputs.items()}, context
                )
                if not validation.valid:
                    raise ExecutionFailure(
                        "NODE_VALIDATION_FAILED",
                        validation.issues[0].message,
                        category="validation",
                        execution_id=context.execution_id,
                        node_id=node_id,
                    )
                try:
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
                        str(exc),
                        category=category,
                        execution_id=context.execution_id,
                        node_id=node_id,
                    ) from exc
                if not isinstance(output, Dataset):
                    raise ExecutionFailure(
                        "INVALID_NODE_OUTPUT",
                        "Node executor returned an unsupported runtime value.",
                        category="type",
                        execution_id=context.execution_id,
                        node_id=node_id,
                    )
                if context.cache:
                    context.cache.put(key, output)
            results[node_id] = output
            identities[node_id] = key
        target = results[target_node_id]
        return ExecutionResult(
            context.execution_id,
            target_node_id,
            ExecutionStatus.SUCCEEDED,
            target,
            target.schema,
            (time.perf_counter() - started) * 1000,
            {"executed_nodes": len(plan.ordered_node_ids), "cache_hits": cache_hits},
        )


def default_execution_logger() -> logging.Logger:
    return logging.getLogger("nodebi.execution")
