# Node BI Development Status

Last updated: 2026-09-21
Release: **MVP COMPLETE - 0.1.0, local single-user scope**

## Current milestone and last completed task

Current milestone: F1 typed field-editor, IN PROGRESS (ADR-090).
Latest completed subtask: eight general typed operations registered in the common execution
engine, named schemas/preview and static row-context/type preflight. Actual Excel save/read/
preview integration passes on SQLite and PostgreSQL. New operations are API-only through the
format_version=2 catalog; the existing editor and default catalog remain v1.
Next: adapt data-dependent schemas in typed branches; add revision-safe workbook/composite
presentation persistence, then opt-in forms/cards/wires and A/B previews. Complete diagnostic
field paths and translations with those forms. F1-F4 remain unfinished. Typed Pivot branches
currently fail explicitly; existing tabular Pivot is unchanged. No new known P0/P1 regression.
Checks: 304 backend tests pass with PostgreSQL, five SQLite matrix skips; Ruff lint/format,
mypy, OpenAPI drift, 82 frontend tests, TypeScript/ESLint and production build pass. Seven
focused browser checks pass against the updated backend (format guard, editor, charts).
Regression covers missing fields, cross-context wires, numeric types/zero division, revoked
sources, parameter-specific cache reuse, field identity changes and mixed named outputs.
Deployment: ordinary cold Docker backend build succeeded after connectivity was restored;
updated backend is running on the standard image. The prior overlay workaround is no longer
needed. Migration head remains 0007; no schema change/reset/conversion in this task. Original
and UX-copy workflow/dashboard snapshots still match all six captured endpoints after restart.
Full 164-slice numerical parity and new-editor UI acceptance were not rerun/claimed.

Previous F1 session (ADR-089):
Latest completed subtask: source_column_id persists through API, database and domain graph in v2.
Migration 20260921_0007 adds a nullable column; downgrade locks/checks projections and refuses
semantic loss. V1 JSON stays unchanged. Source kind/format validation and explicit schema/preview
guard prevent unimplemented field routing from silently passing an entire table. No new UI yet.
Next: typed executor registry/schema routing and named preview; workbook/composite presentation
persistence is also pending. F1-F4 are not complete. No new known defect in this subtask.
Checks: 292 backend tests pass with PostgreSQL, five SQLite matrix skips; final migration guard
rerun passes. Ruff lint/format, mypy, 82 frontend tests, TypeScript/ESLint, OpenAPI drift and local/
Docker frontend production builds pass. Seven browser checks pass, including a persisted field
wire surviving rejected v1 edits/reload, slow saves, two tabs, recovery, Excel preview and charts.
Deployment: backup .backups/field-edge-before.dump; migration 0007 applied in local PostgreSQL.
Original financial project and UX copy graph/dashboard snapshots match exactly across all six
captured API endpoints after restart. This is persistence equivalence, not a new 164-slice result
comparison. Backend image retains the prior runtime with updated app/migrations; the cold-build
download limitation from the previous session remains. No data reset or format auto-upgrade.

Previous F1 session (ADR-088):
Completed: typed value/expression primitives with row-context checks, constants/parameters,
arithmetic/comparisons/logic, explicit sum/append/filter and bounded expressions; shared compiler
preserves v1 syntax. Legacy runner uses named table outputs without copying frames; sink previews
remain compatible. Save-format acknowledgement guards v2 against old-client overwrite, participates
in CAS rollback and rejects unsupported draft fields. Current frontend explicitly saves format 1;
OpenAPI types are regenerated. No persisted edge/presentation changes and no migration yet.
Next: full v2 persistence/migration, typed executor registry/schema routing and output-aware preview;
then workbook/cards/A-B UI and composite blocks. Details: docs/FIELD_EDITOR_PLAN.md and TASKS F1-F4.
New field operations are internal foundations, not yet exposed in the catalog or UI. The entire
approved plan is NOT complete. No conversion/reset of existing projects. U5 human studies remain
pending independently. No known defect in the implemented foundation; no environment blocker.
Validation: 288 backend tests pass with PostgreSQL enabled; four SQLite-only matrix skips.
28 new typed-value cases plus API format guards cover context, types, null, zero division,
empty/zero-column tables, stable IDs, expression limits and CAS rollback. Ruff lint/format,
mypy, OpenAPI drift, 82 frontend tests, TypeScript/ESLint and production frontend builds pass.
12 browser scenarios pass: format rejection/reload keeps the local draft, normal save/recovery,
two tabs, Excel preview, charts, three languages and both themes. Full browser/164-slice parity
and new-editor end-to-end acceptance are not claimed in this session.
Deployment: local frontend production image and updated backend are running. A clean backend
image build was interrupted during a very slow Linux Polars download. The local backend image
reuses the prior working runtime/dependencies with current app files via ignored
.backups/field-foundation.Dockerfile; /app/app imports and new arithmetic were checked in-container.
The ordinary clean backend Docker build remains to be repeated when downloads are practical;
Dockerfiles, dependency locks and production data were not changed by that workaround.

