# MVP 0.1.0 release QA — 2026-09-11

## U5 retained project copy and large-graph projection - 2026-09-18

Independent API-created project 2173f33a-aa46-46af-9a19-b720de4fd036 retains 168 nodes,
172 edges, 53 visualizations and 55 widgets in six dashboards. Computations remain ordinary nodes;
only presentation changes were applied. Source and PostgreSQL backups exist and archive listing
passes; local Excel SHA-256 matches a stored artifact. Backup restore into a separate DB was not
repeated this session. Operator instructions and links: docs/U5_ACCEPTANCE.md.

**164 slices / 1551 widget pages** compared exactly against the retained original project after
normalizing copied identities and workflow revision. This is copy equivalence to the previously
verified reference, not a fresh independent execution of every opop_bi formula. All slices were
compared before restart; after backend/frontend/PostgreSQL restart, 55 sample widget results,
complete graph/dashboard snapshots, six browser views and typed URL slices are preserved.
All three languages and both themes pass. A copied table transition remains within the copied
project. The original project is unchanged. Checkpointed comparison resumed after 124 successful
slices with identical source/copy fingerprints; the restart ran after the separate regression ended.

Final presentation refinement uses existing UI controls to show service names instead of bare
source-row IDs on the two service selectors. IDs remain numeric in URL and workflow filters.
All 18 affected widget results are equal before/after, graph revision is unchanged, and saved
labels plus the selected service survive another backend/frontend/PostgreSQL restart. This
refinement followed the exhaustive data comparison and had its own targeted persistence check.

P2 reproduced on the real copy: collapsed cards overlapped at member-coordinate minima and the
minimum zoom clipped large diagrams. Fixed by separate compact summary layout (grid fallback for
contracted visual cycles), collision avoidance for partial summaries and 0.05 minimum zoom. Boundary
ports/edges and real coordinates remain intact. Unit tests cover tall groups and visual cycles;
browser checks every real copied group for non-overlap, full viewport containment and no graph save.
Intersection ratios tolerate subpixel float rounding (observed 0.99999982 for a fully visible card).

Checks: **82 frontend tests**, TypeScript, ESLint and Docker production build pass; frontend deployed.
Full browser suite: **35 passed, 12 opt-in skips (3.8m)**; the two new private U5 scenarios pass
separately, including actual restart. The full-suite restart flags were disabled to avoid interrupting
parallel read-only comparison; restart evidence comes from the U5 scenarios. An older navigation
test assumed a single alert; it now specifically asserts the invalid dashboard parameter because
its bound choices query may also report an error. The corrected full run passes.
Backend/API/schema/dependencies unchanged; prior backend baseline: 256 passed, 4 SQLite-only skips,
PostgreSQL enabled. No new known P0/P1. Human U0/U5 measurements remain pending, not simulated.

Evidence (ignored private artifacts): .backups/ux-project-copy.log, ux-copy-regression.log,
ux-copy-parity.log, ux-copy-parity-before-resume.log, ux-copy-parity-report.json,
ux-copy-parity-before-restart.json, ux-copy-unit.log, ux-copy-build.log, ux-copy-groups.png,
ux-copy-{ru,en,tt}-{light,dark}.png and ux-copy-named-selection-*.png. Group and Russian light
screenshots reviewed. A fresh exhaustive run is required after subsequent configuration changes;
the earlier comparison checkpoint intentionally rejects the final label-refined dashboard snapshot.

## U4 view mode and placement templates - 2026-09-18

79 frontend tests pass, with both template layouts tested for deterministic, non-overlapping
placement of 100 widgets, semantic preservation and URL typed-value preservation. TypeScript,
ESLint and Docker production build pass; frontend is deployed. Focused browser acceptance passes:
preview/cancel, apply, title edit, draft view toggle, position-only undo, save, reload, drill-through,
parameter selection and browser Back. Read-only viewing does not save dashboard/workflow revisions.
The test waits for client navigation before reload; the initial test race was corrected.
Full browser/restart regression: **35 passed, 10 opt-in skips (3.6 minutes)**, including six-dashboard
restoration after frontend/backend/PostgreSQL restart, both themes and three languages.
Evidence: .backups/ux-dashboard-view-unit.log, ux-dashboard-view-focused.log,
ux-dashboard-view-e2e.log, ux-dashboard-view-build.log and ux-dashboard-view.png (reviewed).
Backend/API/schema unchanged; prior 256 passing PostgreSQL-enabled backend checks with four
SQLite-only skips were not rerun. No new known P0/P1. View mode is presentation, not access control;
undo lasts for the mounted editor and is invalidated by manual layout/membership changes.
U4 is complete; U5 project-copy parity and human operator evaluation remain pending.

## Grouped Unpivot checkpoint - 2026-09-17

