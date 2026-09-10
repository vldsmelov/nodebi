# Architecture review: Sol baseline to Astra

Date: 2026-09-09. This is a disposition/evidence inventory, not a declaration that unfinished features pass acceptance.

Each row inherits the requirement in its linked ADR. Evidence references are relative to the repository. Baseline defects and severity are preserved in ASTRA_HANDOFF.md.

| ADR / requirement | Implementation and verification | Limitation | Disposition |
| --- | --- | --- | --- |
| ADR-001: Use a Modular Monolith | Modular backend and registered executors; app/services and test_execution.py | Source/workflow use cases extracted; project CRUD remains thin repository orchestration | Keep |
| ADR-002: Backend Owns Data Execution | Modular backend and registered executors; app/services and test_execution.py | Source/workflow use cases extracted; project CRUD remains thin repository orchestration | Keep |
| ADR-003: PostgreSQL for Persistent Product State | PostgreSQL models, JSONB, Alembic; full persistence tests also run against PostgreSQL | Dashboard relationships still require application validation in M12/M13 | Keep; complete missing feature contracts |
| ADR-004: Uploaded Files Live Outside PostgreSQL | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; add repeatable cleanup |
| ADR-005: Local StorageProvider for MVP | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; add repeatable cleanup |
| ADR-006: Polars as Primary DataFrame Engine | Polars Dataset/executors; transformation and Excel regression tests | DuckDB not needed for existing execution; full-sheet materialization bounded explicitly | Keep Polars; defer DuckDB |
| ADR-007: DuckDB Is Optional and Complementary | Polars Dataset/executors; transformation and Excel regression tests | DuckDB not needed for existing execution; full-sheet materialization bounded explicitly | Keep Polars; defer DuckDB |
| ADR-008: Workflow Is Persisted as Explicit DAG | Graph persistence, validator and PostgreSQL foreign-ID/stale-save tests | Whole graph replacement requires one serialized writer and atomic revision check | Keep with ADR-050 |
| ADR-009: Backend Graph Validation Is Authoritative | Graph persistence, validator and PostgreSQL foreign-ID/stale-save tests | Whole graph replacement requires one serialized writer and atomic revision check | Keep with ADR-050 |
| ADR-010: Node Types Use Registry + Executor Contracts | NodeRegistry keyed by type/version; test_nodes.py | Only existing implemented nodes verified; future node contracts must use the same registry | Keep |
| ADR-011: Node Versions Are Persisted | NodeRegistry keyed by type/version; test_nodes.py | Only existing implemented nodes verified; future node contracts must use the same registry | Keep |
| ADR-012: Dataset Is Source-Independent | DatasetSchema/ColumnSchema and Excel collision/mixed-value regressions | Join/Pivot lineage is specified but not implemented yet | Keep identity; correct conversion under ADR-051 |
| ADR-013: Explicit Logical Schema Layer | DatasetSchema/ColumnSchema and Excel collision/mixed-value regressions | Join/Pivot lineage is specified but not implemented yet | Keep identity; correct conversion under ADR-051 |
| ADR-014: Schema Propagation Is First-Class | WorkflowSchemaResolver and ProjectSourceAccess; test_cache_safety.py | Initial source schema needs full bounded load; data-dependent Pivot schema still pending | Keep; reuse source materialization under ADR-052 |
| ADR-015: Support Data-Dependent Schema | WorkflowSchemaResolver and ProjectSourceAccess; test_cache_safety.py | Initial source schema needs full bounded load; data-dependent Pivot schema still pending | Keep; reuse source materialization under ADR-052 |
| ADR-016: Visualization Config Is Semantic | Semantic visualization requirements; ECharts installed; persistence tables exist | No complete visualization implementation or chart-volume acceptance yet | Keep principles; finalize single config owner before M12 |
| ADR-017: Visualization Is Not a General Transformation Layer | Semantic visualization requirements; ECharts installed; persistence tables exist | No complete visualization implementation or chart-volume acceptance yet | Keep principles; finalize single config owner before M12 |
| ADR-018: Single-User MVP | Single-user desktop product; projects/editor pages | No authentication; do not expose this development service as a multi-user installation | Keep scope |
| ADR-019: Modular Frontend by Product Feature | Feature modules, TanStack Query, Zustand selection state, React Flow | Editor configuration/cards extracted; editor/M10 browser gates pass; extended UI QA remains | Keep libraries and narrow module boundaries |
| ADR-020: TanStack Query for Server State | Feature modules, TanStack Query, Zustand selection state, React Flow | Editor configuration/cards extracted; editor/M10 browser gates pass; extended UI QA remains | Keep libraries and narrow module boundaries |
| ADR-021: Zustand for Interactive Editor State | Feature modules, TanStack Query, Zustand selection state, React Flow | Editor configuration/cards extracted; editor/M10 browser gates pass; extended UI QA remains | Keep libraries and narrow module boundaries |
| ADR-022: React Flow for Workflow Editor | Feature modules, TanStack Query, Zustand selection state, React Flow | Editor configuration/cards extracted; editor/M10 browser gates pass; extended UI QA remains | Keep libraries and narrow module boundaries |
| ADR-023: ECharts for Visualization Rendering | Semantic visualization requirements; ECharts installed; persistence tables exist | No complete visualization implementation or chart-volume acceptance yet | Keep principles; finalize single config owner before M12 |
| ADR-024: Debounced Workflow Autosave | Serialized WorkflowAutosave, session draft recovery, expected_revision and HTTP 409; autosave/API tests | Browser journey and simultaneous database writers need dedicated tests; tab-close warning protects unsaved session drafts | Extend under ADR-050 and ADR-053 |
| ADR-025: Original Uploaded Files Are Immutable | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; add repeatable cleanup |
| ADR-026: Cache Is Disposable | Synchronous ancestor execution, disposable cache; byte/ownership/artifact tests | Memory estimates exclude Python/engine overhead; synchronous work bounded by workbook limits | Replace entry-count-only assumption with ADR-052 |
| ADR-027: Synchronous Execution for Initial MVP | Synchronous ancestor execution, disposable cache; byte/ownership/artifact tests | Memory estimates exclude Python/engine overhead; synchronous work bounded by workbook limits | Replace entry-count-only assumption with ADR-052 |
| ADR-028: REST API Under `/api/v1` | REST /api/v1, ApiError, server exception handlers, generated api-schema.d.ts | No arbitrary stack/engine exception details in user responses; generated drift check required | Keep REST; adopt generation under ADR-053 |
| ADR-029: JSONB for Flexible Configuration, Relational Columns for Relationships | PostgreSQL models, JSONB, Alembic; full persistence tests also run against PostgreSQL | Dashboard relationships still require application validation in M12/M13 | Keep; complete missing feature contracts |
| ADR-030: Whole-Workflow Save Is Acceptable for MVP | Graph persistence, validator and PostgreSQL foreign-ID/stale-save tests | Whole graph replacement requires one serialized writer and atomic revision check | Keep with ADR-050 |
| ADR-031: Source Deletion Is Blocked When Referenced | SourceService dependency checks and test_sources_api.py | Race between new source reference and source deletion needs final persistence hardening | Keep deletion restriction |
| ADR-032: Formula Execution Must Use Safe Parsed Expressions | Allowlisted AST compiler plus adversarial tests implemented in M10 | Float64 precision is explicit; extra functions are outside the minimum language | Keep ADR-042 as accepted after tested implementation |
| ADR-033: Table and Preview Results Are Bounded | Preview endpoint server limit; tests and generated response schema | Table visualization pagination still pending | Keep |
| ADR-034: Chart Point Counts Are Bounded | Semantic visualization requirements; ECharts installed; persistence tables exist | No complete visualization implementation or chart-volume acceptance yet | Keep principles; finalize single config owner before M12 |
| ADR-035: Original Source Data Is Never Mutated | LocalStorageProvider; immutable upload keys; test_storage.py and test_file_cleanup.py | Source deletion queue retries failures; abrupt failure before cleanup is enqueued needs operational reconciliation | Keep; add repeatable cleanup |
| ADR-036: Dashboard Stores Logical Grid Layout | Dashboard tables and specification only | React Grid Layout selected; early drag/resize/restart/isolation acceptance passes; management QA remains | Keep grid coordinates; select library before dashboard implementation |
| ADR-037: One Failed Dashboard Widget Must Not Break the Dashboard | Dashboard tables and specification only | React Grid Layout selected; early drag/resize/restart/isolation acceptance passes; management QA remains | Keep grid coordinates; select library before dashboard implementation |
| ADR-038: Structured API Errors | REST /api/v1, ApiError, server exception handlers, generated api-schema.d.ts | No arbitrary stack/engine exception details in user responses; generated drift check required | Keep REST; adopt generation under ADR-053 |
| ADR-039: Deterministic Acceptance Fixtures | fixtures/excel/sales.xlsx and deterministic fixture builder | Full formula/chart/dashboard journey not yet implemented | Keep and extend acceptance tests |
| ADR-040: MVP Is a Desktop-First Web Application | Single-user desktop product; projects/editor pages | No authentication; do not expose this development service as a multi-user installation | Keep scope |
| ADR-041: Column Identity Strategy | DatasetSchema/ColumnSchema and Excel collision/mixed-value regressions | Join/Pivot lineage is specified but not implemented yet | Keep identity; correct conversion under ADR-051 |
| ADR-042: Formula Parser Implementation | Allowlisted AST compiler plus adversarial tests implemented in M10 | Float64 precision is explicit; extra functions are outside the minimum language | Keep ADR-042 as accepted after tested implementation |
| ADR-043: Visualization Persistence Model | Semantic visualization requirements; ECharts installed; persistence tables exist | No complete visualization implementation or chart-volume acceptance yet | Keep principles; finalize single config owner before M12 |
| ADR-044: Dashboard Layout Library | Dashboard tables and specification only | React Grid Layout selected; early drag/resize/restart/isolation acceptance passes; management QA remains | Keep grid coordinates; select library before dashboard implementation |
| ADR-045: Initial Execution Cache Implementation | Synchronous ancestor execution, disposable cache; byte/ownership/artifact tests | Memory estimates exclude Python/engine overhead; synchronous work bounded by workbook limits | Replace entry-count-only assumption with ADR-052 |
| ADR-046: Excel Worksheet Loading Strategy | WorkflowSchemaResolver and ProjectSourceAccess; test_cache_safety.py | Initial source schema needs full bounded load; data-dependent Pivot schema still pending | Keep; reuse source materialization under ADR-052 |
| ADR-047: API Type Synchronization | REST /api/v1, ApiError, server exception handlers, generated api-schema.d.ts | No arbitrary stack/engine exception details in user responses; generated drift check required | Keep REST; adopt generation under ADR-053 |
| ADR-048: Optimistic Concurrency for Workflow Saves | Serialized WorkflowAutosave, session draft recovery, expected_revision and HTTP 409; autosave/API tests | Browser journey and simultaneous database writers need dedicated tests; tab-close warning protects unsaved session drafts | Extend under ADR-050 and ADR-053 |
| ADR-049: Persist Incomplete Workflow Drafts | Incomplete registered nodes persist; strict schema/execution validation tests | Saved draft is not necessarily executable; distinguish these states in UI | Keep |

## Reopened milestone acceptance

| Milestone | Evidence / disposition |
| --- | --- |
| M0 | Preserve scope/stack; reconcile mistaken ADR statuses and version semantics. |
| M1 | Local build/type/lint pass; Docker build and dependency review in progress. |
| M2 | Reopened graph ownership corruption; fixed and tested on SQLite/PostgreSQL. New migrations exercised in isolated schemas. |
| M3 | Project CRUD preserved; file cleanup added and tested. |
| M4 | Reopened two Excel failures; collision/type regressions pass. Expanded resource limits require QA. |
| M5 | Explicit schema construction replaces sampled Polars inference. Join/Pivot lineage remains future work. |
| M6 | Registry and graph persistence preserved; revisions separated from format. |
| M7 | Autosave/controller and browser conflict/recovery scenarios pass. |
| M8 | Source schema shares immutable materialization; dynamic-schema acceptance remains M11. |
| M9 | Source checks precede cache; context no longer imports ORM; memory bounds tested. |