Previous session: U5 technical acceptance is COMPLETE; human evaluation remains pending (ADR-087). Database/source backups
u5-before.dump and u5-sources.tar are retained under .backups. Independent project copy:
2173f33a-aa46-46af-9a19-b720de4fd036, workflow 1faead6b-91bc-45f5-ad34-e68ea1b81a5b.
168 nodes/172 edges, 53 visualizations/55 widgets and six dashboards remain explicit/editable.
Added seven presentation groups and applied layouts through existing UI; computation/navigation
semantics and original project are unchanged. API copy identity remapping is test tooling only.
P2 found and fixed: collapsed groups overlapped and large graphs could not fit at default minimum
zoom. Complete summaries now have their own non-overlapping layout; partial summaries move only
proxies. Full-card viewport and non-overlap acceptance passes on the real copy without graph saves.
82 frontend tests, TypeScript/ESLint and production build pass; frontend is deployed.
164 slices / 1551 widget pages match the original exactly after copy-identity/revision normalization.
After backend/frontend/PostgreSQL restart, all six views, 55 sample widget results, typed URL values,
three languages and both themes restore. Full browser regression: 35 passed, 12 opt-in skips (3.8m).
Both U5 opt-in scenarios pass separately. Final UI step replaces source-row-only service selectors
with service names: 18 affected widget results unchanged, typed IDs retained, labels survive a second
restart. Original graph/dashboards remain unchanged. No new known defects or environment blockers.
Next: conduct U0/U5 sessions with 3-5 actual operators and compare recorded results with baseline;
this requires human participants. Do not claim the 40% speed target from automated tests.
Resume context: .backups/ux-project-copy.json, ux-copy-parity-checkpoint.json and ux-copy-*.log.
U0/U5 human measurements remain pending; docs/U5_ACCEPTANCE.md and the raw-results CSV are ready.
No backend/API/schema/dependency changes. Backend baseline remains 256 passed, 4 SQLite-only skips.

Previous session: final U4 delivery adds URL view mode and two reversible layout templates
(ADR-086). Filters/transitions remain available in view mode; editing controls and grid movement
are disabled. Drafts survive switching; unsaved content is explicit. Templates preview/cancel,
change only positions/sizes, and use normal CAS saving; guarded undo preserves semantic edits.
U4 is complete. Next: U5 backup/project copy, presentation changes and 164-slice parity/restart
verification; U0/U5 human operator measurements remain pending and no speed gain is claimed.
79 frontend tests, TypeScript, ESLint and Docker production build pass; frontend deployed.
Focused browser acceptance passes; full browser/restart suite: 35 passed, 10 opt-in skips (3.6m),
including original six-dashboard restoration, three languages and both themes. Logs/screenshots:
.backups/ux-dashboard-view-*; details in docs/QA_REPORT.md. No new known defects or blockers.
Backend/API/schema unchanged; prior backend evidence remains 256 passed, 4 SQLite-only skips
with PostgreSQL enabled (not rerun this frontend-only delivery). No reset/new dependency;
original project and its saved configuration are unchanged.

