# MVP 0.1.0 release QA — 2026-09-11

## Presentation and Class checkpoint - 2026-09-15

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
