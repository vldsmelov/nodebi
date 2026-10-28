"""Own only a recognized alignment suffix, never its two upstream preparation branches."""

import uuid
from dataclasses import dataclass

from pydantic import ValidationError

from app.domain.publications import PublishedOutput
from app.nodes.align_measures import AlignMeasuresConfig
from app.nodes.exact_calculated_column import ExactCalculatedColumnConfig
from app.schemas.alignment_reports import AlignmentSettings
from app.schemas.report_builder import ReportFormula
from app.schemas.workflows import EdgePayload, NodePayload, WorkflowRead, WorkflowSave
from app.services.report_formulas import formula_node
from app.services.report_projection import table_input


@dataclass(frozen=True)
class AlignmentSuffix:
    node: NodePayload
    formulas: tuple[NodePayload, ...]
    left: EdgePayload
    right: EdgePayload

    @property
    def owned(self) -> set[uuid.UUID]:
        return {self.node.id, *(n.id for n in self.formulas)}

    def settings(self, name: str) -> AlignmentSettings:
        return AlignmentSettings(
            name=name,
            alignment=AlignMeasuresConfig.model_validate(self.node.config),
            formulas=[ReportFormula(node_id=n.id, **n.config) for n in self.formulas],
        )


def recognize_alignment(saved: WorkflowRead, output: PublishedOutput) -> AlignmentSuffix | None:
    if output.kind != "dataset" or output.port != "dataset":
        return None
    nodes = {n.id: n for n in saved.nodes}
    node = nodes.get(output.node_id)
    formulas: list[NodePayload] = []
    seen: set[uuid.UUID] = set()
    try:
        while node and (node.type, node.version) == ("calculated_column", 2):
            if (
                node.id in seen
                or len(formulas) >= 16
                or node.ui.get("report_formula") != "alignment"
            ):
                return None
            seen.add(node.id)
            ExactCalculatedColumnConfig.model_validate(node.config)
            edge = table_input(saved, node.id)
            if edge is None:
                return None
            formulas.append(node)
            node = nodes.get(edge.source_node_id)
        if not node or (node.type, node.version) != ("align_measures", 1):
            return None
        AlignMeasuresConfig.model_validate(node.config)
        incoming = [e for e in saved.edges if e.target_node_id == node.id]
        if (
            len(incoming) != 2
            or {e.target_port for e in incoming} != {"left", "right"}
            or any(e.source_column_id is not None for e in incoming)
        ):
            return None
        return AlignmentSuffix(
            node,
            tuple(reversed(formulas)),
            next(e for e in incoming if e.target_port == "left"),
            next(e for e in incoming if e.target_port == "right"),
        )
    except (ValidationError, TypeError):
        return None


def patch_alignment(
    saved: WorkflowRead,
    suffix: AlignmentSuffix,
    settings: AlignmentSettings,
    publication_id: uuid.UUID,
    request_id: uuid.UUID,
) -> WorkflowSave:
    node = suffix.node.model_copy(deep=True)
    node.config = settings.alignment.model_dump(mode="json")
    nodes = [n for n in saved.nodes if n.id not in suffix.owned] + [node]
    edges = [e for e in saved.edges if e.target_node_id not in {n.id for n in suffix.formulas}]
    previous = node.id
    for index, formula in enumerate(settings.formulas):
        original = next((n for n in suffix.formulas if n.id == formula.node_id), None)
        derived = (
            original.model_copy(deep=True)
            if original
            else formula_node(formula, "alignment", node.position.x + 250 * (index + 1))
        )
        derived.config = formula.model_dump(mode="json", exclude={"node_id"})
        if not original:
            derived.position.y = node.position.y
        old_edge = next(
            (e for e in saved.edges if original and e.target_node_id == original.id), None
        )
        edge = (
            old_edge.model_copy(deep=True)
            if old_edge
            else EdgePayload(
                id=uuid.uuid5(request_id, f"alignment-formula-{formula.node_id}"),
                source_node_id=previous,
                source_port="dataset",
                target_node_id=derived.id,
                target_port="input",
            )
        )
        edge.source_node_id = previous
        edge.source_port = "dataset"
        nodes.append(derived)
        edges.append(edge)
        previous = derived.id
    catalog = saved.result_catalog.model_copy(deep=True) if saved.result_catalog else None
    assert catalog
    next(o for o in catalog.outputs if o.id == publication_id).node_id = previous
    node_order = {n.id: i for i, n in enumerate(saved.nodes)}
    edge_order = {e.id: i for i, e in enumerate(saved.edges)}
    nodes.sort(key=lambda n: node_order.get(n.id, len(node_order)))
    edges.sort(key=lambda e: edge_order.get(e.id, len(edge_order)))
    return WorkflowSave(
        name=saved.name,
        expected_revision=saved.revision,
        format_version=saved.version,
        nodes=nodes,
        edges=edges,
        parameters=saved.parameters,
        presentation=saved.presentation,
        result_catalog=catalog,
    )