250 backend tests pass with PostgreSQL (4 SQLite-only skips), Ruff lint/format (104 files), mypy
(66 files), 57 frontend tests, TypeScript, ESLint, OpenAPI drift and production builds pass.
New backend cases verify repeated labels preserve every row, source ID/value/provenance and
reject blank/oversized/foreign labels. Frontend tests cover type/name/group validation, quoted
group constants, repeated label configuration and label cleanup when changing field roles.
Browser creates two groups from a synthetic parts workbook entirely through the wizard. Six
records with repeated labels remain distinct with values 1-6 and original col_2/col_3/col_4 IDs.
The whole five-node extension saves one revision and supports atomic undo/redo. A label edited
in the ordinary Unpivot form changes only its two rows; data and reload remain correct.
Screenshot .backups/ux-grouped-unpivot.png visually reviewed. 27 browser scenarios pass in
2.8 min (10 opt-in skips), including six-screen result equality after application/PostgreSQL
restart, three languages and both themes;
log .backups/ux-grouped-unpivot-e2e.log. Backend log .backups/ux-grouped-unpivot-backend.log.
No original-project mutations or new infrastructure. Human usability measurements remain pending.

## Preparation table checkpoint - 2026-09-16

55 frontend tests, TypeScript, ESLint, OpenAPI drift and Docker production build pass.
Focused browser acceptance uses synthetic inventory data, independent of the financial example.
It creates the preparation branch through UI, verifies one save revision, the strict conversion
error with field ID/row, then edits the ordinary Convert Types node to explicitly allow null.
Expected final columns/order, filtered rows, zero/empty fills and integer schema match. The raw
backend response preserves 9007199254740993 exactly (asserted before JavaScript number parsing).
Atomic branch undo/redo and reload pass. Initial assertion expected a display label in the
conversion error; corrected to the existing stable field ID plus exact row/type contract.
Pure tests cover generated node ordering/configs, backward-compatible calculated batching,
unique normalized names, empty selections, incompatible policies and integer fill conversion.
Screenshot .backups/ux-preparation-table.png visually reviewed. 26 browser scenarios pass in
2.8 min (10 opt-in skips), including six-screen equality after application/PostgreSQL restart,
both themes and three languages; log .backups/ux-preparation-table-e2e.log. Docker registry TLS timeout resolved on retry.
Backend unchanged; previous PostgreSQL/backend baseline applies. No user data reset.

## Calculated-field table checkpoint - 2026-09-16

52 frontend tests, TypeScript, ESLint, OpenAPI drift and production build pass.
25 browser scenarios pass in 2.6 min (10 opt-in skips), including six dashboards/results after
frontend/backend/PostgreSQL restart, three languages and both themes. A final presentation
adjustment centers the modal and keeps Apply/Cancel visible; focused acceptance passes after
that build. The final screenshot was visually reviewed. Backend unchanged; previous PostgreSQL/backend baseline applies.
New tests cover backward-only stable references, normalized name collisions, branch boundaries,
no input mutation and ordinary node construction. Browser creates two dependent fields through
the table, verifies one save revision, output 128, atomic undo/redo and restored IDs/edges.
Editing the first formula yields 256 downstream. Cancelling changes leaves the graph identical;
a manual canvas-form edit is reflected when reopening the table. No hidden recipe is used.
Logs: .backups/ux-calculated-table-e2e.log and .backups/ux-calculated-table-focused.log.
Screenshot .backups/ux-calculated-table.png. No original project/data reset or schema change.
Unapplied table rows are transient; backend validates formula semantics after Apply.

## Formula presentation checkpoint - 2026-09-15

50 frontend tests, TypeScript, ESLint, OpenAPI drift and Docker production build pass.
Unit/component cases cover literal quoted/escaped strings, stable references after renaming,
missing fields, duplicate display names, canonical selection replacement and field search.
Browser acceptance replaces a named field token, restores it, renames the upstream field,
verifies the updated token with unchanged canonical ID, computes 9 and restores after reload.
24 browser scenarios pass in 2.5 min (10 opt-in skips), including six-screen result equality
after application/PostgreSQL restart, both themes and three languages. Log .backups/ux-formula-e2e.log.
Backend remains unchanged; previous 249-test PostgreSQL baseline applies.
This is a readable token view with canonical text editing, not a rich text editor. Detailed
provenance labels and expression-adjacent errors remain planned; no human speed claim is made.

## Configuration feedback checkpoint - 2026-09-15

249 backend tests pass with PostgreSQL (4 SQLite-only skips), Ruff lint/format (104 files),
mypy (66 files), 47 frontend tests, TypeScript, ESLint, OpenAPI drift and production builds pass.
Regression verifies exact nested config paths/node IDs and omission of invalid input values,
Pydantic URLs and model dumps. Frontend tests verify translated field positions and retention
of nested issues/codes/diagnostics in Russian, English and Tatar. The prior assertion expecting
raw config.expression in UI now checks its translated label; the API path stays unchanged.
Focused browser acceptance repairs an empty Filter, switches all three languages while an
error is visible, saves a valid condition and successfully previews it. Initial test selector
also matched Next.js's empty route announcer; scoped to the configuration sidebar.
23 browser scenarios pass (10 opt-in skips), including six-screen result equality after
application/PostgreSQL restart, both themes and three languages. Log .backups/ux-validation-e2e.log.
Backend log .backups/ux-validation-backend.log. No project reset or hidden calculations.

## Group/panel checkpoint - 2026-09-15