Previous session: sixth U4 delivery adds missing input fields to visualization navigation context
and saves the widget action atomically (ADR-085). All three revisions, project/widget ownership,
shared acknowledgement and field types are checked; visible fields cannot be hidden by this API.
256 backend tests pass with PostgreSQL (4 SQLite-only skips), including real concurrent saves,
late rollback and compatibility. Ruff lint/format (109 files), mypy (68 files), 77 frontend tests,
TypeScript/ESLint and OpenAPI drift pass. Production builds pass and are deployed. Both focused
browser scenarios pass (including conflict/lost response). Full browser/restart regression:
34 passed, 10 opt-in skips (3.4 minutes), including six-dashboard restoration after application
and PostgreSQL restart, three languages and both themes. Evidence: docs/QA_REPORT.md and
.backups/ux-navigation-context-e2e.log.
Next: U4 view mode/grid templates. Guided navigation is complete; full U4 remains in progress.
No new known defects or blockers; no data reset/migration/new dependency. Original project intact.

Previous session: fifth U4 delivery adds staged per-widget navigation with typed suggestions and
sample preview (ADR-084). Required/missing/incompatible mappings are explicit; apply preserves
other dashboard drafts, cancel discards only modal changes. Existing global forms remain available.
77 frontend tests, TypeScript/ESLint and production build pass; frontend deployed. Focused browser
acceptance passes. Full browser/restart regression: 33 passed, 10 opt-in skips (3.3 minutes),
including six-dashboard restoration after application/PostgreSQL restart, three languages and
both themes. Evidence: .backups/ux-guided-navigation-e2e.log and docs/QA_REPORT.md.
Backend/API/persistence unchanged.
Next: propose/add missing visualization context fields with an atomic graph/dashboard revision
contract and review; then U4 view mode/grid templates. Guided navigation is still IN PROGRESS.
No new known defects or blockers; original project/data untouched. No human speed claim.

Previous session: fourth U4 delivery separates parameter choice IDs from display labels (ADR-083).
Search covers values and labels; selected labels survive search limits; repeated names retain
distinct IDs. Conflicting labels for one ID produce an explicit error. Old selectors remain valid.
254 backend tests pass with PostgreSQL (4 SQLite-only skips); Ruff lint/format (107 files),
mypy (67 files), 75 frontend tests, TypeScript/ESLint and OpenAPI drift pass. Production builds
pass and backend/frontend are deployed. Full browser regression: 32 passed, 10 opt-in skips
(3.3 minutes), including six-dashboard restoration after application/PostgreSQL restart,
three languages and both themes. Evidence: .backups/ux-parameter-labels-e2e.log and QA_REPORT.md.
Docker Hub metadata EOF interrupted two combined builds; separate rebuilds succeeded.
Next: guided navigation and view mode/grid templates in U4. No new known defects or blockers.
Original project/data untouched; no migration required for the optional JSON configuration key.

Previous session: third U4 delivery links dashboard widgets to their exact workflow/node (ADR-082).
The editor reveals collapsed targets and highlights ancestors without saving a revision. Missing
targets show explicit messages; dashboard drafts survive cancelled/confirmed navigation and Back.
73 frontend tests, TypeScript/ESLint and production build pass. Focused browser acceptance passes.
Full browser/restart regression: 31 passed, 10 opt-in skips (3.4 minutes), including six-dashboard
restoration after application/PostgreSQL restart, three languages and both themes.
Evidence: .backups/ux-calculation-navigation-e2e.log and docs/QA_REPORT.md. Frontend deployed.
Backend/API/schema unchanged; no migration required.
Remaining U4: guided navigation and view mode/grid templates.
No new known defects or blockers; original project/data untouched. Human study remains unmeasured.

Previous session: second U4 delivery creates ordinary visualization nodes/widgets and independent
copies in one transaction (ADR-081). Both revisions and project/input ownership are checked;
late errors roll back graph/index/widget. Copy rebinds only the chosen widget, preserving its
layout/action and all original visualization uses. Dirty dashboard drafts must be saved first.
Backend matrix: 252 passed, 4 SQLite-only skips including PostgreSQL concurrent creation and
late rollback. Ruff lint/format (106 files), mypy (67 source files) pass. Frontend 73 tests pass;
TypeScript/ESLint and OpenAPI drift pass. Production builds pass and are deployed locally.
Full browser regression: 30 passed, 10 opt-in skips (3.3 minutes), including six-dashboard
recovery after application/PostgreSQL restart, three languages and both themes.
Evidence: .backups/ux-widget-authoring-full-e2e.log and docs/QA_REPORT.md.
Remaining U4: ID/label selectors, guided navigation and view mode. Human study remains U0/unmeasured.
No data reset; original project/data untouched.
Retry uses the same IDs/revisions; if a response is lost after commit, reload reveals the result.
Clean local recovery snapshots are cleared after atomic success to prevent stale restoration.

