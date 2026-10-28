"""Validate wizard presentations through the existing engines; never aggregate in charts."""

from uuid import UUID

from app.domain.nodes import ExecutionContext
from app.domain.visualizations import VisualizationConfig
from app.domain.workflows import NodeInstance, Position
from app.models import Visualization, Workflow
from app.nodes.visualization import VisualizationExecutor
from app.schemas.dashboards import VisualizationResult
from app.services.combo_visualizations import render_combo, validate_combo_config
from app.services.execution import ExecutionResult
from app.services.radar_visualizations import render_radar, validate_radar_config


def preview_report_visualization(
    workflow: Workflow,
    identity: UUID,
    kind: str,
    config: VisualizationConfig,
    result: ExecutionResult,
    context: ExecutionContext,
) -> VisualizationResult | None:
    if kind not in {"combo_chart", "radar_chart"}:
        VisualizationExecutor().execute(
            NodeInstance(identity, kind, 1, Position(0, 0), config.model_dump()),
            {"input": result.output},
            context,
        )
        return None
    if kind == "radar_chart":
        validate_radar_config(config)
    else:
        validate_combo_config(config)
    # Reuse common title/highlight/context/format validation without legacy chart bindings.
    VisualizationExecutor().execute(
        NodeInstance(
            identity,
            "table",
            1,
            Position(0, 0),
            config.model_copy(update={"column_ids": None}).model_dump(),
        ),
        {"input": result.output},
        context,
    )
    visual = Visualization(
        id=identity,
        project_id=workflow.project_id,
        workflow_id=workflow.id,
        name=config.title,
        type=kind,
        revision=1,
    )
    renderer = render_radar if kind == "radar_chart" else render_combo
    return renderer(visual, workflow, config, result, context, [], [])