46 frontend tests, TypeScript, ESLint, OpenAPI drift and Docker production build pass.
22 browser scenarios pass in 2.5 min (10 opt-in authoring skips), including six-screen
result/configuration equality after frontend/backend/PostgreSQL restart, both themes and
three languages. Backend unchanged; previous PostgreSQL/backend quality baseline below applies.
Group regressions check duplicate boundary labels retain node/port identities, internal edges
survive projection, membership persists, rename supports undo, dissolution preserves nodes,
and collapse/panel resizing do not save revisions. Preview rows/columns match before/after.
Initial focused test exposed a Shift-selection mismatch with React Flow's default modifier;
the editor now explicitly uses Shift as advertised. A test fixture with an empty Filter was
invalid; replaced by a configured Limit to verify real successful calculation invariance.
Final log: .backups/ux-groups-e2e.log; focused log: .backups/ux-groups-focused.log.
Visual evidence: .backups/ux-groups.png. Desktop canvas may need Fit view after widening panels.
Human authoring speed is not measured. Existing raw-validation P2 remains queued in U2.

## Presentation and Class checkpoint - 2026-09-15

Second U1 delivery adds bounded graph history and dependency layout. Backend regression now
rejects removal of attached visualizations atomically, then permits removal after explicit widget
detachment. PostgreSQL concurrency test observes pg_blocking_pids while an attachment holds
its shared visualization lock, then verifies deletion sees the committed widget and rejects it.
History tests cover field coalescing, bounded snapshots, redo branching and undo during an
in-flight save with the next acknowledged revision. Layout tests cover shared ancestors,
measured spacing, stable data/configuration and cycle/dangling-edge rejection.
Final checks: 248 backend tests pass (4 SQLite-only skips), 44 frontend tests, Ruff lint/format,
mypy, TypeScript, ESLint, OpenAPI drift and production builds pass. 21 browser scenarios pass
in 2.2 min with 10 opt-in skips, including full six-screen restart/result comparison and recovery
from a rejected chart-node deletion without losing its widget. Layout screenshot reviewed.
The initial browser attempt started before container readiness and hit connection resets;
the complete suite was repeated after readiness and passed. No tests were weakened for that.
Observed non-blocking P2: an unconfigured Filter may show a raw validation string; queued in U2.

Subsequent U1 authoring checkpoint: 40 frontend tests, TypeScript, ESLint, OpenAPI drift and
production Docker build pass. 19 browser scenarios pass in 2.3 minutes, including the six-screen
restart/result comparison, three languages and both themes (10 opt-in authoring skips).
New regression covers presentation label persistence without renaming a field, dependency
view without revisions, connected next-step creation and input replacement with no disconnected
save. Unit cases cover cycles, saturated ports and branched dependency paths. Older selector
assumptions were corrected; input labels retain both meaningful name and type. Graph screenshot
reviewed, original reference graph unchanged. Details: [graph authoring](GRAPH_AUTHORING.md).
Human usability/timing evaluation is still pending; it is not implied by browser test success.

247 backend tests, PostgreSQL matrix, Ruff/mypy, 37 frontend tests, ESLint, TypeScript,
OpenAPI drift and production builds pass. All 16 standard browser scenarios pass with
application/database restart. Dynamic titles and selected IDs are authored through the UI;
duplicate-label/zero-ID regression preserves comparison values and order.

Private Class authoring passes in 45.5 seconds: 18 new nodes and nine widgets on the existing
reference project, all four classes checked against the original, including every table row,
chart value and ratio. Overview drill-through and URL reload pass; original nodes are unchanged.
The oracle exporter now runs the pinned original route bodies for all six screen types without
starting its authentication/server infrastructure. Its output and workbook remain ignored.

## Dashboard navigation checkpoint - 2026-09-15

247 backend tests pass with PostgreSQL (three SQLite-only skips), Ruff lint/format,
mypy (66 application files), 36 frontend tests, ESLint, TypeScript and OpenAPI drift.
Production Docker images build and run with migration 0006. All 16 standard browser
scenarios pass in 1.3 min, including full application/database restart; the private-workbook
scenario remains separately opted in. The new UI recipe builds two dashboards with a
parameter binding, data-sourced choices, table-row action and parent link. It checks the
selected URL slice, reload, history, unchanged dashboard revision and invalid-URL feedback.
Backend checks cover cross-project rejection, atomic failures, legacy saves, stable extra
KPI context fields and bounded/searchable distinct choices. Frontend checks cover typed
URL values and passing stable IDs from rows with repeated labels.

One initial browser failure was traced to the authoring test editing the old dashboard
before New dashboard completed. The recipe now waits for the new context; editing controls
also stay disabled while dashboard creation/deletion is pending. No persistence defect
was found. Backup: .backups/before-dashboard-navigation-20260915.sql, excluded from Git.
No data reset. Highlighting, dynamic titles and the five detailed reference screens remain.

## Workflow parameter checkpoint - 2026-09-15

