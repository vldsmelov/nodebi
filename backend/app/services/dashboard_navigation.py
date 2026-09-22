"""Add ordinary visualization context fields and save one widget action atomically."""

import uuid
from dataclasses import replace

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.domain.errors import ApplicationError
from app.domain.nodes import NodeRegistry
from app.domain.visualizations import CHART_TYPES, effective_visualization_config
from app.infrastructure.storage import StorageProvider
from app.models import DashboardWidget
from app.schemas.dashboards import DashboardNavigationSave, DashboardRead, DashboardSave
from app.schemas.workflows import WorkflowSave
from app.services.dashboard_configuration import compatible
from app.services.dashboards import DashboardService
from app.services.execution import ExecutionPlanner, InMemoryExecutionCache
from app.services.projects import ProjectService
from app.services.workflow_validation import InvalidWorkflowError, WorkflowSchemaResolver
from app.services.workflows import (
    domain_graph,
    execution_context,
    get_workflow,
    read_workflow,
    save_graph,
)


def save_navigation(
    session: Session,
    dashboard_id: uuid.UUID,
    payload: DashboardNavigationSave,
    registry: NodeRegistry,
    storage: StorageProvider,
    settings: Settings,
    cache: InMemoryExecutionCache,
) -> DashboardRead:
    service = DashboardService(session)
    try:
        project_id = service.get(dashboard_id).project_id
        ProjectService(session).lock(project_id)
        board = service.read(dashboard_id)
        if board.revision != payload.expected_dashboard_revision:
            raise ApplicationError(
                "DASHBOARD_CONFLICT", "Dashboard changed elsewhere. Reload before saving.", 409
            )
        target = service.read(payload.action.dashboard_id)
        if target.project_id != project_id:
            raise ValueError("The navigation dashboard is missing or belongs to another project.")
        if target.revision != payload.expected_target_revision:
            raise ApplicationError(
                "DASHBOARD_CONFLICT", "Dashboard changed elsewhere. Reload before saving.", 409
            )
        workflow = get_workflow(session, payload.workflow_id)
        if workflow.project_id != project_id:
            raise ValueError("A bound workflow is missing or belongs to another project.")
        graph = read_workflow(session, workflow)
        if graph.revision != payload.expected_workflow_revision:
            raise ApplicationError(
                "WORKFLOW_CONFLICT",
                "This workflow was changed elsewhere. Reload before saving.",
                409,
            )
        widget = next((item for item in board.widgets if item.id == payload.widget_id), None)
        node = next(
            (item for item in graph.nodes if widget and item.id == widget.visualization_id), None
        )
        if widget is None or node is None or node.type not in CHART_TYPES:
            raise ValueError("The selected widget is unavailable.")
        uses = (
            session.scalar(
                select(func.count())
                .select_from(DashboardWidget)
                .where(DashboardWidget.visualization_id == node.id)
            )
            or 0
        )
        if uses > 1 and not payload.acknowledge_shared:
            raise ValueError(
                "Confirm adding navigation fields to all widgets using this visualization."
            )

        context = execution_context(workflow, session, storage, settings, cache, payload.parameters)
        branch = ExecutionPlanner(registry).plan(domain_graph(session, workflow), node.id).graph
        resolved = WorkflowSchemaResolver(registry).resolve(branch, context)
        schemas = {item.node_id: item.schema for item in resolved.nodes if item.schema is not None}
        input_id = next(
            edge.source_node_id
            for edge in branch.edges
            if edge.target_node_id == node.id
            and edge.target_port == ("table" if node.version == 2 else "input")
        )
        original = schemas.get(node.id)
        source = schemas.get(input_id)
        if original is None or source is None:
            raise ValueError("Resolve the visualization schema before adding navigation fields.")
        domain_node = next(item for item in branch.nodes if item.id == node.id)
        appearance = effective_visualization_config(domain_node)
        old_ids = (
            {column.column_id for column in original.columns}
            if node.type == "table"
            else {
                appearance.category_column_id,
                appearance.value_column_id,
                appearance.highlight_column_id,
                *appearance.context_column_ids,
            }
        )
        for identity in payload.add_context_column_ids:
            source.by_id(identity)
            if identity in old_ids:
                raise ValueError("Only fields missing from the visualization result may be added.")
        config = {
            **node.config,
            "context_column_ids": list(
                dict.fromkeys(
                    [*node.config.get("context_column_ids", []), *payload.add_context_column_ids]
                )
            ),
        }
        registry.get(node.type, node.version).config_schema.model_validate(config)
        changed_branch = replace(
            branch,
            nodes=tuple(
                replace(item, config=config) if item.id == node.id else item
                for item in branch.nodes
            ),
        )
        changed_schema = WorkflowSchemaResolver(registry).resolve(changed_branch, context)
        if not changed_schema.valid:
            raise InvalidWorkflowError(changed_schema.issues)
        output = next(
            (item.schema for item in changed_schema.nodes if item.node_id == node.id), None
        )
        if output is None:
            raise ValueError("Resolve the visualization schema before adding navigation fields.")
        save_graph(
            session,
            workflow,
            WorkflowSave(
                format_version=graph.version,
                presentation=graph.presentation,
                name=graph.name,
                expected_revision=graph.revision,
                parameters=graph.parameters,
                nodes=[
                    item.model_copy(update={"config": config}) if item.id == node.id else item
                    for item in graph.nodes
                ],
                edges=graph.edges,
            ),
            registry,
            commit=False,
        )

        # Validate field mappings after staging the graph; any failure rolls back both resources.
        targets = {item.name: item for item in target.configuration.parameters}
        for name, mapping in payload.action.values.items():
            if mapping.source == "field":
                field = output.by_id(mapping.name)
                if name not in targets or not compatible(
                    field.logical_type.value, targets[name].logical_type
                ):
                    raise ValueError("The mapped value has an incompatible type.")
        widgets = [
            item.model_copy(
                update={"config": item.config.model_copy(update={"action": payload.action})}
            )
            if item.id == widget.id
            else item
            for item in board.widgets
        ]
        result = service.save(
            dashboard_id,
            DashboardSave(
                name=board.name,
                expected_revision=board.revision,
                configuration=board.configuration,
                widgets=widgets,
            ),
            commit=False,
        )
        session.commit()
        return result
    except (ValueError, StopIteration, ValidationError, InvalidWorkflowError) as exc:
        session.rollback()
        message = (
            str(exc)
            if isinstance(exc, ValueError) and not isinstance(exc, ValidationError)
            else "Resolve the visualization schema before adding navigation fields."
        )
        raise ApplicationError("INVALID_NAVIGATION_CONFIGURATION", message) from exc
    except Exception:
        session.rollback()
        raise
