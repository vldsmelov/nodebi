# Architecture review: Sol baseline to Astra

Baseline reviewed 2026-09-09; release reconciliation completed 2026-09-11. All required acceptance gates pass; evidence is in QA_REPORT.md.

Each row inherits the requirement in its linked ADR. Evidence references are relative to the repository. Baseline defects and severity are preserved in ASTRA_HANDOFF.md.

| ADR / requirement | Implementation and verification | Limitation | Disposition |
| --- | --- | --- | --- |
| ADR-001: Use a Modular Monolith | Modular backend and registered executors; app/services and test_execution.py | Project/workflow/source use cases are in services; HTTP handlers retain typed transport adaptation | Keep |
| ADR-002: Backend Owns Data Execution | Modular backend and registered executors; app/services and test_execution.py | Project/workflow/source use cases are in services; HTTP handlers retain typed transport adaptation | Keep |
| ADR-003: PostgreSQL for Persistent Product State | PostgreSQL models, JSONB, Alembic; full persistence tests also run against PostgreSQL | Dashboard/widget ownership and references are validated by DashboardService and PostgreSQL tests | Keep; contracts completed under ADR-043/057 |
| ADR-004: Uploaded Files Live Outside PostgreSQL | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; durable cleanup queue implemented (ADR-054) |
| ADR-005: Local StorageProvider for MVP | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; durable cleanup queue implemented (ADR-054) |
| ADR-006: Polars as Primary DataFrame Engine | Polars Dataset/executors; transformation and Excel regression tests | DuckDB not needed for existing execution; full-sheet materialization bounded explicitly | Keep Polars; defer DuckDB |
| ADR-007: DuckDB Is Optional and Complementary | Polars Dataset/executors; transformation and Excel regression tests | DuckDB not needed for existing execution; full-sheet materialization bounded explicitly | Keep Polars; defer DuckDB |
| ADR-008: Workflow Is Persisted as Explicit DAG | Graph persistence, validator and PostgreSQL foreign-ID/stale-save tests | Whole graph replacement requires one serialized writer and atomic revision check | Keep with ADR-050 |
| ADR-009: Backend Graph Validation Is Authoritative | Graph persistence, validator and PostgreSQL foreign-ID/stale-save tests | Whole graph replacement requires one serialized writer and atomic revision check | Keep with ADR-050 |
| ADR-010: Node Types Use Registry + Executor Contracts | NodeRegistry keyed by type/version; test_nodes.py | Only existing implemented nodes verified; future node contracts must use the same registry | Keep |
| ADR-011: Node Versions Are Persisted | NodeRegistry keyed by type/version; test_nodes.py | Only existing implemented nodes verified; future node contracts must use the same registry | Keep |
| ADR-012: Dataset Is Source-Independent | DatasetSchema/ColumnSchema and Excel collision/mixed-value regressions | Join/Pivot lineage and dynamic-schema tests implemented under ADR-056 | Keep identity; correct conversion under ADR-051 |
| ADR-013: Explicit Logical Schema Layer | DatasetSchema/ColumnSchema and Excel collision/mixed-value regressions | Join/Pivot lineage and dynamic-schema tests implemented under ADR-056 | Keep identity; correct conversion under ADR-051 |
| ADR-014: Schema Propagation Is First-Class | WorkflowSchemaResolver and ProjectSourceAccess; test_cache_safety.py | Initial source schema needs full bounded load; data-dependent Pivot uses ancestor materialization under ADR-056 | Keep; reuse source materialization under ADR-052 |
| ADR-015: Support Data-Dependent Schema | WorkflowSchemaResolver and ProjectSourceAccess; test_cache_safety.py | Initial source schema needs full bounded load; data-dependent Pivot uses ancestor materialization under ADR-056 | Keep; reuse source materialization under ADR-052 |
| ADR-016: Visualization Config Is Semantic | Domain chart catalog, executors, result service and ECharts adapter; test_dashboards.py and charts.spec.ts | All mandatory chart types implemented; point-cap and bounded table pagination tests pass | Keep; workflow node is the sole semantic owner (ADR-043/057) |
| ADR-017: Visualization Is Not a General Transformation Layer | Domain chart catalog, executors, result service and ECharts adapter; test_dashboards.py and charts.spec.ts | All mandatory chart types implemented; point-cap and bounded table pagination tests pass | Keep; workflow node is the sole semantic owner (ADR-043/057) |
| ADR-018: Single-User MVP | Single-user desktop product; projects/editor pages | No authentication; do not expose this development service as a multi-user installation | Keep scope |
| ADR-019: Modular Frontend by Product Feature | Feature modules, TanStack Query, Zustand selection state, React Flow | Configuration/cards, autosave and revision-aware NodeOutputPanel extracted; eight browser scenarios pass | Keep libraries and narrow module boundaries |
| ADR-020: TanStack Query for Server State | Feature modules, TanStack Query, Zustand selection state, React Flow | Configuration/cards, autosave and revision-aware NodeOutputPanel extracted; eight browser scenarios pass | Keep libraries and narrow module boundaries |
| ADR-021: Zustand for Interactive Editor State | Feature modules, TanStack Query, Zustand selection state, React Flow | Configuration/cards, autosave and revision-aware NodeOutputPanel extracted; eight browser scenarios pass | Keep libraries and narrow module boundaries |
| ADR-022: React Flow for Workflow Editor | Feature modules, TanStack Query, Zustand selection state, React Flow | Configuration/cards, autosave and revision-aware NodeOutputPanel extracted; eight browser scenarios pass | Keep libraries and narrow module boundaries |
| ADR-023: ECharts for Visualization Rendering | Domain chart catalog, executors, result service and ECharts adapter; test_dashboards.py and charts.spec.ts | All mandatory chart types implemented; point-cap and bounded table pagination tests pass | Keep; workflow node is the sole semantic owner (ADR-043/057) |
| ADR-024: Debounced Workflow Autosave | Serialized WorkflowAutosave, session draft recovery, expected_revision and HTTP 409; autosave/API tests | Browser conflict/recovery and PostgreSQL competing-writer tests pass; tab-close warning protects unsaved session drafts | Extend under ADR-050 and ADR-053 |
| ADR-025: Original Uploaded Files Are Immutable | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; durable cleanup queue implemented (ADR-054) |
| ADR-026: Cache Is Disposable | Synchronous ancestor execution, disposable cache; byte/ownership/artifact tests | Memory estimates exclude Python/engine overhead; synchronous work bounded by workbook limits | Replace entry-count-only assumption with ADR-052 |
| ADR-027: Synchronous Execution for Initial MVP | Synchronous ancestor execution, disposable cache; byte/ownership/artifact tests | Memory estimates exclude Python/engine overhead; synchronous work bounded by workbook limits | Replace entry-count-only assumption with ADR-052 |
| ADR-028: REST API Under `/api/v1` | REST /api/v1, ApiError, server exception handlers, generated api-schema.d.ts | No arbitrary stack/engine exception details in user responses; generated drift check required | Keep REST; adopt generation under ADR-053 |
| ADR-029: JSONB for Flexible Configuration, Relational Columns for Relationships | PostgreSQL models, JSONB, Alembic; full persistence tests also run against PostgreSQL | Dashboard/widget ownership and references are validated by DashboardService and PostgreSQL tests | Keep; contracts completed under ADR-043/057 |
| ADR-030: Whole-Workflow Save Is Acceptable for MVP | Graph persistence, validator and PostgreSQL foreign-ID/stale-save tests | Whole graph replacement requires one serialized writer and atomic revision check | Keep with ADR-050 |
| ADR-031: Source Deletion Is Blocked When Referenced | SourceService dependency checks and test_sources_api.py | Project row lock serializes source deletion/reference saves; PostgreSQL concurrency regression passes (ADR-059) | Keep deletion restriction |
| ADR-032: Formula Execution Must Use Safe Parsed Expressions | Allowlisted AST compiler plus adversarial tests implemented in M10 | Float64 precision is explicit; extra functions are outside the minimum language | Keep ADR-042 as accepted after tested implementation |
| ADR-033: Table and Preview Results Are Bounded | Preview endpoint server limit; tests and generated response schema | Table backend pagination and frontend Next/Previous controls pass API/component tests | Keep |
| ADR-034: Chart Point Counts Are Bounded | Domain chart catalog, executors, result service and ECharts adapter; test_dashboards.py and charts.spec.ts | All mandatory chart types implemented; point-cap and bounded table pagination tests pass | Keep; workflow node is the sole semantic owner (ADR-043/057) |
| ADR-035: Original Source Data Is Never Mutated | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; durable cleanup queue implemented (ADR-054) |
| ADR-036: Dashboard Stores Logical Grid Layout | DashboardService, DashboardEditor, test_dashboards.py and browser restart/layout tests | React Grid Layout selected; early drag/resize/restart/isolation acceptance passes; multiple-dashboard/title/visibility browser acceptance passes | Keep; react-grid-layout selected under ADR-044 |
| ADR-037: One Failed Dashboard Widget Must Not Break the Dashboard | DashboardService, DashboardEditor, test_dashboards.py and browser restart/layout tests | React Grid Layout selected; early drag/resize/restart/isolation acceptance passes; multiple-dashboard/title/visibility browser acceptance passes | Keep; react-grid-layout selected under ADR-044 |
| ADR-038: Structured API Errors | REST /api/v1, ApiError, server exception handlers, generated api-schema.d.ts | No arbitrary stack/engine exception details in user responses; generated drift check required | Keep REST; adopt generation under ADR-053 |
| ADR-039: Deterministic Acceptance Fixtures | fixtures/excel/sales.xlsx and deterministic fixture builder | Full editor/chart/dashboard journey passes with backend/PostgreSQL restart | Keep and extend acceptance tests |
| ADR-040: MVP Is a Desktop-First Web Application | Single-user desktop product; projects/editor pages | No authentication; do not expose this development service as a multi-user installation | Keep scope |
| ADR-041: Column Identity Strategy | DatasetSchema/ColumnSchema and Excel collision/mixed-value regressions | Join/Pivot lineage and dynamic-schema tests implemented under ADR-056 | Keep identity; correct conversion under ADR-051 |
| ADR-042: Formula Parser Implementation | Allowlisted AST compiler plus adversarial tests implemented in M10 | Float64 precision is explicit; extra functions are outside the minimum language | Keep ADR-042 as accepted after tested implementation |
| ADR-043: Visualization Persistence Model | Domain chart catalog, executors, result service and ECharts adapter; test_dashboards.py and charts.spec.ts | All mandatory chart types implemented; point-cap and bounded table pagination tests pass | Keep; workflow node is the sole semantic owner (ADR-043/057) |
| ADR-044: Dashboard Layout Library | DashboardService, DashboardEditor, test_dashboards.py and browser restart/layout tests | React Grid Layout selected; early drag/resize/restart/isolation acceptance passes; multiple-dashboard/title/visibility browser acceptance passes | Keep; react-grid-layout selected under ADR-044 |
| ADR-045: Initial Execution Cache Implementation | Synchronous ancestor execution, disposable cache; byte/ownership/artifact tests | Memory estimates exclude Python/engine overhead; synchronous work bounded by workbook limits | Replace entry-count-only assumption with ADR-052 |
| ADR-046: Excel Worksheet Loading Strategy | WorkflowSchemaResolver and ProjectSourceAccess; test_cache_safety.py | Initial source schema needs full bounded load; data-dependent Pivot uses ancestor materialization under ADR-056 | Keep; reuse source materialization under ADR-052 |
| ADR-047: API Type Synchronization | REST /api/v1, ApiError, server exception handlers, generated api-schema.d.ts | No arbitrary stack/engine exception details in user responses; generated drift check required | Keep REST; adopt generation under ADR-053 |
| ADR-048: Optimistic Concurrency for Workflow Saves | Serialized WorkflowAutosave, session draft recovery, expected_revision and HTTP 409; autosave/API tests | Browser conflict/recovery and PostgreSQL competing-writer tests pass; tab-close warning protects unsaved session drafts | Extend under ADR-050 and ADR-053 |
| ADR-049: Persist Incomplete Workflow Drafts | Incomplete registered nodes persist; strict schema/execution validation tests | Saved draft is not necessarily executable; distinguish these states in UI | Keep |