Typed Filter references are covered independently of the reference workbook: changing one
parameter changes its dependent output/cache while the source loads once and unrelated values
reuse downstream results. Defaults preserve zero/false; explicit null means missing. Invalid
types, undeclared values, missing selections and stale saves fail explicitly. PostgreSQL
migrations preserve old graphs and match ORM metadata. The UI scenario creates declarations,
sets a default, selects a parameter in Filter, changes preview without changing graph revision,
checks missing-value feedback and restores definitions/configuration after reload.
Backend: 235 tests pass with PostgreSQL (three SQLite-only skips), Ruff lint/format and mypy.
All 15 standard browser scenarios pass in 1.2 min, including full application/database restart;
the private-workbook scenario remains separately opted in. Frontend: 32 tests, ESLint,
TypeScript and OpenAPI drift pass. Both production images built and deployed. Before migration:
ignored backup .backups/before-workflow-parameters-20260915.sql. No user-data reset.
Reference overview restoration was checked separately: graph, revision and dashboard config
unchanged after migration/restart; all nine widget results render again. Dashboard URL state,
bindings/actions and five detailed screens remain unfinished.

## Constructor overview checkpoint - 2026-09-15

The private-workbook UI authoring scenario passes in 53.8 s: 29 nodes and nine widgets,
all overview KPI/cost/class/service values compared with original opop_bi v1.2 output,
exact saved widget geometry and browser restoration. Reproduction: REFERENCE_OVERVIEW.md.
The standard suite passes 14 browser scenarios (one private-workbook opt-in skip), including
frontend/backend/PostgreSQL restart. Backend: 223 passed with PostgreSQL and three
SQLite-only skips; Ruff lint/format and mypy pass. Frontend: 31 tests, ESLint, TypeScript,
OpenAPI drift and Docker production build pass. New presentation coverage checks string KPI,
persisted horizontal orientation, per-column ratios and formatted horizontal labels.
Five detailed reference screens and parameter/navigation acceptance are still pending.

## Light/dark theme follow-up — 2026-09-14

The shared semantic palette and persistent selector pass 26 frontend tests, ESLint, TypeScript,
OpenAPI drift and frontend Docker production build. Thirteen Playwright scenarios pass together
in 52.3 s. Theme-specific checks cover initial server rendering after reload, coexistence with
all three languages, unsaved project names, graph edits before debounce and unchanged persisted
graphs after switching. Dashboard tests render all remaining chart types in light mode and switch
back to dark with an unsaved widget title. Light landing/editor/dashboard screenshots were reviewed.
The updated frontend is deployed. No new P0/P1; backend/schema/dependencies were unchanged.
This follow-up reran browser reload acceptance; full-stack restart evidence remains in the
localization/release runs below. Theme choice is a one-year cookie and does not change project data.

## Localization follow-up — 2026-09-14

Russian default, English and Tatar localization passes 26 frontend tests, ESLint, TypeScript,
OpenAPI drift and frontend Docker production build. Eleven Playwright scenarios pass together
in 53.7 s, including frontend/backend/PostgreSQL restart and the full Sales Analysis journey.
Restored dashboard rendering: 1347 ms in that run. Tatar editor/dashboard screenshots were
visually reviewed: labels fit the desktop layout and Cyrillic/Tatar characters render correctly.
The preference survives navigation, reload and a new browser context; user strings and active
workflow/dashboard drafts remain intact. A discovered locale-switch/debounce cancellation
was fixed by separating writer lifetime from localized navigation listeners, with a browser regression.
Backend code, migrations and dependencies were not changed or revalidated as a new backend release.
No data reset and no new open P0/P1. The original release evidence follows unchanged.

Required local single-user MVP acceptance passed. Known open P0/P1: zero.
This validates the documented bounded workload and product scope, not public multi-user deployment.

## Automated gates

| Gate | Result |
| --- | --- |
| Backend SQLite + PostgreSQL | 208 passed; three PostgreSQL-only scenarios skip on SQLite and pass on PostgreSQL |
| Ruff lint / format | Pass, 85 checked Python files |
| mypy strict | Pass, 58 application files |
| Frontend Vitest | 20 passed |
| ESLint / TypeScript / OpenAPI drift | Pass |
| Docker production build | Backend and frontend pass |
| Runtime dependency consistency | pip check passes; XML protection enabled |
| npm production dependency audit | Zero reported vulnerabilities |
| Playwright on isolated clean stack | Eight scenarios passed together in 50.2 s, including full restart |
| Playwright on normal stack after diagnostic/CORS fix | Eight scenarios passed together in 50.7 s; restored dashboard 1368 ms |

## Coverage and evidence

