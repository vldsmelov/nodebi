"""One transaction converts supported chart bindings to published data documents.

No values are calculated here. Unsupported expression bindings require the author
to append the field explicitly before conversion; positional matching is forbidden.
"""

import uuid
from copy import deepcopy

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.domain.parameters import ParameterDefinition
from app.domain.publications import ContextPoint, DataContext, PublishedOutput, ResultCatalog
from app.domain.visualizations import CHART_TYPES, VisualizationConfig, bound_column_id
from app.infrastructure.storage import StorageProvider
from app.models import Dashboard, DashboardWidget, Visualization
from app.schemas.workflows import WorkflowRead, WorkflowSave
from app.services.execution import InMemoryExecutionCache
from app.services.projects import ProjectService
from app.services.workflow_validation import WorkflowSchemaResolver
from app.services.workflows import (
    domain_graph,
    execution_context,
    get_workflow,
    read_workflow,
    save_graph,
)


class ConversionRequest(BaseModel):
    dry_run: bool = False
    expected_revision: int = Field(ge=1)
    dashboard_revisions: dict[uuid.UUID, int]


def convert_visualizations(
    session: Session,
    workflow_id: uuid.UUID,
    request: ConversionRequest,
    registry: NodeRegistry,
    storage: StorageProvider,
    settings: Settings,
    cache: InMemoryExecutionCache,
) -> WorkflowRead:
    workflow = get_workflow(session, workflow_id)
    ProjectService(session).lock(workflow.project_id)
    saved = read_workflow(session, workflow)
    if saved.revision != request.expected_revision:
        raise ApplicationError("WORKFLOW_CONFLICT", "Workflow changed before conversion.", 409)
    graph = domain_graph(session, workflow)
    visuals = list(
        session.scalars(
            select(Visualization).where(
                Visualization.workflow_id == workflow_id, Visualization.publication_id.is_(None)
            )
        )
    )
    ids = {row.id for row in visuals}
    boards = list(
        session.scalars(
            select(Dashboard)
            .where(
                Dashboard.id.in_(
                    select(DashboardWidget.dashboard_id).where(
                        DashboardWidget.visualization_id.in_(ids)
                    )
                )
            )
            .order_by(Dashboard.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )
    if any(request.dashboard_revisions.get(board.id) != board.revision for board in boards):
        raise ApplicationError("DASHBOARD_CONFLICT", "Dashboard changed before conversion.", 409)
    if not visuals:
        raise ApplicationError("ALREADY_CONVERTED", "This workflow has no chart nodes to convert.")
    resolved = WorkflowSchemaResolver(registry).resolve(
        graph, execution_context(workflow, session, storage, settings, cache)
    )
    if not resolved.valid:
        raise ApplicationError("INVALID_WORKFLOW", "Resolve workflow errors before conversion.")
    schemas = {item.node_id: item.schema for item in resolved.nodes}
    nodes = {node.id: node for node in graph.nodes}
    drafts = {node.id: node for node in saved.nodes}
    removed = {node.id for node in graph.nodes if node.type in CHART_TYPES}
    if any(
        edge.source_node_id in removed and edge.target_node_id not in removed
        for edge in graph.edges
    ):
        raise ApplicationError(
            "CONVERSION_UNSUPPORTED",
            "A chart output feeds a calculation. Publish its input explicitly first.",
        )
    catalog = (saved.result_catalog or ResultCatalog()).model_copy(deep=True)
    context = DataContext(
        id=uuid.uuid4(),
        name="Data context",
        roles=[ParameterDefinition.model_validate(item) for item in workflow.parameters],
    )
    # Keep the original selection boundary and ID. A plain Select Columns keeps
    # the table there; view predicates become compiled steps on its output.
    for draft in drafts.values():
        if draft.type != "filter":
            continue
        conditions = draft.config.get("conditions", [])
        selected = [item for item in conditions if item.get("parameter")]
        if not selected:
            continue
        if any(item.get("operator") != "equals" for item in selected):
            raise ApplicationError(
                "CONVERSION_UNSUPPORTED",
                "Only equality context selections can be converted automatically.",
            )
        for item in selected:
            context.points.append(
                ContextPoint(
                    node_id=draft.id,
                    port="dataset",
                    role=item["parameter"],
                    column_id=item["column_id"],
                )
            )
        retained = [item for item in conditions if not item.get("parameter")]
        if retained:
            draft.config = {**draft.config, "conditions": retained}
        else:
            schema = schemas[draft.id]
            assert schema is not None
            draft.type = "select_columns"
            draft.config = {"column_ids": [column.column_id for column in schema.columns]}
    if context.roles:
        catalog.contexts.append(context)
    mappings: dict[uuid.UUID, dict[str, str]] = {}
    for row in visuals:
        if row.source_node_id not in nodes:
            raise ApplicationError("CONVERSION_UNSUPPORTED", "Visualization source is unavailable.")
        assert row.source_node_id is not None
        chart = nodes[row.source_node_id]
        incoming = {
            edge.target_port: edge for edge in graph.edges if edge.target_node_id == chart.id
        }
        config = VisualizationConfig.model_validate(chart.config)
        remap: dict[str, str] = {}
        kind = "dataset"
        if chart.version == 1:
            endpoint = incoming["input"]
        elif chart.type == "bar_chart":
            endpoint = incoming["table"]
            for role in ("category", "value"):
                binding = incoming[role]
                if (
                    binding.source_node_id != endpoint.source_node_id
                    or binding.source_port != endpoint.source_port
                    or not binding.source_column_id
                ):
                    raise ApplicationError(
                        "CONVERSION_UNSUPPORTED",
                        "Append chart expressions to its table before conversion.",
                    )
                remap[bound_column_id(chart, role)] = binding.source_column_id
            config.category_column_id = remap[bound_column_id(chart, "category")]
            config.value_column_id = remap[bound_column_id(chart, "value")]
        elif chart.type == "kpi":
            endpoint = incoming["value"]
            scalar = nodes[endpoint.source_node_id]
            if scalar.type != "field_scalar":
                if "context" in incoming:
                    raise ApplicationError(
                        "CONVERSION_UNSUPPORTED",
                        "Publish a one-row KPI table containing its navigation fields first.",
                    )
                kind = "scalar"
            else:
                scalar_inputs = {
                    edge.target_port: edge
                    for edge in graph.edges
                    if edge.target_node_id == scalar.id
                }
                endpoint = scalar_inputs["table"]
                binding = scalar_inputs["value"]
                if (
                    binding.source_node_id != endpoint.source_node_id
                    or binding.source_port != endpoint.source_port
                    or not binding.source_column_id
                ):
                    raise ApplicationError(
                        "CONVERSION_UNSUPPORTED",
                        "Append the KPI expression to its table before conversion.",
                    )
                navigation = incoming.get("context")
                if navigation and (navigation.source_node_id, navigation.source_port) != (
                    endpoint.source_node_id,
                    endpoint.source_port,
                ):
                    raise ApplicationError(
                        "CONVERSION_UNSUPPORTED", "KPI navigation must use its one-row table."
                    )
                config.value_column_id = binding.source_column_id
                remap[bound_column_id(chart, "value")] = binding.source_column_id
        else:
            raise ApplicationError(
                "CONVERSION_UNSUPPORTED", "This chart binding needs an explicit published result."
            )
        output = next(
            (
                item
                for item in catalog.outputs
                if (item.node_id, item.port, item.kind)
                == (endpoint.source_node_id, endpoint.source_port, kind)
            ),
            None,
        )
        if output is None:
            output = PublishedOutput(
                id=uuid.uuid4(),
                name=row.name,
                node_id=endpoint.source_node_id,
                port=endpoint.source_port,
                kind=kind,
                context_ids=[context.id] if context.roles else [],
            )
            schema = schemas[endpoint.source_node_id]
            available = {column.column_id for column in schema.columns} if schema else set()
            for definition in context.roles:
                candidates = {
                    point.column_id
                    for point in context.points
                    if point.role == definition.name and point.column_id in available
                }
                if len(candidates) == 1:
                    output.semantic_fields[definition.name] = next(iter(candidates))
            catalog.outputs.append(output)
        config.column_formats = {
            remap.get(key, key): value for key, value in config.column_formats.items()
        }
        config.context_column_ids = [remap.get(key, key) for key in config.context_column_ids]
        if config.highlight_column_id:
            config.highlight_column_id = remap.get(
                config.highlight_column_id, config.highlight_column_id
            )
        row.publication_id = output.id
        row.source_node_id = output.node_id
        row.config = config.model_dump(mode="json")
        row.revision += 1
        mappings[row.id] = remap
    # Prune single-value adapters which existed solely to feed removed KPI nodes.
    for node in graph.nodes:
        if (
            node.type == "field_scalar"
            and not any(
                edge.source_node_id == node.id and edge.target_node_id not in removed
                for edge in graph.edges
            )
            and not any(output.node_id == node.id for output in catalog.outputs)
        ):
            removed.add(node.id)
    for board in boards:
        widgets = list(
            session.scalars(select(DashboardWidget).where(DashboardWidget.dashboard_id == board.id))
        )
        for widget in widgets:
            mapping = mappings.get(widget.visualization_id)
            if not mapping:
                continue
            config_dict = deepcopy(widget.config)
            action = config_dict.get("action")
            if action:
                for value in action.get("values", {}).values():
                    if value.get("source") == "field":
                        value["name"] = mapping.get(value["name"], value["name"])
            widget.config = config_dict
        board.revision += 1
    session.flush()
    presentation = saved.presentation
    if presentation:
        for block in presentation.blocks:
            block.node_ids = [identity for identity in block.node_ids if identity not in removed]
            block.inputs = [port for port in block.inputs if port.node_id not in removed]
            block.outputs = [port for port in block.outputs if port.node_id not in removed]
        presentation.blocks = [block for block in presentation.blocks if block.node_ids]
    result = save_graph(
        session,
        workflow,
        WorkflowSave(
            name=saved.name,
            expected_revision=request.expected_revision,
            format_version=3,
            nodes=[node for node in drafts.values() if node.id not in removed],
            edges=[
                edge
                for edge in saved.edges
                if edge.source_node_id not in removed and edge.target_node_id not in removed
            ],
            parameters=saved.parameters,
            presentation=presentation,
            result_catalog=catalog,
        ),
        registry,
        commit=False,
    )
    if request.dry_run:
        session.rollback()
    else:
        session.commit()
    return result
