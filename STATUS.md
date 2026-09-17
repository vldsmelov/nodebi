# Node BI Development Status

Last updated: 2026-09-17
Release: **MVP COMPLETE - 0.1.0, local single-user scope**

## Current milestone and last completed task

Latest session: first U4 delivery edits existing visualization nodes directly from dashboard
widgets (ADR-080). The shared schema-aware form changes only node config through workflow CAS.
Saved usages are listed; shared edits require acknowledgement. Dashboard drafts/layout and
widget overrides are preserved. Conflicts retain the modal draft; reload discards it explicitly.
73 frontend tests, TypeScript, ESLint, OpenAPI drift and Docker production build pass.
Focused browser acceptance passes on two dashboards: shared updates, draft retention, unchanged
layout, API 409 with retained edits, explicit recovery and reload. Full browser regression:
29 passed, 10 opt-in skips (3.1 minutes), including six-dashboard restoration after frontend/
backend/PostgreSQL restart, three languages and both themes. Frontend is deployed locally.
Evidence: .backups/ux-dashboard-settings-build.log, ux-dashboard-settings-focused.log and
ux-dashboard-settings-full-e2e.log.
Current milestone: U4 in progress. Next: create/copy node + widget via atomic or recoverable
saves and exact-branch navigation; then ID/label selectors, guided navigation and view mode.
Human study remains U0 and unmeasured. No new P0/P1 or blocker; original project/data intact.
Backend source/contracts unchanged. Modal drafts are transient; independent copies not yet added.

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