| Area | Evidence |
| --- | --- |
| Graph ownership, atomic revision, concurrent writes, migration upgrade/downgrade/model drift | test_workflows_api.py, test_repositories.py, test_migrations.py on PostgreSQL |
| Source delete versus new graph reference | test_source_concurrency.py; one operation succeeds and the other reports a controlled conflict |
| Excel duplicates/blank headers, late mixed values, Unicode values, dates/nulls, multiple/empty sheets, no worksheets | test_excel.py, test_sources_api.py |
| Upload extension/size/path handling, malformed/forbidden XML, inert macro payload | test_sources_api.py, test_excel.py; defusedxml enabled in deployed image |
| Port/cycle/missing input, disconnected branches, deletion and upstream invalidation | test_workflow_validation.py, test_execution.py, test_workflows_api.py, browser editor tests |
| Formula safety, null/empty/zero division, sorting/aggregation, Join/Union/Pivot schemas | test_arithmetic_nodes.py, test_combine_nodes.py, test_filter.py; combine.spec.ts |
| Chart limits, empty/null/negative values, numeric axes, invalid field/format, table pagination | test_dashboards.py, visualizations.test.tsx, charts.spec.ts |
| API malformed JSON/UUID/nonexistent entities, sanitized unexpected failure and diagnostic correlation | test_qa_errors.py |
| Cache ownership/artifact checks, byte budget, cold-load sharing, failure retry | test_cache_safety.py, test_execution.py |
| Draft conflicts/recovery, slow acknowledgements, navigation before debounce, stale preview/errors | editor.spec.ts, autosave.test.ts, node-output.test.tsx |
| Dashboard CRUD, title/visibility, add/remove, drag/resize/reload and isolated widget errors | test_dashboards.py, charts.spec.ts, transforms.spec.ts |

The canonical browser journey creates **Sales Analysis** and uploads sales.xlsx through the UI,
selects Sales, previews it, filters country = Korea, computes quantity * price, aggregates revenue
by category and creates Bar/KPI. The KPI is explicitly checked as **500**. Both widgets are moved,
the Bar widget is resized, then saved. Frontend, backend and PostgreSQL restart together. The full
workflow payload and widget layout match their saved versions; the chart and KPI render again.

## Clean installation rehearsal

An isolated Compose project `nodebi-release-20260911` was built from the documented configuration.
A copy of .env.example was used, with isolated loopback ports 13000/18000/15432 and matching
frontend API/CORS URLs. Docker created fresh PostgreSQL/source volumes, applied all migrations,
and reported backend/database health. The normal stack and its existing volumes were preserved.
Generated rehearsal config: `.backups/release-smoke-20260911/compose.yml` (local, ignored).
The rehearsal containers were stopped/removed after verification; their volumes were preserved.
Restart that test stack from the repository root with:

```powershell
docker compose -p nodebi-release-20260911 -f .backups/release-smoke-20260911/compose.yml up -d --build --wait
```

Browser invocation from frontend:

```powershell
$env:NODEBI_E2E_API='http://127.0.0.1:18000'
$env:NODEBI_E2E_URL='http://localhost:13000'
$env:NODEBI_E2E_RESTART='1'
$env:NODEBI_E2E_COMPOSE_FILE='D:\projects\nodeBI\.backups\release-smoke-20260911\compose.yml'
$env:NODEBI_E2E_COMPOSE_PROJECT='nodebi-release-20260911'
npm run test:e2e
```

For the ordinary stack, omit the endpoint/Compose overrides and keep NODEBI_E2E_RESTART=1.
Backend checks use NODEBI_TEST_POSTGRES_URL with 127.0.0.1:5432 and connect_timeout=5.
Do not run restart acceptance and PostgreSQL tests on the same database simultaneously.

## Findings resolved

| Severity | Finding | Resolution |
| --- | --- | --- |
| P1 | Backend could exit during simultaneous DB restart | Bounded readiness probe before migrations; actual restart acceptance |
| P1 | Excel XML entity protection absent | Pinned defusedxml and initial/lazy XML regressions |
| P1 | Source deletion could race with a newly saved JSON reference | Project row lock and same-project reference validation, PostgreSQL concurrency regression |
| P2 | Preview lacked the column resource cap | 1025-column preview rejected |
| P2 | Old preview error could reappear after graph revision changed | Revision-aware NodeOutputPanel with delayed-result/error regressions |
| P2 | Parallel widget requests could duplicate a cold workbook load | Shared source-load operation; concurrent cache test |
| P2 | Chart accessible name replaced by generated ECharts text | Explicit aria description and browser assertion |
| P2 | Scatter X could contain nonfinite values | Both axes checked; infinity/NaN regression |
| P2 | Diagnostic ID absent from plain error log text and unreadable by the cross-origin browser on HTTP 500 | UUID appears in logs and UI; the 500 handler preserves the configured origin allowlist, with regression coverage |

Test issues were corrected rather than waived: a PostgreSQL suite was once interrupted by a
deliberate concurrent restart, and pointer resize initially targeted a moving animation. The final
tests use separate stacks, stable semantic widget selection and verify actual resize before saving.

## Performance and UX smoke checks

`backend/.venv/Scripts/python backend/scripts/benchmark_mvp.py` generates 50000 rows/3 columns
(580373-byte Excel), creates its own temporary project, verifies counts and the exact 2500000
aggregate, then removes only that project.

| Operation | Local elapsed ms |
| --- | ---: |
| Upload and inspection together | 699.1 |
| First source preview/materialization | 2016.5 |
| Repeated source preview | 10.2 |
| Filter using loaded source | 16.9 |
| Calculated Column and Group By | 16.8 |
| Chart using cached aggregate | 18.4 |
| Separate Windows reader inspection of the same generated shape | 801.2 |
| Full dashboard reload after stack restart | 1402 |

