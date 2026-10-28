import polars as pl

from app.domain.datasets import Dataset, DatasetSchema, LogicalType
from app.domain.errors import NodeExecutionError
from app.domain.measure_contracts import (
    validate_measure_grain,
    validate_measure_schema,
    validate_measure_selection,
)
from app.domain.nodes import (
    ExecutionContext,
    NodeCategory,
    NodeDefinition,
    PortDefinition,
    PortKind,
    SchemaInferenceMode,
)
from app.domain.visualizations import CHART_NAMES, CHART_TYPES, TITLE_PARAMETER, VisualizationConfig
from app.domain.workflows import NodeInstance
from app.nodes.common import UnaryExecutor, input_schema


class VisualizationExecutor(UnaryExecutor):
    def infer_schema(
        self, node: NodeInstance, input_schemas: dict[str, DatasetSchema], context: ExecutionContext
    ) -> DatasetSchema:
        schema = input_schema(input_schemas)
        config = VisualizationConfig.model_validate(node.config)
        validate_measure_selection(config, node.type)
        if config.measure_column_ids is not None:
            fields = config.measure_column_ids
            assert config.grain_column_ids is not None
            for identity in fields:
                validate_measure_schema(schema, identity, config.grain_column_ids)
        if config.grain_column_ids is not None:
            grain = config.grain_column_ids
            validate_measure_schema(schema, config.value_column_id, grain)
            if node.type == "table":
                if config.column_ids is not None and not {*grain, config.value_column_id} <= set(
                    config.column_ids
                ):
                    raise ValueError("A measure table must display its value and all grain fields.")
            elif node.type == "kpi":
                if grain:
                    raise ValueError("A reusable KPI requires a single total with no grain fields.")
            elif (
                node.type not in {"bar_chart", "line_chart"}
                or len(grain) != 1
                or config.category_column_id != grain[0]
            ):
                raise ValueError(
                    "Use a table for a multi-dimensional measure, "
                    "or a chart with its single grain field."
                )
        if config.additional_series:
            if node.type not in {"bar_chart", "line_chart"}:
                raise ValueError("Multiple series require Bar or Line.")
            series_ids = [
                config.value_column_id,
                *[series.column_id for series in config.additional_series],
            ]
            if len(set(series_ids)) != len(series_ids):
                raise ValueError("Series fields must be unique.")
            for series in config.additional_series:
                if schema.by_id(series.column_id).logical_type not in {
                    LogicalType.INTEGER,
                    LogicalType.FLOAT,
                    LogicalType.DECIMAL,
                    LogicalType.UNKNOWN,
                }:
                    raise ValueError("Select a numeric value field.")
        parameters = {item.name: item for item in context.parameter_definitions}
        if config.title_template and any(
            name not in parameters for name in TITLE_PARAMETER.findall(config.title)
        ):
            raise ValueError("The title references an undeclared workflow parameter.")
        if bool(config.highlight_column_id) != bool(config.highlight_parameter):
            raise ValueError("Select both a highlight field and a workflow parameter.")
        if config.highlight_column_id and config.highlight_parameter:
            highlighted = schema.by_id(config.highlight_column_id)
            parameter = parameters.get(config.highlight_parameter)
            if parameter is None or (
                parameter.logical_type != highlighted.logical_type
                and not (
                    parameter.logical_type == "integer"
                    and highlighted.logical_type == LogicalType.FLOAT
                )
            ):
                raise ValueError("The highlight parameter and field must have compatible types.")
        for column_id in config.column_formats:
            schema.by_id(column_id)
        for column_id in config.context_column_ids:
            schema.by_id(column_id)
        if node.type == "table":
            ids = (
                config.column_ids
                if config.column_ids is not None
                else [c.column_id for c in schema.columns]
            )
            if schema.columns and not ids:
                raise ValueError("Select at least one table field.")
            # Resolve eagerly: a generator converts a missing-field StopIteration to RuntimeError.
            selected = [
                schema.by_id(identity)
                for identity in dict.fromkeys(
                    [
                        *ids,
                        *config.context_column_ids,
                        *([config.highlight_column_id] if config.highlight_column_id else []),
                    ]
                )
            ]
            return DatasetSchema(tuple(selected))
        if not config.value_column_id:
            raise ValueError("Select a numeric value field.")
        value = schema.by_id(config.value_column_id)
        if value.logical_type not in {
            LogicalType.INTEGER,
            LogicalType.FLOAT,
            LogicalType.DECIMAL,
            LogicalType.UNKNOWN,
        } and not (node.type == "kpi" and value.logical_type == LogicalType.STRING):
            raise ValueError("Select a numeric value field.")
        if node.type != "kpi":
            if not config.category_column_id:
                raise ValueError("Select a category field.")
            category = schema.by_id(config.category_column_id)
            if node.type == "scatter_chart" and category.logical_type not in {
                LogicalType.INTEGER,
                LogicalType.FLOAT,
                LogicalType.DECIMAL,
                LogicalType.UNKNOWN,
            }:
                raise ValueError("Scatter X field must be numeric.")
        return schema

    def execute(
        self, node: NodeInstance, inputs: dict[str, Dataset], context: ExecutionContext
    ) -> Dataset:
        source = inputs["input"]
        schema = self.infer_schema(node, {"input": source.schema}, context)
        config = VisualizationConfig.model_validate(node.config)
        if config.grain_column_ids is not None:
            validate_measure_grain(source, config.grain_column_ids)
            for identity in config.measure_column_ids or [config.value_column_id or ""]:
                name = source.schema.by_id(identity).engine_name
                if (~source.frame[name].cast(pl.Float64).is_finite()).any():
                    raise NodeExecutionError(
                        "Visualization values must be finite numbers or empty."
                    )
        if node.type == "table":
            return Dataset(
                source.frame.select([c.engine_name for c in schema.columns]),
                schema,
                source.metadata,
            )
        config = VisualizationConfig.model_validate(node.config)
        assert config.value_column_id is not None
        value_name = source.schema.by_id(config.value_column_id).engine_name
        if (
            source.schema.by_id(config.value_column_id).logical_type != LogicalType.STRING
            and (~source.frame[value_name].cast(pl.Float64).is_finite()).any()
        ):
            raise NodeExecutionError("Visualization values must be finite numbers or empty.")
        for series in config.additional_series:
            name = source.schema.by_id(series.column_id).engine_name
            if (~source.frame[name].cast(pl.Float64).is_finite()).any():
                raise NodeExecutionError("Visualization values must be finite numbers or empty.")
        if node.type == "scatter_chart":
            assert config.category_column_id is not None
            x_name = source.schema.by_id(config.category_column_id).engine_name
            if (~source.frame[x_name].cast(pl.Float64).is_finite()).any():
                raise NodeExecutionError("Scatter X values must be finite numbers or empty.")
        if node.type == "kpi" and source.row_count != 1:
            raise NodeExecutionError(
                "KPI requires exactly one row. Add a Group By with no dimensions first."
            )
        if node.type != "kpi" and source.row_count > 2000:
            raise NodeExecutionError(
                "Chart exceeds 2000 points. Aggregate or explicitly filter the upstream data."
            )
        if node.type in {"pie_chart", "donut_chart"} and source.row_count:
            values = source.frame[value_name].cast(pl.Float64)
            if (values < 0).any() or not (values.sum() or 0) > 0:
                raise NodeExecutionError(
                    "Pie and donut require non-negative values with a positive total."
                )
        return source


def visualization_definitions() -> tuple[NodeDefinition, ...]:
    return tuple(
        NodeDefinition(
            type=kind,
            version=1,
            category=NodeCategory.VISUALIZATION,
            display_name=CHART_NAMES[kind],
            description="Display prepared data. Configure aggregation upstream.",
            input_ports=(PortDefinition("input", "Dataset", PortKind.DATASET),),
            output_ports=(),
            config_schema=VisualizationConfig,
            schema_inference_mode=SchemaInferenceMode.STATIC,
            executor=VisualizationExecutor(),
        )
        for kind in CHART_TYPES
        if kind
        not in {
            "box_plot",
            "histogram_chart",
            "heatmap_chart",
            "radar_chart",
            "waterfall_chart",
            "combo_chart",
            "bubble_chart",
            "pareto_chart",
            "funnel_chart",
            "treemap_chart",
            "sunburst_chart",
            "bullet_chart",
            "analytical_table",
        }
    )
