export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ready */
        get: operations["ready_ready_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Projects */
        get: operations["list_projects_api_v1_projects_get"];
        put?: never;
        /** Create Project */
        post: operations["create_project_api_v1_projects_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Project */
        get: operations["get_project_api_v1_projects__project_id__get"];
        put?: never;
        post?: never;
        /** Delete Project */
        delete: operations["delete_project_api_v1_projects__project_id__delete"];
        options?: never;
        head?: never;
        /** Update Project */
        patch: operations["update_project_api_v1_projects__project_id__patch"];
        trace?: never;
    };
    "/api/v1/projects/{project_id}/sources/excel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload Excel */
        post: operations["upload_excel_api_v1_projects__project_id__sources_excel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Sources */
        get: operations["list_sources_api_v1_projects__project_id__sources_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sources/{source_id}/sheets/{sheet_name}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Preview Sheet */
        get: operations["preview_sheet_api_v1_sources__source_id__sheets__sheet_name__preview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sources/{source_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Source */
        delete: operations["delete_source_api_v1_sources__source_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/workflows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Workflows */
        get: operations["list_workflows_api_v1_projects__project_id__workflows_get"];
        put?: never;
        /** Create Workflow */
        post: operations["create_workflow_api_v1_projects__project_id__workflows_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{workflow_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Workflow */
        get: operations["get_workflow_api_v1_workflows__workflow_id__get"];
        /** Save Workflow */
        put: operations["save_workflow_api_v1_workflows__workflow_id__put"];
        post?: never;
        /** Delete Workflow */
        delete: operations["delete_workflow_api_v1_workflows__workflow_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{workflow_id}/schema": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Resolve Workflow Schema */
        get: operations["resolve_workflow_schema_api_v1_workflows__workflow_id__schema_get"];
        put?: never;
        /** Resolve Parameterized Schema */
        post: operations["resolve_parameterized_schema_api_v1_workflows__workflow_id__schema_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{workflow_id}/nodes/{node_id}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview Workflow Node */
        post: operations["preview_workflow_node_api_v1_workflows__workflow_id__nodes__node_id__preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{workflow_id}/nodes/{node_id}/values": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Get Node Values */
        post: operations["get_node_values_api_v1_workflows__workflow_id__nodes__node_id__values_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/node-catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Node Catalog */
        get: operations["node_catalog_api_v1_node_catalog_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/visualizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Visualizations */
        get: operations["list_visualizations_api_v1_projects__project_id__visualizations_get"];
        put?: never;
        /** Create Visualization */
        post: operations["create_visualization_api_v1_projects__project_id__visualizations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/visualizations/{visualization_id}/result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Visualization Result */
        get: operations["visualization_result_api_v1_visualizations__visualization_id__result_get"];
        put?: never;
        /** Parameterized Visualization Result */
        post: operations["parameterized_visualization_result_api_v1_visualizations__visualization_id__result_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/dashboards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Dashboards */
        get: operations["list_dashboards_api_v1_projects__project_id__dashboards_get"];
        put?: never;
        /** Create Dashboard */
        post: operations["create_dashboard_api_v1_projects__project_id__dashboards_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboards/{dashboard_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Dashboard */
        get: operations["get_dashboard_api_v1_dashboards__dashboard_id__get"];
        /** Save Dashboard */
        put: operations["save_dashboard_api_v1_dashboards__dashboard_id__put"];
        post?: never;
        /** Delete Dashboard */
        delete: operations["delete_dashboard_api_v1_dashboards__dashboard_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboards/{dashboard_id}/visualizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Author Visualization */
        post: operations["author_visualization_api_v1_dashboards__dashboard_id__visualizations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dashboards/{dashboard_id}/navigation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Author Navigation */
        post: operations["author_navigation_api_v1_dashboards__dashboard_id__navigation_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{workflow_id}/convert-visualizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Convert Workflow Visualizations */
        post: operations["convert_workflow_visualizations_api_v1_workflows__workflow_id__convert_visualizations_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/workflows/{workflow_id}/publications/{publication_id}/schema": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Publication Schema */
        get: operations["publication_schema_api_v1_workflows__workflow_id__publications__publication_id__schema_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/visualizations/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Visualization */
        get: operations["get_visualization_api_v1_visualizations__identity__get"];
        /** Save Visualization */
        put: operations["save_visualization_api_v1_visualizations__identity__put"];
        post?: never;
        /** Delete Visualization */
        delete: operations["delete_visualization_api_v1_visualizations__identity__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/visualizations/{identity}/copy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Copy Visualization */
        post: operations["copy_visualization_api_v1_visualizations__identity__copy_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/visualizations/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview Visualization */
        post: operations["preview_visualization_api_v1_projects__project_id__visualizations_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/visualizations/{identity}/uses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Visualization Uses */
        get: operations["visualization_uses_api_v1_visualizations__identity__uses_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** Body_upload_excel_api_v1_projects__project_id__sources_excel_post */
        Body_upload_excel_api_v1_projects__project_id__sources_excel_post: {
            /**
             * File
             * @description Excel workbook
             */
            file: string;
        };
        /** ColumnInfoRead */
        ColumnInfoRead: {
            /** Column Id */
            column_id: string;
            /** Display Name */
            display_name: string;
            /** Engine Name */
            engine_name: string;
            logical_type: components["schemas"]["LogicalType"];
            /** Nullable */
            nullable: boolean;
        };
        /** CompositeBlock */
        CompositeBlock: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Label */
            label: string;
            /** Node Ids */
            node_ids: string[];
            position: components["schemas"]["ContainerPosition"];
            /**
             * Collapsed
             * @default false
             */
            collapsed: boolean;
            /** Inputs */
            inputs?: components["schemas"]["PublicPort"][];
            /** Outputs */
            outputs?: components["schemas"]["PublicPort"][];
        };
        /** ContainerPosition */
        ContainerPosition: {
            /** X */
            x: number;
            /** Y */
            y: number;
        };
        /** ContextPoint */
        ContextPoint: {
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Port */
            port: string;
            /** Column Id */
            column_id: string;
            /** Role */
            role: string;
        };
        /** ConversionRequest */
        ConversionRequest: {
            /**
             * Dry Run
             * @default false
             */
            dry_run: boolean;
            /** Expected Revision */
            expected_revision: number;
            /** Dashboard Revisions */
            dashboard_revisions: {
                [key: string]: number;
            };
        };
        /** DashboardConfiguration */
        DashboardConfiguration: {
            /**
             * Period Enabled
             * @default false
             */
            period_enabled: boolean;
            /** Parameters */
            parameters?: components["schemas"]["DashboardParameter"][];
            /** Bindings */
            bindings?: components["schemas"]["ParameterBinding"][];
            /** Links */
            links?: components["schemas"]["DashboardLink"][];
        };
        /** DashboardLink */
        DashboardLink: {
            /** Label */
            label: string;
            action: components["schemas"]["NavigationAction"];
        };
        /** DashboardList */
        DashboardList: {
            /** Items */
            items: components["schemas"]["DashboardRead"][];
        };
        /** DashboardNavigationSave */
        DashboardNavigationSave: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Widget Id
             * Format: uuid
             */
            widget_id: string;
            /** Expected Workflow Revision */
            expected_workflow_revision: number;
            /** Expected Dashboard Revision */
            expected_dashboard_revision: number;
            /** Expected Target Revision */
            expected_target_revision: number;
            /** Add Context Column Ids */
            add_context_column_ids: string[];
            action: components["schemas"]["NavigationAction"];
            /** Parameters */
            parameters?: {
                [key: string]: string | number | boolean | null;
            };
            /**
             * Acknowledge Shared
             * @default false
             */
            acknowledge_shared: boolean;
        };
        /** DashboardParameter */
        DashboardParameter: {
            /** Name */
            name: string;
            /**
             * Label
             * @default
             */
            label: string;
            /**
             * Logical Type
             * @enum {string}
             */
            logical_type: "string" | "integer" | "float" | "boolean" | "date" | "datetime";
            /** Default */
            default?: string | number | boolean | null;
            /**
             * Required
             * @default false
             */
            required: boolean;
            options?: components["schemas"]["ParameterOptions"] | null;
        };
        /** DashboardRead */
        DashboardRead: {
            /** Name */
            name: string;
            configuration?: components["schemas"]["DashboardConfiguration"];
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Project Id
             * Format: uuid
             */
            project_id: string;
            /** Revision */
            revision: number;
            /** Widgets */
            widgets: components["schemas"]["WidgetPayload"][];
        };
        /** DashboardSave */
        DashboardSave: {
            /** Name */
            name: string;
            configuration?: components["schemas"]["DashboardConfiguration"] | null;
            /** Expected Revision */
            expected_revision: number;
            /** Widgets */
            widgets: components["schemas"]["WidgetPayload"][];
        };
        /** DashboardVisualizationCreate */
        DashboardVisualizationCreate: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /** Expected Workflow Revision */
            expected_workflow_revision: number;
            /** Expected Dashboard Revision */
            expected_dashboard_revision: number;
            /**
             * Source Node Id
             * Format: uuid
             */
            source_node_id: string;
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /**
             * Edge Id
             * Format: uuid
             */
            edge_id: string;
            /**
             * Widget Id
             * Format: uuid
             */
            widget_id: string;
            /**
             * Replace Existing
             * @default false
             */
            replace_existing: boolean;
            /**
             * Type
             * @enum {string}
             */
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart";
            /** Config */
            config?: {
                [key: string]: unknown;
            };
        };
        /** DataContext */
        DataContext: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /**
             * Timezone
             * @default Europe/Moscow
             */
            timezone: string;
            /** Roles */
            roles?: components["schemas"]["ParameterDefinition"][];
            /** Points */
            points?: components["schemas"]["ContextPoint"][];
        };
        /** DataSourceList */
        DataSourceList: {
            /** Items */
            items: components["schemas"]["DataSourceRead"][];
        };
        /** DataSourceRead */
        DataSourceRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Project Id
             * Format: uuid
             */
            project_id: string;
            /** Type */
            type: string;
            /** Name */
            name: string;
            /** Original Filename */
            original_filename: string;
            /** File Size */
            file_size: number;
            /** Status */
            status: string;
            workbook: components["schemas"]["WorkbookInfoRead"];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** DatePeriod */
        DatePeriod: {
            /**
             * Start
             * Format: date
             */
            start: string;
            /**
             * End
             * Format: date
             */
            end: string;
        };
        /** EdgePayload */
        EdgePayload: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Source Node Id
             * Format: uuid
             */
            source_node_id: string;
            /** Source Port */
            source_port: string;
            /**
             * Target Node Id
             * Format: uuid
             */
            target_node_id: string;
            /** Target Port */
            target_port: string;
            /** Source Column Id */
            source_column_id?: string | null;
        };
        /** GraphIssueRead */
        GraphIssueRead: {
            /** Code */
            code: string;
            /** Message */
            message: string;
            /**
             * Severity
             * @enum {string}
             */
            severity: "error" | "warning";
            /** Node Id */
            node_id: string | null;
            /** Edge Id */
            edge_id: string | null;
            /** Field */
            field: string | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HealthResponse */
        HealthResponse: {
            /**
             * Status
             * @constant
             */
            status: "ok";
        };
        /** IndependentVisualizationSave */
        IndependentVisualizationSave: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Publication Id
             * Format: uuid
             */
            publication_id: string;
            /** Expected Workflow Revision */
            expected_workflow_revision: number;
            /**
             * Expected Revision
             * @default 1
             */
            expected_revision: number;
            /** Name */
            name: string;
            /**
             * Type
             * @enum {string}
             */
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart";
            config: components["schemas"]["VisualizationConfig"];
        };
        /** JoinDiagnostics */
        JoinDiagnostics: {
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /**
             * How
             * @enum {string}
             */
            how: "inner" | "left";
            /** Left Rows */
            left_rows: number;
            /** Right Rows */
            right_rows: number;
            /** Matched Left Rows */
            matched_left_rows: number;
            /** Unmatched Left Rows */
            unmatched_left_rows: number;
            /** Matched Right Rows */
            matched_right_rows: number;
            /** Unmatched Right Rows */
            unmatched_right_rows: number;
            /** Left Duplicate Keys */
            left_duplicate_keys: number;
            /** Right Duplicate Keys */
            right_duplicate_keys: number;
            /** Multiplied Left Rows */
            multiplied_left_rows: number;
            /** Additional Rows */
            additional_rows: number;
            /** Dropped Left Rows */
            dropped_left_rows: number;
            /** Result Rows */
            result_rows: number;
        };
        /**
         * LogicalType
         * @enum {string}
         */
        LogicalType: "string" | "integer" | "float" | "boolean" | "date" | "datetime" | "unknown";
        /** NavigationAction */
        NavigationAction: {
            /**
             * Dashboard Id
             * Format: uuid
             */
            dashboard_id: string;
            /** Values */
            values?: {
                [key: string]: components["schemas"]["NavigationValue"];
            };
        };
        /** NavigationValue */
        NavigationValue: {
            /**
             * Source
             * @enum {string}
             */
            source: "field" | "parameter" | "constant";
            /**
             * Name
             * @default
             */
            name: string;
            /** Value */
            value?: string | number | boolean | null;
        };
        /** NodeCatalogRead */
        NodeCatalogRead: {
            /** Items */
            items: components["schemas"]["NodeDefinitionRead"][];
        };
        /** NodeDefinitionRead */
        NodeDefinitionRead: {
            /** Type */
            type: string;
            /** Version */
            version: number;
            /**
             * Category
             * @enum {string}
             */
            category: "source" | "transform" | "visualization";
            /** Config Schema */
            config_schema: {
                [key: string]: unknown;
            };
            /**
             * Schema Inference Mode
             * @enum {string}
             */
            schema_inference_mode: "static" | "data_dependent" | "unknown_until_execution";
            /** Display Name */
            display_name: string;
            /** Description */
            description: string;
            /** Icon */
            icon: string | null;
            /** Input Ports */
            input_ports: components["schemas"]["PortRead"][];
            /** Output Ports */
            output_ports: components["schemas"]["PortRead"][];
        };
        /** NodePayload */
        NodePayload: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Type */
            type: string;
            /** Version */
            version: number;
            position: components["schemas"]["PositionPayload"];
            /** Config */
            config?: {
                [key: string]: unknown;
            };
            /** Ui */
            ui?: {
                [key: string]: unknown;
            };
        };
        /** NodeSchemaRead */
        NodeSchemaRead: {
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][] | null;
            /** Issues */
            issues: components["schemas"]["GraphIssueRead"][];
            /** Outputs */
            outputs?: {
                [key: string]: components["schemas"]["ValueSchemaRead"];
            } | null;
        };
        /** NodeValueChoice */
        NodeValueChoice: {
            /** Value */
            value: string | number | boolean | null;
            /** Label */
            label: string | number | boolean | null;
        };
        /** NodeValuesRead */
        NodeValuesRead: {
            /** Revision */
            revision: number;
            column: components["schemas"]["ResolvedColumnRead"];
            /** Values */
            values: (string | number | boolean | null)[];
            /** Choices */
            choices: components["schemas"]["NodeValueChoice"][];
            selected?: components["schemas"]["NodeValueChoice"] | null;
            label_column?: components["schemas"]["ResolvedColumnRead"] | null;
            /** Truncated */
            truncated: boolean;
        };
        /** NodeValuesRequest */
        NodeValuesRequest: {
            /** Output Port */
            output_port?: string | null;
            /** Parameters */
            parameters?: {
                [key: string]: string | number | boolean | null;
            };
            /**
             * Limit
             * @default 200
             */
            limit: number;
            /** Column Id */
            column_id: string;
            /** Label Column Id */
            label_column_id?: string | null;
            /** Selected Value */
            selected_value?: string | number | boolean | null;
            /**
             * Search
             * @default
             */
            search: string;
        };
        /** NumberFormatConfig */
        NumberFormatConfig: {
            /**
             * Number Format
             * @default number
             * @enum {string}
             */
            number_format: "number" | "currency" | "percent";
            /**
             * Decimals
             * @default 2
             */
            decimals: number;
            /**
             * Currency
             * @default USD
             */
            currency: string;
        };
        /** ParameterBinding */
        ParameterBinding: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /** Workflow Parameter */
            workflow_parameter: string;
            /** Dashboard Parameter */
            dashboard_parameter: string;
        };
        /** ParameterDefinition */
        ParameterDefinition: {
            /** Name */
            name: string;
            /**
             * Label
             * @default
             */
            label: string;
            /**
             * Logical Type
             * @enum {string}
             */
            logical_type: "string" | "integer" | "float" | "boolean" | "date" | "datetime";
            /** Default */
            default?: string | number | boolean | null;
        };
        /** ParameterOptions */
        ParameterOptions: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Column Id */
            column_id: string;
            /** Label Column Id */
            label_column_id?: string | null;
        };
        /** PortRead */
        PortRead: {
            /** Id */
            id: string;
            /** Display Name */
            display_name: string;
            /** Kind */
            kind: string;
            /** Required */
            required: boolean;
            /** Max Connections */
            max_connections: number | null;
            /** Accepted Kinds */
            accepted_kinds?: string[] | null;
        };
        /** PositionPayload */
        PositionPayload: {
            /** X */
            x: number;
            /** Y */
            y: number;
        };
        /** PreviewRead */
        PreviewRead: {
            join_diagnostics?: components["schemas"]["JoinDiagnostics"] | null;
            /** Output Port */
            output_port?: string | null;
            /** Value Kind */
            value_kind?: ("dataset" | "field" | "scalar") | null;
            /** Revision */
            revision: number;
            /**
             * Execution Id
             * Format: uuid
             */
            execution_id: string;
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /**
             * Status
             * @constant
             */
            status: "succeeded";
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
            /** Returned Rows */
            returned_rows: number;
            /** Total Rows */
            total_rows: number;
            /** Truncated */
            truncated: boolean;
            /** Duration Ms */
            duration_ms: number;
            /** Metadata */
            metadata: {
                [key: string]: unknown;
            };
            /** Warnings */
            warnings: string[];
        };
        /** PreviewRequest */
        PreviewRequest: {
            /** Output Port */
            output_port?: string | null;
            /** Parameters */
            parameters?: {
                [key: string]: string | number | boolean | null;
            };
            /**
             * Limit
             * @default 100
             */
            limit: number;
        };
        /** ProjectCreate */
        ProjectCreate: {
            /** Name */
            name: string;
        };
        /** ProjectList */
        ProjectList: {
            /** Items */
            items: components["schemas"]["ProjectRead"][];
        };
        /** ProjectRead */
        ProjectRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** ProjectUpdate */
        ProjectUpdate: {
            /** Name */
            name: string;
        };
        /** PublicPort */
        PublicPort: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Label */
            label: string;
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Port */
            port: string;
            /** Column Id */
            column_id?: string | null;
        };
        /** PublicationSchema */
        PublicationSchema: {
            /** Workflow Revision */
            workflow_revision: number;
            /** Kind */
            kind: string;
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Roles */
            roles: components["schemas"]["ParameterDefinition"][];
            /** Period Supported */
            period_supported: boolean;
        };
        /** PublishedOutput */
        PublishedOutput: {
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Port */
            port: string;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "dataset" | "scalar";
            /** Context Ids */
            context_ids?: string[];
            /** Ignored Roles */
            ignored_roles?: string[];
            /** Semantic Fields */
            semantic_fields?: {
                [key: string]: string;
            };
        };
        /** ReadinessResponse */
        ReadinessResponse: {
            /**
             * Status
             * @constant
             */
            status: "ready";
        };
        /** ResolvedColumnRead */
        ResolvedColumnRead: {
            /** Column Id */
            column_id: string;
            /** Engine Name */
            engine_name: string;
            /** Display Name */
            display_name: string;
            /** Logical Type */
            logical_type: string;
            /** Nullable */
            nullable: boolean;
            /** Metadata */
            metadata: {
                [key: string]: unknown;
            };
        };
        /** ResultCatalog */
        ResultCatalog: {
            /** Outputs */
            outputs?: components["schemas"]["PublishedOutput"][];
            /** Contexts */
            contexts?: components["schemas"]["DataContext"][];
        };
        /** ResultPosition */
        ResultPosition: {
            /**
             * Publication Id
             * Format: uuid
             */
            publication_id: string;
            position: components["schemas"]["ContainerPosition"];
        };
        /** RowContextRead */
        RowContextRead: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Output Port */
            output_port: string;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
        /** ValueSchemaRead */
        ValueSchemaRead: {
            /**
             * Kind
             * @enum {string}
             */
            kind: "dataset" | "field" | "scalar";
            /** Columns */
            columns?: components["schemas"]["ResolvedColumnRead"][] | null;
            /** Logical Type */
            logical_type?: string | null;
            row_context?: components["schemas"]["RowContextRead"] | null;
            /** Nullable */
            nullable: boolean;
        };
        /** ViewContext */
        ViewContext: {
            period?: components["schemas"]["DatePeriod"] | null;
            /** Values */
            values?: {
                [key: string]: string | number | boolean | null;
            };
            /** Highlight Only */
            highlight_only?: string[];
        };
        /** VisualizationConfig */
        VisualizationConfig: {
            /**
             * Number Format
             * @default number
             * @enum {string}
             */
            number_format: "number" | "currency" | "percent";
            /**
             * Decimals
             * @default 2
             */
            decimals: number;
            /**
             * Currency
             * @default USD
             */
            currency: string;
            /**
             * Title
             * @default
             */
            title: string;
            /**
             * Title Template
             * @default false
             */
            title_template: boolean;
            /** Highlight Column Id */
            highlight_column_id?: string | null;
            /** Highlight Parameter */
            highlight_parameter?: string | null;
            /** Context Column Ids */
            context_column_ids?: string[];
            /** Column Formats */
            column_formats?: {
                [key: string]: components["schemas"]["NumberFormatConfig"];
            };
            /**
             * Orientation
             * @default vertical
             * @enum {string}
             */
            orientation: "vertical" | "horizontal";
            /**
             * Show Legend
             * @default true
             */
            show_legend: boolean;
            /**
             * Show Labels
             * @default false
             */
            show_labels: boolean;
            /** Value Column Id */
            value_column_id?: string | null;
            /** Category Column Id */
            category_column_id?: string | null;
            /** Column Ids */
            column_ids?: string[] | null;
        };
        /** VisualizationList */
        VisualizationList: {
            /** Items */
            items: components["schemas"]["VisualizationRead"][];
        };
        /** VisualizationRead */
        VisualizationRead: {
            /** Publication Id */
            publication_id?: string | null;
            /**
             * Revision
             * @default 1
             */
            revision: number;
            config?: components["schemas"]["VisualizationConfig"] | null;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Name */
            name: string;
            /**
             * Type
             * @enum {string}
             */
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart";
        };
        /** VisualizationRequest */
        VisualizationRequest: {
            context?: components["schemas"]["ViewContext"];
            /** Parameters */
            parameters?: {
                [key: string]: string | number | boolean | null;
            };
            /**
             * Offset
             * @default 0
             */
            offset: number;
            /**
             * Limit
             * @default 100
             */
            limit: number;
        };
        /** VisualizationResult */
        VisualizationResult: {
            /**
             * Visualization Revision
             * @default 1
             */
            visualization_revision: number;
            /** Applied Context */
            applied_context?: string[];
            /** Unsupported Filters */
            unsupported_filters?: string[];
            /** Highlight Field */
            highlight_field?: string | null;
            /** Highlight Value */
            highlight_value?: string | number | boolean | null;
            /** Context Column Ids */
            context_column_ids?: string[];
            /** Column Formats */
            column_formats?: {
                [key: string]: components["schemas"]["NumberFormatConfig"];
            };
            /**
             * Orientation
             * @default vertical
             * @enum {string}
             */
            orientation: "vertical" | "horizontal";
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /** Revision */
            revision: number;
            /**
             * Type
             * @enum {string}
             */
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart";
            /** Title */
            title: string;
            /** Value Field */
            value_field: string | null;
            /** Category Field */
            category_field: string | null;
            /**
             * Number Format
             * @enum {string}
             */
            number_format: "number" | "currency" | "percent";
            /** Decimals */
            decimals: number;
            /** Currency */
            currency: string;
            /** Show Legend */
            show_legend: boolean;
            /** Show Labels */
            show_labels: boolean;
            /** Total Rows */
            total_rows: number;
            /** Offset */
            offset: number;
            /** Limit */
            limit: number;
            /** Truncated */
            truncated: boolean;
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
        };
        /** VisualizationUse */
        VisualizationUse: {
            /** Dashboard Id */
            dashboard_id: string;
            /** Name */
            name: string;
            /** Widget Id */
            widget_id: string;
        };
        /** WidgetConfig */
        WidgetConfig: {
            /** Highlight Only */
            highlight_only?: string[];
            /**
             * Show Title
             * @default true
             */
            show_title: boolean;
            action?: components["schemas"]["NavigationAction"] | null;
        };
        /** WidgetPayload */
        WidgetPayload: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /** Title */
            title?: string | null;
            config?: components["schemas"]["WidgetConfig"];
            /** X */
            x: number;
            /** Y */
            y: number;
            /** Width */
            width: number;
            /** Height */
            height: number;
        };
        /** WorkbookContainer */
        WorkbookContainer: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Label */
            label: string;
            /** Node Ids */
            node_ids: string[];
            position: components["schemas"]["ContainerPosition"];
            /**
             * Collapsed
             * @default false
             */
            collapsed: boolean;
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /** Detached Node Ids */
            detached_node_ids?: string[];
        };
        /** WorkbookInfoRead */
        WorkbookInfoRead: {
            /** Sheets */
            sheets: components["schemas"]["WorksheetInfoRead"][];
        };
        /** WorkflowCreate */
        WorkflowCreate: {
            /** Name */
            name: string;
        };
        /** WorkflowList */
        WorkflowList: {
            /** Items */
            items: components["schemas"]["WorkflowSummary"][];
        };
        /** WorkflowPresentation */
        WorkflowPresentation: {
            /** Workbooks */
            workbooks?: components["schemas"]["WorkbookContainer"][];
            /** Blocks */
            blocks?: components["schemas"]["CompositeBlock"][];
            /** Results */
            results?: components["schemas"]["ResultPosition"][];
        };
        /** WorkflowRead */
        WorkflowRead: {
            result_catalog?: components["schemas"]["ResultCatalog"] | null;
            presentation?: components["schemas"]["WorkflowPresentation"] | null;
            /** Parameters */
            parameters?: components["schemas"]["ParameterDefinition"][];
            /** Revision */
            revision: number;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Project Id
             * Format: uuid
             */
            project_id: string;
            /** Name */
            name: string;
            /** Version */
            version: number;
            /** Nodes */
            nodes: components["schemas"]["NodePayload"][];
            /** Edges */
            edges: components["schemas"]["EdgePayload"][];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Updated At
             * Format: date-time
             */
            updated_at: string;
        };
        /** WorkflowSave */
        WorkflowSave: {
            /** Name */
            name: string;
            result_catalog?: components["schemas"]["ResultCatalog"] | null;
            presentation?: components["schemas"]["WorkflowPresentation"] | null;
            /** Expected Revision */
            expected_revision: number;
            /**
             * Format Version
             * @default 1
             * @enum {integer}
             */
            format_version: 1 | 2 | 3;
            /** Nodes */
            nodes: components["schemas"]["NodePayload"][];
            /** Edges */
            edges: components["schemas"]["EdgePayload"][];
            /** Parameters */
            parameters?: components["schemas"]["ParameterDefinition"][] | null;
        };
        /** WorkflowSchemaRead */
        WorkflowSchemaRead: {
            /** Revision */
            revision: number;
            /** Valid */
            valid: boolean;
            /** Nodes */
            nodes: components["schemas"]["NodeSchemaRead"][];
            /** Issues */
            issues: components["schemas"]["GraphIssueRead"][];
        };
        /** WorkflowSummary */
        WorkflowSummary: {
            /** Parameters */
            parameters?: components["schemas"]["ParameterDefinition"][];
            /** Revision */
            revision: number;
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Project Id
             * Format: uuid
             */
            project_id: string;
            /** Name */
            name: string;
            /** Version */
            version: number;
        };
        /** WorksheetInfoRead */
        WorksheetInfoRead: {
            /** Name */
            name: string;
            /** Row Count */
            row_count: number | null;
            /** Column Count */
            column_count: number | null;
        };
        /** WorksheetPreviewRead */
        WorksheetPreviewRead: {
            /** Sheet Name */
            sheet_name: string;
            /** Columns */
            columns: components["schemas"]["ColumnInfoRead"][];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
            /** Returned Rows */
            returned_rows: number;
            /** Truncated */
            truncated: boolean;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    ready_ready_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReadinessResponse"];
                };
            };
        };
    };
    list_projects_api_v1_projects_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectList"];
                };
            };
        };
    };
    create_project_api_v1_projects_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_project_api_v1_projects__project_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_project_api_v1_projects__project_id__delete: {
        parameters: {
            query?: {
                /** @description Explicit destructive-action confirmation */
                confirm?: boolean;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    update_project_api_v1_projects__project_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    upload_excel_api_v1_projects__project_id__sources_excel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_excel_api_v1_projects__project_id__sources_excel_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataSourceRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_sources_api_v1_projects__project_id__sources_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataSourceList"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_sheet_api_v1_sources__source_id__sheets__sheet_name__preview_get: {
        parameters: {
            query?: {
                limit?: number;
                header_row?: number;
                header_rows?: number;
                include_row_number?: boolean;
            };
            header?: never;
            path: {
                source_id: string;
                sheet_name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorksheetPreviewRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_source_api_v1_sources__source_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_workflows_api_v1_projects__project_id__workflows_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowList"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_workflow_api_v1_projects__project_id__workflows_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkflowCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_workflow_api_v1_workflows__workflow_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_workflow_api_v1_workflows__workflow_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkflowSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_workflow_api_v1_workflows__workflow_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    resolve_workflow_schema_api_v1_workflows__workflow_id__schema_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowSchemaRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    resolve_parameterized_schema_api_v1_workflows__workflow_id__schema_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviewRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowSchemaRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_workflow_node_api_v1_workflows__workflow_id__nodes__node_id__preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
                node_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviewRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreviewRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_node_values_api_v1_workflows__workflow_id__nodes__node_id__values_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
                node_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["NodeValuesRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NodeValuesRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    node_catalog_api_v1_node_catalog_get: {
        parameters: {
            query?: {
                format_version?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NodeCatalogRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_visualizations_api_v1_projects__project_id__visualizations_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationList"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_visualization_api_v1_projects__project_id__visualizations_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IndependentVisualizationSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    visualization_result_api_v1_visualizations__visualization_id__result_get: {
        parameters: {
            query?: {
                offset?: number;
                limit?: number;
            };
            header?: never;
            path: {
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationResult"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    parameterized_visualization_result_api_v1_visualizations__visualization_id__result_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VisualizationRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationResult"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_dashboards_api_v1_projects__project_id__dashboards_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardList"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    create_dashboard_api_v1_projects__project_id__dashboards_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkflowCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_dashboard_api_v1_dashboards__dashboard_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dashboard_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_dashboard_api_v1_dashboards__dashboard_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dashboard_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DashboardSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_dashboard_api_v1_dashboards__dashboard_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dashboard_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    author_visualization_api_v1_dashboards__dashboard_id__visualizations_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dashboard_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DashboardVisualizationCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    author_navigation_api_v1_dashboards__dashboard_id__navigation_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                dashboard_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DashboardNavigationSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    convert_workflow_visualizations_api_v1_workflows__workflow_id__convert_visualizations_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConversionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkflowRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    publication_schema_api_v1_workflows__workflow_id__publications__publication_id__schema_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workflow_id: string;
                publication_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicationSchema"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_visualization_api_v1_visualizations__identity__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_visualization_api_v1_visualizations__identity__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IndependentVisualizationSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    delete_visualization_api_v1_visualizations__identity__delete: {
        parameters: {
            query: {
                expected_revision: number;
            };
            header?: never;
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    copy_visualization_api_v1_visualizations__identity__copy_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IndependentVisualizationSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    preview_visualization_api_v1_projects__project_id__visualizations_preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IndependentVisualizationSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationResult"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    visualization_uses_api_v1_visualizations__identity__uses_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisualizationUse"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