These are separate local runs, not additive timings or a concurrency guarantee. Screenshots of all
chart types were visually inspected; widget content stays within bounds. The full browser journey
exercises upload, connection/configuration, previews, feedback and responsive drag/resize interaction.

## Deferred non-blocking limitations

* P2: abrupt failure before upload compensation is journaled may leave an orphan. Compare metadata
  and storage before manual reconciliation; no automatic orphan purge runs (ADR-054).
* P2: cache byte estimates exclude Python/engine overhead. No multi-user load guarantee.
* P3: upstream TestClient/Vite deprecation notices and extended accessibility/keyboard polish.
* Defined scope: Float64 precision, one-key inner/left Join, 128 Pivot categories, 2000 chart points;
  optional OR, advanced formulas, multiple series, duplication and undo/redo remain deferred.
* Tab-local drafts end when the tab closes; beforeunload warns about pending changes.

No existing project data was reset. Backup and historical evidence remain in the handoff/status files.
# Constructor preparation checkpoint — 2026-09-14

The six-screen opop_bi parity extension is still in progress. This checkpoint verifies
only general import/preparation capabilities; it is not evidence of dashboard parity.

- PostgreSQL + SQLite matrix: 222 passed, 3 SQLite-only skips (26.02 s).
- Targeted final import/preparation/cache checks: 34 passed.
- Frontend: 29 tests, ESLint, TypeScript, OpenAPI drift check and production builds pass.
- Browser regression: 14 passed in 55.6 s. New preparation scenario imports a synthetic
  workbook with multirow merged headers and a formatting-only tail, configures Convert
  Types, Window and Unpivot in the UI, checks results and reloads the saved graph.
- The supplied private workbook loads 45 raw rows and 38 original columns with layout
  header_row=3, header_rows=2; optional row identity adds a 39th column. No financial
  totals or reference parity are claimed. User data stays outside Git.
- Main backend/frontend images rebuilt; persistent volumes were not reset.

## Constructor extension final acceptance - 2026-09-15

Approved six-screen scope is complete: 168 editable graph nodes and 55 widget placements.
All 164 reference slices were compared to pinned original outputs. The final chart audit
verified two doughnuts/ten bars and reference orientations; all layouts persist.

247 backend tests pass on PostgreSQL (3 SQLite-only skips); Ruff lint/format and mypy pass.
37 frontend tests, ESLint, TypeScript, OpenAPI drift and production build pass. The final
browser run passes 18 scenarios in 1.8 min; 10 private authoring scenarios are intentionally
opt-in and were exercised separately. Restart acceptance verifies identical graph, dashboards
and 55 widget results after restarting frontend/backend/PostgreSQL. All six pages restore
URL slices; service-cost rendering passes three languages and both themes. Russian/light
and Tatar/dark screenshots reviewed. No open extension P0/P1.

[Final report and reproduction](OPOP_CONSTRUCTOR_ACCEPTANCE.md) documents private artifacts,
backup, stage-history distinctions and the non-blocking source-row-ID selector limitation.


## Formula diagnostics beside expression (2026-09-17)

58 frontend tests pass, including pending/stale message removal and node/field context.
TypeScript, ESLint and local production build pass. Docker frontend rebuilt/deployed.
Focused formula browser acceptance passes: stable-reference rename and preview/reload,
invalid syntax shown beside expression, correction and normal autosave.
Evidence: .backups/ux-formula-diagnostics-build.log and ux-formula-diagnostics-e2e.log.
Backend/full restart matrix was not rerun: this change only presents existing server issues.
Richer source labels and U0 human measurements remain pending.


## Formula value origins (2026-09-17, ADR-077)

63 frontend tests pass. New cases cover Join with repeated column IDs, rename/calculation,
Union name alignment, identical filenames, cycles/missing metadata and original-header search.
TypeScript and ESLint pass; Docker production frontend build passes. Focused formula browser
acceptance verifies original Excel header/column after rename, filename search, preview/reload
and correction of invalid syntax. Screenshot .backups/ux-formula.png visually reviewed.
Evidence: .backups/ux-provenance-build.log and .backups/ux-provenance-e2e.log.
No backend/API/persistence changes. The full PostgreSQL/restart matrix was not rerun for this
presentation change. U0 human study remains pending. Staged batch rows show provenance only
once applied and opened as saved ordinary nodes; row-selection dependencies are not value origins.


## Share/rank authoring (2026-09-17, ADR-078)

67 frontend tests pass; TypeScript, ESLint, OpenAPI drift and Docker production build pass.
Compiler cases protect partition/global scope, stable denominator ID, null/zero fallback,
parameter type compatibility, post-calculation filtering, explicit rank tie-break and upstream
traversal. Browser acceptance authors grouped share, global share and rank entirely in the UI
on a synthetic inventory workbook. Group total remains 60 across selected items; input total
is 100 and comparison retains all six rows. Zero denominator returns null; a normal formula
edit changes fallback to zero. Tied ranks follow Item ID despite reversed input order.
One revision per insertion, undo/redo, reload and upstream parameter disclosure are checked.
Screenshot .backups/ux-analytics-helper.png visually reviewed. No original project changes.
Evidence: .backups/ux-analytics-build.log, ux-analytics-e2e.log, ux-analytics-full-e2e.log.
Backend source/contracts unchanged; dedicated backend unit/PostgreSQL matrix was not rerun.
U3 path highlighting/existing-graph parameter inspection and U0 human measurements remain open.

