# Node BI Development Status

Last updated: 2026-09-22
Release: **MVP COMPLETE - 0.1.0, local single-user scope**

## Current milestone and last completed task

Latest slice: F3 first composite-block UI (ADR-101, 2026-09-22).
Named checklist packs ordinary nodes; collapsed cards expose real boundary endpoints. Opening
reveals members on the shared canvas; return collapses the block. Rename, move, unpack, extra
output publication and member deletion use shared history/CAS without changing computational IDs.
Workbook/nested membership is excluded. New explicit boundary wires export public endpoints.
Checks: 111 frontend tests, TypeScript/ESLint and Docker production build pass. Nine existing
focused browser scenarios pass; the new composite scenario passes after correcting a handle
selector and using the return action after node-focused zoom. It checks unchanged results/IDs,
proxy reconnection and undo/redo, inner edit, extra output, reload/unpack, RU/EN/TT and both themes.
Fifteen presentation backend tests pass with SQLite/PostgreSQL (one SQLite migration skip).
Six retained snapshots unchanged; frontend deployed healthy. Backend/API/DB unchanged.
No full backend/private 164-slice rerun; no known P0/P1 in this slice.
Next: F3 membership/public-port management and typed visualizations. F2 operator acceptance and
F4 remain open. This is not completion of the entire new editor; no implementation blocker.

Previous preview diagnostic slice:

Latest slice: F1 preview-scoped runtime diagnostics (ADR-100, 2026-09-22).
Selected inspector combines current schema issues with current preview issues. Draft/revision/
parameter/output changes and retry clear stale errors; direct field preview failures identify
outputs.<port>. A/B diagnostics remain local. Typed value/schema repair messages are localized.
F1 foundation is complete; next implementation task is F3 one-level composite block UI and
public ports, then direct chart/KPI bindings. F2 financial-copy/operator acceptance remains open.
Checks: 338 backend tests with SQLite/PostgreSQL pass (6 SQLite-only skips), Ruff/format/mypy pass.
108 frontend tests, TypeScript/ESLint and production Docker builds pass. Focused preview/locale
tests rerun after translation additions. Thirteen browser scenarios covered: eleven passed in
the combined run, runtime diagnostic and authoring scenarios passed on targeted rerun. The new
runtime locator was scoped to exclude Next's route alert; authoring now waits for current saved
schema before dragging. Six retained snapshots unchanged. Backend/frontend deployed healthy.
No API shape/DB change, no private 164-slice parity rerun. No known P0/P1 or blocker in this slice.

Previous comparison/runtime slice:

Latest slice: F1 comparison/runtime diagnostics and inspector highlighting (ADR-099, 2026-09-22).
Comparison failures identify operand b. Typed execution failures retain structured paths/wires;
null predicates identify their policy and deferred arithmetic identifies the materializing input.
Current schema errors mark only matching controls with aria-invalid, border and localized title;
editing clears stale highlights. Runtime errors remain in preview, not control highlights yet.
Checks: 338 backend tests pass with SQLite/PostgreSQL (6 SQLite-only skips); final targeted
execution rerun 29 pass. Ruff/format/mypy pass. Existing 105 frontend tests plus new component
test pass; TypeScript/ESLint and production builds pass. Six browser scenarios pass, including
repairing an invalid connection and clearing its highlight in the three-language diagnostic flow.
Six retained project snapshots unchanged. No API/DB change; no private 164-slice parity rerun.
Next: audit direct named-output errors, runtime-to-inspector highlighting and remaining locale
coverage, then F3 composite UI/direct charts. F1 remains open; no known P0/P1 or blocker.

Previous schema diagnostic slice:

Latest slice: F1 typed schema diagnostic locations (ADR-098, 2026-09-22).
Typed operand/context, sum/filter and scalar/name errors preserve input/config paths and wire IDs.
Inspector error messages identify inputs and provide RU/EN/TT repair instructions. Public API
shape, database schema and calculation semantics are unchanged. F1 remains IN PROGRESS:
comparison/compiler and runtime-boundary paths, inline highlighting and remaining error coverage
are next; then F3 composite UI/direct chart bindings and F4/operator acceptance.
Checks: 336 backend tests pass with SQLite/PostgreSQL (6 SQLite-only skips); Ruff/format/mypy pass.
105 frontend tests pass; localization rerun passes after removing a duplicate translation key
caught by TypeScript/build. TypeScript/ESLint and final production Docker builds pass.
Backend/frontend deployed healthy. Browser diagnostic scenario passes in all three languages;
field-editor regression results are recorded in QA_REPORT. Six retained project snapshots match.
No known P0/P1 in this slice, no implementation blocker. Private 164-slice parity not rerun.

Previous large-graph slice:

Latest slice: F2 bounded field rendering and large-graph navigation (ADR-097, 2026-09-22).
Scrollable unconnected fields mount at most 16 rows; connected/focused ports remain pinned.
Graphs over 40 nodes default compact; node search reveals and navigates to nodes/workbooks.
Removed the unused classic schema GET in field mode. Backend/API/DB unchanged.
Synthetic 168-node graph with a real generated 1024-column Excel: initial handles 3695 -> 335,
canvas elements 15303 -> 4887, schema requests 2 -> 1. Observed readiness 3173 -> 1852 ms;
navigation 525 ms (single local runs, not a productivity claim). No eager previews/view saves.
Checks: 104 frontend tests, TypeScript, ESLint, production Docker build and 14 focused browser
scenarios pass. Frontend deployed healthy; six original/UX-copy snapshot endpoints unchanged.
No full backend/PostgreSQL/private 164-slice parity rerun for this frontend-only slice.
Next: remaining F1 diagnostic field paths, F3 composite UI/direct chart bindings, then F4 and
retained financial-copy/operator acceptance. F2 remains open for that acceptance. No known
P0/P1 in this slice; no blocker to implementation of the next task.

Previous operation chooser slice:

Latest slice: F2 operation chooser on output drop (ADR-096, 2026-09-22). Dragging a real or workbook
output to blank canvas opens compatible registry operation/input choices with search. Selecting
an output and using Add operation to output offers a keyboard alternative. Current schema is
required; applying the choice revalidates it. Node plus wires is one undo/save action. Typed
value/table operations connect the exact row_context table when available; no table is guessed.
Capacity and declared composite public boundaries are respected. Escape/cancel do not mutate
the graph. Other required settings remain visible in the inspector. No API/DB/backend change.
Checks: 103 frontend tests pass; targeted operation tests rerun after optional-port handling fix.
TypeScript/ESLint and production Docker build pass. Twelve existing browser scenarios pass;
the new operation scenario passes after comparing graph arrays by stable ID (API order is not
semantic). Six original/UX-copy snapshots remain unchanged. Frontend deployed healthy.
Next: F2 large-graph/virtualization acceptance and remaining F1 diagnostic fields; then F3
composite UI/direct chart bindings and F4. No known P0/P1 in this slice; F2 is not complete.

Previous connection-hints slice:

Latest slice: F2 connection hints and explicit field paths (ADR-095, 2026-09-22).
Dragging an output highlights compatible/blocked/pending inputs with localized text and symbols,
using the same validator as connection creation and normalized workbook endpoints. Known numeric,
boolean and comparison type constraints are checked locally; missing current schema stays pending.
Output-label clicks highlight exact field wires through expressions and dim unrelated edges;
tracing stops at produced tables. This is not inferred column lineage through Join/Group By.
Selection and aborted drags do not change graph revisions. Clear button/Escape remove path focus.
Checks: 99 frontend tests, TypeScript/ESLint, Docker production build and 12 browser scenarios
pass; six original/UX-copy snapshots match. Backend/DB/API unchanged; no full backend/private
164-slice parity rerun this session. Docker frontend is updated. No known P0/P1 in this slice.
Next: compatible operation menu on blank-canvas field drop, then large-graph/virtualization
acceptance and remaining F1 diagnostic fields. F3 composite UI and F4 acceptance remain open.

Previous workbook-card slice:

Latest slice: F2 canvas workbook cards (ADR-094, 2026-09-22). Explicit grouping from Excel Source
inspector, sheet selection/field wires, persistent collapse and position, button/native-drag
detach, return and ungroup now use the existing presentation contract and graph history/CAS.
Visible book handles project real sheet endpoints; persisted wires and calculation IDs stay
unchanged. Connected ports remain visible when collapsed. Source deletion/change reconciles
membership and removes empty books atomically. Existing projects are not auto-grouped.
Checks: 96 frontend tests, TypeScript/ESLint and Docker production build pass. Twelve focused
browser scenarios passed before extending native drag/delete; final rerun has all four field
editor scenarios passing, with the other eight regressions passing on the same deployed code.
Six original/UX-copy snapshot endpoints match. No backend/API/migration changes.
Next: compatible operation menus/highlighting, selected field path, large-graph/virtualization
acceptance and remaining F1 diagnostic field paths. F3 composite UI and F4 remain pending.
No known P0/P1 in the delivered implementation; full F2 completion is not claimed.

Earlier navigator slice in this session:

Current session: F2 workbook navigation (2026-09-22). Added a searchable, expandable source
browser with bounded sheet lists, click and native drag insertion into the canvas. Existing
configured sheet instances reopen by ID without changes to config/position/wires; different
books with matching sheet names remain separate. Creation uses ordinary source nodes and
shared history/autosave. Browser expansion/search are local view state. No backend/API/DB changes.
Next: actual canvas workbook containers with persistent collapse/detach/reveal; then compatible
drop menus/highlighting and field dependency focus. F2 is not complete; F3/F4 remain pending.
Checks so far: 93 frontend tests, TypeScript, ESLint and production Docker build pass; new
image deployed healthy. Six original/UX-copy snapshot endpoints match. Browser suite: 38 passed,
13 opt-in private-project scenarios skipped.
Backend suite not rerun for this frontend-only change. No known P0/P1 in the added navigator.

Previous F2 slice (2026-09-21):

