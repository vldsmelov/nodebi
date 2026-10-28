"""Validate saved navigation and parameter references without executing datasets."""

from sqlalchemy.orm import Session

from app.domain.dashboards import DashboardConfiguration, NavigationAction
from app.domain.errors import ApplicationError
from app.domain.parameters import ParameterDefinition, compatible_parameters
from app.models import Dashboard, Workflow, WorkflowNode
from app.schemas.dashboards import WidgetPayload


def compatible(source: str, target: str) -> bool:
    return source == target or (source == "integer" and target == "float")


def validate_configuration(
    session: Session,
    dashboard: Dashboard,
    config: DashboardConfiguration,
    widgets: list[WidgetPayload],
) -> None:
    declared = {item.name: item for item in config.parameters}
    try:
        for parameter in config.parameters:
            if parameter.options:
                workflow = session.get(Workflow, parameter.options.workflow_id)
                node = session.get(WorkflowNode, parameter.options.node_id)
                if (
                    workflow is None
                    or workflow.project_id != dashboard.project_id
                    or node is None
                    or node.workflow_id != workflow.id
                ):
                    raise ValueError("The parameter options node is unavailable in this project.")
        for binding in config.bindings:
            workflow = session.get(Workflow, binding.workflow_id)
            if workflow is None or workflow.project_id != dashboard.project_id:
                raise ValueError("A bound workflow is missing or belongs to another project.")
            definitions = [ParameterDefinition.model_validate(item) for item in workflow.parameters]
            target = next(
                (item for item in definitions if item.name == binding.workflow_parameter), None
            )
            source = declared.get(binding.dashboard_parameter)
            if target is None or source is None:
                raise ValueError("A dashboard binding references an undeclared parameter.")
            if not compatible_parameters(source, target):
                raise ValueError("Dashboard and workflow parameter types are incompatible.")

        def validate_action(action: NavigationAction, *, row_available: bool) -> None:
            target_dashboard = session.get(Dashboard, action.dashboard_id)
            if target_dashboard is None or target_dashboard.project_id != dashboard.project_id:
                raise ValueError(
                    "The navigation dashboard is missing or belongs to another project."
                )
            target_config = (
                config
                if action.dashboard_id == dashboard.id
                else DashboardConfiguration.model_validate(target_dashboard.configuration)
            )
            targets = {item.name: item for item in target_config.parameters}
            if action.values.keys() - targets.keys():
                raise ValueError("Navigation references an undeclared destination parameter.")
            for name, target in targets.items():
                value = action.values.get(name)
                if value is None:
                    inherited = declared.get(name)
                    if (
                        target.required
                        and target.default is None
                        and not (inherited and compatible_parameters(inherited, target))
                    ):
                        raise ValueError("Provide every required destination parameter.")
                    continue
                if value.source == "parameter":
                    source = declared.get(value.name)
                    if source is None or not compatible_parameters(source, target):
                        raise ValueError(
                            "Navigation parameter is missing or has an incompatible type."
                        )
                elif value.source == "field":
                    if not row_available:
                        raise ValueError("Navigation links cannot use a selected row field.")
                else:
                    target.checked(value.value)
                    if target.required and value.value is None:
                        raise ValueError("Provide every required destination parameter.")

        for link in config.links:
            validate_action(link.action, row_available=False)
        for widget in widgets:
            if widget.config.action:
                validate_action(widget.config.action, row_available=True)
    except ValueError as exc:
        raise ApplicationError("INVALID_DASHBOARD_CONFIGURATION", str(exc)) from exc