Final full browser run: 28 passed, 10 opt-in skips (3.2 minutes). Includes retained six-dashboard
results/configuration after frontend/backend/PostgreSQL restart, three languages and both themes.
Frontend deployed locally. All original reference configurations remain intact.


## Saved calculation scope (2026-09-17, ADR-079)

71 frontend tests pass; TypeScript, ESLint, OpenAPI drift and Docker production build pass.
New regressions classify filters before/after an explicitly selected calculation and on other
Join inputs, exclude unrelated calculations, terminate cycles, retain repeated parameter
application points and tolerate malformed conditions. Component acceptance checks field/parameter
labels, explicit selection, highlight callbacks and navigation without modifying graph inputs.

Focused browser acceptance passes on the synthetic inventory graph: input/path highlighting
has correct node opacity, normal dependency controls clear custom highlights, inspection does
not save a revision, and opening the calculation permits an ordinary Limit branch before the
selection Filter. Comparison keeps six rows across item changes while the selected branch keeps
one; both restore after reload. Screenshot .backups/ux-calculation-scope.png visually reviewed.
Evidence: .backups/ux-scope-build.log, ux-scope-focused.log and ux-scope-full-e2e.log.
Backend/API/DB unchanged; the separate backend unit/PostgreSQL matrix was not rerun.
No claim of automated formula-denominator inference or measured human speed improvements.

Final full browser regression: 28 passed, 10 opt-in skips (3.3 minutes), including six-dashboard
recovery after frontend/backend/PostgreSQL restart, three languages and both themes. Frontend
deployed locally; original project configurations/data intact.


## Edit visualization from dashboard (2026-09-17, ADR-080)

73 frontend tests pass; TypeScript, ESLint, OpenAPI drift and Docker production build pass.
Component regressions cover retained settings on failed save, expected-revision/selected-node
payload and refusal to edit mismatched workflow/schema revisions. Browser acceptance uses a
shared chart on two dashboards: explicit shared-edit acknowledgement, both views refreshed,
unsaved dashboard name retained, source/edges and dashboard layout unchanged by chart save.
A concurrent workflow update produces HTTP 409 / WORKFLOW_CONFLICT; the user sees its localized
message, entered title remains intact, and explicit reload/reapply preserves the concurrent
workflow name. Final reload restores the updated chart. The corrected test checks API codes
in the HTTP response and human-readable prose in the English UI, matching the existing formatter.
Screenshot .backups/ux-dashboard-settings-conflict.png visually reviewed.
Evidence: .backups/ux-dashboard-settings-build.log, ux-dashboard-settings-focused.log,
ux-dashboard-settings-full-e2e.log. Separate backend unit/PostgreSQL matrix not rerun (no backend
changes). New-node creation, independent copies and navigation remain next in U4.

Final browser regression: 29 passed, 10 opt-in skips (3.1 minutes), including six-dashboard
recovery after application/PostgreSQL restart, three languages and both themes. Frontend deployed
locally. Original project/data remain intact; no settings were copied into dashboard storage.


## Atomic widget creation and independent copies (2026-09-17, ADR-081)

Backend: 252 passed, 4 SQLite-only skips with PostgreSQL enabled. New API acceptance covers
concurrent requests (one 201, one 409), workflow/dashboard CAS, valid rendered output, late
widget-validation failure rolling back graph/index/revisions, copy-only rebinding, cross-project
rejection and rejection of visualization output as a dataset input. Existing migration/locking
regressions remain green. Ruff lint/format: 106 files; mypy: 67 source files. No DB migration needed.
Frontend: 73 tests pass; TypeScript, ESLint, generated OpenAPI drift and production builds pass.

Focused browser acceptance builds a Bar Chart from a named workflow output through dashboard UI,
checks one revision per resource, copies one shared placement independently and preserves the
original visualization on another dashboard. Dirty dashboard edits block creation/copy. A clean
local recovery snapshot left by reverting edits is cleared on success. A route deliberately drops
the response after a committed operation: retry conflicts without duplicates and explicit reload
recovers both widgets. Screenshot .backups/ux-create-widget.png visually reviewed.
Evidence: .backups/ux-widget-authoring-backend.log, ux-widget-authoring-build.log,
ux-widget-authoring-frontend-build.log, ux-widget-authoring-focused.log and
ux-widget-authoring-full-e2e.log. Original project/data unchanged. Exact-branch navigation and
remaining U4 selectors/navigation/view modes are still pending.

Full browser regression: 30 passed, 10 opt-in skips (3.3 minutes), including six-dashboard
recovery after application/PostgreSQL restart, three languages and both themes. Backend and
frontend production builds are deployed locally. No failures in required checks.


## Exact calculation navigation (2026-09-17, ADR-082)

