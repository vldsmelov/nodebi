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
        post?: never;
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
        post?: never;
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
        post?: never;
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
        /** DashboardList */
        DashboardList: {
            /** Items */
            items: components["schemas"]["DashboardRead"][];
        };
        /** DashboardRead */
        DashboardRead: {
            /** Name */
            name: string;
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
            /** Expected Revision */
            expected_revision: number;
            /** Widgets */
            widgets: components["schemas"]["WidgetPayload"][];
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
        /**
         * LogicalType
         * @enum {string}
         */
        LogicalType: "string" | "integer" | "float" | "boolean" | "date" | "datetime" | "unknown";
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
        /** VisualizationList */
        VisualizationList: {
            /** Items */
            items: components["schemas"]["VisualizationRead"][];
        };
        /** VisualizationRead */
        VisualizationRead: {
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
            type: "bar_chart" | "kpi";
        };
        /** VisualizationResult */
        VisualizationResult: {
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
            type: "bar_chart" | "kpi";
            /** Title */
            title: string;
            /** Value Field */
            value_field: string;
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
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
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
            /** X */
            x: number;
            /** Y */
            y: number;
            /** Width */
            width: number;
            /** Height */
            height: number;
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
        /** WorkflowRead */
        WorkflowRead: {
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
            /** Expected Revision */
            expected_revision: number;
            /** Nodes */
            nodes: components["schemas"]["NodePayload"][];
            /** Edges */
            edges: components["schemas"]["EdgePayload"][];
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
    node_catalog_api_v1_node_catalog_get: {
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
                    "application/json": components["schemas"]["NodeCatalogRead"];
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
    visualization_result_api_v1_visualizations__visualization_id__result_get: {
        parameters: {
            query?: never;
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
}