Previous session: fifth U2 delivery implements grouped Unpivot authoring (ADR-076). A staged
table assigns values to 1-10 groups and creates ordinary Unpivot/Calculated Column branches
plus Union. New optional Unpivot labels affect field_name only; duplicate labels retain field
IDs and records. Ordinary node forms edit labels afterward. Existing configs remain compatible.
Apply uses normal snapshot/port/cycle checks, revision-aware autosave and atomic undo/redo.

Historical U2 grouped-Unpivot verification (not rerun as a backend matrix in this session):

Checks: 250 backend tests pass with PostgreSQL (4 SQLite-only skips), Ruff lint/format (104 files),
mypy (66 files), 57 frontend tests, TypeScript, ESLint and OpenAPI drift pass. Production builds
pass and backend/frontend are deployed. All 27 browser scenarios pass (10 opt-in skips),
including six-dashboard results/configurations after application/PostgreSQL restart, three
languages and both themes.
Logs .backups/ux-grouped-unpivot-backend.log, .backups/ux-grouped-unpivot-focused.log and
.backups/ux-grouped-unpivot-e2e.log. Screenshot .backups/ux-grouped-unpivot.png visually reviewed.
No migration or new dependency. Node configuration extension defaults to empty labels.

Approved six-screen constructor extension: **COMPLETE** (2026-09-15).
One retained editable workflow has 168 nodes, six dashboards and 55 widget placements.
All calculations, financial mappings, filters and transitions are ordinary project settings.
Local project: http://localhost:3000/projects/6547673e-c856-48f8-af35-83ef354d4a58/dashboard.

Last completed: Cost/class and Cost/service, final navigation/formatting/chart audit, all six
layouts, large-graph node finder, full reference acceptance and documentation. All 164 reference
slices match the pinned original outputs. Two doughnuts and ten bars use the reference chart
orientations. No financial-specific runtime was introduced. Decisions: ADR-063 through ADR-068.

Final checks: 247 backend tests pass with PostgreSQL (3 SQLite-only skips), Ruff lint/format,
mypy; 37 frontend tests, ESLint, TypeScript, OpenAPI drift and production build pass.
18 browser scenarios pass in 1.8 min, with 10 intentionally skipped opt-in authoring recipes.
The final acceptance restarts frontend/backend/PostgreSQL and verifies identical graph,
dashboards and all 55 widget results. All six URL slices reopen; three languages and both
themes pass. Final Russian/light and Tatar/dark screenshots were visually reviewed.

Evidence and repeat commands: docs/OPOP_CONSTRUCTOR_ACCEPTANCE.md, docs/QA_REPORT.md.
Private final configuration: .backups/reference-finalized-project.json; browser log:
.backups/six-screen-full-e2e.log. Final database backup:
.backups/constructor-parity-final-20260915.sql (source files remain separately in storage).
Original user project/data preserved; no reset. Production frontend is deployed locally.

Known extension limitations: direct service selector shows source-row IDs; named selection
is available through tables/peer charts. Authored labels are not automatically translated.
No open P0/P1 or environment blocker. Constructor parity is complete; the subsequent UX review
and proposed redesign are recorded above. Historical checkpoint
reports below describe earlier test counts and do not supersede this final acceptance.

Last completed task (2026-09-14): persistent light/dark theme selector. Semantic colors cover
forms, feedback, React Flow canvas and ECharts. Dark remains the default; the cookie restores
the selected theme in initial server rendering. Language and draft state are independent.
Current checks: **26 frontend tests**, ESLint, TypeScript, OpenAPI drift and Docker production build
pass. **13 browser scenarios pass in 52.3 s**, including theme persistence, graph autosave,
dashboard draft preservation and chart rendering in both themes. Light home/editor/chart screenshots
were visually reviewed. Updated frontend is deployed. No new P0/P1 defect or blocker remains.

