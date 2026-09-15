# Node BI Development Status

Last updated: 2026-09-15
Release: **MVP COMPLETE - 0.1.0, local single-user scope**

## Current milestone and last completed task

Active extension: six-screen opop_bi parity through ordinary constructor configuration.
The overview is delivered: 29 editable nodes and nine saved widgets, authored through
UI. All overview indicators, class rows/shares, cost slices and 36 service rows match
an independent oracle exported from the reviewed original implementation.
Local project: 6547673e-c856-48f8-af35-83ef354d4a58, available at
http://localhost:3000/projects/6547673e-c856-48f8-af35-83ef354d4a58/dashboard.
Private artifact .backups/reference-overview-project.json holds the IDs/configuration.

Completed: multirow/merged Excel headers, real content bounds, source-row identity,
strict Convert Types, Unpivot, Window, safe string/null/division expressions;
horizontal Bar, string KPI and per-column table formats. All use ordinary editor forms.
See docs/REFERENCE_OVERVIEW.md, docs/OPOP_CONSTRUCTOR_PLAN.md and ADR-063/064.

Latest completed task: typed workflow parameters with editor declarations/defaults and
separate preview values. Filter can reference a parameter; schemas do not require a runtime
value. Runtime values affect only dependent cache branches, with node-attributed missing-value
errors and late-response isolation. GET visualizations use defaults; POST accepts typed values.
Migration 0005 applied after backup .backups/before-workflow-parameters-20260915.sql.
Legacy saves omitting parameters preserve declarations. No reset; previous projects unchanged.

Checks: 235 backend tests pass with PostgreSQL (3 SQLite-only skips), including migration
upgrade/downgrade and compatibility. Ruff lint/format and mypy (63 files) pass. Frontend:
32 tests, ESLint, TypeScript, OpenAPI drift and production builds pass. All 15 standard browser
scenarios pass in 1.2 min, including parameter authoring/switching without revision changes,
three languages, themes and full backend/database/frontend restart. The private-workbook
scenario was separately verified at the overview checkpoint (53.8 s). After the parameter
migration/restart the same 29 nodes, graph revision and dashboard config remain unchanged;
all nine overview widget results render. No new P0/P1 in the delivered slices.

Next: dashboard declarations and explicit workflow bindings, URL state/history, value selectors,
navigation actions, highlights and dynamic titles; then five detailed dashboards and full
six-screen parity acceptance. Temporary editor preview values intentionally reset on reload;
dashboard URL restoration is still pending. Full transfer is NOT complete. No environment
blocker is known. Current architecture decisions ADR-063/064/065; overview checkpoint b70b457.
Original MVP/localization/theme evidence below remains historical.

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
