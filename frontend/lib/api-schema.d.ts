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
    "/api/v1/projects/{project_id}/imports/{source_id}/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Import Session */
        get: operations["import_session_api_v1_projects__project_id__imports__source_id__session_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/imports/{source_id}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Save Draft */
        put: operations["save_draft_api_v1_projects__project_id__imports__source_id__draft_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/connectors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Connectors */
        get: operations["connectors_api_v1_connectors_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Imports */
        get: operations["imports_api_v1_projects__project_id__imports_get"];
        put?: never;
        /** Upload */
        post: operations["upload_api_v1_projects__project_id__imports_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/{source_id}/inspect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Inspect */
        post: operations["inspect_api_v1_imports__source_id__inspect_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/{source_id}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview */
        post: operations["preview_api_v1_imports__source_id__preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/imports/{source_id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply */
        post: operations["apply_api_v1_imports__source_id__apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/datasets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Datasets */
        get: operations["datasets_api_v1_projects__project_id__datasets_get"];
        put?: never;
        post?: never;
        delete?: never;
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
    "/api/v1/dashboards/{dashboard_id}/layout-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Layout Templates */
        get: operations["list_layout_templates_api_v1_dashboards__dashboard_id__layout_templates_get"];
        put?: never;
        /** Save Layout Template */
        post: operations["save_layout_template_api_v1_dashboards__dashboard_id__layout_templates_post"];
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
    "/api/v1/visualization-types": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Typed Visualization Types */
        get: operations["typed_visualization_types_api_v1_visualization_types_get"];
        put?: never;
        post?: never;
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
    "/api/v1/updates/{identity}/editor/workspace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Editor Workspace */
        get: operations["editor_workspace_api_v1_updates__identity__editor_workspace_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/editor/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Find Editor Cells */
        get: operations["find_editor_cells_api_v1_updates__identity__editor_find_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/editor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Editor Page */
        get: operations["editor_page_api_v1_updates__identity__editor_get"];
        put?: never;
        /** Save Editor */
        post: operations["save_editor_api_v1_updates__identity__editor_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/editor/prepare": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Prepare Editor */
        post: operations["prepare_editor_api_v1_updates__identity__editor_prepare_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/editor/discard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Discard Editor */
        post: operations["discard_editor_api_v1_updates__identity__editor_discard_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/file-updates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Start File Update */
        post: operations["start_file_update_api_v1_projects__project_id__file_updates_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/files/{kind}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download Update File */
        get: operations["download_update_file_api_v1_updates__identity__files__kind__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Report State */
        get: operations["report_state_api_v1_projects__project_id__report_state_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/visualizations/{identity}/lineage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lineage */
        get: operations["lineage_api_v1_visualizations__identity__lineage_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sources/{source_id}/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Versions */
        get: operations["versions_api_v1_sources__source_id__versions_get"];
        put?: never;
        /** Upload Version */
        post: operations["upload_version_api_v1_sources__source_id__versions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/updates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Updates */
        get: operations["updates_api_v1_projects__project_id__updates_get"];
        put?: never;
        /** Create Update */
        post: operations["create_update_api_v1_projects__project_id__updates_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Save Update */
        put: operations["save_update_api_v1_updates__identity__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Update */
        post: operations["apply_update_api_v1_updates__identity__apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Update */
        post: operations["cancel_update_api_v1_updates__identity__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/rollback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Rollback Update */
        post: operations["rollback_update_api_v1_updates__identity__rollback_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/updates/{identity}/check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Check Update */
        post: operations["check_update_api_v1_updates__identity__check_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/quality-rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Rules */
        get: operations["get_rules_api_v1_projects__project_id__quality_rules_get"];
        /** Save Rules */
        put: operations["save_rules_api_v1_projects__project_id__quality_rules_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/checks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Check Current */
        post: operations["check_current_api_v1_projects__project_id__checks_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Jobs */
        get: operations["jobs_api_v1_projects__project_id__report_jobs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/report-jobs/{identity}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Job */
        post: operations["cancel_job_api_v1_report_jobs__identity__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/releases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Releases */
        get: operations["releases_api_v1_projects__project_id__releases_get"];
        put?: never;
        /** Release */
        post: operations["release_api_v1_projects__project_id__releases_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/releases/{identity}/dashboards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Release Dashboards */
        get: operations["release_dashboards_api_v1_releases__identity__dashboards_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/releases/{identity}/widgets/{visualization_id}/result": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Release Result */
        get: operations["release_result_api_v1_releases__identity__widgets__visualization_id__result_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/releases/{identity}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Restore */
        post: operations["restore_api_v1_releases__identity__restore_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/inputs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Inputs */
        get: operations["list_inputs_api_v1_projects__project_id__report_builder_inputs_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/inputs/{workflow_id}/{publication_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Input */
        get: operations["read_input_api_v1_projects__project_id__report_builder_inputs__workflow_id___publication_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/fields": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Fields */
        post: operations["fields_api_v1_projects__project_id__report_builder_fields_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}/fields": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Edit Fields */
        post: operations["edit_fields_api_v1_projects__project_id__report_builder__visualization_id__fields_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Edit Read */
        get: operations["edit_read_api_v1_projects__project_id__report_builder__visualization_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Edit Preview */
        post: operations["edit_preview_api_v1_projects__project_id__report_builder__visualization_id__preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/{visualization_id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Edit Apply */
        post: operations["edit_apply_api_v1_projects__project_id__report_builder__visualization_id__apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview */
        post: operations["preview_api_v1_projects__project_id__report_builder_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-builder/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply */
        post: operations["apply_api_v1_projects__project_id__report_builder_apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/measures/{workflow_id}/{publication_id}/{measure_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remove Measure */
        delete: operations["remove_measure_api_v1_projects__project_id__measures__workflow_id___publication_id___measure_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/measures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Measures */
        get: operations["list_measures_api_v1_projects__project_id__measures_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/measures/{workflow_id}/{publication_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Save Measure */
        put: operations["save_measure_api_v1_projects__project_id__measures__workflow_id___publication_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/measure-reports/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview Report */
        post: operations["preview_report_api_v1_projects__project_id__measure_reports_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/measure-reports/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Report */
        post: operations["apply_report_api_v1_projects__project_id__measure_reports_apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Alignment */
        get: operations["read_alignment_api_v1_projects__project_id__alignment_reports__visualization_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}/fields": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Edit Alignment Fields */
        post: operations["edit_alignment_fields_api_v1_projects__project_id__alignment_reports__visualization_id__fields_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview Alignment Edit */
        post: operations["preview_alignment_edit_api_v1_projects__project_id__alignment_reports__visualization_id__preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/alignment-reports/{visualization_id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Alignment Edit */
        post: operations["apply_alignment_edit_api_v1_projects__project_id__alignment_reports__visualization_id__apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/alignment-reports/fields": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Alignment Fields */
        post: operations["alignment_fields_api_v1_projects__project_id__alignment_reports_fields_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/alignment-reports/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview Alignment */
        post: operations["preview_alignment_api_v1_projects__project_id__alignment_reports_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/alignment-reports/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Alignment */
        post: operations["apply_alignment_api_v1_projects__project_id__alignment_reports_apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/statistical-reports/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview */
        post: operations["preview_api_v1_projects__project_id__statistical_reports_preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/statistical-reports/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply */
        post: operations["apply_api_v1_projects__project_id__statistical_reports_apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/statistical-reports/{visualization_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Edit */
        get: operations["read_edit_api_v1_projects__project_id__statistical_reports__visualization_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/statistical-reports/{visualization_id}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview Edit */
        post: operations["preview_edit_api_v1_projects__project_id__statistical_reports__visualization_id__preview_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/statistical-reports/{visualization_id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Apply Edit */
        post: operations["apply_edit_api_v1_projects__project_id__statistical_reports__visualization_id__apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/template-catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Template Catalog */
        get: operations["list_template_catalog_api_v1_projects__project_id__template_catalog_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/template-catalog/{template_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Edit Template Catalog */
        patch: operations["edit_template_catalog_api_v1_projects__project_id__template_catalog__template_id__patch"];
        trace?: never;
    };
    "/api/v1/projects/{project_id}/analytical-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Templates */
        get: operations["list_templates_api_v1_projects__project_id__analytical_templates_get"];
        put?: never;
        /** Capture Template */
        post: operations["capture_template_api_v1_projects__project_id__analytical_templates_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/analytical-templates/{template_id}/prepare": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Prepare Template */
        post: operations["prepare_template_api_v1_projects__project_id__analytical_templates__template_id__prepare_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Report Templates */
        get: operations["list_report_templates_api_v1_projects__project_id__report_templates_get"];
        put?: never;
        /** Capture Report Template */
        post: operations["capture_report_template_api_v1_projects__project_id__report_templates_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/report-templates/{template_id}/prepare": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Prepare Report Template */
        post: operations["prepare_report_template_api_v1_projects__project_id__report_templates__template_id__prepare_post"];
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
        /** AdditionalSeries */
        AdditionalSeries: {
            /** Column Id */
            column_id: string;
            /**
             * Name
             * @default
             */
            name: string;
        };
        /** AlignMeasuresConfig */
        AlignMeasuresConfig: {
            /** Keys */
            keys: components["schemas"]["JoinKey"][];
            /** Left Value */
            left_value: string;
            /** Right Value */
            right_value: string;
            /**
             * Left Name
             * @default Left measure
             */
            left_name: string;
            /**
             * Right Name
             * @default Right measure
             */
            right_name: string;
            /**
             * Null Keys
             * @default reject
             * @enum {string}
             */
            null_keys: "reject" | "match";
        };
        /** AlignmentDiagnostics */
        AlignmentDiagnostics: {
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Matched Rows */
            matched_rows: number;
            /** Left Only Rows */
            left_only_rows: number;
            /** Right Only Rows */
            right_only_rows: number;
            /** Result Rows */
            result_rows: number;
        };
        /** AlignmentEditRead */
        AlignmentEditRead: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /** Expected Token */
            expected_token: string;
            /** Name */
            name: string;
            /**
             * Editable
             * @default false
             */
            editable: boolean;
            /** Reason */
            reason?: string | null;
            settings?: components["schemas"]["AlignmentSettings"] | null;
            /** Left Columns */
            left_columns?: components["schemas"]["ResolvedColumnRead"][];
            /** Right Columns */
            right_columns?: components["schemas"]["ResolvedColumnRead"][];
            /** Steps */
            steps?: components["schemas"]["ReportStep"][];
            /**
             * Widget Count
             * @default 0
             */
            widget_count: number;
        };
        /** AlignmentEditRequest */
        AlignmentEditRequest: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Expected Token */
            expected_token: string;
            settings: components["schemas"]["AlignmentSettings"];
            /**
             * Rebind Fields
             * @default false
             */
            rebind_fields: boolean;
            /**
             * Acknowledge Shared
             * @default false
             */
            acknowledge_shared: boolean;
        };
        /** AlignmentReportFields */
        AlignmentReportFields: {
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Formula Outputs */
            formula_outputs?: {
                [key: string]: components["schemas"]["ResolvedColumnRead"][];
            };
        };
        /** AlignmentReportPreview */
        AlignmentReportPreview: {
            graph: components["schemas"]["WorkflowSave"];
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
            /** Total Rows */
            total_rows: number;
            /** Steps */
            steps: string[];
            visualization?: components["schemas"]["VisualizationResult"] | null;
            alignment_diagnostics: components["schemas"]["AlignmentDiagnostics"];
            formula_fields: components["schemas"]["AlignmentReportFields"];
        };
        /** AlignmentReportRequest */
        AlignmentReportRequest: {
            /** Name */
            name: string;
            alignment: components["schemas"]["AlignMeasuresConfig"];
            /** Formulas */
            formulas?: components["schemas"]["ReportFormula"][];
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Left Publication Id
             * Format: uuid
             */
            left_publication_id: string;
            /**
             * Right Publication Id
             * Format: uuid
             */
            right_publication_id: string;
            /** Expected Token */
            expected_token: string;
        };
        /** AlignmentSettings */
        AlignmentSettings: {
            /** Name */
            name: string;
            alignment: components["schemas"]["AlignMeasuresConfig"];
            /** Formulas */
            formulas?: components["schemas"]["ReportFormula"][];
        };
        /** AnalyticalRowRoles */
        AnalyticalRowRoles: {
            /** Row Id */
            row_id: string;
            /** Parent Id */
            parent_id: string;
            /** Depth */
            depth: string;
            /** Kind */
            kind: string;
            /** Source Count */
            source_count: string;
        };
        /** AnalyticalTablePresentation */
        AnalyticalTablePresentation: {
            /** Cells */
            cells?: {
                [key: string]: {
                    [key: string]: components["schemas"]["TableCellFormat"];
                };
            };
        };
        /** AnalyticalTableSpec */
        AnalyticalTableSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default analytical_table
             * @constant
             */
            type: "analytical_table";
            rows: components["schemas"]["AnalyticalRowRoles"];
            /** Dimensions */
            dimensions: string[];
            /** Measures */
            measures: string[];
            /** Visible Measures */
            visible_measures?: string[] | null;
            /**
             * Pinned Columns
             * @default 0
             */
            pinned_columns: number;
            /**
             * Density
             * @default normal
             * @enum {string}
             */
            density: "normal" | "compact";
            /** Rules */
            rules?: components["schemas"]["TableFormatRule"][];
        };
        /** ApplyImportRequest */
        ApplyImportRequest: {
            profile: components["schemas"]["ImportProfile"];
            /** Expected Revision */
            expected_revision: number;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Draft Revision */
            draft_revision?: number | null;
        };
        /** ApplyRequest */
        ApplyRequest: {
            /** Expected Revision */
            expected_revision: number;
            /**
             * Acknowledge Warnings
             * @default false
             */
            acknowledge_warnings: boolean;
        };
        /** BasicSeries */
        BasicSeries: {
            /** Column Id */
            column_id: string;
            /**
             * Name
             * @default
             */
            name: string;
        };
        /** BasicVisualizationInput */
        BasicVisualizationInput: {
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
            /** Spec */
            spec: components["schemas"]["CartesianSpec"] | components["schemas"]["PartToWholeSpec"] | components["schemas"]["ScatterSpec"] | components["schemas"]["KpiInputSpec"] | components["schemas"]["TableInputSpec"];
            /** Measure Column Ids */
            measure_column_ids?: string[] | null;
            /** Grain Column Ids */
            grain_column_ids?: string[] | null;
        };
        /** Body_upload_api_v1_projects__project_id__imports_post */
        Body_upload_api_v1_projects__project_id__imports_post: {
            /** File */
            file: string;
            /** Connector */
            connector: string;
            /**
             * Encoding
             * @default utf-8-sig
             */
            encoding: string;
            /**
             * Delimiter
             * @default ,
             */
            delimiter: string;
            /**
             * Header Row
             * @default 1
             */
            header_row: number;
        };
        /** Body_upload_excel_api_v1_projects__project_id__sources_excel_post */
        Body_upload_excel_api_v1_projects__project_id__sources_excel_post: {
            /**
             * File
             * @description Excel workbook
             */
            file: string;
        };
        /** Body_upload_version_api_v1_sources__source_id__versions_post */
        Body_upload_version_api_v1_sources__source_id__versions_post: {
            /** File */
            file: string;
            /** Read Options */
            read_options?: string | null;
        };
        /** BoxOutlierRoles */
        BoxOutlierRoles: {
            /** Group Id */
            group_id: string;
            /** Group */
            group: string;
            /** Point Id */
            point_id: string;
            /** Value */
            value: string;
        };
        /** BoxPlotReportSettings */
        BoxPlotReportSettings: {
            /** Value Column Id */
            value_column_id: string;
            /** Group Column Id */
            group_column_id?: string | null;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "boxplot_stats";
        };
        /** BoxPlotSpec */
        BoxPlotSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default box_plot
             * @constant
             */
            type: "box_plot";
            summary: components["schemas"]["BoxSummaryRoles"];
            outliers: components["schemas"]["BoxOutlierRoles"];
        };
        /** BoxSummaryRoles */
        BoxSummaryRoles: {
            /** Group Id */
            group_id: string;
            /** Group */
            group: string;
            /** Count */
            count: string;
            /** Missing Count */
            missing_count: string;
            /** Minimum */
            minimum: string;
            /** Lower Whisker */
            lower_whisker: string;
            /** Q1 */
            q1: string;
            /** Median */
            median: string;
            /** Q3 */
            q3: string;
            /** Upper Whisker */
            upper_whisker: string;
            /** Maximum */
            maximum: string;
            /** Outlier Count */
            outlier_count: string;
        };
        /** BubbleAxis */
        BubbleAxis: {
            /** Minimum */
            minimum: string | null;
            /** Maximum */
            maximum: string | null;
            /** Ticks */
            ticks: components["schemas"]["BubbleTick"][];
            /** Zero Position */
            zero_position: number | null;
            /** Label Offset */
            label_offset?: string | null;
        };
        /** BubblePoint */
        BubblePoint: {
            /** Id */
            id: string;
            /** Key */
            key: string | number | boolean | null;
            /** Group Id */
            group_id: string | null;
            /** X */
            x: number | null;
            /** Y */
            y: number | null;
            /** Radius Ratio */
            radius_ratio: number | null;
            /**
             * State
             * @enum {string}
             */
            state: "visible" | "zero_size" | "missing";
        };
        /** BubblePresentation */
        BubblePresentation: {
            x_axis: components["schemas"]["BubbleAxis"];
            y_axis: components["schemas"]["BubbleAxis"];
            /** Size Maximum */
            size_maximum: string | null;
            /** Input Count */
            input_count: number;
            /** Missing Count */
            missing_count: number;
            /** Zero Size Count */
            zero_size_count: number;
            /** Visible Count */
            visible_count: number;
            /** Group Count */
            group_count: number;
            /** Points */
            points: components["schemas"]["BubblePoint"][];
        };
        /** BubbleSpec */
        BubbleSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default bubble_chart
             * @constant
             */
            type: "bubble_chart";
            /** Key Column Id */
            key_column_id: string;
            /** X Column Id */
            x_column_id: string;
            /** Y Column Id */
            y_column_id: string;
            /** Size Column Id */
            size_column_id: string;
            /** Label Column Id */
            label_column_id?: string | null;
            /** Group Column Id */
            group_column_id?: string | null;
            /**
             * Size Encoding
             * @default area
             * @constant
             */
            size_encoding: "area";
        };
        /** BubbleTick */
        BubbleTick: {
            /** Position */
            position: number;
            /** Label */
            label: string;
            /** Display Label */
            display_label?: string | null;
        };
        /** BulletBand */
        BulletBand: {
            /** Label */
            label: string;
            /** Upper */
            upper: string;
            /**
             * Tone
             * @default neutral
             * @enum {string}
             */
            tone: "neutral" | "negative" | "warning" | "positive";
        };
        /** BulletPoint */
        BulletPoint: {
            /** Id */
            id: string;
            /** Actual */
            actual: number | null;
            /** Target */
            target: number | null;
            /** Actual Band */
            actual_band: number | null;
            /** Actual Zero */
            actual_zero: boolean;
        };
        /** BulletPresentation */
        BulletPresentation: {
            /** Zero */
            zero: number;
            /** Ticks */
            ticks: components["schemas"]["BubbleTick"][];
            /** Band Ends */
            band_ends: number[];
            /** Input Count */
            input_count: number;
            /** Missing Actual Count */
            missing_actual_count: number;
            /** Missing Target Count */
            missing_target_count: number;
            /** Points */
            points: components["schemas"]["BulletPoint"][];
        };
        /** BulletSpec */
        BulletSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default bullet_chart
             * @constant
             */
            type: "bullet_chart";
            /** Category Column Id */
            category_column_id: string;
            /** Actual Column Id */
            actual_column_id: string;
            /** Target Column Id */
            target_column_id: string;
            /**
             * Minimum
             * @default 0
             */
            minimum: string;
            /** Maximum */
            maximum: string;
            /** Bands */
            bands: components["schemas"]["BulletBand"][];
        };
        /** CartesianSpec */
        CartesianSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @enum {string}
             */
            type: "bar_chart" | "line_chart" | "area_chart";
            /** X */
            x: string;
            /** Y */
            y: components["schemas"]["BasicSeries"][];
        };
        /** CellAppearance */
        CellAppearance: {
            /**
             * Font
             * @default Arial
             */
            font: string;
            /**
             * Size
             * @default 11
             */
            size: number;
            /**
             * Bold
             * @default false
             */
            bold: boolean;
            /**
             * Italic
             * @default false
             */
            italic: boolean;
            /** Color */
            color?: string | null;
            /** Background */
            background?: string | null;
            /**
             * Alignment
             * @default general
             */
            alignment: string;
            /**
             * Wrap
             * @default false
             */
            wrap: boolean;
            /**
             * Number Format
             * @default General
             */
            number_format: string;
            /** Borders */
            borders?: {
                [key: string]: components["schemas"]["CellBorder"];
            };
        };
        /** CellBorder */
        CellBorder: {
            /** Line */
            line: string;
            /** Color */
            color: string;
        };
        /** CellFormatPatch */
        CellFormatPatch: {
            /** Bold */
            bold?: boolean | null;
            /** Italic */
            italic?: boolean | null;
            /** Wrap */
            wrap?: boolean | null;
            /** Size */
            size?: number | null;
            /** Color */
            color?: string | null;
            /** Background */
            background?: string | null;
            /** Alignment */
            alignment?: ("general" | "left" | "center" | "right") | null;
        };
        /** CheckIssue */
        CheckIssue: {
            /**
             * Severity
             * @enum {string}
             */
            severity: "error" | "warning";
            /** Message */
            message: string;
            /** Node Id */
            node_id?: string | null;
            /** Workflow Id */
            workflow_id?: string | null;
            /** Count */
            count?: number | null;
            /** Examples */
            examples?: {
                [key: string]: unknown;
            }[];
        };
        /** CheckResult */
        CheckResult: {
            /** Token */
            token: string;
            /** Issues */
            issues?: components["schemas"]["CheckIssue"][];
            /** Profiles */
            profiles?: components["schemas"]["MappingProfile"][];
            /** Dataset Profiles */
            dataset_profiles?: components["schemas"]["DatasetMappingProfile"][];
            /** Affected Workflows */
            affected_workflows?: string[];
            /** Affected Visualizations */
            affected_visualizations?: string[];
            /** Metrics */
            metrics?: components["schemas"]["ControlValue"][];
            /** Affected Reports */
            affected_reports?: string[];
        };
        /** ColumnBinding */
        ColumnBinding: {
            /** Logical Id */
            logical_id: string;
            /** Physical Id */
            physical_id: string;
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
        /** ComboObservation */
        ComboObservation: {
            /** Id */
            id: string;
            /** Positions */
            positions: (number | null)[];
        };
        /** ComboPresentation */
        ComboPresentation: {
            primary: components["schemas"]["ComboScale"];
            secondary?: components["schemas"]["ComboScale"] | null;
            /** Observations */
            observations: components["schemas"]["ComboObservation"][];
        };
        /** ComboScale */
        ComboScale: {
            /** Minimum */
            minimum: string;
            /** Maximum */
            maximum: string;
            /** Lower */
            lower: number;
            /** Upper */
            upper: number;
            /** Ticks */
            ticks: components["schemas"]["ComboTick"][];
        };
        /** ComboSeries */
        ComboSeries: {
            /** Column Id */
            column_id: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "bar" | "line";
            /**
             * Axis
             * @default primary
             * @enum {string}
             */
            axis: "primary" | "secondary";
            /**
             * Name
             * @default
             */
            name: string;
        };
        /** ComboSpec */
        ComboSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default combo_chart
             * @constant
             */
            type: "combo_chart";
            /** Category Column Id */
            category_column_id: string;
            /**
             * Secondary Axis
             * @default false
             */
            secondary_axis: boolean;
            /** Series */
            series: components["schemas"]["ComboSeries"][];
        };
        /** ComboTick */
        ComboTick: {
            /** Position */
            position: number;
            /** Label */
            label: string;
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
        /** ConnectorDefinition */
        ConnectorDefinition: {
            /** Type */
            type: string;
            /**
             * Version
             * @default 1
             */
            version: number;
            /** Name */
            name: string;
            /**
             * Status
             * @default available
             * @enum {string}
             */
            status: "available" | "planned";
            /** Capabilities */
            capabilities: ("file" | "resources" | "batch_read" | "schema" | "http" | "odata")[];
            /** Extensions */
            extensions?: string[];
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
        /** ControlValue */
        ControlValue: {
            /** Workflow Id */
            workflow_id: string;
            /** Node Id */
            node_id: string;
            /** Port */
            port: string;
            /** Name */
            name: string;
            /** Value */
            value: number | null;
            /** Previous */
            previous?: number | null;
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
        /** DashboardLayoutRead */
        DashboardLayoutRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Is Default */
            is_default: boolean;
            /** Widgets */
            widgets: components["schemas"]["WidgetPayload"][];
        };
        /** DashboardLayoutSave */
        DashboardLayoutSave: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Name */
            name: string;
            dashboard: components["schemas"]["DashboardSave"];
        };
        /** DashboardLayoutSaved */
        DashboardLayoutSaved: {
            dashboard: components["schemas"]["DashboardRead"];
            template: components["schemas"]["DashboardLayoutRead"];
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
            logical_type: "string" | "integer" | "float" | "decimal" | "boolean" | "date" | "datetime";
            /** Default */
            default?: string | number | boolean | null;
            /** Precision */
            precision?: number | null;
            /** Scale */
            scale?: number | null;
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
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart" | "box_plot" | "histogram_chart" | "heatmap_chart" | "radar_chart" | "waterfall_chart" | "combo_chart" | "bubble_chart" | "pareto_chart" | "treemap_chart" | "sunburst_chart" | "bullet_chart" | "funnel_chart" | "analytical_table";
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
            /** Periods */
            periods?: string[];
            /** Logical Sheets */
            logical_sheets?: string[];
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
        /** DatasetBinding */
        DatasetBinding: {
            /** Resource Id */
            resource_id: string;
            /** Target Resource Id */
            target_resource_id: string;
            options?: components["schemas"]["ReadOptions"] | null;
            /** Columns */
            columns?: components["schemas"]["ColumnBinding"][];
        };
        /** DatasetMappingProfile */
        DatasetMappingProfile: {
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /**
             * Version Id
             * Format: uuid
             */
            version_id: string;
            /** Resource Id */
            resource_id: string;
            /** Target Resource Id */
            target_resource_id: string;
            /** Name */
            name: string;
            options: components["schemas"]["ReadOptions"];
            /** Old Columns */
            old_columns: components["schemas"]["ResolvedColumnRead"][];
            /** New Columns */
            new_columns: components["schemas"]["ResolvedColumnRead"][];
            /** Suggestions */
            suggestions: components["schemas"]["ColumnBinding"][];
            /** Old Rows */
            old_rows: number;
            /** New Rows */
            new_rows: number;
            /** New Examples */
            new_examples?: {
                [key: string]: unknown;
            }[];
        };
        /** DatasetSnapshotRead */
        DatasetSnapshotRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /**
             * Source Version Id
             * Format: uuid
             */
            source_version_id: string;
            /** Resource Id */
            resource_id: string;
            /** Row Count */
            row_count: number;
            profile: components["schemas"]["ImportProfile"];
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
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
        /** EditorAction */
        EditorAction: {
            /** Expected Revision */
            expected_revision: number;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
        };
        /** EditorCell */
        EditorCell: {
            /** Row Id */
            row_id: string;
            /** Column */
            column: number;
            /** Value */
            value: string;
            /**
             * Formula
             * @default false
             */
            formula: boolean;
            /**
             * Override Protection
             * @default false
             */
            override_protection: boolean;
        };
        /** EditorColumn */
        EditorColumn: {
            /** Index */
            index: number;
            /** Name */
            name: string;
            /** Description */
            description: string;
            /** Date Format */
            date_format?: string | null;
            /** Decimal Separator */
            decimal_separator?: string | null;
        };
        /** EditorFormatCell */
        EditorFormatCell: {
            /** Row Id */
            row_id: string;
            /** Column */
            column: number;
            patch: components["schemas"]["CellFormatPatch"];
            /**
             * Override Protection
             * @default false
             */
            override_protection: boolean;
        };
        /** EditorMatch */
        EditorMatch: {
            /** Row */
            row: number;
            /** Column */
            column: number;
        };
        /** EditorPage */
        EditorPage: {
            /** Revision */
            revision: number;
            /** Resource Id */
            resource_id: string;
            /** Resources */
            resources: string[];
            /** Columns */
            columns: components["schemas"]["EditorColumn"][];
            /** Rows */
            rows: components["schemas"]["EditorRow"][];
            /** Total Rows */
            total_rows: number;
            /** Offset */
            offset: number;
            /** Limit */
            limit: number;
            /** Pending */
            pending: boolean;
            /**
             * Workbook
             * @default false
             */
            workbook: boolean;
            /**
             * Can Change Rows
             * @default true
             */
            can_change_rows: boolean;
            /**
             * External Cached Values
             * @default false
             */
            external_cached_values: boolean;
            /**
             * Precision As Displayed
             * @default false
             */
            precision_as_displayed: boolean;
            /** Date 1904 */
            date_1904?: boolean | null;
            /**
             * Can Format
             * @default false
             */
            can_format: boolean;
        };
        /** EditorRow */
        EditorRow: {
            /** Id */
            id: string;
            /** Values */
            values: string[];
            /** Readonly */
            readonly?: number[];
            /** Formulas */
            formulas?: {
                [key: string]: string;
            };
            /** Style Ids */
            style_ids?: {
                [key: string]: number;
            };
            /** Editable In Workbook Mode */
            editable_in_workbook_mode?: number[];
            /** Pending Formulas */
            pending_formulas?: number[];
            /** Number Values */
            number_values?: {
                [key: string]: string;
            };
            /** Formats */
            formats?: {
                [key: string]: components["schemas"]["CellFormatPatch"];
            };
            /** Format Readonly */
            format_readonly?: number[];
        };
        /** EditorSave */
        EditorSave: {
            /** Expected Revision */
            expected_revision: number;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Resource Id */
            resource_id: string;
            /** Cells */
            cells?: components["schemas"]["EditorCell"][];
            /** Formats */
            formats?: components["schemas"]["EditorFormatCell"][];
            /** Append Rows */
            append_rows?: string[];
            /** Delete Rows */
            delete_rows?: string[];
            /** Restore Rows */
            restore_rows?: string[];
        };
        /** EditorSearch */
        EditorSearch: {
            /** Cells */
            cells: components["schemas"]["EditorMatch"][];
        };
        /** EditorWorkspace */
        EditorWorkspace: {
            page: components["schemas"]["EditorPage"];
            /** Sheets */
            sheets: components["schemas"]["SheetAppearance"][];
            /** Styles */
            styles?: components["schemas"]["CellAppearance"][];
        };
        /** FileExchangeRead */
        FileExchangeRead: {
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /** Source Name */
            source_name: string;
            /**
             * Connector
             * @enum {string}
             */
            connector: "excel" | "csv";
            /** Filename */
            filename: string;
            /** Base Token */
            base_token: string;
            /** Template Available */
            template_available: boolean;
            /** Template Reason */
            template_reason?: string | null;
        };
        /** FileExchangeStart */
        FileExchangeStart: {
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Reuse Existing
             * @default false
             */
            reuse_existing: boolean;
        };
        /** FilterCondition */
        FilterCondition: {
            /** Column Id */
            column_id: string;
            operator: components["schemas"]["FilterOperator"];
            /** Value */
            value?: unknown;
            /** Parameter */
            parameter?: string | null;
        };
        /**
         * FilterOperator
         * @enum {string}
         */
        FilterOperator: "equals" | "not_equals" | "greater_than" | "greater_or_equal" | "less_than" | "less_or_equal" | "contains" | "does_not_contain" | "starts_with" | "ends_with" | "is_null" | "is_not_null";
        /** FunnelPoint */
        FunnelPoint: {
            /** Id */
            id: string;
            /** Width */
            width: number;
            /** Zero */
            zero: boolean;
        };
        /** FunnelPresentation */
        FunnelPresentation: {
            /** Points */
            points: components["schemas"]["FunnelPoint"][];
        };
        /** FunnelReportSettings */
        FunnelReportSettings: {
            /** Stage Column Id */
            stage_column_id: string;
            /** Order Column Id */
            order_column_id: string;
            /** Value Column Id */
            value_column_id: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "funnel_steps";
        };
        /** FunnelRoles */
        FunnelRoles: {
            /** Point Id */
            point_id: string;
            /** Stage */
            stage: string;
            /** Order */
            order: string;
            /** Value */
            value: string;
            /** Previous Percent */
            previous_percent: string;
            /** Initial Percent */
            initial_percent: string;
            /** Loss */
            loss: string;
            /** Previous Exact */
            previous_exact: string;
            /** Initial Exact */
            initial_exact: string;
        };
        /** FunnelSpec */
        FunnelSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default funnel_chart
             * @constant
             */
            type: "funnel_chart";
            rows: components["schemas"]["FunnelRoles"];
            summary: components["schemas"]["FunnelSummaryRoles"];
        };
        /** FunnelSummaryRoles */
        FunnelSummaryRoles: {
            /** Stage Count */
            stage_count: string;
            /** Initial Value */
            initial_value: string;
            /** Final Value */
            final_value: string;
            /** Overall Percent */
            overall_percent: string;
            /** Overall Exact */
            overall_exact: string;
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
        /** HeatmapColorScale */
        HeatmapColorScale: {
            /**
             * Mode
             * @default extent
             * @enum {string}
             */
            mode: "extent" | "zero_centered" | "fixed";
            /** Minimum */
            minimum?: string | null;
            /** Maximum */
            maximum?: string | null;
        };
        /** HeatmapReportSettings */
        HeatmapReportSettings: {
            /** X Column Id */
            x_column_id: string;
            /** Y Column Id */
            y_column_id: string;
            /** Value Column Id */
            value_column_id: string;
            /**
             * Aggregation
             * @enum {string}
             */
            aggregation: "sum" | "average" | "min" | "max" | "count";
            /**
             * Average Scale
             * @default 6
             */
            average_scale: number;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "heatmap_stats";
        };
        /** HeatmapRoles */
        HeatmapRoles: {
            /** Cell Id */
            cell_id: string;
            /** X Id */
            x_id: string;
            /** Y Id */
            y_id: string;
            /** X */
            x: string;
            /** Y */
            y: string;
            /** Value */
            value: string;
            /** Present */
            present: string;
            /** Row Count */
            row_count: string;
            /** Valid Count */
            valid_count: string;
            /** Missing Count */
            missing_count: string;
        };
        /** HeatmapScaleResult */
        HeatmapScaleResult: {
            /**
             * Mode
             * @enum {string}
             */
            mode: "extent" | "zero_centered" | "fixed";
            /** Minimum */
            minimum: string | null;
            /** Maximum */
            maximum: string | null;
            /** Positions */
            positions: {
                [key: string]: number | null;
            };
            /**
             * Below Count
             * @default 0
             */
            below_count: number;
            /**
             * Above Count
             * @default 0
             */
            above_count: number;
        };
        /** HeatmapSpec */
        HeatmapSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default heatmap_chart
             * @constant
             */
            type: "heatmap_chart";
            cells: components["schemas"]["HeatmapRoles"];
            color_scale?: components["schemas"]["HeatmapColorScale"];
        };
        /** HierarchyPoint */
        HierarchyPoint: {
            /** Id */
            id: string;
            /** Parent Id */
            parent_id: string | null;
            /** Depth */
            depth: number;
            /** Weight */
            weight: number;
            /** Share Exact */
            share_exact: string | null;
        };
        /** HierarchyPresentation */
        HierarchyPresentation: {
            /** Root Id */
            root_id: string;
            /** Total */
            total: string | null;
            /** Zero Count */
            zero_count: number;
            /** Points */
            points: components["schemas"]["HierarchyPoint"][];
        };
        /** HierarchyReportSettings */
        HierarchyReportSettings: {
            /** Dimensions */
            dimensions?: string[];
            /** Measures */
            measures: components["schemas"]["RollupMeasure"][];
            /**
             * Subtotals
             * @default true
             */
            subtotals: boolean;
            /**
             * Grand Total
             * @default true
             */
            grand_total: boolean;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "sunburst_chart" | "treemap_chart";
        };
        /** HierarchySpec */
        HierarchySpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @enum {string}
             */
            type: "treemap_chart" | "sunburst_chart";
            rows: components["schemas"]["AnalyticalRowRoles"];
            /** Dimensions */
            dimensions: string[];
            /** Value Column Id */
            value_column_id: string;
        };
        /** HistogramReportSettings */
        HistogramReportSettings: {
            /** Value Column Id */
            value_column_id: string;
            /**
             * Bin Count
             * @default 20
             */
            bin_count: number;
            /** Range Min */
            range_min?: string | null;
            /** Range Max */
            range_max?: string | null;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "histogram";
        };
        /** HistogramRoles */
        HistogramRoles: {
            /** Bin Id */
            bin_id: string;
            /** Bin Index */
            bin_index: string;
            /** Lower */
            lower: string;
            /** Upper */
            upper: string;
            /** Upper Inclusive */
            upper_inclusive: string;
            /** Interval */
            interval: string;
            /** Count */
            count: string;
        };
        /** HistogramSpec */
        HistogramSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default histogram_chart
             * @constant
             */
            type: "histogram_chart";
            bins: components["schemas"]["HistogramRoles"];
            summary: components["schemas"]["HistogramSummaryRoles"];
        };
        /** HistogramSummaryRoles */
        HistogramSummaryRoles: {
            /** Input Count */
            input_count: string;
            /** Valid Count */
            valid_count: string;
            /** Missing Count */
            missing_count: string;
            /** Included Count */
            included_count: string;
            /** Below Count */
            below_count: string;
            /** Above Count */
            above_count: string;
            /** Bin Count */
            bin_count: string;
            /** Range Min */
            range_min: string;
            /** Range Max */
            range_max: string;
        };
        /** ImportDraftRead */
        ImportDraftRead: {
            /** Source Revision */
            source_revision: number;
            /** Resource Id */
            resource_id: string;
            options?: components["schemas"]["ReadOptions"];
            profile?: components["schemas"]["ImportProfile"] | null;
            /** Revision */
            revision: number;
            /**
             * Status
             * @default draft
             * @enum {string}
             */
            status: "draft" | "applied";
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Snapshot Id */
            snapshot_id?: string | null;
        };
        /** ImportField */
        ImportField: {
            /** Field Id */
            field_id: string;
            /** Source Field */
            source_field: string;
            /** Name */
            name: string;
            logical_type: components["schemas"]["LogicalType"];
            /**
             * Nullable
             * @default true
             */
            nullable: boolean;
            /** Unit */
            unit?: string | null;
            /** Currency */
            currency?: string | null;
            /**
             * Precision
             * @default 38
             */
            precision: number;
            /**
             * Scale
             * @default 2
             */
            scale: number;
            /** Timezone */
            timezone?: string | null;
            /**
             * Error Policy
             * @default reject
             * @enum {string}
             */
            error_policy: "reject" | "null";
            /**
             * Decimal Separator
             * @default .
             * @enum {string}
             */
            decimal_separator: "." | ",";
            /**
             * Date Format
             * @default iso
             * @enum {string}
             */
            date_format: "iso" | "%d.%m.%Y" | "%d/%m/%Y" | "%m/%d/%Y";
        };
        /** ImportIssue */
        ImportIssue: {
            /** Code */
            code: string;
            /** Field Id */
            field_id?: string | null;
            /** Row */
            row?: number | null;
            /** Message */
            message: string;
            /**
             * Severity
             * @default error
             * @enum {string}
             */
            severity: "error" | "warning";
        };
        /** ImportPreview */
        ImportPreview: {
            profile: components["schemas"]["ImportProfile"];
            /** Columns */
            columns: {
                [key: string]: unknown;
            }[];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
            /** Total Rows */
            total_rows: number;
            /** Returned Rows */
            returned_rows: number;
            /** Checked Rows */
            checked_rows: number;
            /** Issue Count */
            issue_count: number;
            /** Issues */
            issues: components["schemas"]["ImportIssue"][];
            /** Can Apply */
            can_apply: boolean;
        };
        /** ImportProfile */
        ImportProfile: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /** Resource Id */
            resource_id: string;
            /** Name */
            name: string;
            /**
             * Grain
             * @default
             */
            grain: string;
            options?: components["schemas"]["ReadOptions"];
            /** Fields */
            fields: components["schemas"]["ImportField"][];
            /** Key Fields */
            key_fields?: string[];
        };
        /** ImportSessionRead */
        ImportSessionRead: {
            source: components["schemas"]["ImportedSourceRead"];
            draft: components["schemas"]["ImportDraftRead"];
        };
        /** ImportedSourceRead */
        ImportedSourceRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Connector */
            connector: string;
            /** Resources */
            resources: components["schemas"]["SourceResource"][];
            /** Active Snapshots */
            active_snapshots: {
                [key: string]: string;
            };
            /** Revision */
            revision: number;
            /**
             * Has Draft
             * @default false
             */
            has_draft: boolean;
            read_options?: components["schemas"]["ReadOptions"];
        };
        /** IndependentVisualizationPreview */
        IndependentVisualizationPreview: {
            /** Request Id */
            request_id?: string | null;
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
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart" | "box_plot" | "histogram_chart" | "heatmap_chart" | "radar_chart" | "waterfall_chart" | "combo_chart" | "bubble_chart" | "pareto_chart" | "treemap_chart" | "sunburst_chart" | "bullet_chart" | "funnel_chart" | "analytical_table";
            config: components["schemas"]["VisualizationConfig"] | components["schemas"]["BasicVisualizationInput"];
            context?: components["schemas"]["ViewContext"];
            /** Parameters */
            parameters?: {
                [key: string]: string | number | boolean | null;
            };
        };
        /** IndependentVisualizationSave */
        IndependentVisualizationSave: {
            /** Request Id */
            request_id?: string | null;
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
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart" | "box_plot" | "histogram_chart" | "heatmap_chart" | "radar_chart" | "waterfall_chart" | "combo_chart" | "bubble_chart" | "pareto_chart" | "treemap_chart" | "sunburst_chart" | "bullet_chart" | "funnel_chart" | "analytical_table";
            config: components["schemas"]["VisualizationConfig"] | components["schemas"]["BasicVisualizationInput"];
        };
        /** InspectResourceRequest */
        InspectResourceRequest: {
            /** Resource Id */
            resource_id: string;
            options?: components["schemas"]["ReadOptions"];
        };
        /** JobRead */
        JobRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Revision */
            revision: number;
            /** Status */
            status: string;
            /** Progress */
            progress: number;
            /** Message */
            message: string;
            /** Result Id */
            result_id?: string | null;
            check?: components["schemas"]["CheckResult"] | null;
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
        /** JoinKey */
        JoinKey: {
            /** Left Key */
            left_key: string;
            /** Right Key */
            right_key: string;
        };
        /** KpiInputSpec */
        KpiInputSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default kpi
             * @constant
             */
            type: "kpi";
            /** Value */
            value?: string | null;
        };
        /** KpiSpec */
        KpiSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default kpi
             * @constant
             */
            type: "kpi";
            /** Value */
            value: string;
        };
        /** LineageRead */
        LineageRead: {
            workflow: components["schemas"]["WorkflowRead"];
            /**
             * Target Node Id
             * Format: uuid
             */
            target_node_id: string;
            /** Sources */
            sources: components["schemas"]["LineageSource"][];
        };
        /** LineageSource */
        LineageSource: {
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /** Name */
            name: string;
            /** Files */
            files: string[];
            /** Periods */
            periods: string[];
        };
        /**
         * LogicalType
         * @enum {string}
         */
        LogicalType: "string" | "integer" | "float" | "decimal" | "boolean" | "date" | "datetime" | "unknown";
        /** MappingProfile */
        MappingProfile: {
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /** Sheet Name */
            sheet_name: string;
            /** Target Sheet */
            target_sheet: string;
            layout: components["schemas"]["WorksheetLayout"];
            /** Old Columns */
            old_columns: components["schemas"]["ResolvedColumnRead"][];
            /** New Columns */
            new_columns: components["schemas"]["ResolvedColumnRead"][];
            /** Suggestions */
            suggestions: components["schemas"]["ColumnBinding"][];
            /** Old Rows */
            old_rows: number;
            /** New Rows */
            new_rows: number;
            /** Old Examples */
            old_examples?: {
                [key: string]: unknown;
            }[];
            /** New Examples */
            new_examples?: {
                [key: string]: unknown;
            }[];
        };
        /** MeasureDefinition */
        MeasureDefinition: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /**
             * Description
             * @default
             */
            description: string;
            /** Column Id */
            column_id: string;
            /** Grain Column Ids */
            grain_column_ids?: string[];
        };
        /** MeasureEntry */
        MeasureEntry: {
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
            /** Workflow Name */
            workflow_name: string;
            /** Publication Name */
            publication_name: string;
            definition: components["schemas"]["MeasureDefinition"];
        };
        /** MeasureList */
        MeasureList: {
            /** Items */
            items: components["schemas"]["MeasureEntry"][];
            /** Expected Token */
            expected_token: string;
        };
        /** MeasureReportRequest */
        MeasureReportRequest: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
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
            /**
             * Measure Id
             * Format: uuid
             */
            measure_id: string;
            /** Additional Measure Ids */
            additional_measure_ids?: string[];
            /** Expected Token */
            expected_token: string;
            /** Name */
            name: string;
            /**
             * Presentation
             * @default table
             * @enum {string}
             */
            presentation: "table" | "kpi" | "bar_chart" | "line_chart";
        };
        /** MeasureSave */
        MeasureSave: {
            /** Expected Token */
            expected_token: string;
            definition: components["schemas"]["MeasureDefinition"];
        };
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
            /** Diagnostic */
            diagnostic?: ("left_unmatched" | "right_unmatched" | "left_duplicates" | "right_duplicates") | null;
            /**
             * Offset
             * @default 0
             */
            offset: number;
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
            logical_type: "string" | "integer" | "float" | "decimal" | "boolean" | "date" | "datetime";
            /** Default */
            default?: string | number | boolean | null;
            /** Precision */
            precision?: number | null;
            /** Scale */
            scale?: number | null;
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
        /** ParetoReportSettings */
        ParetoReportSettings: {
            /** Category Column Id */
            category_column_id: string;
            /** Value Column Id */
            value_column_id: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "pareto";
        };
        /** ParetoRoles */
        ParetoRoles: {
            /** Point Id */
            point_id: string;
            /** Rank */
            rank: string;
            /** Category */
            category: string;
            /** Value */
            value: string;
            /** Cumulative Value */
            cumulative_value: string;
            /** Share Percent */
            share_percent: string;
            /** Cumulative Percent */
            cumulative_percent: string;
            /** Share Exact */
            share_exact: string;
            /** Cumulative Exact */
            cumulative_exact: string;
        };
        /** ParetoSpec */
        ParetoSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default pareto_chart
             * @constant
             */
            type: "pareto_chart";
            rows: components["schemas"]["ParetoRoles"];
            summary: components["schemas"]["ParetoSummaryRoles"];
            /**
             * Threshold Percent
             * @default 80
             */
            threshold_percent: number;
        };
        /** ParetoSummaryRoles */
        ParetoSummaryRoles: {
            /** Input Count */
            input_count: string;
            /** Zero Count */
            zero_count: string;
            /** Total Value */
            total_value: string;
        };
        /** PartToWholeSpec */
        PartToWholeSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @enum {string}
             */
            type: "pie_chart" | "donut_chart";
            /** Category */
            category: string;
            /** Value */
            value: string;
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
            alignment_diagnostics?: components["schemas"]["AlignmentDiagnostics"] | null;
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
            /** Diagnostic */
            diagnostic?: ("left_unmatched" | "right_unmatched" | "left_duplicates" | "right_duplicates") | null;
            /**
             * Offset
             * @default 0
             */
            offset: number;
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
            /** Suggested Specs */
            suggested_specs?: (components["schemas"]["BubbleSpec"] | components["schemas"]["BoxPlotSpec"] | components["schemas"]["HistogramSpec"] | components["schemas"]["HeatmapSpec"] | components["schemas"]["RadarSpec"] | components["schemas"]["WaterfallSpec"] | components["schemas"]["ComboSpec"] | components["schemas"]["AnalyticalTableSpec"] | components["schemas"]["ParetoSpec"] | components["schemas"]["HierarchySpec"] | components["schemas"]["BulletSpec"] | components["schemas"]["FunnelSpec"])[];
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
            /** Measures */
            measures?: components["schemas"]["MeasureDefinition"][];
        };
        /** PublishedReportInput */
        PublishedReportInput: {
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
            /** Expected Token */
            expected_token: string;
        };
        /** QualityRule */
        QualityRule: {
            /**
             * Id
             * Format: uuid
             */
            id?: string;
            /** Name */
            name: string;
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
            /**
             * Port
             * @default dataset
             */
            port: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "required" | "unique" | "compare" | "change";
            /** Columns */
            columns?: string[];
            /** Other Node Id */
            other_node_id?: string | null;
            /**
             * Other Port
             * @default value
             */
            other_port: string;
            /**
             * Tolerance
             * @default 0
             */
            tolerance: number;
            /**
             * Severity
             * @default error
             * @enum {string}
             */
            severity: "error" | "warning";
        };
        /** RadarAxis */
        RadarAxis: {
            /** Column Id */
            column_id: string;
            /** Minimum */
            minimum: string;
            /** Maximum */
            maximum: string;
        };
        /** RadarPresentation */
        RadarPresentation: {
            /** Profiles */
            profiles: components["schemas"]["RadarProfileResult"][];
            /** Incomplete Count */
            incomplete_count: number;
        };
        /** RadarProfileResult */
        RadarProfileResult: {
            /** Id */
            id: string;
            /** Category */
            category: string | number | boolean | null;
            /** Positions */
            positions: (number | null)[];
            /** Complete */
            complete: boolean;
        };
        /** RadarSpec */
        RadarSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default radar_chart
             * @constant
             */
            type: "radar_chart";
            /** Profile Column Id */
            profile_column_id: string;
            /**
             * Normalization
             * @enum {string}
             */
            normalization: "shared" | "min_max";
            /** Axes */
            axes: components["schemas"]["RadarAxis"][];
        };
        /** ReadOptions */
        ReadOptions: {
            /**
             * Encoding
             * @default utf-8-sig
             * @enum {string}
             */
            encoding: "utf-8-sig" | "cp1251" | "utf-16";
            /**
             * Delimiter
             * @default ,
             * @enum {string}
             */
            delimiter: "," | ";" | "\t" | "|";
            /**
             * Header Row
             * @default 1
             */
            header_row: number;
            /**
             * Header Rows
             * @default 1
             */
            header_rows: number;
            /**
             * Skip Data Rows
             * @default 0
             */
            skip_data_rows: number;
            /**
             * Drop Tail Rows
             * @default 0
             */
            drop_tail_rows: number;
            /** Cell Range */
            cell_range?: string | null;
        };
        /** ReadinessResponse */
        ReadinessResponse: {
            /**
             * Status
             * @constant
             */
            status: "ready";
        };
        /** ReleaseRead */
        ReleaseRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Name */
            name: string;
            /** Period */
            period: string;
            /** Comment */
            comment: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Dashboard Ids */
            dashboard_ids: string[];
        };
        /** ReleaseRequest */
        ReleaseRequest: {
            /** Name */
            name: string;
            /** Period */
            period: string;
            /**
             * Comment
             * @default
             */
            comment: string;
            /** Dashboard Ids */
            dashboard_ids: string[];
            context?: components["schemas"]["ViewContext"];
            /** Dashboard Contexts */
            dashboard_contexts?: {
                [key: string]: components["schemas"]["ViewContext"];
            };
            /**
             * Acknowledge Warnings
             * @default false
             */
            acknowledge_warnings: boolean;
            /** Expected Token */
            expected_token: string;
        };
        /** ReportBuildPreview */
        ReportBuildPreview: {
            graph: components["schemas"]["WorkflowSave"];
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
            /** Total Rows */
            total_rows: number;
            /** Steps */
            steps: string[];
            visualization?: components["schemas"]["VisualizationResult"] | null;
        };
        /** ReportBuildRequest */
        ReportBuildRequest: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Source Id */
            source_id?: string | null;
            /** Resource Id */
            resource_id?: string | null;
            /** Expected Snapshot Id */
            expected_snapshot_id?: string | null;
            published_input?: components["schemas"]["PublishedReportInput"] | null;
            /** Name */
            name: string;
            /** Dimensions */
            dimensions?: string[];
            /** Measures */
            measures: components["schemas"]["ReportMeasure"][];
            /** Row Formulas */
            row_formulas?: components["schemas"]["ReportFormula"][];
            /** Summary Formulas */
            summary_formulas?: components["schemas"]["ReportFormula"][];
            /** Value Field Id */
            value_field_id?: string | null;
            /** Filters */
            filters?: components["schemas"]["FilterCondition"][];
            /**
             * Presentation
             * @default table
             * @enum {string}
             */
            presentation: "table" | "bar_chart" | "line_chart" | "kpi" | "combo_chart" | "radar_chart";
            combo?: components["schemas"]["ComboSpec"] | null;
            radar?: components["schemas"]["RadarSpec"] | null;
            /**
             * Decimal Average Scale
             * @default 6
             */
            decimal_average_scale: number;
            comparison?: components["schemas"]["ReportComparison"] | null;
        };
        /** ReportBuildResult */
        ReportBuildResult: {
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
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /**
             * Dashboard Id
             * Format: uuid
             */
            dashboard_id: string;
        };
        /** ReportComparison */
        ReportComparison: {
            /** Date Column Id */
            date_column_id: string;
            /**
             * Unit
             * @default month
             * @enum {string}
             */
            unit: "month" | "quarter" | "year";
            /** Value Column Id */
            value_column_id: string;
            /**
             * Compare To
             * @default previous_period
             * @enum {string}
             */
            compare_to: "previous_period" | "previous_year";
            /**
             * Name
             * @default Comparison
             */
            name: string;
            /**
             * Ratio Scale
             * @default 6
             */
            ratio_scale: number;
        };
        /** ReportEditRead */
        ReportEditRead: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /** Name */
            name: string;
            /** Expected Token */
            expected_token: string;
            /** Editable */
            editable: boolean;
            /** Reason */
            reason?: string | null;
            settings?: components["schemas"]["ReportEditSettings"] | null;
            /** Columns */
            columns?: components["schemas"]["ResolvedColumnRead"][];
            /** Steps */
            steps?: components["schemas"]["ReportStep"][];
            /**
             * Widget Count
             * @default 0
             */
            widget_count: number;
            /**
             * Analytical Editor
             * @default false
             */
            analytical_editor: boolean;
            /**
             * Alignment Editor
             * @default false
             */
            alignment_editor: boolean;
        };
        /** ReportEditRequest */
        ReportEditRequest: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Expected Token */
            expected_token: string;
            settings: components["schemas"]["ReportEditSettings"];
            /**
             * Acknowledge Shared
             * @default false
             */
            acknowledge_shared: boolean;
        };
        /** ReportEditResult */
        ReportEditResult: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /** Workflow Revision */
            workflow_revision: number;
            /** Visualization Revision */
            visualization_revision: number;
            /** Dashboard Id */
            dashboard_id?: string | null;
        };
        /** ReportEditSettings */
        ReportEditSettings: {
            /** Name */
            name: string;
            /** Dimensions */
            dimensions?: string[];
            /** Measures */
            measures: components["schemas"]["ReportMeasure"][];
            /** Row Formulas */
            row_formulas?: components["schemas"]["ReportFormula"][];
            /** Summary Formulas */
            summary_formulas?: components["schemas"]["ReportFormula"][];
            /** Value Field Id */
            value_field_id?: string | null;
            /** Filters */
            filters?: components["schemas"]["FilterCondition"][];
            /**
             * Presentation
             * @default table
             * @enum {string}
             */
            presentation: "table" | "bar_chart" | "line_chart" | "kpi" | "combo_chart" | "radar_chart";
            combo?: components["schemas"]["ComboSpec"] | null;
            radar?: components["schemas"]["RadarSpec"] | null;
            /**
             * Decimal Average Scale
             * @default 6
             */
            decimal_average_scale: number;
            comparison?: components["schemas"]["ReportComparison"] | null;
            /**
             * Rebind Fields
             * @default false
             */
            rebind_fields: boolean;
        };
        /** ReportFormula */
        ReportFormula: {
            /** Name */
            name: string;
            /** Expression */
            expression: string;
            /**
             * Precision
             * @default 38
             */
            precision: number;
            /**
             * Scale
             * @default 2
             */
            scale: number;
            /**
             * Rounding
             * @default half_even
             * @constant
             */
            rounding: "half_even";
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
        };
        /** ReportFormulaFields */
        ReportFormulaFields: {
            /** Row Columns */
            row_columns: components["schemas"]["ResolvedColumnRead"][];
            /** Measure Columns */
            measure_columns: components["schemas"]["ResolvedColumnRead"][];
            /** Row Outputs */
            row_outputs?: {
                [key: string]: components["schemas"]["ResolvedColumnRead"][];
            };
            /** Summary Outputs */
            summary_outputs?: {
                [key: string]: components["schemas"]["ResolvedColumnRead"][];
            };
        };
        /** ReportInputChoice */
        ReportInputChoice: {
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
            /** Workflow Name */
            workflow_name: string;
            /** Name */
            name: string;
            /** Available */
            available: boolean;
            /** Reason */
            reason?: string | null;
        };
        /** ReportInputList */
        ReportInputList: {
            /** Items */
            items: components["schemas"]["ReportInputChoice"][];
        };
        /** ReportInputRead */
        ReportInputRead: {
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
            /** Workflow Name */
            workflow_name: string;
            /** Name */
            name: string;
            /** Available */
            available: boolean;
            /** Reason */
            reason?: string | null;
            /** Expected Token */
            expected_token: string;
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Uses Parameters */
            uses_parameters: boolean;
        };
        /** ReportMeasure */
        ReportMeasure: {
            /** Column Id */
            column_id?: string | null;
            /**
             * Operation
             * @enum {string}
             */
            operation: "count" | "sum" | "average" | "min" | "max" | "distinct_count";
            /** Name */
            name: string;
            /** Output Id */
            output_id?: string | null;
        };
        /** ReportSettings */
        ReportSettings: {
            /** Name */
            name: string;
            /** Dimensions */
            dimensions?: string[];
            /** Measures */
            measures: components["schemas"]["ReportMeasure"][];
            /** Row Formulas */
            row_formulas?: components["schemas"]["ReportFormula"][];
            /** Summary Formulas */
            summary_formulas?: components["schemas"]["ReportFormula"][];
            /** Value Field Id */
            value_field_id?: string | null;
            /** Filters */
            filters?: components["schemas"]["FilterCondition"][];
            /**
             * Presentation
             * @default table
             * @enum {string}
             */
            presentation: "table" | "bar_chart" | "line_chart" | "kpi" | "combo_chart" | "radar_chart";
            combo?: components["schemas"]["ComboSpec"] | null;
            radar?: components["schemas"]["RadarSpec"] | null;
            /**
             * Decimal Average Scale
             * @default 6
             */
            decimal_average_scale: number;
            comparison?: components["schemas"]["ReportComparison"] | null;
        };
        /** ReportState */
        ReportState: {
            /** Token */
            token: string;
            /** Restored Views */
            restored_views?: components["schemas"]["RestoredView"][];
            /** Last Update Name */
            last_update_name?: string | null;
            /** Last Update At */
            last_update_at?: string | null;
            /**
             * Pending Updates
             * @default 0
             */
            pending_updates: number;
            /**
             * Check Status
             * @default missing
             * @enum {string}
             */
            check_status: "missing" | "outdated" | "error" | "warning" | "passed";
        };
        /** ReportStep */
        ReportStep: {
            /**
             * Node Id
             * Format: uuid
             */
            node_id: string;
            /** Type */
            type: string;
            /**
             * Editable
             * @default false
             */
            editable: boolean;
        };
        /** ReportTemplateList */
        ReportTemplateList: {
            /** Items */
            items: components["schemas"]["ReportTemplateRead"][];
        };
        /** ReportTemplateRead */
        ReportTemplateRead: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /** Name */
            name: string;
            /** Input Grain */
            input_grain: string;
            /** Fields */
            fields: components["schemas"]["TemplateField"][];
            settings: components["schemas"]["ReportSettings"];
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Revision
             * @default 1
             */
            revision: number;
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
        /** RestoreRequest */
        RestoreRequest: {
            /** Name */
            name: string;
        };
        /** RestoredView */
        RestoredView: {
            /**
             * Dashboard Id
             * Format: uuid
             */
            dashboard_id: string;
            /** Name */
            name: string;
            context: components["schemas"]["ViewContext"];
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
        /** RevisionRequest */
        RevisionRequest: {
            /** Expected Revision */
            expected_revision: number;
        };
        /** RollupMeasure */
        RollupMeasure: {
            /**
             * Output Id
             * Format: uuid
             */
            output_id: string;
            /** Name */
            name: string;
            /**
             * Operation
             * @enum {string}
             */
            operation: "sum" | "average" | "min" | "max" | "count" | "count_rows" | "ratio_of_sums";
            /** Column Id */
            column_id?: string | null;
            /** Denominator Column Id */
            denominator_column_id?: string | null;
            /**
             * Scale
             * @default 6
             */
            scale: number;
        };
        /** RollupReportSettings */
        RollupReportSettings: {
            /** Dimensions */
            dimensions?: string[];
            /** Measures */
            measures: components["schemas"]["RollupMeasure"][];
            /**
             * Subtotals
             * @default true
             */
            subtotals: boolean;
            /**
             * Grand Total
             * @default true
             */
            grand_total: boolean;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "table_rollup";
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
        /** RulesRead */
        RulesRead: {
            /** Revision */
            revision: number;
            /** Rules */
            rules: components["schemas"]["QualityRule"][];
        };
        /** RulesSave */
        RulesSave: {
            /** Expected Revision */
            expected_revision: number;
            /** Rules */
            rules?: components["schemas"]["QualityRule"][];
        };
        /** SaveImportDraft */
        SaveImportDraft: {
            /** Source Revision */
            source_revision: number;
            /** Resource Id */
            resource_id: string;
            options?: components["schemas"]["ReadOptions"];
            profile?: components["schemas"]["ImportProfile"] | null;
            /** Expected Revision */
            expected_revision: number;
        };
        /** ScatterSpec */
        ScatterSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default scatter_chart
             * @constant
             */
            type: "scatter_chart";
            /** X */
            x: string;
            /** Y */
            y: string;
        };
        /** SeriesField */
        SeriesField: {
            /** Field */
            field: string;
            /** Name */
            name: string;
        };
        /** SheetAppearance */
        SheetAppearance: {
            /** Name */
            name: string;
            /** Rows */
            rows: number;
            /** Columns */
            columns: number;
            /** Widths */
            widths?: {
                [key: string]: number;
            };
            /** Heights */
            heights?: {
                [key: string]: number;
            };
            /** Merges */
            merges?: [
                number,
                number,
                number,
                number
            ][];
        };
        /** SheetBinding */
        SheetBinding: {
            /** Sheet Name */
            sheet_name: string;
            /** Target Sheet */
            target_sheet: string;
            layout?: components["schemas"]["WorksheetLayout"];
            /** Columns */
            columns?: components["schemas"]["ColumnBinding"][];
        };
        /** SourceResource */
        SourceResource: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "worksheet" | "table" | "entity";
            /** Row Count */
            row_count?: number | null;
        };
        /** StatisticalEditRead */
        StatisticalEditRead: {
            /**
             * Workflow Id
             * Format: uuid
             */
            workflow_id: string;
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /** Name */
            name: string;
            /** Expected Token */
            expected_token: string;
            /** Editable */
            editable: boolean;
            /** Reason */
            reason?: string | null;
            settings?: components["schemas"]["StatisticalSettings"] | null;
            /** Columns */
            columns?: components["schemas"]["ResolvedColumnRead"][];
            /** Steps */
            steps?: components["schemas"]["ReportStep"][];
            /**
             * Widget Count
             * @default 0
             */
            widget_count: number;
        };
        /** StatisticalEditRequest */
        StatisticalEditRequest: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Expected Token */
            expected_token: string;
            settings: components["schemas"]["StatisticalSettings"];
            /**
             * Acknowledge Shared
             * @default false
             */
            acknowledge_shared: boolean;
            /**
             * Rebind Fields
             * @default false
             */
            rebind_fields: boolean;
        };
        /** StatisticalReportPreview */
        StatisticalReportPreview: {
            graph: components["schemas"]["WorkflowSave"];
            result: components["schemas"]["VisualizationResult"];
            /** Steps */
            steps: string[];
        };
        /** StatisticalReportRequest */
        StatisticalReportRequest: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Source Id */
            source_id?: string | null;
            /** Resource Id */
            resource_id?: string | null;
            /** Expected Snapshot Id */
            expected_snapshot_id?: string | null;
            published_input?: components["schemas"]["PublishedReportInput"] | null;
            /** Name */
            name: string;
            /** Analysis */
            analysis: components["schemas"]["HistogramReportSettings"] | components["schemas"]["BoxPlotReportSettings"] | components["schemas"]["HeatmapReportSettings"] | components["schemas"]["RollupReportSettings"] | components["schemas"]["ParetoReportSettings"] | components["schemas"]["FunnelReportSettings"] | components["schemas"]["WaterfallReportSettings"] | components["schemas"]["HierarchyReportSettings"];
            /** Filters */
            filters?: components["schemas"]["FilterCondition"][];
        };
        /** StatisticalSettings */
        StatisticalSettings: {
            /** Name */
            name: string;
            /** Analysis */
            analysis: components["schemas"]["HistogramReportSettings"] | components["schemas"]["BoxPlotReportSettings"] | components["schemas"]["HeatmapReportSettings"] | components["schemas"]["RollupReportSettings"] | components["schemas"]["ParetoReportSettings"] | components["schemas"]["FunnelReportSettings"] | components["schemas"]["WaterfallReportSettings"] | components["schemas"]["HierarchyReportSettings"];
            /** Filters */
            filters?: components["schemas"]["FilterCondition"][];
        };
        /** TableCellFormat */
        TableCellFormat: {
            /**
             * Rule Id
             * Format: uuid
             */
            rule_id: string;
            /** Label */
            label: string;
            /**
             * Tone
             * @enum {string}
             */
            tone: "positive" | "warning" | "negative" | "neutral";
        };
        /** TableFormatRule */
        TableFormatRule: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Column Id */
            column_id: string;
            /** Label */
            label: string;
            /**
             * Operator
             * @enum {string}
             */
            operator: "lt" | "lte" | "eq" | "gte" | "gt" | "between" | "is_empty";
            /** Threshold */
            threshold?: string | null;
            /** Upper */
            upper?: string | null;
            /**
             * Scope
             * @default all
             * @enum {string}
             */
            scope: "all" | "details" | "totals";
            /**
             * Tone
             * @default neutral
             * @enum {string}
             */
            tone: "positive" | "warning" | "negative" | "neutral";
        };
        /** TableInputSpec */
        TableInputSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default table
             * @constant
             */
            type: "table";
            /** Columns */
            columns?: string[] | null;
        };
        /** TableSpec */
        TableSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default table
             * @constant
             */
            type: "table";
            /** Columns */
            columns: string[];
        };
        /** TemplateCapture */
        TemplateCapture: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /**
             * Visualization Id
             * Format: uuid
             */
            visualization_id: string;
            /** Expected Token */
            expected_token: string;
            /** Name */
            name: string;
            /** Input Grain */
            input_grain: string;
        };
        /** TemplateCatalogEdit */
        TemplateCatalogEdit: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Expected Revision */
            expected_revision: number;
            /** Name */
            name?: string | null;
            /** Archived */
            archived?: boolean | null;
        };
        /** TemplateCatalogEntry */
        TemplateCatalogEntry: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Family
             * @enum {string}
             */
            family: "analytical" | "report";
            /** Name */
            name: string;
            /** Input Grain */
            input_grain: string;
            /** Presentation */
            presentation: string;
            /** Revision */
            revision: number;
            /** Archived */
            archived: boolean;
            /** Fields */
            fields: components["schemas"]["TemplateField"][];
        };
        /** TemplateCatalogPage */
        TemplateCatalogPage: {
            /** Items */
            items: components["schemas"]["TemplateCatalogEntry"][];
            /** Total */
            total: number;
            /** Active Count */
            active_count: number;
            /** Archived Count */
            archived_count: number;
            /** Offset */
            offset: number;
            /** Limit */
            limit: number;
        };
        /** TemplateField */
        TemplateField: {
            /** Key */
            key: string;
            /** Name */
            name: string;
            logical_type: components["schemas"]["LogicalType"];
            /** Unit */
            unit?: string | null;
            /** Currency */
            currency?: string | null;
        };
        /** TemplateList */
        TemplateList: {
            /** Items */
            items: components["schemas"]["TemplateRead"][];
        };
        /** TemplatePrepare */
        TemplatePrepare: {
            /**
             * Request Id
             * Format: uuid
             */
            request_id: string;
            /** Source Id */
            source_id?: string | null;
            /** Resource Id */
            resource_id?: string | null;
            /** Expected Snapshot Id */
            expected_snapshot_id?: string | null;
            published_input?: components["schemas"]["PublishedReportInput"] | null;
            /** Mapping */
            mapping: {
                [key: string]: string;
            };
            /**
             * Acknowledge Grain
             * @default false
             */
            acknowledge_grain: boolean;
            /** Expected Template Revision */
            expected_template_revision?: number | null;
        };
        /** TemplateRead */
        TemplateRead: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /** Name */
            name: string;
            /** Input Grain */
            input_grain: string;
            /** Fields */
            fields: components["schemas"]["TemplateField"][];
            settings: components["schemas"]["StatisticalSettings"];
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Revision
             * @default 1
             */
            revision: number;
        };
        /** UpdateItem */
        UpdateItem: {
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /**
             * Version Id
             * Format: uuid
             */
            version_id: string;
            /** Bindings */
            bindings?: components["schemas"]["SheetBinding"][];
            /** Dataset Bindings */
            dataset_bindings?: components["schemas"]["DatasetBinding"][];
            /**
             * Mode
             * @default replace
             * @enum {string}
             */
            mode: "replace" | "append" | "replace_period";
            /**
             * Period
             * @default
             */
            period: string;
            /**
             * Baseline Period
             * @default
             */
            baseline_period: string;
        };
        /** UpdateRead */
        UpdateRead: {
            /**
             * Browser Editor Pending
             * @default false
             */
            browser_editor_pending: boolean;
            file_exchange?: components["schemas"]["FileExchangeRead"] | null;
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
            /** Status */
            status: string;
            /** Name */
            name: string;
            /** Items */
            items: components["schemas"]["UpdateItem"][];
            check?: components["schemas"]["CheckResult"] | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
        };
        /** UpdateSave */
        UpdateSave: {
            /** Expected Revision */
            expected_revision: number;
            /**
             * Name
             * @default Data update
             */
            name: string;
            /** Items */
            items?: components["schemas"]["UpdateItem"][];
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
        /** VersionRead */
        VersionRead: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /**
             * Source Id
             * Format: uuid
             */
            source_id: string;
            /** Filename */
            filename: string;
            /** File Size */
            file_size: number;
            /** Sha256 */
            sha256: string;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Sheet Names */
            sheet_names?: string[];
            /** Resources */
            resources?: components["schemas"]["SourceResource"][];
            read_options?: components["schemas"]["ReadOptions"] | null;
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
            /** Primary Series Name */
            primary_series_name?: string | null;
            /** Spec */
            spec?: components["schemas"]["BubbleSpec"] | components["schemas"]["BoxPlotSpec"] | components["schemas"]["HistogramSpec"] | components["schemas"]["HeatmapSpec"] | components["schemas"]["RadarSpec"] | components["schemas"]["WaterfallSpec"] | components["schemas"]["ComboSpec"] | components["schemas"]["AnalyticalTableSpec"] | components["schemas"]["ParetoSpec"] | components["schemas"]["HierarchySpec"] | components["schemas"]["BulletSpec"] | components["schemas"]["FunnelSpec"] | null;
            /** Measure Column Ids */
            measure_column_ids?: string[] | null;
            /** Grain Column Ids */
            grain_column_ids?: string[] | null;
            /** Additional Series */
            additional_series?: components["schemas"]["AdditionalSeries"][];
            /** Value Column Id */
            value_column_id?: string | null;
            /** Category Column Id */
            category_column_id?: string | null;
            /** Column Ids */
            column_ids?: string[] | null;
        };
        /** VisualizationDataset */
        VisualizationDataset: {
            /** Columns */
            columns: components["schemas"]["ResolvedColumnRead"][];
            /** Rows */
            rows: {
                [key: string]: unknown;
            }[];
            /** Total Rows */
            total_rows: number;
            /** Offset */
            offset: number;
            /** Limit */
            limit: number;
            /** Truncated */
            truncated: boolean;
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
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart" | "box_plot" | "histogram_chart" | "heatmap_chart" | "radar_chart" | "waterfall_chart" | "combo_chart" | "bubble_chart" | "pareto_chart" | "treemap_chart" | "sunburst_chart" | "bullet_chart" | "funnel_chart" | "analytical_table";
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
            funnel?: components["schemas"]["FunnelPresentation"] | null;
            bullet?: components["schemas"]["BulletPresentation"] | null;
            hierarchy?: components["schemas"]["HierarchyPresentation"] | null;
            bubble?: components["schemas"]["BubblePresentation"] | null;
            analytical_table?: components["schemas"]["AnalyticalTablePresentation"] | null;
            combo?: components["schemas"]["ComboPresentation"] | null;
            waterfall_scale?: components["schemas"]["WaterfallScale"] | null;
            radar?: components["schemas"]["RadarPresentation"] | null;
            heatmap_scale?: components["schemas"]["HeatmapScaleResult"] | null;
            /** Spec */
            spec?: components["schemas"]["BubbleSpec"] | components["schemas"]["BoxPlotSpec"] | components["schemas"]["HistogramSpec"] | components["schemas"]["HeatmapSpec"] | components["schemas"]["RadarSpec"] | components["schemas"]["WaterfallSpec"] | components["schemas"]["ComboSpec"] | components["schemas"]["AnalyticalTableSpec"] | components["schemas"]["ParetoSpec"] | components["schemas"]["HierarchySpec"] | components["schemas"]["BulletSpec"] | components["schemas"]["FunnelSpec"] | components["schemas"]["CartesianSpec"] | components["schemas"]["PartToWholeSpec"] | components["schemas"]["ScatterSpec"] | components["schemas"]["KpiSpec"] | components["schemas"]["TableSpec"] | null;
            /** Datasets */
            datasets?: {
                [key: string]: components["schemas"]["VisualizationDataset"];
            };
            /** Additional Series */
            additional_series?: components["schemas"]["SeriesField"][];
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
            type: "bar_chart" | "kpi" | "table" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart" | "box_plot" | "histogram_chart" | "heatmap_chart" | "radar_chart" | "waterfall_chart" | "combo_chart" | "bubble_chart" | "pareto_chart" | "treemap_chart" | "sunburst_chart" | "bullet_chart" | "funnel_chart" | "analytical_table";
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
        /** VisualizationTypeDefinition */
        VisualizationTypeDefinition: {
            /**
             * Type
             * @default box_plot
             * @enum {string}
             */
            type: "bar_chart" | "line_chart" | "area_chart" | "pie_chart" | "donut_chart" | "scatter_chart" | "kpi" | "table" | "box_plot" | "histogram_chart" | "heatmap_chart" | "radar_chart" | "waterfall_chart" | "combo_chart" | "bubble_chart" | "pareto_chart" | "treemap_chart" | "sunburst_chart" | "bullet_chart" | "funnel_chart" | "analytical_table";
            /**
             * Spec Version
             * @default 1
             * @constant
             */
            spec_version: 1;
            /**
             * Binding Contract
             * @default spec
             * @enum {string}
             */
            binding_contract: "spec" | "spec_or_legacy_config";
            /**
             * Result Data
             * @default datasets
             * @enum {string}
             */
            result_data: "datasets" | "rows";
            /**
             * Input Kinds
             * @default [
             *       "dataset"
             *     ]
             */
            input_kinds: ("dataset" | "scalar")[];
            /**
             * Name
             * @default Box plot
             */
            name: string;
            /**
             * Purpose
             * @default Compare distributions, quartiles and outliers across groups.
             */
            purpose: string;
            /**
             * Preparation Node
             * @default boxplot_stats
             */
            preparation_node: ("boxplot_stats" | "histogram" | "heatmap_stats" | "waterfall_steps" | "table_rollup" | "pareto" | "funnel_steps") | null;
            /**
             * Preparation Version
             * @default 1
             * @constant
             */
            preparation_version: 1;
            /**
             * Publication Port
             * @default dataset
             */
            publication_port: "dataset" | null;
            /** Datasets */
            datasets?: {
                [key: string]: string;
            };
            /**
             * Max Groups
             * @default 2000
             */
            max_groups: number | null;
            /**
             * Quantile Method
             * @default linear
             */
            quantile_method: "linear" | null;
            /**
             * Whisker Iqr Multiplier
             * @default 1.5
             */
            whisker_iqr_multiplier: "1.5" | null;
            /** Max Bins */
            max_bins?: number | null;
            /** Max Axis Categories */
            max_axis_categories?: number | null;
            /** Max Cells */
            max_cells?: number | null;
            /** Min Axes */
            min_axes?: number | null;
            /** Max Axes */
            max_axes?: number | null;
            /** Max Steps */
            max_steps?: number | null;
            /** Max Series */
            max_series?: number | null;
            /** Max Nodes */
            max_nodes?: number | null;
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
        /** WaterfallPosition */
        WaterfallPosition: {
            /** Start */
            start: number;
            /** End */
            end: number;
            /**
             * Sign
             * @enum {integer}
             */
            sign: -1 | 0 | 1;
        };
        /** WaterfallReportSettings */
        WaterfallReportSettings: {
            /** Category Column Id */
            category_column_id: string;
            /** Value Column Id */
            value_column_id: string;
            /** Kind Column Id */
            kind_column_id?: string | null;
            /** Order Column Id */
            order_column_id: string | null;
            /**
             * Initial Marker
             * @default initial
             */
            initial_marker: string;
            /**
             * Change Marker
             * @default change
             */
            change_marker: string;
            /**
             * Subtotal Marker
             * @default subtotal
             */
            subtotal_marker: string;
            /**
             * Total Marker
             * @default total
             */
            total_marker: string;
            /**
             * Append Total
             * @default false
             */
            append_total: boolean;
            /**
             * Total Label
             * @default Total
             */
            total_label: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "waterfall_steps";
        };
        /** WaterfallRoles */
        WaterfallRoles: {
            /** Step Id */
            step_id: string;
            /** Step Index */
            step_index: string;
            /** Category */
            category: string;
            /** Kind */
            kind: string;
            /** Value */
            value: string;
            /** Start */
            start: string;
            /** End */
            end: string;
            /** Balance */
            balance: string;
            /** Generated */
            generated: string;
        };
        /** WaterfallScale */
        WaterfallScale: {
            /** Minimum */
            minimum: string;
            /** Maximum */
            maximum: string;
            /** Zero */
            zero: number;
            /** Ticks */
            ticks: components["schemas"]["WaterfallTick"][];
            /** Positions */
            positions: {
                [key: string]: components["schemas"]["WaterfallPosition"];
            };
        };
        /** WaterfallSpec */
        WaterfallSpec: {
            /**
             * Version
             * @default 1
             * @constant
             */
            version: 1;
            /**
             * Type
             * @default waterfall_chart
             * @constant
             */
            type: "waterfall_chart";
            steps: components["schemas"]["WaterfallRoles"];
        };
        /** WaterfallTick */
        WaterfallTick: {
            /** Position */
            position: number;
            /** Label */
            label: string;
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
        /** WorksheetLayout */
        WorksheetLayout: {
            /**
             * Header Row
             * @default 1
             */
            header_row: number;
            /**
             * Header Rows
             * @default 1
             */
            header_rows: number;
            /**
             * Include Row Number
             * @default false
             */
            include_row_number: boolean;
            /**
             * Skip Data Rows
             * @default 0
             */
            skip_data_rows: number;
            /**
             * Drop Tail Rows
             * @default 0
             */
            drop_tail_rows: number;
            /** Cell Range */
            cell_range?: string | null;
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
                skip_data_rows?: number;
                drop_tail_rows?: number;
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
    import_session_api_v1_projects__project_id__imports__source_id__session_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                source_id: string;
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
                    "application/json": components["schemas"]["ImportSessionRead"];
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
    save_draft_api_v1_projects__project_id__imports__source_id__draft_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                source_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveImportDraft"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportDraftRead"];
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
    connectors_api_v1_connectors_get: {
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
                    "application/json": components["schemas"]["ConnectorDefinition"][];
                };
            };
        };
    };
    imports_api_v1_projects__project_id__imports_get: {
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
                    "application/json": components["schemas"]["ImportedSourceRead"][];
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
    upload_api_v1_projects__project_id__imports_post: {
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
                "multipart/form-data": components["schemas"]["Body_upload_api_v1_projects__project_id__imports_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportedSourceRead"];
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
    inspect_api_v1_imports__source_id__inspect_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InspectResourceRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportPreview"];
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
    preview_api_v1_imports__source_id__preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ImportProfile"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportPreview"];
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
    apply_api_v1_imports__source_id__apply_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ApplyImportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DatasetSnapshotRead"];
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
    datasets_api_v1_projects__project_id__datasets_get: {
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
                    "application/json": components["schemas"]["DatasetSnapshotRead"][];
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
    list_layout_templates_api_v1_dashboards__dashboard_id__layout_templates_get: {
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
                    "application/json": components["schemas"]["DashboardLayoutRead"][];
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
    save_layout_template_api_v1_dashboards__dashboard_id__layout_templates_post: {
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
                "application/json": components["schemas"]["DashboardLayoutSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DashboardLayoutSaved"];
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
    typed_visualization_types_api_v1_visualization_types_get: {
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
                    "application/json": components["schemas"]["VisualizationTypeDefinition"][];
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
                "application/json": components["schemas"]["IndependentVisualizationPreview"];
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
    editor_workspace_api_v1_updates__identity__editor_workspace_get: {
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
                    "application/json": components["schemas"]["EditorWorkspace"];
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
    find_editor_cells_api_v1_updates__identity__editor_find_get: {
        parameters: {
            query: {
                resource: string;
                text: string;
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
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EditorSearch"];
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
    editor_page_api_v1_updates__identity__editor_get: {
        parameters: {
            query?: {
                resource?: string | null;
                offset?: number;
                limit?: number;
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
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EditorPage"];
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
    save_editor_api_v1_updates__identity__editor_post: {
        parameters: {
            query?: {
                offset?: number;
                limit?: number;
            };
            header?: never;
            path: {
                identity: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EditorSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EditorPage"];
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
    prepare_editor_api_v1_updates__identity__editor_prepare_post: {
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
                "application/json": components["schemas"]["EditorAction"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRead"];
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
    discard_editor_api_v1_updates__identity__editor_discard_post: {
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
                "application/json": components["schemas"]["RevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRead"];
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
    start_file_update_api_v1_projects__project_id__file_updates_post: {
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
                "application/json": components["schemas"]["FileExchangeStart"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRead"];
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
    download_update_file_api_v1_updates__identity__files__kind__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                identity: string;
                kind: "current" | "template";
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
                    "application/json": unknown;
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
    report_state_api_v1_projects__project_id__report_state_get: {
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
                    "application/json": components["schemas"]["ReportState"];
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
    lineage_api_v1_visualizations__identity__lineage_get: {
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
                    "application/json": components["schemas"]["LineageRead"];
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
    versions_api_v1_sources__source_id__versions_get: {
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
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRead"][];
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
    upload_version_api_v1_sources__source_id__versions_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_version_api_v1_sources__source_id__versions_post"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionRead"];
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
    updates_api_v1_projects__project_id__updates_get: {
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
                    "application/json": components["schemas"]["UpdateRead"][];
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
    create_update_api_v1_projects__project_id__updates_post: {
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
                    "application/json": components["schemas"]["UpdateRead"];
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
    save_update_api_v1_updates__identity__put: {
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
                "application/json": components["schemas"]["UpdateSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRead"];
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
    apply_update_api_v1_updates__identity__apply_post: {
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
                "application/json": components["schemas"]["ApplyRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRead"];
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
    cancel_update_api_v1_updates__identity__cancel_post: {
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
                "application/json": components["schemas"]["RevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRead"];
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
    rollback_update_api_v1_updates__identity__rollback_post: {
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
                "application/json": components["schemas"]["RevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateRead"];
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
    check_update_api_v1_updates__identity__check_post: {
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
                "application/json": components["schemas"]["RevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobRead"];
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
    get_rules_api_v1_projects__project_id__quality_rules_get: {
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
                    "application/json": components["schemas"]["RulesRead"];
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
    save_rules_api_v1_projects__project_id__quality_rules_put: {
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
                "application/json": components["schemas"]["RulesSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RulesRead"];
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
    check_current_api_v1_projects__project_id__checks_post: {
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
                    "application/json": components["schemas"]["JobRead"];
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
    jobs_api_v1_projects__project_id__report_jobs_get: {
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
                    "application/json": components["schemas"]["JobRead"][];
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
    cancel_job_api_v1_report_jobs__identity__cancel_post: {
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
                "application/json": components["schemas"]["RevisionRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobRead"];
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
    releases_api_v1_projects__project_id__releases_get: {
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
                    "application/json": components["schemas"]["ReleaseRead"][];
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
    release_api_v1_projects__project_id__releases_post: {
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
                "application/json": components["schemas"]["ReleaseRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobRead"];
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
    release_dashboards_api_v1_releases__identity__dashboards_get: {
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
                    "application/json": components["schemas"]["DashboardRead"][];
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
    release_result_api_v1_releases__identity__widgets__visualization_id__result_get: {
        parameters: {
            query?: {
                offset?: number;
                limit?: number;
            };
            header?: never;
            path: {
                identity: string;
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
    restore_api_v1_releases__identity__restore_post: {
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
                "application/json": components["schemas"]["RestoreRequest"];
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
    list_inputs_api_v1_projects__project_id__report_builder_inputs_get: {
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
                    "application/json": components["schemas"]["ReportInputList"];
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
    read_input_api_v1_projects__project_id__report_builder_inputs__workflow_id___publication_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
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
                    "application/json": components["schemas"]["ReportInputRead"];
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
    fields_api_v1_projects__project_id__report_builder_fields_post: {
        parameters: {
            query?: {
                include_summary?: boolean;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReportBuildRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportFormulaFields"];
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
    edit_fields_api_v1_projects__project_id__report_builder__visualization_id__fields_post: {
        parameters: {
            query?: {
                include_summary?: boolean;
            };
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReportEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportFormulaFields"];
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
    edit_read_api_v1_projects__project_id__report_builder__visualization_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
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
                    "application/json": components["schemas"]["ReportEditRead"];
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
    edit_preview_api_v1_projects__project_id__report_builder__visualization_id__preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReportEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportBuildPreview"];
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
    edit_apply_api_v1_projects__project_id__report_builder__visualization_id__apply_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReportEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportEditResult"];
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
    preview_api_v1_projects__project_id__report_builder_preview_post: {
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
                "application/json": components["schemas"]["ReportBuildRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportBuildPreview"];
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
    apply_api_v1_projects__project_id__report_builder_apply_post: {
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
                "application/json": components["schemas"]["ReportBuildRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportBuildResult"];
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
    remove_measure_api_v1_projects__project_id__measures__workflow_id___publication_id___measure_id__delete: {
        parameters: {
            query: {
                expected_token: string;
            };
            header?: never;
            path: {
                project_id: string;
                workflow_id: string;
                publication_id: string;
                measure_id: string;
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
    list_measures_api_v1_projects__project_id__measures_get: {
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
                    "application/json": components["schemas"]["MeasureList"];
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
    save_measure_api_v1_projects__project_id__measures__workflow_id___publication_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                workflow_id: string;
                publication_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MeasureSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MeasureEntry"];
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
    preview_report_api_v1_projects__project_id__measure_reports_preview_post: {
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
                "application/json": components["schemas"]["MeasureReportRequest"];
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
    apply_report_api_v1_projects__project_id__measure_reports_apply_post: {
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
                "application/json": components["schemas"]["MeasureReportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportBuildResult"];
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
    read_alignment_api_v1_projects__project_id__alignment_reports__visualization_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
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
                    "application/json": components["schemas"]["AlignmentEditRead"];
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
    edit_alignment_fields_api_v1_projects__project_id__alignment_reports__visualization_id__fields_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AlignmentEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlignmentReportFields"];
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
    preview_alignment_edit_api_v1_projects__project_id__alignment_reports__visualization_id__preview_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AlignmentEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlignmentReportPreview"];
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
    apply_alignment_edit_api_v1_projects__project_id__alignment_reports__visualization_id__apply_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AlignmentEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportEditResult"];
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
    alignment_fields_api_v1_projects__project_id__alignment_reports_fields_post: {
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
                "application/json": components["schemas"]["AlignmentReportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlignmentReportFields"];
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
    preview_alignment_api_v1_projects__project_id__alignment_reports_preview_post: {
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
                "application/json": components["schemas"]["AlignmentReportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AlignmentReportPreview"];
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
    apply_alignment_api_v1_projects__project_id__alignment_reports_apply_post: {
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
                "application/json": components["schemas"]["AlignmentReportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportBuildResult"];
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
    preview_api_v1_projects__project_id__statistical_reports_preview_post: {
        parameters: {
            query?: {
                outlier_offset?: number;
                offset?: number | null;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StatisticalReportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatisticalReportPreview"];
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
    apply_api_v1_projects__project_id__statistical_reports_apply_post: {
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
                "application/json": components["schemas"]["StatisticalReportRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportBuildResult"];
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
    read_edit_api_v1_projects__project_id__statistical_reports__visualization_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
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
                    "application/json": components["schemas"]["StatisticalEditRead"];
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
    preview_edit_api_v1_projects__project_id__statistical_reports__visualization_id__preview_post: {
        parameters: {
            query?: {
                offset?: number;
            };
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StatisticalEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatisticalReportPreview"];
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
    apply_edit_api_v1_projects__project_id__statistical_reports__visualization_id__apply_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                visualization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StatisticalEditRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportEditResult"];
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
    list_template_catalog_api_v1_projects__project_id__template_catalog_get: {
        parameters: {
            query?: {
                q?: string;
                family?: ("analytical" | "report") | null;
                state?: "active" | "archived" | "all";
                offset?: number;
                limit?: number;
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
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TemplateCatalogPage"];
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
    edit_template_catalog_api_v1_projects__project_id__template_catalog__template_id__patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                template_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TemplateCatalogEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TemplateCatalogEntry"];
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
    list_templates_api_v1_projects__project_id__analytical_templates_get: {
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
                    "application/json": components["schemas"]["TemplateList"];
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
    capture_template_api_v1_projects__project_id__analytical_templates_post: {
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
                "application/json": components["schemas"]["TemplateCapture"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TemplateRead"];
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
    prepare_template_api_v1_projects__project_id__analytical_templates__template_id__prepare_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                template_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TemplatePrepare"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StatisticalSettings"];
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
    list_report_templates_api_v1_projects__project_id__report_templates_get: {
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
                    "application/json": components["schemas"]["ReportTemplateList"];
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
    capture_report_template_api_v1_projects__project_id__report_templates_post: {
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
                "application/json": components["schemas"]["TemplateCapture"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportTemplateRead"];
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
    prepare_report_template_api_v1_projects__project_id__report_templates__template_id__prepare_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                template_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TemplatePrepare"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReportSettings"];
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