Previous completed task: Russian (default), English and Tatar interface localization.
The selector persists the language, including server rendering; switching preserves active editors,
pending saves, dashboard drafts and user content. Catalog, errors, controls and numeric/date
presentation are localized. The local frontend has been rebuilt and deployed.
Checks on 2026-09-14: **26 frontend tests**, ESLint, TypeScript, OpenAPI drift and Docker production
build pass; **11 browser scenarios pass together in 53.7 s**, including full application/database
restart. Tatar workflow/dashboard screenshots reviewed. No new P0/P1 defect remains.
Details: docs/LOCALIZATION.md and ADR-061. Backend code/schema/dependencies were unchanged;
the 208-test backend release evidence below remains the prior verified baseline.

M16 release gate passed. Astra architecture revision and all mandatory M0–M16 milestones
are complete. Last work: application-service boundaries, revision-aware preview isolation,
source-delete/save concurrency, shared cold source loading, QA and clean-stack acceptance.

## Delivered functionality

Projects; Excel import/inspection; versioned workflow editor; reliable autosave/recovery;
Select, Rename, Filter (AND), Sort, Limit, safe Calculated Column, Group By, inner/left Join,
Union and Pivot. Table, KPI, Bar, Line, Area, Pie, Donut and Scatter use workflow-owned
semantic config. Multiple dashboards support widget add/remove, titles, visibility,
drag/resize, revision-checked saves and recovery after browser/server/database restart.

The Sol implementation and all ADR-001–ADR-049 dispositions are preserved in
docs/ASTRA_HANDOFF.md and docs/ARCHITECTURE_REVIEW.md. New decisions: ADR-050–ADR-060.

## Release evidence

* Backend: **208 passed**, three SQLite-only skips; PostgreSQL variants pass.
  Ruff lint/format and strict mypy pass (58 application files).
* Frontend: **20 tests**, ESLint, TypeScript, OpenAPI drift check and production build pass.
* Playwright: **8 scenarios pass together**, including clean-stack full restart.
* Canonical Sales Analysis is created and configured through the UI. Korea revenue = **500**;
  Bar/KPI, both widget moves, resize, persisted layout and full workflow restoration are verified.
* Fresh PostgreSQL/source volumes were created under a separate test Compose project;
  migrations, startup, health/readiness and restart acceptance pass. Existing data was not reset.
* Docker dependency check passes; openpyxl XML protection is enabled; npm production audit is clean.
* 50000-row benchmark: cold source ~2 s, warm source ~10 ms; restored dashboard ~1.4 s.
  Full evidence, scope and reproducible commands: docs/QA_REPORT.md.

## Known non-blocking limitations

No known open P0/P1 in the required MVP.

* P2: abrupt failure before failed-upload compensation is journaled can leave an orphan file;
  inspect metadata/storage before manual reconciliation. No automatic orphan deletion is enabled.
* P2: cache byte accounting excludes Python/engine overhead; this is not a multi-user load guarantee.
* P3: upstream TestClient/Vite deprecation notices; extended keyboard/accessibility polish remains.
* Explicit scope limits: Float64 arithmetic precision, single-key inner/left Join, 128 Pivot categories,
  2000 chart points; table/preview pagination is bounded. OR, advanced formulas, multiple chart series,
  duplication, undo/redo and other optional features remain deferred in TASKS.md.
* Session drafts survive navigation/reload but end when their browser tab is closed.

## Next task and blockers

The approved constructor/dashboard parity extension is active. Follow the next tasks above;
no environment blocker is known. The original MVP/localization/theme work remains complete.

## Resume and operating context

Main stack: http://localhost:3000; API http://localhost:8000/docs. Compose ports bind to loopback.
Checkpoint commits: accc239 baseline; e2987fb revision/M10; 47076ba early charts/dashboard;
576d64a M11; baf6a8f complete charts/dashboard and initial QA. The commit containing this snapshot is the final release checkpoint.
Backup: .backups/before-astra-migrations-20260910.sql (ignored); no reset performed.
Migrations 0002–0004 add workflow revision, file cleanup queue and dashboard revision.
Use 127.0.0.1 for local Python/PostgreSQL connections in this Windows environment.
PostgreSQL tests use isolated UUID schemas. Do not run them concurrently with restart acceptance
against the same database. See README.md and docs/QA_REPORT.md for exact commands.