Frontend 73 tests, TypeScript and ESLint pass. Frontend production build passes and is deployed.
Focused browser acceptance creates two workflows and a grouped visualization, opens the exact
node from its widget, expands the collapsed group, highlights ancestors and preserves the graph
revision across selection/reload. Cancelled navigation leaves dashboard edits intact; confirmed
navigation and browser Back recover them. Missing node/workflow URLs display explicit errors.
The screenshot .backups/ux-calculation-navigation.png was visually reviewed.
Evidence: .backups/ux-calculation-navigation-build.log and ux-calculation-navigation-focused.log.
Full browser/restart regression: 31 passed, 10 opt-in skips (3.4 minutes), recorded in
.backups/ux-calculation-navigation-e2e.log. Six-dashboard restoration after application/PostgreSQL
restart, three languages and both themes pass. No required check failed.
No backend/API/persistence changes. Prior backend baseline remains 252 passed with 4 SQLite-only
skips and PostgreSQL enabled; not rerun for this frontend-only change. Original project untouched.


## Parameter ID/label choices (2026-09-17, ADR-083)

Backend matrix: 254 passed, 4 SQLite-only skips with PostgreSQL enabled. API regression uses
an equipment workbook to test duplicate labels with distinct numeric IDs, repeated identical
pairs, null IDs/labels, ambiguous mappings rejected before search, literal/case-insensitive
search, limits, selected values outside the result page, boolean/datetime selected values,
missing columns, typed-value validation, legacy scalar responses and saved label configuration.
Ruff lint/format: 107 files; mypy: 67 source files; OpenAPI regenerated and drift check passes.
Frontend: 75 tests pass. Component tests verify typed selection and late previous-slice response
isolation, preserving unavailable selected IDs with a warning. TypeScript/ESLint pass.
Backend/frontend production builds pass and are deployed. Two combined attempts were interrupted
by Docker Hub metadata EOF; separate builds succeeded without changing dependencies or images.
Browser acceptance configures value/label fields through UI, preserves separate same-name IDs,
searches labels, keeps the selected label outside matching results and restores typed URL values
on reload/history without dashboard revision changes. Screenshot ux-parameter-labels.png reviewed.
Evidence under .backups/: ux-parameter-labels-backend.log, ux-parameter-labels-backend-build.log,
ux-parameter-labels-frontend-build.log, ux-parameter-labels-focused.log, ux-parameter-labels-e2e.log.
Full browser/restart result: 32 passed, 10 opt-in skips (3.3 minutes). Six-dashboard restoration
after application/PostgreSQL restart, three languages and both themes pass. Original project/data
unchanged; no required check remains failing.


## Guided widget navigation, first delivery (2026-09-17, ADR-084)

77 frontend tests pass; TypeScript/ESLint and production build pass. Navigation planning tests
cover unique typed suggestions, ambiguity, preserving explicit assignments, missing/removed
references and incompatible/required destination values. No backend/API/persistence changes;
previous backend baseline is 254 passed, 4 SQLite-only skips with PostgreSQL (not rerun here).
Browser acceptance configures a transition at its widget, blocks incomplete required mappings,
filters incompatible fields, suggests a field, previews the actual first-row value, cancels without
losing title edits, reapplies into a draft and saves through existing CAS. It verifies no workflow
revision changes and follows the saved transition after reload. Screenshot visually reviewed.
Evidence: .backups/ux-guided-navigation-build.log, ux-guided-navigation-focused.log,
ux-guided-navigation-e2e.log and ux-guided-navigation.png. Full browser/restart result: 33 passed,
10 opt-in skips (3.3 minutes). Six-dashboard restoration after application/PostgreSQL restart,
three languages and both themes pass; no required check remains failing.
Original project/data unchanged. Automatic missing-context-field addition remains unfinished U4.


## Atomic navigation context fields (2026-09-18, ADR-085)

Backend matrix: 256 passed, 4 SQLite-only skips with PostgreSQL enabled. API tests verify three
revision conflicts, project/widget ownership, shared-use acknowledgement, rejection of visible
or missing fields, incompatible mappings, rollback after graph staging, required target parameters,
one winner for concurrent requests, stable node/edge IDs and unchanged shared dashboard state.
Ruff lint/format: 109 files; mypy: 68 source files. OpenAPI regenerated and drift check passes.
77 frontend tests, TypeScript/ESLint and production builds pass; backend/frontend deployed.
Focused browser acceptance: 2 passed, covering prior staged-only behavior and new atomic context
addition. The UI blocks unsaved dashboard edits, reviews shared uses, retains mapping after a
workflow conflict, recovers a committed but lost response without repeated writes and follows the
restored transition using a hidden context field. Visible table columns and other widget settings
remain unchanged. Screenshot .backups/ux-navigation-context.png visually reviewed.
Logs under .backups/: ux-navigation-context-backend.log, ux-navigation-context-build.log,
ux-navigation-context-frontend-build.log, ux-navigation-context-focused.log,
ux-navigation-context-e2e.log. Full browser/restart result: 34 passed, 10 opt-in skips (3.4 minutes).
Six-dashboard restoration after application/PostgreSQL restart, three languages and both themes
pass. No required check remains failing. No migration/new dependency;
original project/data unchanged. U4 view mode/grid templates remain unfinished.