## Reopened milestone acceptance

| Milestone | Evidence / disposition |
| --- | --- |
| M0 | Preserve scope/stack; reconcile mistaken ADR statuses and version semantics. |
| M1 | Local build/type/lint pass; Docker production build and pinned runtime dependencies verified. |
| M2 | Reopened graph ownership corruption; fixed and tested on SQLite/PostgreSQL. New migrations exercised in isolated schemas. |
| M3 | Project CRUD preserved; file cleanup added and tested. |
| M4 | Reopened two Excel failures; collision/type regressions pass. XML, preview cap and 50000-row resource smoke checks pass. |
| M5 | Explicit schema construction replaces sampled Polars inference. Join/Pivot lineage implemented and tested. |
| M6 | Registry and graph persistence preserved; revisions separated from format. |
| M7 | Autosave/controller and browser conflict/recovery scenarios pass. |
| M8 | Source schema shares immutable materialization; Pivot-to-Select dynamic-schema browser acceptance passes. |
| M9 | Source checks precede cache; context no longer imports ORM; memory bounds tested. |

## Release reconciliation

All ADR-001-049 rows and reopened M0-M9 acceptance were checked against the implementation.
Preserved stack: modular FastAPI/PostgreSQL/Polars backend and Next.js/React Flow/ECharts frontend.
The source reference rule is refined by ADR-059: unconfigured drafts persist; a supplied source ID
must refer to an existing source in the same project. Cache cold-load sharing is ADR-060.
Remaining P2/P3 limits are explicitly listed in QA_REPORT.md; no known open required-scope P0/P1.
