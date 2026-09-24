"""Validate containers against a draft without executing it or copying computations."""

from typing import NoReturn
from uuid import UUID

from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry, PortKind
from app.schemas.presentation import WorkflowPresentation
from app.schemas.workflows import WorkflowSave


def validate_presentation(
    presentation: WorkflowPresentation, draft: WorkflowSave, registry: NodeRegistry
) -> None:
    def invalid(message: str) -> NoReturn:
        raise ApplicationError(
            "INVALID_PRESENTATION",
            message,
            issues=[
                {
                    "code": "INVALID_PRESENTATION",
                    "message": message,
                    "field": "presentation",
                }
            ],
        )

    containers = [*presentation.workbooks, *presentation.blocks]
    if not containers:
        return
    if draft.format_version < 2:
        invalid("Workbook containers and composite blocks require workflow format v2.")
    nodes = {node.id: node for node in draft.nodes}
    identities = [container.id for container in containers]
    if len(set(identities)) != len(identities) or set(identities) & nodes.keys():
        invalid("Container IDs must be unique and distinct from node IDs.")
    members: set[UUID] = set()
    for container in containers:
        selected = set(container.node_ids)
        if len(selected) != len(container.node_ids) or not selected <= nodes.keys():
            invalid("Container members must reference distinct nodes in this workflow.")
        if selected & members:
            invalid("A node may belong to only one workbook or composite block.")
        members.update(selected)
    sources = [book.source_id for book in presentation.workbooks]
    if len(sources) != len(set(sources)):
        invalid("A workbook source may have only one container in this workflow.")
    for book in presentation.workbooks:
        detached = set(book.detached_node_ids)
        if len(detached) != len(book.detached_node_ids) or not detached <= set(book.node_ids):
            invalid("Detached sheets must reference distinct members of their workbook.")
        for identity in book.node_ids:
            node = nodes[identity]
            try:
                source_id = UUID(str(node.config.get("source_id")))
            except ValueError:
                source_id = None
            if node.type not in {"excel_source", "excel_periods"} or source_id != book.source_id:
                invalid("Workbook members must be Excel nodes using the workbook source.")

    for block in presentation.blocks:
        selected = set(block.node_ids)
        port_ids = [port.id for port in [*block.inputs, *block.outputs]]
        if len(port_ids) != len(set(port_ids)):
            invalid("Public port IDs must be unique within a block.")
        for direction, ports in (("input", block.inputs), ("output", block.outputs)):
            endpoints = set()
            for port in ports:
                if port.node_id not in selected:
                    invalid("A public port must reference a member of its block.")
                node = nodes[port.node_id]
                definition = registry.get(node.type, node.version)
                available = (
                    definition.input_ports if direction == "input" else definition.output_ports
                )
                actual = next((item for item in available if item.id == port.port), None)
                if actual is None:
                    invalid("A public port references an unavailable node port.")
                if port.column_id is not None and (
                    direction == "input" or actual is None or actual.kind != PortKind.DATASET
                ):
                    invalid("Only a public table output may project a column.")
                endpoint = (port.node_id, port.port, port.column_id)
                if endpoint in endpoints:
                    invalid("A block cannot expose the same endpoint more than once.")
                endpoints.add(endpoint)
            for edge in draft.edges:
                if direction == "input":
                    crosses = (
                        edge.target_node_id in selected and edge.source_node_id not in selected
                    )
                    endpoint = (edge.target_node_id, edge.target_port, None)
                else:
                    crosses = (
                        edge.source_node_id in selected and edge.target_node_id not in selected
                    )
                    endpoint = (edge.source_node_id, edge.source_port, edge.source_column_id)
                if crosses and endpoint not in endpoints:
                    invalid("Every connection crossing a block boundary needs a public port.")