Current milestone: F2 opt-in field editor, IN PROGRESS (ADR-093); F1 diagnostics remain open.
Latest completed slice: explicit new-v2 editor with field cards, eight operation forms, drag/list
connections, shared revision-safe autosave/history and two independent named-output A/B previews.
Authoring Excel -> multiply quantity/price -> append Revenue -> sum now works through the UI.
Schema POST accepts preview parameters; partial typed drafts retain usable independent schemas.
Late previews are keyed by node/output/parameters and saved revision. Classic and field editors
use separate local recovery namespaces. Wrong-format drafts are refused, never auto-upgraded.
Entry: project workflow page -> New field workflow; reopen v2 via Field editor (mode=fields).
Operator steps: docs/FIELD_EDITOR_GUIDE.md. Existing projects are not converted automatically.
Next: workbook/sheet container UI and detach/reveal, compatible-port highlighting/drop menus,
field dependency focus, complete virtualization/large-graph acceptance. Finish diagnostic field
paths; F3 composite UI and direct field chart/scalar KPI remain pending. Constant form currently
offers number/string/boolean/null; date/integer-specific controls remain to extend. Container
metadata is preserved but represented as individual nodes; A/B pins are page-local view state.
No known P0/P1 in this delivered slice; F1-F4 and operator measurements remain incomplete.
Validation details: docs/QA_REPORT.md. Full backend suite: 328 pass, six SQLite matrix skips;
parameterized-schema API and legacy workflow checks rerun on PostgreSQL after the API addition.
Frontend: 89 tests pass; all nine browser scenarios pass after the final recovery-key fix.
Type/lint/build and browser scenarios cover authoring, wire drag, A/B,
restore, undo/redo, three languages, both themes, slow saves, two tabs and classic compatibility.
Standard Docker images rebuilt/deployed; migration stays 0008. Six original/UX-copy snapshot
endpoints remain unchanged. No DB reset or full 164-slice numerical parity rerun in this slice.

Previous F1 session (ADR-092):
Latest completed subtask: workbook/composite presentation persistence with migration 0008.
Typed containers reference existing nodes/ports, including detached workbook sheets and projected
output fields. Membership, boundary ports and source references are validated without execution.
Metadata shares graph revision CAS; omission preserves stored metadata, explicit {} unwraps it.
API rename/collapse/unwrap preserves nodes, edges and computed values. Existing UI groups are
not converted. New containers are API-only until the opt-in editor is implemented.
Next: finish field-specific diagnostic paths/translations and start F2 opt-in cards/book/wires
with revision-aware drafts, configuration forms and A/B preview. Boundary-port derivation, UI
pack/unpack and undo remain F3 work. F1-F4 are not complete; no new known P0/P1 defect.
Checks: 327 backend tests pass with PostgreSQL (six SQLite-only matrix skips); targeted container,
migration and field tests pass. Ruff lint/format, mypy, generated OpenAPI drift, TypeScript/ESLint,
82 frontend tests and production build pass. Seven browser scenarios pass, now including saved
block metadata surviving an old editor's rejected save and reload.
Deployment: .backups/workflow-presentation-before.dump created before upgrade; normal Docker
backend build and healthy restart succeeded. Local DB is at 20260921_0008. Original/UX-copy
workflow/dashboard snapshots remain identical across six API endpoints. No reset/conversion.
No new-editor UI authoring acceptance, full 164-slice numerical parity or human study claimed.

Previous F1 session (ADR-091):
Latest completed subtask: data-dependent legacy schemas in mixed typed branches. Pivot now
accepts a typed upstream calculation and exposes stable fields to downstream field operations.
Schema discovery executes only validated dynamic prefixes through the common bounded engine;
ordinary static schema inference remains data-free. Parameter changes cannot reuse obsolete
Pivot fields; missing fields identify their wire. Runtime failures retain the actual node.
Next: revision-safe workbook/composite presentation metadata with migration, then opt-in
editor cards, field connections, forms/translations and A/B previews. No new UI in this task.
UNKNOWN_UNTIL_EXECUTION executors without schema discovery remain unsupported in typed branches;
the registered Pivot uses DATA_DEPENDENT and is supported. F1-F4 are not complete.
Checks: 312 backend tests pass with PostgreSQL (five SQLite matrix skips), Ruff lint/format,
mypy, OpenAPI drift and frontend typecheck pass. Seven browser regressions pass against the
updated backend. New cases cover real Excel/API save/restore, cached/uncached execution,
consecutive Pivots, parameter-dependent categories, missing fields, disconnected branches,
numeric errors, source revocation and Pivot category limits. No known new P0/P1 defect.
Deployment: standard Docker backend build and healthy restart pass; six original/UX-copy
workflow/dashboard API snapshots remain unchanged. The first snapshot request raced startup;
retry after Compose --wait succeeded. No DB migration/reset/automatic conversion. Full frontend
unit/build checks were last green in ADR-090; unchanged frontend code was not rebuilt here.
New-editor UI acceptance, full 164-slice parity and human usability remain pending.

Previous F1 session (ADR-090):
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
