# Node BI Development Status

Last updated: 2026-10-28
Release: **MVP COMPLETE - 0.1.0, local single-user scope**

## Active development: product evolution R0–R6

Overall extension status: IN PROGRESS, not R0–R6 complete.

## Repository checkpoint · 2026-10-28

Owner requested a Git commit of the accumulated implementation through ADR-219. Include source,
tests, migrations, corporate assets, demonstration setup and project documentation. Runtime data,
private workbook copies, backups and QA artifacts remain excluded by .gitignore. This is a commit-only
checkpoint; no application behavior changed or deployment performed. Validation remains the recorded
2026-10-27 result below (1578 backend/702 frontend/7 browser cases;32 PostgreSQL-only skips).
Current milestone remains delivered ADR-219; next task is physical worksheet structural editing and
independent economist acceptance. No new blocker or known P0/P1 introduced by the checkpoint.

## Current task · 2026-10-27 · ADR-219

Milestone delivered/deployed: persistent XLSX bold/italic, size, text/fill colours, alignment/wrap
through typed sparse operations, existing draft/CAS/check/apply and shared cell/format undo.
Range formatting, Ctrl+B/Ctrl+I outside text input, reset colours, protection explanations and
fixed hint space work without moving the grid. CSV has no style panel; simple synthetic headers
remain protected. Number-format and physical row/column/merge authoring remain separate work.
P1 reproduced/fixed: plain XLSX round-tripping could change untouched numeric9007199254740993
to9007199254740992. Styling-only saves now patch original OOXML; value/row saves restore exact
numeric input XML at stable row positions, including unselected sheets and explicit integer edits.
Native display also retains unsafe integers/high-precision decimals as original text.
Checks:1578 backend passed/32 PostgreSQL-only skipped,2 existing deprecation warnings; mypy191,
ruff352 pass. Frontend702/121 files pass, release maxWorkers2; configured ceiling4 avoids host
resource exhaustion. Final types/lint/API consistency and both production Docker builds pass.
Seven final production UI3030 browser cases against disposable API8020 pass in3.0m: real canvas
font paint, unchanged grid position, undo/redo, mixed styles/value save/reopen, exact native numeric
ID9007199254740993 in downloaded XLSX, formulas, protected calculations, range clipboard, both
active-save paths and connected chart updates. Earlier paint probe incorrectly equated points
with pixels; fixed oracle uses96/72 conversion. Overlapping debug runners caused a trace-output
collision; final single runner passes with no assertions/timeouts weakened. Screenshots reviewed.
Private25-sheet copy passes on Windows and Linux image with --network none:8495 shared expressions
and all13219 caches consistent, original precision/unrelated archive assets retained.
Live three-project QA opens/edits/undoes all7 files without source writes. OPIOP popup checks E9/I9
against fresh current backend formulas (never the stale ADR217 baseline);1480/390px layouts pass.
JS errors0; source writes0. Inventory preserved4 projects/9 dashboards/77 widgets/79 visualizations.
Demo3030/8030 ready; final frontend dc8a90d5f1e0/backend de273910c1a0. Verified ready backup:
.backups/update-demo-20261027-105450-d39574c1cc2a4f0c9fb2c38f19d03131/manifest.json.
Owned temporary API8020/session65769 stopped; earlier API17406/85093, dev3040 and isolated UI
container stopped. No listeners8020/3040 remain. Other stacks/user source edits preserved.
Inherited dirty tree retained, no commit/reset; private artifacts in ignored .backups. No migration,
new dependency or known P0/P1 in this delivery; no blocker. Before-task snapshots: .backups/adr219-before.
Next: persisted physical worksheet row/column/merge commands and independent economist acceptance.
Advanced Office features/full Excel parity and the remaining R6 gates are still open.

## Current task · 2026-10-26 · ADR-218

Milestone: editable showcase sources and editor usability delivered/deployed. Last completed:
source-picker pointer blocking reproduced/fixed, clean picker without inactive spreadsheet tools,
same-window file switch/dirty guard, narrow-layout wrapping, toolbar native-input completion and
paste target capture, search feedback, active-edit discard and explicit deleted-row recovery.
Recovery retains stable IDs only until preparation/apply/discard; materialized replacements assign
new row identities. All seven existing CSV/XLSX files are present/readable; no substitute data needed.
New sales seeder reuses published sales aggregation for Pareto. Existing live dedicated Pareto
graph repaired through revisioned workflow API (revision2->3), retaining visualization/publication/
dashboard IDs. Eight categories, total3195000.00, all financial values/ranks/types/currency/scales
and spec match the prior result. Point keys/lineage correctly reflect actual upstream sales fields.
Historical independent export retained because report history may need it. Repair plan/receipt:
.backups/adr218-sales-repair-{plan,receipt}.json. Initial exact-result comparison correctly exposed
changed provenance/point IDs; independent semantic comparison verifies all numeric data unchanged.
Checks:17 backend passed/2 PostgreSQL-only skipped (includes3 new end-to-end business-scenario
regressions); ruff check/format348 and documented mypy app188 pass. Broader mypy app scripts is
not the configured command and reported duplicate module naming; no app typing failure.
Frontend697/121 files pass; final types/lint/API pass and final Docker build passes. One earlier
parallel run hit an unchanged waterfall test timeout; clean full reruns pass without weakened tests.
Five final production UI3030 Playwright cases against isolated API8020 pass (2.5m): real picker
mouse clicks, exact IDs, native formulas/references, both active-save paths, toolbar undo/redo/clear,
search, delete/restore/append rows, save/reopen and actual dashboard totals. Earlier dev cases pass.
Live three-project QA opens all7 files, edits/undoes values without server source writes, switches
files and checks390px picker layout; JS errors0. All26 demo visualization result endpoints pass.
Inventory preserved4 projects/9 dashboards/77 widgets/79 visualizations. Original OPIOP editor now
contains a user-owned formula differing from ADR217's fixed baseline; stale private QA failed that
old assertion. Do not revert the source/draft or assume the old formula; this session did not write it.
Demo3030/8030 ready; frontend ad96abdc4ebb/backend114e74e56c53. Verified ready backup:
.backups/update-demo-20261026-120706-a9781f98103d4943913e148e4c070c5e/manifest.json.
Owned temporary API8020/session34079 and dev3040/session13394 stopped; other stacks untouched.
Inherited dirty tree preserved, no reset/commit. Private artifacts/screenshots remain ignored.
No migration/new dependency, no known P0/P1 in the delivered flow, no blocker.
Next: continue highest-priority source format/structure editor parity and independent economist
acceptance. Physical-book row/merge/style authoring and advanced Office capabilities remain open.

## Active highest-priority task · 2026-10-26 · ADR-217

Current milestone: native formula interaction delivered and deployed; broader Excel parity remains
the owner's highest priority. Last completed: native Univer bar/inline editing, actual f metadata
with disabled client calculation, fixed STRING vs NUMBER type (root of artificial zeros/NaN), source
numfmt/date system/theme/indexed colours/borders, raw edit restoration, selection operation bridge,
qualified name-box routing and cached row painting. No duplicate formula buffer remains. Native
internal copy/paste adjusts relative formula references; values-only/cut retain literal semantics.
Full backend1565 passed/32 skipped/2 existing deprecation warnings; focused23, mypy188 and ruff pass.
Full frontend697 passed/121 files; types/lint/API checks and production Docker build pass. Four
Playwright cases pass on dev and final production UI3030 against disposable API8020 (1.5m): actual
mouse/keyboard selection, painted numeric/date/empty values, coloured reference pixels, range
insertion, relative formula copy, exact long identifiers, both active-save paths and reload.
Private25-sheet copy: target E9 formula references display natively, I9 updates to its own formula;
desktop/mobile opening passes with zero JS errors. Initial private QA wrongly assumed the first
sheet and a cached numeric result rather than its source formula; corrected fixture addresses and
expectations against the original book, no app/test assertion weakened.
Live popup/read-only QA passes at1480x1000 and390x844, no document overflow/JS errors/external
requests or source writes. Inventory stays4 projects/9 dashboards/77 widgets/79 visualizations.
Demo3030/8030 ready; frontend ec53d6be9329/backend6cfb672da6d9. Verified ready backup:
.backups/update-demo-20261026-111427-2041d9b4a08f4623879e42b9dd3ecb44/manifest.json.
Owned temporary API8020/session44806 and dev3040/session14856 stopped. Other stacks untouched;
inherited dirty tree preserved, no commit/reset. Private QA artifacts in ignored .backups must not
be published. No migration or external service added. No known P0/P1 in this interaction fix.
Next task: persist source formatting/structural commands and continue advanced editor parity;
independent economist acceptance/R6 gates remain open. Arrays/data tables/macros, source styling
and row/column/merge authoring in physical books remain unsupported; do not claim full Excel parity.

## Previous calculation delivery · 2026-10-26 · ADR-216

Milestone: supported workbook calculation editing delivered and deployed. Last completed: explicit
Edit calculations mode, formula/value/override operations with sparse history/draft semantics,
Russian function/decimal/argument normalization outside quoted text, safe server checks and XML
patching/chain invalidation, merged anchors and the same LibreOffice/check/apply pipeline.
F2 on formulas focuses the editable bar. Shared formulas resolve via Translator; only an edited
group expands to explicit formulas, preserving every other member's references. Worksheet
protection/merges remain intact. Arrays/data tables retain a distinct structural explanation.
Native apostrophe intent is captured before SDK coercion; literal equals remains literal.
Full backend1563 passed/32 skipped/2 existing deprecation warnings; focused editor21 passed;
mypy187 and full backend ruff pass. Full frontend694 passed; final focused18, types/lint/API pass.
Earlier overlapping-code/test run failed; clean final-source full rerun passes without weakening.
Three Playwright cases pass on dev and production UI3030 against disposable API8020: range
clipboard, both active-save paths, exact IDs, protected/new/existing formulas, merged anchor,
escaped equals, rejected division-by-zero with unchanged active data, correction/save and reload.
Real25-sheet private copy: all8495 shared expressions agree with openpyxl; editing one to an
equivalent expression preserves all13219 cached results within1e-6/1e-10 relative tolerance.
Both Windows and final Linux image with --network none pass, including original precision/assets.
Live read-only check: new mode toggles and an existing formula becomes editable/F2 focuses its
bar. Desktop1480x1000 and narrow390x844 pass, JS errors0, external requests0, no document overflow.
No permanent source/report/layout values changed; inventory stays4 projects/9 dashboards/77
widgets/79 visualizations. Demo3030/8030 ready, final frontend fb7cec296577/backend84355061466f.
Verified backup: .backups/update-demo-20261026-095654-685cfa6eff0849259c7c4f304aa5096e/manifest.json.
Owned API8020 and frontend3040 stopped. Other stacks untouched; inherited dirty tree preserved,
no commit/reset. Private validation artifacts/screenshots stay ignored in .backups; do not publish.
Known limits: array/data-table formula editing, source styling/merge/row/column authoring and macros
remain out; no new external file refresh. Imported CSV/plain-table editor keeps literal semantics.
Next task: independent economist acceptance of calculation mode and the remaining R6 gates.

## Previous spreadsheet delivery · 2026-10-26 · ADR-215

Current milestone: replace modal correction with a standalone familiar spreadsheet window.
Current task: delivery complete; next is independent user acceptance in R6. Last completed: Univer OSS1.2.0
integration, native grid/tabs/ranges/inline F2, corporate Home/View ribbon, literal clipboard,
protected formula/value/address bar, search, undo/redo, zoom/freeze/column widths, save/continue,
cancel-all and CSV header/row operations. Source links open a separate window; direct old links
still work. Only this route loads the new SDK. No migration, Pro/cloud or core stack replacement.
Backend adds typed paged workspace/appearance and literal find; no whole-sheet frontend execution.
Original source patches/LibreOffice precision/check-token/CAS/apply remain authoritative. Source
values stay strings in the UI, engine calculation is disabled, protected/unloaded cells are guarded.
SDK isolated mounts/deferred disposal/Steady readiness prevent React19/remount controller races.
Selection, width, zoom and freeze survive a save in the same window; BroadcastChannel refreshes
the original report. Synthetic CSV headers preserve physical row IDs and leading-zero values.
Full backend1556 passed,32 skipped (PG/restart gates),2 existing deprecation warnings; final14
focused editor/workspace/search/prepare/apply checks pass. Mypy186 and full backend ruff pass.
Full frontend691 passed; final focused15 passed and two Playwright keyboard/button-save cases pass.
Types/lint/generated API pass; npm audit (including dev) reports0 known
vulnerabilities. A localization test once timed out under an overlapping image build; unchanged
rerun passes, no timeout/assertion weakening. Earlier duplicate-key/pixel-type build errors were
fixed before deployment. Final frontend build passes, including TypeScript and production route.
Isolated real25-sheet copy: native F2 edit, undo/redo, value paste, long00009007199254740993 code,
literal=1+1, Ctrl+S, warning confirmation/apply, continued editing/selection and popup entry pass.
Separate CSV copy: protected headers/0001 codes, append/delete/save and cancel-with-source-unchanged
pass. Fixed hidden SDK contenteditable stealing range shortcuts, awaited active F2 input before
save (including no-extra-Enter/button and exact cell restoration), close guard while typing and
duplicate StrictMode opening requests. Text transport no longer adds misleading green alerts.
New e2e/spreadsheet-window.spec.ts protects clipboard/undo/active save/reload for both save paths.
Final production UI3030 against isolated API8020: real25-sheet copy F2, Ctrl+C/V/Z/Y and Ctrl+S
directly during typing, warning confirmation, apply and continued editing all pass, JS errors0.
Permanent source entry opens a popup; desktop1480x1000/narrow390x844 pass with no JS errors,
external requests or document overflow. No permanent source/report/layout values changed for QA.
Private screenshots: .backups/spreadsheet-live-{desktop,mobile}.png; do not publish OPIOP artifacts.
Demo3030/8030 deployed and healthy. Final guarded update backup manifest is ready:
.backups/update-demo-20261026-091823-db3506ac741441e6b466cdf9c02014a9/manifest.json.
Frontend image2acb68ef099f; backend f37ffbb0f7ff. Inventory retained:4 projects/9 dashboards/
77 widgets/79 visualizations. Owned API8020 and dev frontend3040 stopped; main3000/8000 and
unrelated services untouched. No commit/reset; inherited unrelated dirty files preserved.
Known limits: source style/formula/structural authoring and macros remain outside this input editor;
native SDK messages use RU fallback for TT. Find returns first100 matches; R6 human/accessibility/
load/full-PG acceptance remains open. Next task: independent economist acceptance of the new window.

## Previous workbook delivery · 2026-10-26 · ADR-214


Current milestone: direct editing of the actual data_example workbook in the browser.
Current task: workbook feature delivered, deployed and verified; handoff complete.
Owner rejected the original-file fallback; direct worksheet editing now replaces it for data_example.
Last completed: automatic physical-sheet editor, cell/formula bar, paste/undo, worksheet selector,
row jump/paging and guarded Save changes. Complex workbook structure/formulas remain protected;
explicitly unlocked Excel inputs can be edited. Original assets/ZIP parts are preserved.
Backend recalculates a stripped copy using checksum-pinned LibreOffice26.2.6.3; formulas are
allowlisted, external references use literal saved caches and require an explicit check warning.
Existing update CAS/base/check/apply is reused, no database migration. Macro/signed workbooks,
formula authoring, structural design and external refresh remain unsupported.
Critical verification: data_example has fullPrecision=false. Copying that setting removes6645
unrequested rounding differences: all13219 original formula caches agree at1e-6/1e-10 tolerance.
Hidden rows/filter settings are also retained for SUBTOTAL calculation scope. A separate new
test protects precision and literal input preservation. Formatting-only XFD/last-row tails do not
inflate the editable area; numeric/dates/booleans stay typed and text/formula-looking IDs literal.
Latest full regression:1555 backend pass,32 skipped,685 frontend pass. The final inactive-filter
regression was added afterward; focused backend editor/calc checks14 pass, including SUBTOTAL9
versus109 with manual hidden rows. Frontend safety/editor/localization checks17 pass.
Types/lint/generated API pass, frontend production build passes. The initial Linux image smoke
found missing glib/X11-xcb runtime libraries before deployment; Docker now installs and checks them.
An isolated browser copy of the25-sheet book successfully edits/recalculates/checks/applies without
JS exceptions. Private screenshots .backups/workbook-editor-20261026-*.png; no permanent source
was edited. Final Linux (with network disabled) baseline agrees for all13219 formula results.
Production UI3030 with an isolated Linux API/copy:25 sheets, no download fallback, single-save
recalculation/check/warning acknowledgement/apply succeeds without JS exceptions. At390px the
page scroll width equals390px; dialog354px. Native live GET confirms25-sheet editor availability.
The permanent inventory stays4 projects/9 dashboards/77 widgets. Backup before deployment:
.backups/update-demo-20261026-072513-bd04a5b7e74248489f8df55fdbcdd15e, manifest ready.
Temporary API8020, dev frontend3040 and identity-verified disposable Linux API8021 stopped.
Final deployment backup: .backups/update-demo-20261026-072947-b87c1e2edc2149f49055809f9d9c2dc1,
manifest ready. Live production source opens25 sheets without a download fallback/JS errors.
Save/Close actions remain visible without scrolling to the end (desktop bottom945 of1000px,
mobile top681/bottom802 of844px;390px document width). Read-only live screenshots retained at
.backups/workbook-editor-20261026-live-{desktop,mobile}.png. Live opening reused an existing
same-base draft; no source values, reports or layouts changed. No owned temporary services remain.
Known limits: allowlisted Calc compatibility, no arbitrary Excel functions/macros or remote links;
R6 independent human/accessibility/load/full PostgreSQL acceptance remains open. No other blocker.
Next task after delivery: independent economist usability acceptance of this direct editing path.
Inherited623 dirty/untracked entries preserved; no commit/reset. See ADR-214 and REPORT_CYCLE.md.

## Previous audit delivery · 2026-10-26 · ADR-213

Current milestone: reliability, UX and maintainable local updates; technical audit delivered.
Current task: audit increment delivered and verified; the complete R0–R6 programme is not complete.
Last completed: exact quick-save job/token/revision guard, exact applied-receipt recovery after
lost HTTP response, cancellation on editor unmount, visible project-delete errors and recovery,
consistent project labels, accessible outline tokens, corrected dark pie/donut separators and
missing localization. Existing statistics/field identity calculations remain unchanged.
Security: Next/eslint-config-next16.4.3, sharp0.35.5, source-map-js1.2.2, Mako1.4.2, Vitest4.1.12
plus compatible dev transitive patches. npm audit (including dev) reports0 known vulnerabilities;
OSV runtime batch for35 Python package versions reports0. This is not OS-container CVE scanning
or a penetration test. Critical Next advisory applicability depends on specific cache features;
no exploitation of this app is claimed. Sources are linked in docs/AUDIT_2026_10_26.md.
Tests resumed for the owner's full audit:1545 backend tests pass,32 skipped (PG/restart gates).
52 selected PostgreSQL tests pass,2 SQLite-only cases skipped,50 deselected; additionally3 new
editor PostgreSQL cases and migration test pass (4). The first PG attempt raced database startup
and had4 connection errors; after readiness the same selection passes without weakening tests.
682 frontend tests pass after updating stale corporate/view-mode/history test expectations and
fixing real defects. Added exact revision/lost response/abort/delete/clipboard/editor regressions.
All backend app/scripts/tests ruff checks and mypy app (183 sources), frontend types/lint/API
consistency and production builds pass. Vitest config moved to .mts to avoid native-loader warning.
CI workflow added for future push/PR; remote GitHub Actions has not been run or claimed passing.
Starlette TestClient emits2 existing deprecation warnings; no framework replacement was attempted.
Operations: scripts/Update-NodeBI.ps1 provides CheckOnly/WhatIf, build-first, stack lock, source
volume/root/local-DB guards, API/UI pause, pg_dump+files, checksum/image manifest and readiness.
Failure before deployment restores original containers; after deployment it never auto-restores
or downgrades data/schema. Node/Python base images are digest-pinned. No new DB migration.
Updater safety harness proves CheckOnly/WhatIf/build-failure do not mutate an app. Real updater
ran successfully, preserving4 projects/9 dashboards/77 widgets/79 visualizations. Verified backup:
.backups/update-demo-20261026-060904-e189198071bb4029844159f0314ea0c3. Restored its database into
a disposable PostgreSQL17 DB: same counts, schema0012, all15 file hashes and source refs match.
Subsequent security-build snapshots retained as update-demo-20261026-062420-* and062804-*.
These snapshots include private OPIOP data; do not commit or share .backups.
Performance spot check: normalize100000x3 decimal cold0.026/repeat0.022s, output4.58MiB;
1000x100 cold0.030/repeat0.029s. Excludes input construction and native memory; not full load QA.
Browser:9 read-only live dashboard entries without JS exceptions; narrow project list fits390px.
On updated Next16.4.3, isolated browser correction runs real check-job/exact-revision auto-apply.
No permanent demo source or layout used for write QA. Private screenshots:
.backups/audit-20261026-{projects-mobile,input-save}.png.
Final read-only browser verification on the deployed version: all9 dashboard entries return200,
no JS exceptions; project catalog scroll width equals390px viewport, corporate logo loads.
Final frontend types/lint/API check and10 focused safety/clipboard/project tests pass; npm audit0.
Temporary write-QA API8020 stopped; the identity-verified disposable PostgreSQL container was
stopped/removed. Permanent demo remains running with4 projects,9 dashboards and77 widgets.
Known limits/next task: full PG/E2E/restart matrix, independent economist/assistive-tech acceptance,
end-to-end load and native memory. Formula/complex workbook editing still requires Excel; full
Excel recalculation, remote hosting/auth/multiple users need separate scope. See audit report.
No new known P0/P1 on reviewed paths; do not infer unrestricted deployment/security certification.
Existing608 dirty/untracked entries at session start were preserved; no commit/reset/git pull.
Primary3000/8000 stack and unrelated Alabuga services were not changed. Demo3030/8030 updated.

## Previous delivery · 2026-10-21

Current priority: simplify input editing and fix template/editor gating, ADR-212.
Current task: implementation/manual acceptance delivered; automated regression remains deferred.
Last completed increment: direct source link/single-source entry opens editor immediately; multiple
sources use cards. Save changes stages/checks/applies automatically only if checks have no issues.
Errors remain inactive in the dialog; warnings require explicit inline acknowledgement/confirmation.
Draft controls, history, completed jobs and advanced update fields are collapsed. Same-source/base
browser/empty drafts are reused. Browser availability no longer depends on blank-template metadata.
Plain legacy XLSX derives bounded nonpersistent profiles from existing layouts; edited cells retain
declared native types via the shared strict converter. No project/node/source-ID migration.
Complex workbook fallback has download plus corrected-file upload in the same editor; Save changes
runs check/apply as one action. This is not general Excel/formula evaluation. Read-only inspection
of demo data_example finds25 sheets/13219 formulas on24 sheets; it must be edited/recalculated in
Excel. Its old grey button was misleading; it now opens an actionable replacement path.
Manual isolated API: legacy editor opens despite template_available=false, safe draft reuse,
native code/integer/float round trip and check/apply. Browser production UI against isolated API:
direct opening, one-save legacy apply, all-record-deletion warning kept inactive until inline ack,
and complex-book corrected-file upload/check/apply without leaving the dialog; no JS errors.
390px fallback dialog contained. Initial multipart QA via Playwright route.fetch corrupted file
payloads (Chromium request data omits file bodies); browser-native fetch URL rewriting to the
isolated API fixed the harness, no application upload change. The same original fixture uploads
successfully through native browser fetch and Python HTTP. QA did not write permanent demo inputs.
Screenshots: .backups/quick-edit-20261021-{legacy,warning,fallback-mobile,replacement-applied}.png.
Backend affected ruff/format/mypy and frontend types/lint/generated API checks pass; production
images built and deployed. A mutable node:24-alpine tag attempted a very slow new base pull; stopped
that build and used the already deployed Node24 digest through private ignored
.backups/Dockerfile.quick-edit-frontend. Product Dockerfile/dependencies are unchanged.
Automated pytest/vitest/E2E suites remain deferred by owner, not counted as passing. Existing
normalization test hook follows the scalar converter's public name, retaining its original assertion.
Known limits: formula editing/recalculation, complex/multiple legacy layouts and period sets still
need original-file editing. The quick save does not bypass schema, source-base, revision or warning
guards; a closed browser before apply leaves a staged draft. No new dependency or DB migration.
Next: targeted automated quick-save/native-type/warning/retry lifecycle checks when suites resume;
scope a real spreadsheet engine separately if full data_example browser editing is required.
Primary3000/8000 old stack stays untouched; feature deployment targets corporate demo3030/8030.
Final live read-only check opens the exact existing data_example draft into the concise Excel
replacement dialog; zero API writes and no JS errors. Final RU primary button is localized and
expected unsupported capability is an explanatory form, not a red technical error. Final editor
has Save changes/Close with optional draft actions. Screenshot:
.backups/quick-edit-20261021-live-data-example.png (also final-editor/final-fallback).
Inventory remains4 projects/9 dashboards/77 widgets/79 visualizations. Demo services stay healthy;
owned isolated QA API stopped at handoff. No new known P0/P1 on manually reviewed paths.

Previous implementation delivery: initial browser editor.

Current priority: browser source-table editor, ADR-211, owner requested implementation.
Current task: implementation/manual verification delivered; automated regression deferred.
Last completed increment: paged CSV/plain-XLSX cell editor in source-bound file updates, Excel
TSV paste, row add/delete/last restore, local cell undo, persistent sparse draft and reload/resume.
Protected headers, string values, localized type/format hints; no JS Number conversion/formulas.
Prepare creates an immutable replacement then uses existing checks/explicit apply. Pending drafts
block generic update save/check/apply. Source-base/storage-key/revision guards, digest save replay
and atomic version-selection/prepare receipt prevent stale or duplicate writes. Existing field
bindings survive preparation. Project lock is released across separate uploader artifact reservation
and reacquired with CAS afterward. Concurrent conflict may leave an inactive staged version.
Plain input boundary rejects formulas anywhere, XLSM, complex workbook structures/options and
oversized XLSX before mutable loading. Original download/Excel/upload remains available. CSV
encoding and control characters are validated; pages/patch count/bytes/paste are bounded.
No new dependency, database table or migration. Sparse drafts use existing ReportDocument JSON.
Manual isolated SQLite API: CSV raw codes/decimal strings, persisted edits/replay/conflict,
row add/delete/restore and prepare replay, followed by check/apply. Production browser against
isolated API: XLSX save/close/reload/resume, dirty-cell addition, delete/restore, undo, TSV paste,
prepare/check/apply without JS errors; dialog fits 390px (x18,width354). Screenshots:
.backups/browser-editor-20261021-{desktop,mobile,applied,ru}.png.
Separate disposable PostgreSQL API: prepare 0.081s, check/apply, literal edited XLSX value/code,
untouched other-sheet integrity, preserved explicit dataset field bindings, duplicate prepare,
discard without input change and stale source 409. Formula on another sheet returns explicit
409 BROWSER_EDITOR_UNAVAILABLE. Control-character edit rejected 422. A 100000-row CSV page at
offset99980 returned 20 rows /1209 bytes in0.085s locally; this is a spot measurement, not load QA.
The PG harness initially targeted localhost before startup and assumed immediate background
completion; corrected to 127.0.0.1/readiness and job polling. No application change was needed.
Checks: affected backend ruff/format/mypy, generated API consistency, frontend types/lint and both
production images pass. Existing typed test fixture updated for the new additive pending flag;
no pytest/vitest/E2E suites run or newly counted. Latest images deployed on demo3030/8030.
Known limits: input tables only, no full workbook/formula editing, column/schema changes, automatic
range expansion across pages, global persisted undo or unrestricted large workbook editing.
Current plain-XLSX cap200000 cells across workbook; draft10000 cell edits/10000 row ops/4MB.
Next: targeted editor draft/retry/conflict/serialization/pagination regression when suites resume,
then broader R6 accessibility/load/locale/economist acceptance. No known new P0/P1 on reviewed paths.
Final review also invalidates source-version picker caches after browser preparation so the newly
selected replacement appears immediately without a page reload. Temporary audit APIs stopped;
disposable PostgreSQL container/data removed. Permanent demo content is not used for write QA.
Final live inventory remains4 projects/9 dashboards/77 widgets/79 visualizations; API/UI HTTP200.
The first three demo projects have prepared imports (2/3/2 respectively); OPIOP has legacy inputs
and intentionally stays on original-file download/edit/upload rather than this prepared-table editor.

Previous implementation delivery: file download/edit/upload.
Current priority: file download/edit/upload workflow, ADR-210, owner approved implementation.
Current task: implementation and manual verification delivered; automated regression deferred.
Last completed increment: dashboard/Data/history entry → source chooser → persisted source/base-bound
update → current-file or compatible CSV/XLSX template download → existing replacement/check/apply.
Current inputs download byte-exact through storage; templates retain physical headers/options,
Excel sheets/header rows, comments and text column defaults without phantom rows. Legacy/complex
and XLSM inputs explicitly fall back to the original file. File updates enforce one-source whole
replacement; source fingerprint guards save/check/apply/download after another update. Idempotent
start reuses request identity. An empty replacement of nonempty data warns and requires existing
acknowledgement. Existing generic/legacy period updates remain separate. No database migration.
Manual isolated API: CSV byte equality, header-only BOM template, replacement check/apply,
stale download 409 FILE_BASE_CHANGED, repeat start same ID; legacy XLSX byte equality/template
fallback and invalid project rejection. Simple XLSX template has headers only, sheet Sales,
text column format and field comment. Service check confirms empty replacement warning.
Production browser UI against isolated API: select source/start, download XLSX template, fill,
upload/check/apply HTTP 200; dependent KPI 0.30→0.40, no JS errors. Screenshot:
.backups/file-exchange-20261021-applied.png. A download-harness failure used an extensionless
temporary path; reading the same XLSX as a binary stream fixed the harness, not application code.
Checks: affected backend ruff/format/mypy, generated API consistency, frontend types/lint and
production builds pass. Latest frontend/backend deployed on demo 3030/8030; no saved demo input
or layout was edited for QA. Final live dashboard → file-update entry passes at 390px with
automatic single-source selection, no horizontal overflow and no JavaScript errors. No demo
update draft was created during this read-only entry check. Final inventory: 4 projects,
9 dashboards, 77 widgets, 79 visualizations. Screenshot: .backups/file-exchange-20261021-start-mobile.png.
Temporary audit API stopped; persistent demo services remain running and healthy.
Automated suites remain deferred by owner; not a full R6 or browser empty-replacement certification.
Known limits: full replacement only; no row patch/upsert/exact row diff, complex blank workbook
generation or generic append. CSV editing in Excel needs explicit text import for IDs/money.
Next: targeted automated file-exchange/stale/empty/template safety regression when suites resume,
then broader R6 accessibility/load/economist acceptance. No new known P0/P1 on reviewed paths.

Previous analysis:
Latest session: owner requested analysis of a downloadable/editable file refresh workflow.
Analysis only; no source code/API/runtime/data changes for this request. Existing version upload,
mapping/check/apply/revision/rollback cycle can be reused. No source-file download/template API
found. Universal prepared datasets currently accept complete replacement only (dataset_updates.py);
legacy period modes must not be advertised as generic append support.
Recommended next increment (not implemented): Update data entry on dashboard and source card,
source-scoped persisted update draft with current file/blank compatible template downloads,
replacement upload, validation/review and explicit apply. Bind download to source/base version;
keep connector-specific file/header/resource contracts, decimal/text-ID fidelity, and never export
an aggregated report as if it were source input. Row-level diff needs a declared unique key;
otherwise show schema/count/control-total changes without claiming exact modified-row counts.
Next implementation requires the file-round-trip increment to be requested; current response
provides the proposed interaction and boundaries. Automated checks not run for read-only analysis.

Previous implementation delivery:
Current priority: stable dashboard editing and protected layout variants, ADR-209.
Current task: implementation/manual verification delivered; automated regression remains deferred.
Last completed increment: noCompactor + preventCollision prevents neighbour pushing on drag/resize;
explicit gap collapse and type-based recommended sizing/arrangement use existing undo/redo.
Widget-menu Position and size dialog offers numeric coordinates/dimensions, recommended sizing
and one-shot insert-at-beginning. Persist immutable default/named widget layout snapshots; ordinary
save updates only the active dashboard. Named capture atomically saves dashboard plus template,
with CAS/request digest/replay guards, unique names and 50-template cap. Applying restores draft
widget set; missing visualizations are diagnosed, shared chart definitions are not copied.
New table/API/types and migration 20261021_0012, included in release snapshot/identity remapping.
Existing boards are not rearranged: current saved composition becomes their protected baseline
before the first subsequent save. Before that, read-only template lists synthesize the same baseline.
Checks: affected backend ruff/format/mypy and frontend API consistency/types/lint pass; backend and
frontend production images built, deployed to demo 8030/3030. Clean PostgreSQL migrations to head,
0012 down/up, and new SQLite migration up/down passed. Full historical SQLite migration chain
is not supported by its older JSONB-only initial migration; this is not a new SQLite acceptance claim.
Manual isolated API: first baseline, atomic named save, duplicate-safe retry, stale revision 409,
normal-save preservation and default restoration. Manual release document snapshot/restore checks
embedded ID remapping and exactly one default after saving the restored board; not a full frozen
release creation/restart acceptance. Browser: drag/resize leave neighbours unchanged, compact undo,
insert-first, named capture, reload/default restoration; no JS errors. 390px layout dialog contained.
Screenshots: .backups/layouts-20261021-{editor,mobile}.png. Pre-migration private demo database backup:
.backups/nodebi-before-layout-20261021.dump; source volume unchanged. Full suites remain deferred
per owner; no new tests counted as passing. Known limitations: recommended sizes are by chart type,
not automatic measurement of full table contents; named layouts have no rename/delete/cross-project
catalog in this increment. Broader R6 contrast/accessibility/load/economist acceptance remain open.
Next: targeted layout/collision/lifecycle regression when suites resume, then remaining R6 gates.
No known new P0/P1 on reviewed paths; no blocker.
Final live read-only OPIOP default-layout preview passes without JS errors. Inventory remains
4 projects, 9 dashboards, 77 widgets, 79 visualizations. Final isolated browser check confirms
gap collapse y=14→6 and undo→14; recommended bar height is 10 grid rows (408px).
Temporary audit API and isolated migration PostgreSQL container stopped/removed after checks;
demo containers remain running, including additive migration 0012. Private backup is retained.

Previous increment: functional/UX audit and guided use case, ADR-208.
Current task: guided report audit increment delivered; automated acceptance remains deferred.
Last implemented: overview three-step journey and business-task choice; import → active
dataset → report; preflight explanations for missing measures/KPI/Bar/Line breakdowns;
explicit read-vs-edit entry; usable default summary; recoverable missing detail selections;
separate report loading/read-error/empty states and unavailable-dataset guidance. RU/EN/TT.
Mobile wizard settings and Next precede the preview/field reference in DOM order; desktop
keeps its three-panel layout via grid areas. No saved reports/layouts or backend contracts changed.
Manual isolated API walkthrough: decimal exactness and leading zeros; profit/ratio of totals;
same-request apply returns identical IDs; stale edit rejected 409 REPORT_EDIT_CONFLICT;
source replacement with reordered columns preserves field IDs and recalculates dependent data.
Box-plot quartiles/whiskers and two-bin histogram independently checked on four decimal values.
Production browser: preselected data, missing-measure/KPI guards, save/view/reload, empty project,
unavailable dataset, OPIOP default summary/detail selection and read-failure Retry recovery.
Types/lint/final production build pass; only demo frontend redeployed on localhost:3030.
Final browser walkthrough verifies settings/Next precede preview at 390px without horizontal
overflow; 1600px keeps fields/preview/settings in three columns, and form state survives resize.
After that resize, KPI guard/recovery, preview (HTTP 200) and save/view link passed without
JavaScript errors. Screenshots: .backups/functional-20261021-{overview,builder-mobile}.png.
Permanent showcase inventory remains 4 projects, 9 dashboards, 77 widgets, 79 visualizations.
No pytest/vitest/E2E suites run: owner deferral remains in force, not a green regression claim.
Known limitations: full R6 accessibility/contrast/load/regression and economist acceptance remain
open; saved OPIOP coordinates are preserved, not automatically rearranged. No new known P0/P1
in reviewed paths, no blocker. Next: targeted regression when suites resume, remaining R6 gates.
Detailed evidence/severity table: docs/USABILITY_REVIEW.md, section 21 October 2026.

Previous delivery: corporate frontend using Alabuga Framework, ADR-207.
Pinned upstream b048bc2546a3e05131f4451a1115f7282b13523b, package 0.6.0. Unmodified tokens/
styles, four local WOFF2 fonts and two logos copied; all eight git blob hashes match upstream.
CorporateHeader, project catalog/home/navigation and shared forms/widgets/chart typography
integrated. Light corporate tokens plus Node BI dark adaptation; RU/EN/TT retained.
No npm/backend/API/database changes. Existing demo inventory before deployment:
4 projects, 9 dashboards, 77 widgets, 79 visualization documents.
Current checks: final frontend typecheck/lint and Docker production build pass. Recreated only
nodebi-demo frontend; updated UI is live on localhost:3030, API/storage unchanged on 8030.
Browser review: home, catalog, project overview, import, report builder, graph and history in
both themes; finance plus sales/logistics/OPIOP dashboards inspected. Fonts loaded locally;
sampled 1600/1440 desktop and 390px catalog/import/home had no horizontal page overflow.
RU/EN/TT kept. Screenshots: .backups/corporate-20261021-*.png (private OPIOP captures included).
Original supplied white logo was a stacked version; header uses the original horizontal
wordmark with a white CSS treatment, retaining its geometry. Mobile controls keep label
associations while visually collapsing labels; final 390px header is approximately 126px tall.
Browser review found React #418 on report-builder first loads from server sessionStorage
initialization. Client hydration gate added; final browser walk confirms a changed report
name survives reload/Restore local draft, with no page errors and no saved report created.
Automated test suites remain deferred per owner instruction. Prior R6 contrast measurements
do not certify this new theme; accessibility/regression and human acceptance gates stay open.
Next: review the live corporate showcase; resume R6 when requested. No new known blocker.
Final inventory after deployment/browser walkthrough remains 4 projects, 9 dashboards,
77 widgets and 79 visualizations. Final direct dark-builder load also has no page errors.
Full-page screenshots can capture offscreen native ECharts animations before painting;
sales-viewport-reduce/no-preference screenshots confirm the visible bars/donut render in
both motion settings. Use viewport captures for presentation evidence, not offscreen blanks.

Previous priority:
Session priority override: owner requested pausing tests and preparing business demonstrations.
Latest delivery: added fourth project, OPIOP copy 747800d4-8804-4429-b2cd-8e5d760688d6,
from original published financial project 908f1522-f6cd-42e4-93e0-0a59ae0749e8.
Six dashboards / 53 visualizations / 55 widgets plus its Excel source and v3 graph copied.
Original database read in READ ONLY transactions, source read from original Docker volume;
no original migrations or data edits. Original postgres was temporarily started for reading,
then stopped; demo services remain running. Source revision history/releases not copied.
Transfer script: backend/scripts/opiop_showcase.py; explicit --resume-project supports partial
recovery. Context-dependent legacy KPIs cannot pass the new API's empty-context render guard;
these original documents were restored through IndependentVisualizationService with schema/
binding/revision validation, without changing calculations. All other saves used public APIs.
Forward dashboard links required creating destination parameter contracts before links/widgets.
Browser walkthrough: summary charts displayed, table selection navigated to class and service
inside the copy, service KPI values displayed. No automated suites run. Screenshots in .backups
opiop-showcase-*.png are private local artifacts. README includes link and private-data warning.
Next: present four showcase projects; R6 gates remain deferred, not completed.

Previous demo increment:
Demo delivery: three persistent projects, 22 widgets / 17 visualization types, created through
public APIs in isolated nodebi-demo PostgreSQL / source Docker volumes. Frontend 3030, API 8030;
containers intentionally left running for the presentation. Standard migrations and production
Docker build succeeded. All displayed results materialized; three browser screens captured and
visually inspected (not an automated test run). README has links, restart commands and a 15-minute
business narrative, with clear separation of orders, budget scenario, cohort and expert SLA data.
New files: docker-compose.demo.yml and backend/scripts/showcase.py. Seeder creates NEW projects
on each invocation; do not rerun just to start the app. Only redundant dashboards created by the
seeder were removed; their source workflows/visualizations remain, no user data was removed.
No test suites run for this request. Prior uncompleted bullet/funnel test edits remain untouched;
the historical 669/116 frontend result below is not a fresh validation of this session.
Next: present the three demo projects; resume the remaining R6 gates when requested. No demo
blocker found. Full R1/R6 completion and human acceptance are still not claimed.

Previous acceptance work (paused for demo preparation):
Current milestone: R6 consolidated product acceptance IN PROGRESS; R2–R5 functional delivery completed.
Current task: A4-M1 waterfall/combo/Pareto paint verified; next heatmap/bullet/funnel/hierarchy.
Latest completed increment: six real SVG cases verify waterfall filled/outlined balances,
zero line/tiny dot in both orientations/themes, eight combo colours and Pareto contribution,
share and reference. Zero-total Pareto retains no drawable share/reference geometry. Existing
context-opacity checks remain complementary. No runtime/statistics/persistence edits needed.
Initial zero check counted an empty SVG path; corrected to inspect drawable geometry. Missing
required name in the new combo typed fixture was corrected, not a production contract change.
Full frontend 669/116 passes (39.02s); lint/types/API/default production build pass. Browser/
backend not rerun (test/docs only), no acceptance services started. No P0/P1 or blocker found.
Next: remaining five mark families (heatmap, bullet, funnel, treemap, sunburst), A1/A3-R,
A5-S1 and consolidated A6. R1/R6/H1/H2 remain open; no full-completion claim.
User requested ETA: rough technical-demo estimate 1–2 working days if final regression has
no major findings; human economist/screen-reader acceptance timing depends on participants.
This estimate is not a deadline or authorization to waive remaining gates.

Previous increment:
Latest completed increment: six real SVG cases verify basic bar/line/area/scatter normal
fills, lines and markers after alpha composition; area contour also passes against its own
translucent interior. Radar checks eight profile colours, 24 markers and selected/muted
contour opacity in both themes. No runtime/data/geometry/statistics/persistence edits needed.
Initial selectors missed non-interactive area paths and radar polylines; corrected against
actual SVG output before measuring contrast. All normal sampled marks pass >=3:1.
Full frontend 663/116 passes (55.99s); lint/types/API/default build pass. No browser/backend
rerun (tests/docs only), no acceptance services started. No P0/P1 or blocker found.
Scope: vector/composition evidence, not arbitrary profile overpainting/antialiasing/human
perception. A4-M1/R1/R6 and H1/H2 remain open. Next: waterfall/combo/Pareto actual mark and
zero/outline fixtures; then heatmap/bullet/funnel/hierarchy residuals, A1/A3-R, A5-S1 and A6.

Previous increment:
Latest completed increment: four real SVG tests cover box/whisker and histogram boundaries
in both themes/orientations and normal/context states. Normal contours pass >=3:1 against
CSS panel/surface and composited interior; 2px box/1px bar widths and muted 0.3 stroke alpha
are checked separately. Shared test-only contrast helper prevents duplicated arithmetic.
Initial measurement rejected eight-digit hex fills; added explicit alpha multiplication with
independent oracles. No runtime/data/statistical/persistence change needed.
Full frontend 657/116 passes (57.43s); lint/types/API/default build pass. Browser/backend not
rerun (test/docs only), no services started. No P0/P1 or blocker found. This is SVG/compositing
evidence, not pixel-level antialiasing/tiny-mark geometry or human usability certification.
Next: representative basic line/area/scatter paint, then radar and the remaining bounded
A4-M1 inventory; A1/A3-R, A5-S1 and A6 remain. R1/R6/H1/H2 are still open.

Previous increment:
Latest completed increment: real SVG tests cover all eight bubble group colours in both
themes, extracting actual fill/alpha and compositing normal 0.75 opacity over CSS panel/surface.
All pass >=3:1. Selected-versus-muted fixture verifies 0.75/0.2 separately; no runtime palette,
radius, coordinate, statistical or persisted change needed. Independent alpha oracles included.
Full frontend 653/116 passes (51.92s); lint/types/API/default production build pass.
Browser/backend suites not rerun (only tests/docs changed); no services started this increment.
This is vector/compositing evidence, not fresh browser pixels, arbitrary overlap certification
or human observations. No P0/P1 found or blocker. A4-M1/R1/R6 and human H1/H2 remain open.
Next: box-plot/histogram rendered boundary contrast around translucent interiors; then the
remaining bounded mark inventory, A1/A3-R, A5-S1 and consolidated A6.

Previous increment:
Latest completed increment: real SVG reproduced default sector contrast below 3:1 (light lime
1.659:1) and missing separators. Shared existing thematic palette, category-stable colours,
2px separators and retained hover fill now pass four real SVG cases. Existing patterns,
row ordering, exact values and 1/0.35 context opacity remain; highlighting keeps boundaries.
Full frontend 651/116 passes (46.66s); 11 browser cases pass (1.1m),
.backups/r6-pie-mark-contrast-20261013. Keyboard/native legend, zero/missing values, exact tables,
tooltip contrast, reload and basic-series regressions pass. Light pie/dark donut screenshots
inspected. Lint/types/API/default build pass. Backend unchanged/not rerun. Owned projects empty,
8020/3020 stopped and default build restored. No known P0/P1 or blocker in this increment.
A4-M1 remains open with a bounded 21-type inventory in docs/PRODUCT_EVOLUTION.md; normal
base-fill/separator measurements do not certify patterned edges or intentionally dimmed marks.
Next: bubble normal 0.75 alpha versus actual background (no border today), then remaining
mark inventory, A1/A3-R, A5-S1 and A6. Human H1/H2 remain separate. R1/R6 are not complete.

Previous increment:
Latest completed increment: native Pareto axis-label collision handling, preserving endpoints,
server scales/tick values, statistics, paging and saved widget dimensions. Real canvas bounds
first reproduced overlap; actual height increase/decrease now restores/omits intermediate labels.
Full frontend 647/116 passes (36.51s); final 3 browser cases pass (30.0s),
.backups/r6-pareto-axis-final-20261013 (populated/zero Pareto and executive demo). Light and
narrow-dark screenshots inspected. Initial zero test incorrectly demanded two ticks; corrected
to require the legitimate single exact zero on the degenerate contribution axis.
Lint/types/API/default build pass. Backend unchanged/not rerun. Acceptance projects empty,
own 8020/3020 stopped, default build restored. No remaining P0/P1 or blocker in this slice.
Next: A4-M1, then A1/A3-R, A5-S1 and consolidated A6. Human H1/H2 remain separate. R1/R6 open.

Previous increment:
Latest completed increment: six remaining tooltip renderers sampled with actual pointer hover
in both themes. Seven browser cases pass (42.1s), including Pareto zero/populated regression,
.backups/r6-remaining-tooltip-contrast-20261013. Computed contrast, opaque backing, tooltip
content and unchanged basic graphs verified. Light pie/dark Pareto screenshots inspected.
No production edits; full frontend/backend unit suites not rerun (last frontend 647/116).
Lint/types/API/default build pass. Isolated projects empty, own 8020/3020 services stopped,
default build restored. No P0/P1 found; new P2: short populated Pareto cards crowd axis ticks.
Next: fix that actual rendered geometry, preserving full-population scale/statistics, paging
and saved dimensions. Then A4-M1, A1/A3-R, A5-S1 and consolidated A6. H1/H2 still require
human observations. R1/R6 remain open; no blocker. A4-L1/T1 must not be reopened without regression.

Previous increment:
Latest completed increment: shared keyboard legend controls (ADR-206).
Native disclosure/buttons mirror renderer names/formatters and selection events; pointer and
keyboard states agree. Escape/Close returns focus; exact tables/calculations/saved graphs
unchanged. Hidden/non-interactive legends have no visibility controls. Labels EN/RU/TT.
Full frontend 647/116 passes (33.13s); scoped 20 browser cases pass (2.0m),
.backups/r6-keyboard-legend-20261013. Final accessible-title revision: 8 browser cases pass
(42.4s), .backups/r6-keyboard-legend-final-20261013. Real Tab/Space hide/restore covers
bar/line and pie/donut in both themes, including native pointer synchronization. Final menu
text contrast and minimum targets pass; scrolled light/dark focused-button screenshots inspected.
Lint/types/API/default build pass. Backend unchanged/not rerun. Acceptance projects empty,
owned 8020/3020 stopped, default build restored. No known P0/P1 in this increment or blocker.
Next: A4-T1 direct hover contrast for line/area/scatter/pie/donut/Pareto. A4-M1, A1/A3-R,
A5-S1, final consolidated A6 and human H1/H2 remain open; do not rerun completed twelve-family
tooltip checks as new work. R1/R6 remain open; automated checks do not certify human usability.

Previous increment:
Latest completed increment: acceptance reconciliation and chart-render recovery correction.
Current finite remaining obligations now have named IDs in docs/PRODUCT_EVOLUTION.md/TASKS.md:
A4-L1 interactive legend keyboard parity, A4-M1 mark/boundary contrast, A4-T1 six remaining
tooltip renderers, A1/A3-R named authoring residuals, A5-S1 seven-family state/locale ledger,
A6 consolidated candidate, H1/H2 human observations. Historical family table marked historical.
Confirmed A5 defect fixed: failed renderer no longer leaves updated data permanently in error;
local retry disposes failed resources and restores focus once, not on later background updates.
Full frontend 643/115 passes (35.51s); three browser cases pass (10.4s),
.backups/r6-chart-render-recovery-fixed-20261013. Both-theme actual canvas-failure injection,
keyboard retry, focus/exact table/unchanged graph verified. Initial alert selector also matched
Next announcer; widget-scoped locator fixes harness. Lint/types/API/default build pass.
Backend unchanged/not rerun. Acceptance projects empty, owned 8020/3020 services stopped and
default build restored. No known remaining P0/P1 in this fix; no blocker. R1/R6/H1/H2 open.
Next: implement A4-L1, synchronized keyboard-capable visibility controls for interactive
ECharts legends; table alternatives do not reproduce hide/restore. Do not reopen completed
12-family-tooltip/category-cue/scatter-null checks without a regression.

Previous increment:
Latest completed increment: pie/donut category patterns and scatter-null rendering verification.
Eight patterns track sorted display labels; repeated categories remain separate rows. Native
legend swatches verified by real SVG; over-eight warning localized EN/RU/TT preserves all rows.
Scatter renderer keeps signed coordinates/true origin and excludes incomplete coordinate pairs.
Full frontend 641/114 passes (41.78s); five browser cases pass (25.5s),
.backups/r6-pie-category-cues-20261013. Settled light pie/dark donut screenshots inspected;
prior zero-sum fix, exact table, reload and unchanged graph checks retained.
Lint/types/API/default build pass. Backend not changed/rerun. Acceptance projects empty,
owned services stopped and default API build restored; no new P0/P1 or blocker.
Next: reconcile finite A4/A5 acceptance inventory with accumulated evidence and identify exact
remaining gaps before adding further chart audit variants; then fresh consolidated A6.
Do not reopen completed category-cue/scatter-null/12-family-tooltip checks. Arbitrary density,
mark contrast and human H1/H2 are not certified by this slice. R1/R6 remain open.

Previous increment:
Latest completed increment: pie/donut false equal shares after legend filtering fixed.
Actual SVG reproduced two sectors from zero/missing observations after hiding the positive
category. Disable zero-sum/empty-circle synthesis; missing values no longer project to zero.
EN/RU/TT guidance added. Both-theme browser pixel checks verify disappearance/restoration,
exact zero/null tables and unchanged graph after reload; dark empty-donut screenshot inspected.
Full frontend 635/114 passes (38.25s); 3 browser cases pass (17.4s),
.backups/r6-pie-zero-shares-20261013; 10 existing backend input cases pass (1.13s).
Lint/types/API/default build pass. No backend changes; full backend suite not rerun.
Acceptance projects empty, owned 8020/3020 services stopped, default API build restored.
No remaining P0/P1 identified in this fix or blocker. R1/R6 and H1/H2 remain open.
Next: remaining basic pie/donut/scatter mark distinctions and finite A4/A5 reconciliation,
then consolidated A6. Negative/source-total validation already exists on backend; do not
duplicate it in the browser or confuse source validity with post-legend visible values.

Previous increment:
Latest completed increment: shared rendered tooltip contrast and executive showcase recheck.
Both-theme checks cover 12 chart types with settled opaque text and actual computed colour
contrast. Sampler rejects unsupported translucent popup backing; positive/negative browser
oracles pass. Initial run failed before measurement due to captured pre-resize bar width;
live bounding-box polling fixes the test harness, without changing application behavior.
25 browser cases pass (2.1m), .backups/r6-tooltip-contrast-verified-20261013; separate box-plot,
oracle and executive-demo batch 3 pass (21.9s), .backups/r6-tooltip-executive-20261013.
Executive screenshots inspected in light/compact-dark: eight real widgets, exact refreshed
revenue/profit/margin and unchanged saved dashboard verified. This is not consolidated A6.
Lint/types/API/default build pass. Full unit/backend suites not rerun (only E2E tests changed);
last full frontend remains 633/114. Acceptance projects empty, owned 8020/3020 services
stopped and default API build restored. No new P0/P1 or blocker; R1/R6 and H1/H2 remain open.
Next: remaining basic pie/donut/scatter mark distinctions, finite A4/A5 evidence reconciliation,
then fresh consolidated A6. Do not reopen the completed 12-family tooltip contrast audit.

Previous increment:
Latest completed increment: production-browser basic-series audit plus light-palette contrast fix.
Eight-series bar/line cases cover both themes, exact tables/reload and actual canvas label
disappearance/return through legend toggles. Screenshots wait for stable pixels to avoid
mid-animation markers; settled light bar/line and dark line inspected. Four browser cases
pass (33.3s), .backups/r6-basic-series-contrast-20261013. Light second-series contrast first
failed at 2.1423:1; darker light hues now pass >=3:1 against CSS panel/surface backgrounds.
Dark colours, data and persisted specs unchanged. Full frontend 633/114 passes (39.28s);
lint/types/API/default build pass. Backend suite not rerun (no backend edits).
No new P0/P1 or blocker. Acceptance projects empty; own 8020/3020 services stopped, default
API build restored. Next: remaining basic pie/donut/scatter mark distinctions and shared
tooltip contrast, reconcile finite A4/A5 evidence, then consolidated A6. R1/R6 and H1/H2 open.

Previous increment:
Latest completed increment: basic multi-series bar/line non-colour cues implemented.
Eight patterns/marker shapes follow sorted stable field IDs; order/data/colour assignments
and saved specs unchanged. Legacy repeated-field series keep unique renderer identities.
Two regressions first failed with one cue instead of eight; four new tests now cover both
types/themes, reordering, repeated bindings and real SVG bar/legend hide/restore behavior.
Full frontend 631/114 passes (40.57s); lint, API consistency and production build/type checks pass.
Browser/perceptual review of these new cues remains pending; no browser or backend suite
rerun in this increment, no acceptance services started. No new P0/P1 or blocker.
Next: production-browser review of basic multi-series cues, then remaining finite A4/A5
inventory and fresh consolidated acceptance. R1/R6 and human H1/H2 remain open.

Previous increment:
Latest completed increment: basic chart tooltip clipping/exact source projection fixed.
Long-name right clipping reproduced in narrow horizontal bar. Shared bounded escaped HTML
reads original row/series field, not rounded drawing coordinates; additional series, exact
decimals, numeric X, dates and missing values covered by eight regressions. Full frontend
627/114 passes (42.01s); two browser journeys pass (18.4s),
.backups/r6-basic-tooltip-fixed-20261013. Both-theme 420px content/bounds pass; dark screenshot
inspected. Browser long-hover evidence is bar-specific; six families covered by unit/normal
functional regression. Initial canvas replacement race fixed by scrolling stable widget.
No backend/graph/coordinate/saved-spec changes. Next: basic multi-series non-colour cues and
remaining finite A4/A5 inventory. R1/R6 and H1/H2 open; no new P0/P1 or blocker.
Lint/types/API/diff checks and default build pass. Acceptance projects empty; owned
services stopped and default API build restored. Backend suite not rerun (no backend edits).

Previous increment:
Latest completed increment: six basic chart label families now use opaque themed text/backing.
Real SVG regressions first reproduce alpha 0.35, then pass normal/muted both-theme states,
including both bar orientations; mark opacity/formatting/coordinates retained. Full frontend
619/114 passes (37.98s); two browser journeys pass (11.3s),
.backups/r6-basic-chart-labels-settled-20261013. Fixture enables labels; actual numeric 4.00
canvas paint observed in both themes, settled light screenshot inspected. Initial capture
was mid-animation, so final capture waits for opaque label paint. Muted-state evidence is
SVG-based, not six browser selection journeys. No backend or saved-spec changes.
Next: basic-chart tooltip and remaining non-colour/mark contrast inventory. R1/R6/A4/A5
and human H1/H2 open; no new P0/P1 or blocker. Lint/types/API/diff checks and default build
pass. Acceptance projects empty; owned services stopped and default API build restored.
Backend suite not rerun (no backend edits).

Previous increment:
Latest completed increment: analytical-table conditional-format contrast verified for four
UI-authored persisted tones in both themes, >=4.5 computed composited text contrast. Labels/
symbols and exact grand total 4410 retained; total-row badge/value contrast included. Eight
analytical/shared-contrast browser cases pass (35.4s),
.backups/r6-analytical-rule-contrast-final-20261013; dark totals screenshot inspected. Ten
focused table/layout/theme unit tests pass (1.63s). Shared computed-colour helper extracted;
independent alpha/colour oracles retained. Initial failures were test locators (badge changes
cell names; nested table-scoped has), fixed without weakening exact-value/count requirements.
No runtime/backend changes; last full frontend 613/114 remains the preceding increment,
not a fresh full-suite claim. Next: remaining legacy chart-family rendering audit; explicit
highlighted-table-background permutations remain open. R1/R6/A4/A5/H1/H2 not complete.
No new P0/P1 or blocker. Lint/types/API/diff checks and default build pass; acceptance
projects empty, owned services stopped and default API build restored. Backend suite not
rerun because only browser tests/helper and evidence documentation changed.

Previous increment:
Latest completed increment: histogram exact long-interval tooltip clipping fixed with shared
bounded escaped HTML. Settled 16-digit hover fit; 30-digit decimal endpoints reproduced
right clipping. Both-theme 420px full endpoint/bracket/count and viewport assertions pass;
dark screenshot inspected. New real CSV decimal(38,2) journey retains cent differences,
counts [1,2,2,3], missing/out-of-range accounting and saved range after reload. Unit regression
protects exact text/escaping. Full frontend 613/114 passes (34.22s), four histogram/hierarchy
production cases pass (30.7s), .backups/r6-histogram-tooltip-fixed-20261013. No backend or
binning change. Next: analytical-table conditional-format contrast and finite A4/A5 items.
R1/R6 and H1/H2 remain open; no new P0/P1 or blocker. Lint/types/API/diff checks and
default build pass. Acceptance projects empty; owned services stopped and default API
build restored. Backend suite not rerun (no backend code changes).

Previous increment:
Latest completed increment: histogram count-label opacity fixed. Real SVG regressions first
reproduce inherited alpha 0.3, then pass normal/muted both-theme/both-orientation states with
opaque themed ink/backing. Prepared counts/bar opacity unchanged. Browser enables labels
and observes actual 2/3 paint under injected highlight metadata; dark narrow screenshot
inspected. Not selection-wiring evidence. Full frontend 612/114 passes (34.80s), three
histogram/hierarchy browser journeys pass (20.9s), .backups/r6-histogram-labels-20261013.
No backend, binning, interval or saved-spec change. Next: histogram long exact-interval
tooltip readability, then remaining finite A4/A5 gates. R1/R6 and H1/H2 remain open;
no new P0/P1 or blocker. Lint/types/API/diff checks and default build pass. Acceptance
projects empty; owned services stopped and default API build restored. Backend suite
not rerun because this increment changes presentation only.

Previous increment:
Latest completed increment: P2 hierarchy label contrast fixed using opaque themed text and
a neutral 3px halo in normal/emphasis/blur states. Real SVG regressions first failed then
pass both chart variants/themes and hide-labels behavior. Browser canvas records cleared
before hover confirm A/B/C alpha 1 and themed ink in both themes. Full frontend 610/114
passes (36.57s); two production journeys pass (14.0s),
.backups/r6-hierarchy-label-halo-20261013. Both normal dark screenshots inspected. Initial
label-background attempt hid treemap fills despite green tests; visual review caught it,
and final halo preserves fills with a regression against label backgrounds. No backend,
weights, scales or saved-spec changes. Next: histogram rendered label/tooltip audit and
remaining finite A4/A5 items. R1/R6 and H1/H2 open; no known P0/P1 or blocker.
Lint/types/API/diff checks and default build pass. Acceptance projects empty; owned
services stopped and default API build restored. Backend suite not rerun (no backend edits).

Previous increment:
Latest completed increment: treemap/sunburst long-measure tooltip clipping fixed using
shared bounded escaped HTML. Both before screenshots reproduce right clipping; both-theme
420px content/bounds and value/share assertions now pass. Two unit regressions first failed,
then protect escaping/exact decimals. Full frontend 608/114 passes (31.36s), lint/types/API
pass. Two browser journeys pass (11.0s), .backups/r6-hierarchy-tooltip-fixed-20261013.
Dark tooltip inspected; keyboard group exploration/reload/zero leaf retained. No backend,
weights or saved-spec changes. Next: P2 hierarchy label contrast, confirmed visually on
dark treemap white leaf text over pastel fills (configured white contrast 1.86/1.94).
Inspect actual normal/emphasis/blur renderer states and fix both hierarchy variants.
R1/R6, remaining A4/A5 and H1/H2 open; no P0/P1 or blocker. Diff check/default build pass;
acceptance projects empty, owned services stopped, default API build restored. Backend
unchanged; its full suite was not rerun this increment.

Previous increment:
Latest completed increment: bubble/bullet tooltip clipping fixed with shared bounded escaped
HTML. 420px screenshots reproduce long bubble observation-field right clipping and bullet
band-text bottom clipping. Both-theme complete content/viewport bounds pass; dark screenshots
inspected. Two unit regressions first failed, then protect exact decimals and source escaping.
Full frontend 606/114 pass (32.88s), lint/types/API pass; six bubble/bullet/funnel production
cases pass (40.9s), .backups/r6-bubble-bullet-tooltip-fixed-20261013. No backend/geometry/
saved-spec changes. Next: treemap/sunburst rendered details, remaining finite A4/A5 gates.
R1/R6 and human H1/H2 remain open; no new P0/P1 or blocker. Diff check and default build
pass; acceptance projects empty, owned services stopped, default API build restored.
Backend unchanged; its full suite was not rerun this increment.

Previous increment:
Latest completed increment: funnel tooltip clipping fixed using shared bounded escaped HTML.
420px scrolled-stage screenshot reproduced hidden initial-retention/loss rows. Both-theme
full long-name/retention/loss content and viewport bounds now pass; dark screenshot inspected.
Exact large-decimal/source-HTML regression first failed, then passes. Full frontend 604/114
pass (34.97s); four funnel/bullet production cases pass (25.0s),
.backups/r6-funnel-tooltip-fixed-20261013. No backend, saved-spec or geometry change.
Next: bubble/bullet tooltip readability and remaining finite A4/A5 items; R1/R6 and human
H1/H2 remain open. No new P0/P1 or blocker. Lint, types, API consistency, diff check and
default production build pass. Acceptance projects empty; owned services stopped and
default API build restored. Backend unchanged and its full suite was not rerun this increment.

Previous increment:
Latest completed increment: bullet optional first-label clipping fixed. Real renderer geometry
reproduced label top y=8.48 against clip y=15 at supported 71px height. When labels are shown,
the custom-series clip now includes the existing top canvas padding; horizontal/bottom bounds,
marks and scales stay unchanged. Regression verifies actual text/clip bounds at heights
71/99/127/155/183/400. Full frontend 603/114 pass (39.49s), lint/types/API/default build pass.
Four bullet/funnel production cases pass (38.0s), .backups/r6-bullet-label-clip-20261013.
Bullet authoring now explicitly enables labels; narrow dark screenshot inspected and shows
complete -50.00 above its band. Numeric/missing/zero/window/reload assertions retained.
Funnel was regression-tested, not newly certified for every optional label state. No backend,
data or saved-spec changes. Projects empty, owned services stopped, default build restored.
Next: bubble/bullet/funnel tooltip readability and remaining finite A4/A5 items. R1/R6 and
human H1/H2 remain open; no new P0/P1 or blocker.

Previous increment:
Latest completed increment: bubble optional observation labels now have opaque themed ink/
backing instead of inheriting normal 0.75 or muted 0.2 bubble opacity. Two real SVG renderer
tests first failed, then pass for normal/highlighted states in both themes; radius ratios,
mark opacity and missing/zero behavior are retained. Full frontend 602/114 pass (38.58s),
lint/types/API pass. Six production-browser cases pass (49.8s),
.backups/r6-bubble-labels-20261013, including bubble pages/exact values and bullet/funnel
normal/zero/missing/windows regressions. Narrow dark screenshot inspected. Actual canvas
paint confirms A/B labels at alpha 1 in both themes; injected highlight/legend metadata
isolates observation text from same-named legend labels. Not a selection-wiring claim.
No backend, data or saved-spec change. Projects empty, owned services stopped; default
build restored and passed. Next: optional bullet/funnel label geometry and tooltip
readability; passing existing flows does not certify their untested label states. R1/R6
and H1/H2 remain open; no new P0/P1 or blocker.

Previous increment:
Latest completed increment: combo/Pareto now reuse bounded escaped HTML tooltips. Settled
420px combo hover screenshot reproduced a long series name clipping axis/value to the right;
first attempt was during canvas resize, so browser now waits for actual canvas width.
Both-theme long-name/Left axis: 100 content and viewport bounds pass, with dark screenshot
inspected. Five combo/Pareto browser cases pass (33.5s),
.backups/r6-combo-tooltip-fixed-20261013. Pareto shares the tested option and its normal/zero
regressions pass; no separate long-name Pareto hover claim. Exact values/scales unchanged.
Full frontend rerun: 600/114 pass (35.90s). Initial full run had 599 pass/one catalog focus
failure: findByRole presence preceded DataStatePanel's focus effect. Test now waits for the
same focus assertion, without relaxing the requirement or changing runtime catalog behavior.
Lint/types/API/default build pass. Projects empty, owned services stopped,
default build restored. Next: finite A4 bubble/bullet/funnel rendering and remaining A5 gates.
No new P0/P1 or blocker; R1/R6 and human H1/H2 remain open.

Previous increment:
Latest completed increment: scoped P2 combo numeric-label overlap closed using ECharts
labelLayout.hideOverlap, including the shared Pareto adapter. Real SVG regression first
rendered two colliding labels, then verifies one at 220px height and both restored at 900px;
exact tooltip values are unchanged. Five browser cases pass (34.9s),
.backups/r6-combo-label-layout-20261013; dark eight-series screenshot inspected, first-row
table retains all eight exact values. Existing basic-chart muted-label observation retained;
multi-series paint assertions no longer demand labels intentionally hidden by layout.
Full frontend 600/114 pass (39.84s), lint/types/API/build pass. No data, scales or saved-spec
changes. Test projects empty, owned services stopped, default build restored. Next: combo/Pareto hover readability,
then remaining finite A4 families/A5 states. This is collision handling, not a promise that
every value is printed on a short chart; hover/table remain the exact-value alternatives.
No new P0/P1 or blocker; R1/R6 and H1/H2 remain open.

Previous increment:
Latest completed increment: combo same-kind series now have non-colour cues. Lines use
distinct symbols; bars use solid/diagonal/horizontal/vertical/dot/triangle patterns inherited
by the ECharts legend. Sorted field IDs preserve cues on series reorder. The one-bar/one-line
case (including Pareto) retains solid bar/circle marker. Two regressions first failed with
only one cue, then passed for seven bars or seven lines (contract maximum with both kinds).
Full frontend 599/114 pass (32.51s); lint/types/API/default build pass. Initial new test fixture
missed required series.name; corrected before successful build/typecheck. Five production
browser cases pass (38.2s), .backups/r6-combo-series-cues-20261013, including a new eight-series
save/reload/two-axis fixture. Dark screenshot confirms four bar patterns/four line markers
and matching legend. This is not perceptual certification of all seven patterns.
The same screenshot exposes dense numeric-label overlap in short eight-series cards (P2).
Next actionable task: prevent overlapping combo labels while keeping exact values available
in hover/table; then continue finite A4 tooltip/mark checks. No backend/schema/calculation
changes or new P0/P1. Projects empty, owned services stopped, default build restored.
R1/R6 and human H1/H2 gates remain open; no blocker.

Previous increment:
Latest completed increment: narrow waterfall tooltip clipping fixed. Wide short-name hover
was visually complete; the 420px long-name fixture reproduced right/bottom clipping (including
Running balance). Reused radar's bounded escaped HTML tooltip via chart-tooltip.ts rather
than duplicating positioning. Existing radar behavior retained; all exact waterfall values
and chart geometry unchanged. Four production-browser cases pass (32.1s),
.backups/r6-waterfall-tooltip-fixed-20261013: full long title and four exact value lines,
both-theme viewport bounds, orientation/reload/windows and radar regressions. Dark screenshot
inspected. Initial old-renderer DOM-role failures alone were not clipping evidence; the
pre-fix screenshots distinguish the wide passing layout from the narrow defect.
Full frontend 597/114 pass (38.27s); lint/types/API/default build pass. Escaping regression
retains exact huge values without creating source HTML elements. Test projects empty, owned
services stopped, default build restored. Next: combo/Pareto hover and non-colour distinction;
short viewport/arbitrarily long text and broader A4 remain unverified. No new P0/P1 or blocker;
R1/R6 and H1/H2 are still open.

Previous increment:
Latest completed increment: combo/Pareto and waterfall optional numeric labels no longer
inherit muted-category alpha 0.3. Combo uses opaque themed text/backing; waterfall retains
its existing opaque halo without changing custom geometry. Four regressions reproduced the
defect (actual combo SVG paint and waterfall render items); two Pareto adapter cases protect
exact contribution/share labels. Full frontend 597/114 pass (33.97s), lint/types/API/default
build pass. Six production-browser cases pass (35.7s),
.backups/r6-contribution-labels-20261013, including normal/windows/Pareto zero population.
Actual canvas fillText checks confirm combo -40/80 and horizontal waterfall -150/40 at
alpha 1 with theme ink. Dark screenshots inspected. Highlight metadata is injected into
otherwise real results; not cross-filter selection-wiring evidence. Projects empty, owned
services stopped, default build restored. No backend/schema/calculation changes or new P0/P1.
Next: contribution/comparison tooltip clipping and remaining non-colour/mark contrast scope;
dense label overlap is not certified. R1/R6 and human H1/H2 gates remain open; no blocker.

Previous increment:
Latest completed increment: eight-axis radar tooltip clipping reproduced in a short existing
widget (last axis missing). Escaped body-level HTML fixes clipping; the first narrow rerun
then reproduced x=-195 overflow. Width now follows actual chart width (up to 420px), with
ECharts confinement and long-name wrapping. Final four production cases pass (36.0s),
.backups/r6-radar-eight-confined-20261013: 1600/420px both-theme tooltip content/bounds,
radar wizard/scales/reload and box-plot tables/paging. Narrow dark screenshot inspected.
Full frontend 591/114 passes (40.59s); lint/types/API/default build pass. Unit regression checks escaped hostile
source text and chart-width bound. Box-plot SVG tests also verify hide/show legend removes
and restores median labels. No backend, persisted schema or calculation changes.
Owned services stopped; test projects empty; default build restored. Next: A4 comparison/
contribution chart marks and tooltip contrast, preserving finite inventory and separate
human H1/H2 gates. Extremely long multi-line tooltip/short viewport remains unverified;
eight-axis fixture is not all-tooltip accessibility certification. No new P0/P1 or blocker.

Previous increment:
Latest completed increment: box-plot Show labels now actually renders exact medians. Native
ECharts boxplot ignored its label option; two real SVG-renderer regressions reproduced absence.
A silent scatter text layer uses server medians, skips null groups and shares the summary
legend identity. Opaque themed ink/backing remains readable for muted groups. Both orientations,
both themes and disabling labels pass renderer tests. Full frontend: 590 tests / 114 files
pass (38.36s); lint/types/API/default build pass. Production browser: 1 pass (7.4s),
.backups/r6-box-median-labels-exact-20261013; actual canvas fillText confirms exact 305.50 at
alpha 1 in both themes. Dark screenshot inspected. Initial browser observer incorrectly
expected 305.5; corrected to exact transport 305.50, not a runtime failure. Muted/orientation
label evidence is SVG-based, not a browser claim. No backend/statistical/persistence changes.
Test projects removed, owned services stopped, default build restored. Next: remaining finite
A4 chart readability and A5 state/locale gaps; H1/H2 human gates remain open. No new P0/P1 or blocker.

Previous increment:
Full backend verification: 1542 passed / 32 skipped (149.90s). Skips are PostgreSQL-specific
concurrency/migration checks and the opt-in Docker restart, not newly verified by this run.
Latest implementation: wizard-created radar widgets start at 12 grid rows instead of 8.
Only new report creation changes; existing layouts/type changes/edit paths untouched. Backend
regression reproduced height 8, then checks initial 12 and preservation of manually set 6
after calculation edits. Focused tests: 30 pass / 3 PostgreSQL-only skipped (6.31s).
Browser radar creation/edit/reload + canvas height >=300px: 1 pass (5.5s),
.backups/r6-radar-default-size-20261013; screenshot inspected. Mypy 175 files, ruff lint/format
310 files, frontend lint/types/API/default build pass. Last full frontend remains 588/114,
not rerun for this backend-default/test-only change. Projects cleaned; owned services stopped.
Next: continue finite A4 checks without
claiming old diagrams were resized. No new P0/P1 or external blocker.

Previous increment:
Latest completed increment: radar optional numeric labels no longer inherit muted-profile
opacity or series colour. Explicit themed ink, opaque neutral backing and alpha 1 retain
exact values while marks/lines stay muted. Two theme regressions first failed then passed.
Full frontend 588 tests / 114 files pass (38.64s); lint/types/API/default build pass.
Radar wizard + renderer: 2 cases pass (31.2s), .backups/r6-radar-labels-20261013. Corrected
highlight fixture to use the actual category_field rather than source label branch; final
renderer rerun passes (8.6s), .backups/r6-radar-labels-bound-20261013. Canvas fillText observer
confirms 3/8/5 at alpha 1 with correct ink in both themes; final dark screenshot inspected.
Highlight metadata is injected into an otherwise real result: renderer evidence, not
selection-wiring coverage. No dataset, scale, persistence or backend changes. Projects empty,
owned services stopped. Next: settled box/radar geometry and remaining A4 contrast scope;
short wide default radar remains visually small, and dense-label overlap is not certified.
No new P0/P1 or external blocker; R1/R6 remain open.

Previous increment:
Latest completed increment: radar profiles now use explicit marker shapes, matching legend
icons and existing line-style groups; markers increased from 5 to 7 CSS pixels. Previously
the first eight profiles relied on colour alone. One regression first failed then passed:
20 distinct shape/line combinations, preserved on row reversal and missing-profile omission.
Allocation uses the same sorted full identity list as colours, so incomplete profiles retain
their slot. No scale, value, persisted schema or backend changes.
Full frontend 586 tests / 114 files pass (36.40s); lint/types/API/default build pass.
Two production radar cases pass (18.5s), .backups/r6-radar-symbols-20261013; light hover
screenshot inspected and shows matching rectangular/triangular legend/profile markers.
This is not a human perceptual trial of all 20 profiles. Dense overlap, settled mark/label
contrast and wider tooltip states remain A4 work. Projects empty; owned services stopped;
no processes to resume, P0/P1 or external blocker.

Previous increment:
Latest completed increment: box-plot tooltip clipping reproduced by actual hover screenshot
(.backups/r6-distribution-hover-20261013; 2 functional cases pass, but bottom Missing values
row visually clipped). Reused escaped plain-text HTML rendering via chart-tooltip.ts for
box plot and heatmap; no calculation/schema changes and radar runtime unchanged.
Both-theme box tooltip checks now verify exact Q1 153.25, Missing values: 0 and viewport
vertical bounds. Post-fix dark screenshot inspected. Three production cases pass (22.2s),
.backups/r6-box-tooltip-fixed-20261013 (box plot, heatmap, radar). Full frontend 585/114
pass (35.87s); lint/types/API/default build pass. Projects empty, owned services stopped.
Radar light hover screenshot shows all three axes and full long profile name, but this
does not certify narrow/8-axis/tooltips or all contrast. Dark box screenshot captures marks
during theme animation; do not use it to claim settled mark geometry. Next: settled marks,
label contrast and non-colour profile distinction for box/radar. No P0/P1 or external blocker.

Previous increment:
Latest completed increment: heatmap hover contrast fixed. ECharts automatic lift(-0.1)
reproduced 3.96:1 sequential and 3.90:1 diverging label contrast. Three extended regression
sweeps first failed, then passed after explicit emphasis fill preserves the encoded colour;
existing border cue remains. Browser pixel comparison passes before/after numeric and missing
cell hover, including injected muted states in light/dark (1 case, 6.8s):
.backups/r6-heatmap-emphasis-20261013. Earlier paint-alpha observations remain applicable.
Full frontend 585/114 pass (32.77s); lint/types/API/default build pass (99854 terminal).
Owned services stopped; test projects empty. No active process to resume.
P2 heatmap label contrast is closed at this scoped level. Not all A4 chart marks/tooltip/axes
or human acceptance are certified. Next: box-plot/radar normal/hover/tooltips in both themes,
using the finite A4 inventory; no new P0/P1 or external blocker.

Previous increment:
Latest evidence: heatmap browser canvas paint observation passes (1 case, 7.2s),
.backups/r6-heatmap-ink-20261013. Init-script observer records real fillText colour/alpha:
muted -3 and 10 labels paint black/white at alpha 1 in both themes. Numeric -3 hover tooltip
checks pass in normal and highlighted views; muted light/dark screenshots visually inspected.
Highlight metadata is injected into the real server result to isolate rendering; this is
not selection-wiring evidence. All rows/schema/scale remain real. No runtime code changed.
Lint/types/default build pass; last full frontend remains 585/114 (38.26s). Test projects
empty and owned services stopped. Initial test-only window typing error was fixed before run.
Next: inspect ECharts automatic hover fill lift against foreground thresholds (states.js uses
liftColor unless explicit emphasis fill). Current sampled hover evidence is not a full colour
sweep, then continue the finite A4 family inventory. No blocker or new P0/P1.

Previous increment:
Latest completed increment: narrow/enlarged settings footer occlusion fixed.
Centre hit-testing first reproduced the covered name input (25.7s failed browser case).
Below the existing 80rem workbench container threshold, sticky bottom actions now stay in
normal flow; wide panels retain sticky actions. No state, persistence or backend changes.
Workbench browser scenario passes (18.8s), .backups/r6-settings-footer-fixed-20261013:
narrow/enlarged name-field hit-testing and sequential Tab, plus copy/preview/arrange/recovery.
Fixed narrow screenshot visually reviewed. Original failure: .backups/r6-settings-hit-test-20261013.
This is scoped name-field evidence, not certification of every control's occlusion.
Full frontend: 585 tests / 114 files pass (38.26s); lint/types/API/default build pass.
Projects empty; owned services stopped; no running processes. Next: heatmap numeric hover
and highlighted-label rendered verification. No new P0/P1 or external blocker.

Previous increment:
Latest completed increment: actual hover screenshots reproduced clipped heatmap tooltip rows.
ADR-205 moves escaped plain text to a body-level HTML tooltip, preserving exact values and
line breaks without interpreting source markup. Light/dark browser checks now assert visible
last line and vertical viewport bounds; post-fix dark screenshot manually inspected.
Current full frontend: 585 tests / 114 files pass (30.65s); lint/types/API/default build pass.
Two production browser cases pass (18.1s), .backups/r6-heatmap-tooltip-20261013: heatmap and
eight-widget executive refresh. Previous contrast-only run: 2 pass (16.6s), screenshots in
.backups/r6-heatmap-contrast-20261013 show the original clipping. Those hover cases target
a missing-measure cell, not numeric hover or active highlighting. Do not claim those checked.
Test projects empty; owned API 11087/frontend 77207 stopped; no processes to resume.
No new P0/P1 or external blocker; backend unchanged.

Previous increment:
Latest implementation: heatmap numeric/marker foreground selects black or white by relative
luminance of rounded sRGB colour interpolation. Muted cells retain 0.25 fill opacity, but
labels explicitly use opacity 1 and an opaque, same-colour backing with one-pixel padding.
No dataset, scale, exact value, selection identity or persistence changes. No new dependency.
Full frontend: 584 tests / 114 files pass (32.43s). Three formerly failing scale sweeps now
check 1001 positions each in both themes, plus muted fill/label/backing invariants; two marker
regressions cover dark/light missing cells. This is option-level, not rendered evidence.
Lint, typecheck, API consistency and default production build pass after the fix (92182
terminal success). No running processes to resume. Backend unchanged.
Next: verify canvas normal/highlight/hover/tooltip rendering, then the narrow sticky-footer
interaction risk. The prior 253-case browser run predates this runtime fix; do not relabel it.
Latest completed checkpoint: 253 public browser tests passed in one uninterrupted run (23.5m),
.backups/r6-public-state-reconciled-20261013; Playwright session 79898 terminal success.
Isolated API projects confirmed empty. Owned API 3091 (8020) and frontend 26865 (3020)
stopped after the runner completed; default frontend production build restored and passes.
No owned acceptance processes remain active. Lint/types/API passed before this checkpoint;
typecheck and default production build also pass with the new failing heatmap regressions.
Run selection: rg --files e2e -g '*.spec.ts', excluding files returned by rg -l 'test.skip';
these are explicit private opt-in scenarios. NODEBI_E2E_URL=http://localhost:3020,
NODEBI_E2E_API and NODEBI_EVOLUTION_API=http://localhost:8020. No runtime code changed
during this checkpoint. Private opt-in scenarios, PostgreSQL and process restart are not
part of this public-browser result; retain their separate evidence scopes.
Latest completed increment: finite A5 evidence reconciliation and common-state locale tests.
119 tests / 11 files pass (6.43s), with explicit visible names/roles/busy states for all five
shared states in EN/RU/TT. Seven surface families mapped to evidence and unverified boundaries
in PRODUCT_EVOLUTION.md. Broad public run completed: 253 passes, no failures.
This is an integration checkpoint, not final product acceptance; A4/A5/H1/H2 remain open.
Pre-fix frontend suite passed: 579 tests / 114 files (39.43s), session 42527 terminal.
Read-only A4 investigation found a P2 heatmap numeric-label contrast defect: fixed foreground
thresholds in frontend/features/dashboard/heatmap.ts do not track interpolated colour luminance.
Installed ECharts colour interpolation + sRGB contrast calculation reproduces zero_centered
position .24: white on rgb(210,156,119), 2.397:1; .76: white on rgb(143,164,210), 2.497:1.
Sequential .50 gives 4.253:1 and .51 gives 3.852:1. These are palette-level measurements,
not rendered-canvas certification. Implementation and option-level regressions now pass;
rendered labels/tooltips remain to verify. No new P0/P1 identified; no external blocker.
Regression added in tests/heatmap-visualization.test.tsx: 1001-position sweep for extent,
fixed and zero_centered, both themes intended. Focused run: 8 pass / 3 fail (2.82s), correctly
reproducing insufficient contrast (first failures extent/fixed .482, zero_centered .05).
The pre-fix tests stopped at their first light-theme failure. The post-fix run now covers both
themes and passes all 584 tests. No production code changed during the prior browser run.
Installed HeatmapView.js passes style.opacity as label defaultOpacity; labelStyle.js inherits
it unless explicit label opacity is set. Highlighted-out cells therefore also need composited
background/foreground checks; opaque-cell contrast alone cannot establish highlighted readability.
Next: rendered verification on the new candidate; keep the historical failure evidence above.
Read-only visual review: inspected executive-light.png and executive-compact-dark.png in
the current run's executive-demo-executive-d-73c8c-ons-without-changing-layout directory.
Both show the eight-widget financial/statistical dashboard; case 97 passes actual render
and refresh-without-layout-change assertions (11.3s). These images do not prove all chart
contrast or human usability. Also inspected dashboard-workspace tt-light/workbench-narrow.
The narrow full-page capture shows sticky Apply/Close over the visualization-name area.
Treat as a reproducible visual risk, not yet a proven interaction defect: add focused
viewport hit-testing and keyboard-focus checks after the checkpoint. expectFormFits checks
horizontal geometry only; it does not establish lack of sticky-control occlusion.

Previous completed increment:
Latest completed increment: source-version loading and recoverable read failures.
DatasetUpdates version selection and dataset binding fieldsets now disable until versions
are successfully loaded; pending status and read-only Retry are available. Source/dataset
catalog read failures also offer Retry. Upload capability is unchanged; no automatic selection
or mapping changes happen on retry. Three EN/RU/TT regressions reproduced enabled unknown
versions before fix and now check failure/retry with preserved selection and GET-only calls.
Full frontend: 576 passed / 114 files (31.05s). CSV import/create/update/rollback lifecycle
passes in desktop/narrow/enlarged layouts: 3 cases (40.7s), .backups/r6-version-retry-20261012.
Browser evidence is normal lifecycle regression; version-list failure injection is component
evidence. Lint/types/API/default build pass. Backend unchanged; isolated projects empty,
owned services stopped. No known new P0/P1 or blocker; R1/R6 remain open.
Next: reconcile the finite A5 state/locale matrix against these fixes and outstanding evidence,
then A4 chart/tooltip residuals and an uninterrupted A6 candidate run; H1/H2 remain human gates.

Previous completed increment: report history loading/empty/error and action readiness.
History now announces initial loading, distinguishes confirmed empty updates/releases from
failed reads, and offers retry for history/state/task fetch errors. Creating updates, checking
reports and UpdateEditor actions require successfully loaded jobs/state/update metadata;
freezing additionally requires release-history success. Existing server revision guards remain.
Regression reproduced an enabled Check button before job state arrived; after fix, delayed
jobs + failed updates + retry to confirmed empty are covered without mutation requests.
Full frontend 573 tests / 114 files pass (43.71s); extended retry test passes separately (7 tests).
Five browser cases pass (1.3m), .backups/r6-history-state-20261012: two-book mapping,
freeze/restore desktop/narrow/enlarged text and storage-denied release recovery.
Lint/types/API/default build pass. Backend unchanged; isolated projects empty; owned services
stopped. No new known P0/P1 or blocker. Fetch-error gating is component-tested; these browser
cases verify the normal release/update lifecycle, not an injected history outage.
Next: reconcile remaining A5 source-version fetch/retry behavior in DatasetUpdates and
remaining locale/state evidence, then A4 residuals and A6 candidate regression. H1/H2 open.

Previous completed increment: alignment create/edit preview state parity.
Both alignment forms now show explicit pending, successful-empty and invalidated-preview
states. Prior results are hidden while recalculating or after failure; save remains gated by
a successful matching preview. Schema and zero diagnostics remain visible for empty results.
Two delayed-response component regressions reproduced missing loading feedback before fix;
they now cover pending -> empty -> edited/stale and save gating in both forms.
Full frontend: 572 passed / 114 files (31.29s). Browser statistical/alignment suite: 3 passed
(4.8s), .backups/r6-alignment-state-20261012, including delayed real alignment create/edit
responses and error recovery without graph mutations. Empty alignment is component evidence,
not a newly executed real-empty-source browser case. Lint/types/API/default build pass.
No backend changes. Isolated projects empty and owned services stopped; no new P0/P1/blocker.
Next: A5 update/history state inventory and reconciliation; A4 contrast residuals and A6
candidate regression remain, with H1/H2 human gates. R1/R6 are not complete.

Previous completed increment: statistical preview state reconciliation.
Reproduced contradictory Finish configuration alongside a failed, fully configured preview.
StatisticalReportBuilder now suppresses that incomplete panel on failure; changed settings
show an explicit outdated-preview message rather than implying setup was never completed.
Retained current statistics during page refresh are labelled as previous data in the loading
panel; existing disabled fieldset remains. New title has EN/RU/TT translations.
Full frontend 570 tests / 114 files pass (30.43s). Three browser cases pass (4.7s),
.backups/r6-statistical-state-20261012: statistical failure/retry/change/recheck/save and
alignment create/edit error-recovery regressions. Browser interaction uses existing focus/
pointer harness, not newly certified sequential keyboard coverage. Lint/types/API/build pass.
Backend unchanged; isolated projects empty, owned services stopped. No P0/P1/blocker found.
Next: finish A5 alignment pending/empty and update/history state inventory. Statistical
pending-page notice is implemented but not separately delayed-browser certified in this run.
A4 residuals, final A6 and human H1/H2 remain open; R1/R6 not complete.

Previous completed increment: explicit successful empty report preview.
ReportBuilder now labels total_rows=0 as a completed empty calculation with guidance to
check source data/filters. Schema headers remain available; empty results can still be saved.
Changing settings hides the outdated empty notice and requires another matching preview.
Three EN/RU/TT tests reproduced the missing message before correction and now pass.
Full frontend: 570 passed / 114 files (31.58s). Real filtered-zero-row create/save/open/reload
journey passes in both themes at 420px: 2 cases (4.1s), .backups/r6-empty-report-20261012.
Lint/types/API/default build pass; no backend changes. Isolated projects empty; owned
services stopped. No new known P0/P1 or external blocker. R1/R6 remain open.
Next: reconcile remaining A5 states across statistical/alignment builders and update/history,
then A4 chart/tooltip residuals and A6 final candidate run. H1/H2 require human observations.

Previous completed increment: plain-table pending pagination state and notice contrast.
Regression first reproduced an enabled-looking Next button while its handler was unavailable.
Plain-table Previous/Next now disable without setOffset, matching other paged renderers and
read-only snapshots. A delayed-page test checks one request, old page label, arrival and recovery.
Full frontend suite: 567 passed / 114 files (33.50s). Seven browser cases passed (25.0s),
.backups/r6-pagination-state-20261012: actual delayed 201-row table paging, disabled controls,
keyboard return and previous-result notice contrast in both themes at 420px, plus existing
report/overview contrast oracles. Lint/types/API/default production build pass.
No backend changes; isolated projects empty and owned services stopped. No new P0/P1/blocker.
Next concrete A5 check: ReportBuilder currentPreview with zero rows currently renders only
headers, without a distinct empty-result explanation (source inspection, not yet reproduced).
Review that state and prevent confusion with incomplete/failed calculations; broader A4/A5,
A6 final candidate and H1/H2 remain open.

Previous completed increment: previous-result feedback and stale-selection guard.
Visualization refresh/pagination now visibly marks retained data (EN/RU/TT), suspends
row/chart selection and resumes after success. Errors replace the result with retry feedback.
Initial loading has status semantics; placeholder data remains marked if fetching is paused.
Full frontend suite: 566 passed / 114 files (34.72s). Three new locale regressions cover
delayed refetch, retained rows, disabled selection, error hiding and successful retry.
10 browser cases passed (39.7s), .backups/r6-refresh-feedback-final-20261012, including
delayed bubble pagination and hierarchy/heatmap/contrast regressions. Final small styling
cleanup uses existing bg-panel instead of an undefined warning-surface utility; build rechecked.
Initial test-only failures: locale number/error expectations and an unsupported Testing Library
exact option; fixed. First browser run lacked a build after that type error; superseded by
the successful final run. No backend changes. Lint/types/API pass; isolated projects empty,
owned services stopped. No known new P0/P1 or external blocker.
Next: A5 loading/empty/incomplete/error/stale inventory across named screens; separately
finish A4 chart/tooltip contrast and A6 candidate regression. H1/H2 remain human gates.

Previous completed increment:
Latest completed increment: comparison/contribution and analytical-table keyboard controls.
13 production-browser cases passed (1.1m), .backups/r6-comparison-keyboard-20261012:
combo category windows, waterfall step windows/table, bubble/Pareto/bullet table pagination,
funnel scroll-region entry/table switch and analytical-table last page now use real Tab/Enter.
Existing exact large decimals, missing/zero populations, signed totals, scale invariance and
reflow assertions remain. Setup remains pointer/API driven; scrolling geometry probes are
not keyboard evidence. No blanket two-theme control or canvas/tooltip contrast claim.
Lint/types/API/default build pass. Runtime/backend unchanged; unit suites not rerun.
Owned isolated projects cleaned and services stopped. R1/R6 remain open.
Next actionable A5 issue (P2, code inspection): VisualizationView retains placeholderData
while fetching but exposes loading only through sr-only status. Add a visible previous-result
notice with EN/RU/TT coverage and delayed-response regression; review selection of stale rows.
No new P0/P1 or external blocker. A4 contrast residuals, A1/A3, A6 and H1/H2 remain open.

Previous completed increment: heatmap/histogram keyboard semantics and finite A4 inventory.
Two production-browser cases passed (10.4s), .backups/r6-cell-interval-keyboard-20261012.
Heatmap table distinguishes absent rows, missing measures and observed zero via text after
reload in dark/narrow view; keyboard return renders the chart. Histogram table/chart switches
work in both narrow themes with exact intervals and unchanged population accounting.
All 21 ChartType entries are now mapped to evidence locators and explicit remaining A4 checks
in docs/PRODUCT_EVOLUTION.md. No canvas/tooltip contrast or whole-family certification inferred.
Lint/types/API/default production build pass; no runtime/backend changes, units not rerun.
Isolated projects empty and owned services stopped. No new known P0/P1 or external blocker.
Next: six comparison/contribution families and analytical-table controls, then shared A5
state/locale audit and final A6 regression. A1/A3 residuals and H1/H2 remain open.

Previous completed increment: sequential keyboard alternatives for box plot, radar and hierarchy.
Four production-browser cases passed (17.7s), .backups/r6-statistical-keyboard-20261012.
Tab/Enter reaches box-plot summary and both outlier pages (100 + 10), radar profiles/scales
including missing-measure semantics, and treemap/sunburst group exploration/return in light
and dark narrow layouts. Radar scroll-region entry no longer uses programmatic focus.
Authoring setup and theme selection still use pointer/native harness actions; these are bounded
viewer-navigation checks, not full keyboard authoring or canvas contrast certification.
Lint/types/API/default production build pass. Runtime/backend unchanged; unit suites not rerun.
Isolated projects cleaned and owned services stopped. No new known P0/P1 or external blocker.
Next: complete the finite A4 family/state inventory, then A5 state/localization and A6 final
regression; A1/A3 exceptions and H1/H2 human acceptance remain open. R1/R6 are not complete.

Previous completed increment: report table contrast and real keyboard data alternatives.
Light/dark bar-report data tables now check computed DOM contrast, visible switch focus and
Chart/Data table target dimensions. Actual Tab/Enter switching exposes exact 50.123456 and
150.123456, then returns to the rendered chart without changing the graph. The existing
canvas numeric-label geometry test now also uses sequential keyboard switching; it retains
real resize/EN-RU-TT/theme checks for overlapping numeric labels and full raw labels.
Combined final run: 6 passed (24.0s), .backups/r6-report-contrast-20261012, including overview
contrast and independent color-oracle regressions. Lint/types/API/default build pass.
No runtime/backend changes; previous unit suites not rerun. Isolated projects empty;
owned services stopped. No new known P0/P1 or external blocker.
Scope: DOM table/control contrast and canvas label positions, not canvas mark contrast,
tooltip/hover/pseudo-element contrast or certification of all 21 visualization families.
Next: finite A4 chart-family/state inventory, including statistical/hierarchical alternatives;
A1/A3 residuals, A5/A6 and H1/H2 remain open.

Previous completed increment:
Latest completed increment: computed browser contrast baseline for project overview.
New browser test measures visible text computed foregrounds against composited ancestor
backgrounds (including alpha warning surfaces), normal/large-text thresholds, keyboard-visible
rename focus and overview button minimum dimensions in light/dark initial/error states.
Oklab conversion is delegated to browser relative-color sRGB, not rounded canvas pixels.
Black/white/half-alpha/Oklab independent oracles pass. Unsupported gradient/filter/opacity/
blend composition fails explicitly rather than being silently treated as passing.
Final 3 passed (18.0s), .backups/r6-rendered-contrast-verified-20261012. Initial harness
failures were unsupported Oklab and ambiguous route-announcer alert selection; corrected.
No UI defect found in this scoped audit. Runtime/backend unchanged; unit suites not rerun.
Lint/types/API/default build pass. Isolated projects empty; owned services stopped.
Next: expand A4 to report controls and chart/table alternatives; this test excludes canvas,
pseudo-elements, placeholders, hover states and actual assistive-technology perception.
No full WCAG claim. A1/A3 residuals, A5/A6 and H1/H2 remain open; no external blocker.

Previous completed increment:
Latest completed increment: release keyboard actions and storage-denied navigation.
Release name/period label/comment/dashboard selection, check, draft restore, All time,
freeze and opening the frozen release now use real Tab/text/Space/Enter in all three layouts.
Storage-denied draft navigation/restore also uses real keyboard links and actions. Final
5 cases passed (1.0m), .backups/r6-keyboard-release-20261012, including unchanged two-book
mapping regression. Frozen five rows survive a working-graph change to four and restore
as a new project. This is All-time release isolation, not newly certified date-filter semantics.
Date inputs, warning checkbox, some update/restore setup and localization inspection still
use harness/pointer actions; native confirmations and reload are harness actions. Do not
describe the whole report-cycle test as keyboard-only. Runtime/backend unchanged.
Final lint/types/API/default build pass; previous unit counts not rerun. Private projects empty;
owned servers stopped. No new known P0/P1 or external blocker.
Next: rendered contrast/focus/target audit A4 (source-token tests alone are insufficient),
then localized states A5 and consolidated A6. A1 residual focus/keyboard exceptions, A3 native
zoom and observed H1/H2 remain open; core named sequential journeys now have scoped evidence.

Previous completed increment:
Latest completed increment: dashboard keyboard authoring and recovery.
Two new desktop/420px journeys create a dashboard and independent table from an API-seeded
publication using Tab/native select/text keys, save, view, reload and return to editing.
Five rows and the original graph are unchanged: 2 passed (4.8s),
.backups/r6-keyboard-dashboard-authoring-20261012. Six recovery cases now use real keyboard
actions/input; malformed drafts preserve saved state and restore name focus, stale drafts
receive 409 then explicitly discard/reload the newer server report and clear the local draft:
6 passed (10.0s), .backups/r6-keyboard-dashboard-recovery-20261012.
Confirmation dialogs are accepted/dismissed by the harness; OS dialog interaction is not
claimed. Test-only changes, no runtime/backend changes; previous unit counts not rerun.
Isolated projects empty and owned servers stopped. Final lint/types/API/default build passed.
Next: release-history sequential keyboard path and focus-return reconciliation; A1 overall,
A3 native zoom, A4/A5/A6 and H1/H2 remain open. No new known P0/P1 or external blocker.

Previous completed increment:
Latest completed increment: executable graph and preparation keyboard acceptance.
Both graph formats now have keyboard-only add/name/connect/limit/preview/disconnect/reconnect/
reload scenarios, retaining the saved graph and two-row result. Four inspector cases use native
keyboard selection/input to prove condition scratch stays on its owner across node switches,
expression edits, reload and explicit discard (both formats and formula versions).
Final graph batch: 6 passed (1.2m), .backups/r6-keyboard-graph-final-20261012. Initial failures
were test label mismatches (finder includes node type), not implementation failures. Selection
helper now waits for its option to load before reading it; no focus repair is introduced.
Preparation dialog and error correction/undo/redo now use native keyboard controls: 3 layouts
passed (54.1s), .backups/r6-keyboard-preparation-20261012, preserving integer 9007199254740993,
Cost [10.5,0,0], explicit invalid conversion failure and reload. Independent API previews remain
numeric oracles, not claimed keyboard preview actions. API/file setup remains fixture setup.
Wizard helper regression: 4 passed (50.7s), .backups/r6-keyboard-wizard-regression-20261012.
Test-only changes; lint/types/API/default build pass; prior unit/backend counts not rerun.
Private projects empty, owned services stopped. No new known P0/P1 or external blocker.
Next: A1 remaining dashboard authoring/history release focus paths and focus-return audit;
then rendered A4/localized A5/final A6. A1 overall and A3 native zoom/H1/H2 remain open.

Previous completed increment:
Latest completed increment: sequential keyboard overview/import/report/update journey.
wizard-focus now uses actual Tab traversal for actions and links, typed text and native select
Space/Home/ArrowDown/Enter, not locator.focus/fill/selectOption/click jumps. Radio groups use
their native arrow navigation; Shift+Tab field order remains asserted. Enters through empty
overview, corrects duplicate key and invalid conversion, creates a report, edits sum to average,
then navigates to History for reordered-source replacement and back to Reports via UI links.
Exact results 0.30 -> 0.15 -> 0.35 and leading-zero identifier 001 survive save/reload.
Final four layouts/themes passed (50.4s), .backups/r6-keyboard-full-journeys-20261012.
Test setup creates the project via API; file payload attachment bypasses the OS picker after
focusing its input. Reload and final table geometry probing remain explicit test actions.
No runtime/backend changes. Lint/types/API/default build pass; unit suite not rerun this turn.
Owned services stopped; isolated projects empty. No new known P0/P1 or external blocker.
Next: A1 sequential preparation/graph journeys (both editors), then remaining dashboard/history
focus paths. A1 overall, A3 native zoom, A4/A5/A6 and human H1/H2 are still open.

Previous completed increment:
Latest completed increment: advanced dashboard/navigation/shared-settings form acceptance.
Legacy navigation journey now checks populated parameters/choices/link/widget mappings at
420px and enlarged text: 1 passed (14.6s), .backups/r6-dashboard-navigation-reflow-20261012.
Selected Korea slice survives reload/back/forward without revision changes; invalid typed
selection hides the table and reports its error. Shared node-owned visualization settings
run at desktop/narrow/enlarged: 3 passed (17.0s), .backups/r6-shared-settings-reflow-20261012.
Explicit shared-use consent, 409 retention/reload and independent dashboard drafts preserved.
Modern publication navigation dialog checked at both layouts: 1 passed (17.1s),
.backups/r6-publication-navigation-20261012. Period and KPI 10.00 survive drill-through;
workflow unchanged. Enlarged shared-settings screenshot reviewed. Test-only changes.
Final lint/types/API/default build pass; previous 563-unit suite not rerun this turn.
Isolated projects empty; owned services stopped. No new known P0/P1 or external blocker.
Next: A1 sequential overview/import/report-authoring journey. Named primary form geometry
now has scoped evidence across overview/import/preparation/report/template/graph/dashboard/
history and these advanced settings. Do not expand this into endless type permutations:
A3 native zoom/reflow limits remain unverified, A4/A5/A6 and human H1/H2 remain explicit.

Previous completed increment:
Latest completed increment: dashboard workbench and recovery reflow (ADR-204).
Reproduced 1280px/doubled-text fixed field/settings panels occupying the preview space and
hiding section navigation. Added a dashboard container and text-relative stacked workbench
rule; existing field/configuration/draft instances are retained. Desktop six locale/theme
combinations still keep the preview between panels. Narrow/enlarged checks verify all controls,
section navigation, vertical non-overlap and preview width. Final 11 cases pass (36.2s),
.backups/r6-dashboard-reconciled-20261012, including six malformed/stale-draft cases and four
period-recovery cases. Stale revisions cannot overwrite newer reports; bad drafts stay explicit.
Full frontend 563 passed / 114 files (40.38s); final lint/types/API/default build pass.
Unit run preceded final equivalent max-width query spelling; final browser run covers that CSS.
Reviewed enlarged workbench screenshot; isolated projects empty, owned services stopped.
Test limitation: live root-font mutation after resize did not reevaluate the query in this
browser run; final test sets font before viewport resize. Not native browser-zoom certification.
Correction to earlier note: DashboardEditor does render main; the prior zero-count helper
observation did not establish absent landmark semantics. Actual screen-reader H2 remains open.
Next: finite A3 inventory reconciliation (advanced dashboard/navigation dialogs included),
then sequential A1, rendered A4 and localized A5; final A6 and human H1/H2 still required.
No new known P0/P1 or external blocker. Backend unchanged; no backend rerun this turn.

Previous completed increment:
Latest completed increment: publication/group controls and dashboard period reflow.
Expanded existing single/composite Join journeys to check all dialog controls, not only
Cancel, at narrow/doubled text. Publication name survives resize; real Tab reaches Cancel
then Publish. Both full journeys pass (52.1s), .backups/r6-publication-form-20261012;
aggregate 80, shared chart/table, saved graph and reload remain intact.
Dashboard date drafts pass normal/enlarged text with normal or denied recovery storage,
including 420px dark mode: 4 passed (9.5s), .backups/r6-dashboard-period-final-20261012.
Restoring input dates does not apply URL filters; revision is unchanged. Initial four test
failures were an incorrect helper assumption that dashboard controls are inside main;
helper now accepts explicit root, preserving nonempty/control/page bounds assertions.
Reviewed publication and narrow dark period screenshots. No product runtime/backend changes.
Lint/types/API and default build pass; preceding 563-unit result was not rerun this turn.
Private projects empty, owned services stopped. Next: dashboard authoring/recovery state
matrix and finite A3 reconciliation, then A1/A4/A5/A6. Dashboard main-landmark semantics
also need A1/H2 inspection; no claim of screen-reader acceptance. No new known P0/P1 or blocker.

Previous completed increment:
Latest completed increment: overview and analytical helper reflow acceptance.
Analytics shares/ranks and grouped Unpivot now run at desktop, 420px and doubled root text.
Denominators remain 60/100 (shares 0.5/0.3), zero groups remain null, stable ranks and six
Unpivot values survive undo/redo/reload. Overview covers empty/populated/rename/search/pages,
unavailable checks/retry and RU/TT dark layouts. Initial overview matrix: 2 pass/1 fail;
390px/32px text exposed unconstrained heading width and non-wrapping pagination. Limited
heading width and enabled pagination wrapping; no calculation/API/state changes.
Final combined browser run: 9 passed (1.7m), .backups/r6-overview-helpers-final-20261012.
Full frontend: 563 passed / 114 files (39.07s); lint/types/API/default production build pass.
Reviewed narrow Unpivot and enlarged Russian overview screenshots. Isolated projects empty;
owned services stopped. No new known P0/P1; backend suite not rerun (backend unchanged).
Next: publish/group helper and dashboard-state coverage, then finite A3 reconciliation;
A1/A4/A5/A6 and observed human H1/H2 remain open. No external implementation blocker.

Previous completed increment:
Latest completed increment: preparation/calculated-field dialog reflow (ADR-203).
Populated Prepare data table overflowed at 420px (initial 7 pass/1 fail). A text-relative
60rem container rule now stacks the same table cells with translated headings; desktop stays
tabular. No alternate draft, plan generation or calculation semantics. Added dialog-specific
control bounds/overflow checks; calculated-field create/edit/undo/cancel also runs in three
layouts. Final 8 cases passed (1.5m), .backups/r6-preparation-dialogs-final-20261012, including
existing single/composite Join journeys with sequential Tab-to-Cancel and declined discard.
Exact integer 9007199254740993 and missing/conversion policies retained; graph undo/redo and
reload pass. Inspected narrow stacked-dialog screenshot. Full frontend 563 passed / 114 files
(31.68s); lint/types/API consistency and default production build passed. Backend unchanged.
Private projects empty, owned services stopped. A3/A1 still require remaining helper dialogs
and overview/dashboard state reconciliation; A4/A5/A6 and observed human gates remain open.
Next: analytics/grouped-unpivot/publish helper coverage and finite A3 reconciliation. No external
blocker or new known P0/P1. Stacked-table screen-reader behavior still needs human H2 evidence.

Previous completed increment:
Latest completed increment: waterfall, analytical-template and Excel-range form reflow.
Three layouts (desktop, 420px, 1280px/32px root text) cover waterfall create/error-repair/edit,
histogram/treemap template capture/mapping/lost-response recovery, and Excel multi-header/range
import plus relocated update. Final 12 passed (1.4m), .backups/r6-remaining-form-reflow-20261012.
Waterfall balances remain 10.10/10.30/8.00/8.00; template treemap total 100.00/histogram count 4.
Excel settings restore, preserve exact values, reject oversized range without changing current
data and survive simulated update conflict. Existing Tab traversal of reading controls retained.
Inspected enlarged Excel settings screenshot. No runtime/backend changes or new defects.
Lint/types/API and restored default production build passed; prior 563-unit suite not rerun.
Private projects empty, owned services stopped. The named report/import/template form batches
are covered; A3 still needs preparation dialogs and remaining overview/dashboard states plus
scope reconciliation. A1/A4/A5/A6 and human gates remain open. Next: preparation helper/dialog
reflow and actual sequential focus paths, not more chart types. No external blocker.

Previous completed increment:
Latest completed increment: alignment and six analytical authoring families reflow acceptance.
Wizard alignment plus heatmap, analytical table, Pareto, funnel, treemap and sunburst run at
desktop, 420px and 1280px/32px root text; existing desktop graph alignment also retained.
Final 22 passed (1.4m), .backups/r6-analytics-form-final-20261012. Analytical narrow variants
now retain their viewport through save/retry/dashboard/reload, not only initial settings.
Checks cover full-input unmatched counts, unchanged upstream nodes/edges, missing-vs-zero
heatmap cells, 30.00/10.000000/1.000000 table totals, hierarchy drilling and no-duplicate replay.
Inspected enlarged alignment and heatmap screenshots. Earlier 22 passes (1.5m) predate the
stronger retained-viewport save sequence and are not substituted for final evidence.
Lint/types/API consistency passed; final changed-test lint and restored default build passed.
No runtime/backend changes or new defects; previous 563-unit suite not rerun for this test-only
increment. Private project list empty, owned services stopped. Remaining A3 work includes
waterfall, analytical-template mapping, Excel acquisition and remaining preparation/dialog
coverage; A1/A4/A5/A6 and human gates stay open. Next: finish these named forms, reconcile
the finite A3 matrix rather than inferring whole-product coverage. No external blocker.

Previous completed increment:
Latest completed increment: template catalog and combo/radar template mapping reflow.
Nine desktop/narrow/doubled-root-text journeys passed (46.4s),
.backups/r6-template-reflow-final-20261012. Covers capture/retry/draft recovery, explicit
renamed-field mapping, exact 6.00/10.00/0.6000 results, unchanged original graph, catalog
competing edits and archive/restore. Initial eight passes/one failure exposed 390px/32px RU
pagination right overflow and global theme control left clipping. Wrapping preferences,
rename actions and pagination fixed it; regression checks both edges, final dark screenshot
inspected. Added scoped shared browser form-reflow helper for these two test files.
Full frontend 563 passed / 114 files (30.49s), lint/types/API consistency passed. Additional
both-editor geometry/save regression: 8 passed (26.7s),
.backups/r6-preferences-graph-reflow-20261012. Default build restored; private projects empty,
owned services stopped. No backend changes or new known P0/P1. A3 remains open for alignment,
other statistical types, analytical-template-specific mapping and Excel acquisition. A1/A4/A5/A6
and human gates remain open. Next: finish the remaining named form families and reconcile A3.
No external blocker.

Previous completed increment:
Latest completed increment: statistical wizard preview reflow (ADR-202 follow-up).
Expanded histogram/box-plot authoring across desktop, 420px and 1280px/32px root text.
Initial seven controls-only cases passed, but screenshot review exposed a cramped chart beside
the enlarged fixed-width settings panel. Two stronger preview-position/width regressions failed
before the fix. StatisticalReportForm now shares the text-relative container boundary, stacking
the same settings/preview components without calculation or persistence changes.
Final 10 browser cases passed (52.8s), .backups/r6-statistics-preview-final-20261012: six
distribution variants, prepared-result reuse and three ordinary formula creation/edit cases.
Includes histogram range/missing counters, 150-outlier pagination, draft recovery, lost-response
retry with exact request replay/no duplicate graph and reload. Inspected final enlarged preview.
Full frontend 563 passed / 114 files (30.43s); lint, types, API consistency and default production
build passed. Backend unchanged. Final private projects empty, owned services stopped.
No new known P0/P1 or external blocker. A3 remains open for templates, alignment and remaining
statistical configuration families/Excel acquisition; A1/A4/A5/A6 and human gates stay open.
Next: populated template/alignment and other statistical controls, then consolidate A3 scope.

Previous completed increment:
Latest completed increment: populated release form reflow and frozen-data isolation evidence.
report-cycle.spec.ts runs the full update/check/draft recovery/period validation/freeze/restore
journey at desktop, 420px and 1280px with 32px root text. Form controls fit at the checked
filled states, with no page overflow. All-time release retains five exact rendered rows after
working graph changes to four rows; reload and restored-project table both equal frozen rows.
Existing RU/TT, both-theme and 390px checks remain. Final 4 passed (49.7s), including two-book
mapping repair, .backups/r6-release-reflow-final-20261012. Inspected enlarged release screenshot.
Initial run: one pass/three test-setup failures; new mutation incorrectly sent WorkflowRead
instead of WorkflowSave. Corrected explicit save payload preserves format version and CAS;
no runtime defect or application/backend change. Full lint/types/API passed, final changed-test
lint and default production build passed. Prior 563-unit suite is not relabeled as fresh.
Final private projects list empty; owned services stopped. A3 still has Excel acquisition,
template and other report-family forms; A1/A4/A5/A6 and human gates remain open. This test
validates date draft/application but freezes All time; it is not new filtered-release evidence.
Next: remaining statistical/alignment/template authoring reflow. No external blocker.

Previous completed increment:
Latest completed increment: CSV import/update/rollback expanded-form reflow acceptance.
evolution.spec.ts now runs desktop, 420px and 1280px with 32px root text retained across
navigation/reload. Expanded import metadata, currency RUB and string-code key survive saved
draft recovery. Checked form controls stay within the viewport after scrolling, page does not
overflow; reordered-file mapping and exact totals 0.30 -> 0.70 -> 0.30 are preserved.
Final 3 journeys passed (39.6s), .backups/r6-import-history-details-20261012; initial collapsed
details matrix also passed (33.1s). Inspected narrow history and enlarged import screenshots.
Lint, typecheck and API consistency pass. Default production build restored after isolated
services stopped; final private project list empty. No runtime/backend changes or new defects.
Previous 563-unit suite is historical, not rerun for this test-only increment. A3 still includes
populated release/Excel-specific acquisition/template/other report-family forms. A1/A4/A5/A6
and human gates remain open. Next: release authoring and remaining report/template reflow.
No external blocker.

Previous completed increment:
Latest completed increment: ADR-202 report wizard reflow. Reproduced horizontal page overflow
at 1280px with doubled root text; replaced viewport-based fixed three-column activation with
a 78rem inline-size container query. The same panels stack without remounting or calculation
changes. Populated row/summary formula creation and saved-report editing pass at desktop,
420px and doubled text: 3 passed (36.5s), .backups/r6-report-form-reflow-final-20261012.
Independent values 2.0000 (average of ratios), 2.5000 (ratio of totals), and edited difference
6.0000 remain correct. Inspected enlarged-text screenshot: panels stack and controls fit.
Full frontend 563 passed / 114 files (36.10s); lint, typecheck, API consistency and restored
default production build passed. No backend changes. Initial run stopped because its test
build used an incorrect API base; corrected run reproduced the layout defect (2 pass/1 fail).
Only the final run is acceptance evidence. Verified leftover from interrupted run removed
from private API; final project list empty, owned services stopped. A3 remains open for
import/history/template forms and other report families; A1/A4/A5/A6 and human gates remain
open. No new known P0/P1 or external blocker. Next: import/history populated-form reflow.

Previous completed increment:
Latest completed increment: populated classic calculation forms acceptance. transforms.spec.ts
now runs desktop, 420px and 1280px/doubled-root-text variants with populated filter, formula,
grouping and exact decimal parameter controls. Every inspected control fits its panel and
viewport after scrolling; page horizontal overflow is rejected. Filter traversal uses real Tab
after initial focus. Decimal default 9007199254740993.11 persists exactly; preview-only changes
do not mutate the saved graph. All three full calculation/reload/dashboard journeys passed
(43.3s), .backups/r6-populated-parameters-20261012, retaining independent total 500.
Downstream chart/dashboard gestures run at desktop size, not claimed as narrow-screen evidence.
Lint, typecheck, API consistency and default production build passed. Isolated services stopped
(ports 8020/3020 no longer listening); final API project list was empty. No runtime/backend changes or new
known defects. Earlier 563-unit suite remains historical, not rerun for this test-only increment.
A3 remains open for report/import/history/template forms; A1/A4/A5/A6 and human gates remain
open. No external blocker. Next: populated report/import/history forms and sequential focus.

Previous completed increment:
Latest completed increment: A2 enumerated non-drag functional acceptance reconciled. Inspected
workflow/dashboard drag/drop/resize handlers and their ordinary-control alternatives. Added
button-vs-drag operation creation, selector-only field authoring at 420px, panel-width pointer
click/keyboard End, and all eight dashboard movement/size buttons with bounds checks.
Both connection paths produce independent fixture total 1121 (160+240+621+100, missing price
remains null), retain A/B previews, undo/redo, metadata and reload. Layout changes preserve full
workflow JSON and displayed table rows; title/caption changes are checked separately. Added
component coverage for occupied positions/minimum sizes without changing runtime code.
Final full frontend: 563 passed / 114 files (36.49s); lint, types, API consistency and default
production build passed. Final isolated browser matrix: 10 passed (1.6 min),
.backups/r6-nondrag-authoring-final-20261012. Includes existing copy/conflict/locales/themes and
book detach/return cases. Inspected populated desktop and 420px field/A-B screenshots: settings
fit, previews stack. Earlier diagnostic .backups/r6-nondrag-authoring-20261012 had six passes
and a test assertion error: intentional title rename changed the table caption. Final assertions
compare all headers/data rows, keep explicit saved-title expectations and full graph equality.
A2 is complete for the inventoried graph/layout actions, not a claim of whole-app keyboard or
WCAG acceptance. A1/A3/A4/A5/A6 and human gates remain open. No application/API/backend code
changed this session. Test projects removed (final list empty), owned services stopped and
default build restored. Next: remaining populated classic filter/formula/parameter settings
and report/import/history form reflow, with actual focus traversal. No external blocker.

Previous completed increment: viewport navigation and readable duplicate choices (ADR-201).
Latest completed increment: viewport navigation and readable duplicate choices (ADR-201).
Both editors now expose directional viewport buttons alongside existing zoom/fit, moving
200 screen pixels without changing zoom, node positions or graph state. A shared helper
disambiguates repeated list captions before filtering, avoiding collisions with authored
suffixes; values remain stable IDs, and optional diagnostic ID search still works.
Full frontend: 562 passed / 113 files (40.42s); final lint, types, API consistency and default
production build pass. Final isolated browser matrix: 14 passed (51.1s),
.backups/r6-canvas-navigation-final-20261012. Includes both-editor distant-node search/pan,
keyboard activation, unchanged full saved graph, retained edits, stable filtered labels,
grouping and eight reflow cases. Inspected 420px screenshot: Limit entries are distinct and
all four viewport buttons remain inside the canvas. No backend/API/calculation changes.
Earlier .backups/r6-canvas-navigation-20261012 had 13 passes and one test setup failure:
the v3 legacy formula field was in a closed Advanced settings disclosure. The corrected test
opens it explicitly; timeout/assertions were not weakened. Its synthetic leftover was verified
and removed from the private API. Final project list empty; owned services stopped, default
API build restored. The earlier duplicate-caption note below is now resolved by ADR-201.
Next: finish A2 evidence for input/field operations, panel width and dashboard controls;
check populated settings/forms under reflow instead of inferring coverage from empty nodes.
Human economist/screen-reader gates remain open; no external blocker.

Previous completed increment: classic group checkbox selection (ADR-200).
Latest completed increment: classic group checkbox selection (ADR-200). Searchable, named
native checkboxes use existing canvas selection; clearing also clears implicit inspector
selection. Filtering preserves off-screen selected nodes with explicit scope guidance. The
list renders up to 100 matches and prompts refinement, not silent truncation of group scope.
Grouping/rename/dissolve/undo still use the existing operations; selection itself does not save.
Full frontend: 560 passed / 111 files (37.79s); lint, types, API consistency and default production
build pass. Isolated browser matrix: 12 passed (55.8s), .backups/r6-group-selection-20261012,
covering canvas and checkbox grouping, focus and eight reflow cases. Final stronger two-case
run: 2 passed (12.8s), .backups/r6-group-selection-final-20261012, including the full checkbox
journey at 420px, Tab/Space selection, no page overflow, no selection-only revision change,
group collapse/reload, panel width, rename/undo/dissolve and unchanged dataset rows/columns.
Inspected checkbox screenshot: controls/focus visible. Unnamed same-type nodes still show
the same caption (e.g. two Limit entries); disambiguating these without technical IDs is a
remaining copy/usability refinement, not a calculation change. No backend/API changes.
Synthetic projects removed (final list empty), owned services stopped, default build restored.
Next: non-drag canvas navigation, duplicate-caption disambiguation and remaining populated-form
reflow. Human economist/screen-reader gates remain open; no external blocker.

Previous completed increment: non-drag graph placement (ADR-199).
Latest completed increment: non-drag graph placement (ADR-199). CanvasPlacement lists visible
movable items by name/coordinates, with four 20-unit buttons and announced position. Classic
nodes and field nodes/books/blocks/prepared results use existing graph position mutations,
history and revision-protected autosave. Missing selections disable actions, not retarget them.
Full frontend: 559 passed / 110 files (32.23s); final lint, types, API consistency and default
production build passed. No backend/API changes. Production evidence on disposable 8020/3020:
- .backups/r6-canvas-placement-20261012: 10 passed (34.7s), node movement/undo plus eight reflow cases.
- .backups/r6-canvas-placement-expanded-20261012: 10 passed (1.2 min), node/result movement,
  composite/book movement with unchanged calculations and wires, field history/conflicts and focus.
- .backups/r6-canvas-placement-final-20261012: 2 passed (9.8s), strengthened no-page-overflow
  checks and screenshots, keyboard activation, undo, save/reload and result-card positions.
These are separate targeted runs, not a new whole-suite browser claim. Inspected the field
placement screenshot at 420px: all four controls and position status visible without overflow.
Test projects removed (final list empty), owned services stopped, default API build restored.
Initial A2 inventory is in docs/PRODUCT_EVOLUTION.md. Next: verify classic group multi-selection
without canvas gestures and non-drag navigation over a large graph; audit remaining populated
forms. Human economist/screen-reader gates remain open. No external blocker.

Previous completed increment: graph workspace reflow (ADR-198).
Latest completed increment: graph workspace reflow (ADR-198). Both editors reproduced horizontal
page overflow at 320/420 px. CSS now stacks the same mounted library/canvas/settings/preview,
wraps the route toolbar, names focusable panel regions and stacks A/B previews on narrow screens.
Desktop classic widths remain intact. Enlarged-text screenshot review found a second defect:
the field canvas overlaid preview despite initial green tests. Added canvas-boundary assertions
and minimum desktop workspace/grid-row heights; inspected the final 1280px/doubled-text image,
confirming separate canvas, visible settings and preview without overlap.
Final production regression: 15 passed (1.2 min), .backups/r6-graph-reflow-final-20261012:
eight version/width cases (320 light, 420 dark, 1280 doubled root text, 1600 desktop), two
sequential-focus cases and five full field-editor wiring/pins/undo/conflict scenarios.
New cases check real Tab/Enter insertion, labels retained through resize, save/reload identity,
page width and drawing containment. They do not certify every configuration or browser zoom.
Full frontend: 558 passed / 109 files (38.11s), before final CSS-only row-height refinement;
final lint, types and default production build pass. API consistency also passed; no API/backend
changes. Earlier broad 170-case run below predates this layout correction and is not relabeled.
Initial failing diagnostics: .backups/r6-graph-reflow-before-20261012 and
.backups/r6-graph-reflow-20261012. Expanded run was green but screenshot review found overlap;
only the final run above includes the strengthened containment assertions.
Synthetic projects removed (final list empty); owned 8020/3020 stopped, default build restored.
Next: A2 inventory single-pointer and keyboard alternatives for movement/selection/grouping/
connections; continue A3 with representative populated forms rather than infer all-form support
from Select Columns. Human economist/screen-reader gates remain unverified. No external blocker.

Previous completed increment: finite acceptance reconciliation and heatmap labels.
This session: documented A1–A6 / H1–H2 in docs/PRODUCT_EVOLUTION.md and TASKS.md;
marked the earlier acceptance checkpoint historical instead of treating already delivered
PostgreSQL/restart/HTTP/browser evidence as missing. Human gates remain open.
Fixed capitalized heatmap aggregation translations (RU/TT); four failing component cases
now pass across EN/RU/TT, preserving exact values. Focused heatmap/localization: 17 passed.
Fresh uninterrupted public browser regression: 170 passed, 2 private-data opt-ins skipped,
zero failures (13.1 min), on isolated 8020/3020. Evidence:
.backups/r6-public-reconciled-20261012, passed .last-run.json. This used the build before
the translation-only fix; dashboard parser hardening from ADR-197 is included. Both 100k-row
fixtures passed, as did the five-journey variants and eight-widget executive refresh.
Final frontend: 558 tests / 109 files passed (41.98s); lint, typecheck, API consistency and
production build passed. Rebuilt executive-demo and heatmap browser checks: 2 passed (15.0s),
including the new Russian aggregation assertion and unchanged exact financial results.
Evidence: .backups/r6-heatmap-copy-20261012. No backend/API/calculation changes this session;
earlier backend/PostgreSQL/restart evidence below is not relabeled as a fresh run.
Synthetic projects removed (final items empty); owned 8020/3020 stopped and default-API
production build restored. No user projects or unrelated services modified.
Next implementation: A3 graph editor reflow reproduction, then fix verified failures and
continue the finite keyboard/drag/visual-state packages. No current external blocker.

Latest completed increment: explicit dashboard configuration recovery (ADR-197). A post-hydration
boundary validates identity/revision, widget geometry/unique IDs and nested rendering shapes
before mounting editor/widgets. Invalid JSON, denied reads and incompatible structures require
Retry, confirmed discard or explicit saved-dashboard continuation; raw recovery is not silently
removed/replaced. Failed discard stays blocked. Valid incomplete authoring and original CAS are
preserved. Error entry focuses its panel; recovery decisions focus dashboard name/view heading.
Final full frontend: 554 passed / 109 files (34.28s); lint, types and default production build pass;
API consistency passed before the final parser-only hardening (no API changes). Six production
scenarios pass (16.8s): malformed JSON/nested settings, declined discard/explicit continuation,
save/reload, real stale-revision 409 preservation, date recovery and eight-widget executive refresh.
Evidence: .backups/r6-dashboard-recovery-20261012. Inspected fresh executive-light image: three
financial KPIs, plan-fact combo, heatmap, distribution boxplot/histogram and analytical table.
Final additional unknown-field guards are covered by the full unit regression; that small parser
hardening followed the browser run. No backend changes. Synthetic projects removed (final list
empty); owned 8020/3020 stopped and default API build restored. Unrelated services untouched.
Next: reconcile R1 authoring/five-journey acceptance against concrete evidence and enumerate
finite remaining checks instead of perpetuating generic audit placeholders. Human economist,
screen-reader and whole-app accessibility gates remain open; R0–R6 not complete. No blocker.

Latest completed increment: dashboard view-date recovery (ADR-196). A versioned project/board
draft retains partial dates separately from applied URL filters. Restore/discard/explicit recovery
bypass focus the first date; changed URL periods warn before restore. Editing/recovery never
updates configuration, dashboard revision or execution context. Apply retains focus across URL
changes, and explicit application/pristine input retires recovery. Native unload protects active
edits; denied writes retain the bounded document copy, failed discard keeps it, denied reads
require an explicit choice. Successful dashboard deletion retires date/config recovery keys.
Strengthened read+write-denial browser test reproduced a P2: after successful Apply cleanup,
the new URL caused a denied recovery read and disabled the form. Fixed with a one-shot marker
for the control's own application; external URL changes still inspect recovery. Regression added.
Final full frontend: 531 passed / 108 files (32.75s); lint, types, API consistency and default
production build pass. Three final production scenarios pass (23.2s): two-dashboard isolation,
reload/back/changed-period recovery, read+write-denied narrow dark interaction/focus/unchanged
dashboard revisions, plus existing independently authored chart/KPI period-before-aggregation
journey. Evidence: .backups/r6-dashboard-period-final-20261012. Earlier failing diagnostic run is
retained at .backups/r6-dashboard-period-verified-20261012; do not cite it as a passing run.
No backend/API changes. Test projects removed (final list empty), owned 8020/3020 stopped and
default API build restored. The subsequent dashboard configuration recovery work is recorded
above. Human gates
and broader R1/R6 remain open; no current implementation blocker.

Latest completed increment: release date scratch and recovery focus (ADR-195 follow-up).
Partial/unapplied start/end inputs now persist separately from the applied DatePeriod. Recovery
does not filter data; explicit Apply validates the range and All time clears it. Pending date edits
show guidance and block release creation, preventing a release silently using an older period.
The same pending-edit notice appears in dashboard controls. Restore/discard focuses release name
once; applying a valid period retains button focus. Older drafts without scratch remain valid.
Final full frontend: 522 passed / 107 files (28.36s); lint, types, API consistency and default
production build pass. Three production browser scenarios pass (20.2s), including partial-date
reload, recovery focus, rejected incomplete range, explicit apply/reset, freeze/restore, denied
storage return and two-book mapping. Evidence: .backups/r6-release-period-20261012.
No backend/API changes. All synthetic projects removed, owned 8020/3020 stopped, default API
build restored. The subsequent dashboard-route scratch recovery is recorded above. Human
economist/screen-reader acceptance and broader R1/R6 remain open; no blocker.

Latest completed increment: release-form settings recovery (ADR-195). Explicit tab-local
restore/discard preserves name, period label, comment, selected dashboards, applied date period
and exact parameter values. Recovery never creates a release or restores warning consent/check
tokens. Malformed/foreign drafts block editing until an explicit choice; missing dashboards
block submission pending reselection. Denied/quota storage uses the existing bounded document
fallback with visible reload-loss guidance; failed discard retains settings. Route state is keyed
by project. Departure protection avoids adding a second guard when update/rule editors are dirty.
Release POST starts a background job: settings intentionally remain after enqueue/failure, with
guidance to check tasks/releases before repeating. No idempotent job retry or completion receipt
claim. The follow-up above adds previously missing unapplied date-input scratch recovery.
Verification: 31 focused tests; final full frontend 517 passed / 106 files (27.91s). Lint,
typecheck, OpenAPI consistency and default production build pass. Three production browser
scenarios pass (19.9s): denied-storage client return with declined/accepted navigation and
420px fit, two-book repair, and reload recovery followed by actual release/frozen restore.
Evidence: .backups/r6-release-draft-verified-20261012. First browser run exposed an exact-label
test selector issue for a populated nested textarea; switched to its unchanged accessible textbox
name and verified the value. No backend changes. Synthetic test projects removed (final list
empty), owned 8020/3020 services stopped, default API build restored; user services untouched.
Next concrete task after that increment was unapplied date-control scratch and recovery focus;
release coverage is now above, dashboard work remains. Human economist/screen-reader gates
remain open; R1/R6 and the overall evolution are not complete. No implementation blocker.

Latest R1 history delivery (ADR-194): selected saved update is addressable/reloadable via query
parameter; selection replaces URL and preserves other query parameters. Missing/foreign IDs
show a clear state, never silently another update. Confirmed create/rollback responses seed the
query cache before navigation. New rollback opens immediately but still requires checks/apply.
Editor entry focuses its heading; action errors focus a named panel; query errors do not steal
focus. Existing unsaved-switch confirmation and all CAS semantics remain intact.
Five new component cases and full frontend 504/105 files pass (37.02s); lint/typecheck/OpenAPI
consistency/default production build pass. Six import/report/range browser journeys pass (1.1m),
including injected 409 save failure with focused error and retained settings, reload selection,
direct rollback entry and exact values. Four legacy/evolution/executive scenarios pass (38.6s),
including two-book field repair, release freeze/restore and all eight demo widgets refreshing
without layout changes. Inspected fresh executive-light screenshot.
Evidence: .backups/r6-history-navigation-20261012 and .backups/r6-history-showcase-20261012.
No backend runtime/API changes. All isolated synthetic projects removed (final list empty),
owned 8020/3020 stopped and default API build restored. Unrelated user services untouched.
The subsequent unsaved release-form settings increment is recorded above; saved update deep
links remain distinct from recovery of that separate form.
R1/R6 remain open, including economist/screen-reader human acceptance.
Latest R1 increment: actionable import validation. ImportIssues offers one review button per
affected field plus row-key review; actions return to Fields and focus the matching control,
opening key details without changing data/profile or triggering persistence. One-shot focus
does not hijack subsequent ordinary Back navigation. Bounded diagnostic samples now say how
many issues are shown. Import preview has a localized caption, scoped headers and named
keyboard scroll-region tab stop with visible focus.
27 affected import/localization tests pass; full frontend 499/104 files pass (33.67s), lint and
types pass. Six production journeys pass (58.3s), including narrow/doubled-text correction focus
within viewport, key/type error repair, exact report updates and relocated Excel rollback.
Evidence: .backups/r6-import-correction-20261012. No backend runtime or API changes this turn.
Owned synthetic projects removed (final list empty), owned 8020/3020 stopped; default API
production build restored successfully. Unrelated services and user data untouched.
Next: continue R1 history/update feedback, then remaining authoring forms. Inspect concrete
error/focus/recovery behavior; keep human trials and whole-app accessibility gates distinct.
Latest R2 completion reconciliation: docs/PRODUCT_EVOLUTION.md now maps every functional R2
requirement to contracts and acceptance evidence, including ranges, metadata/keys, exact node
versions, immutable snapshots/drafts, failed refresh, rollback and frozen restoration. Removed
the unbounded remaining-decimal-audit placeholder; explicit R1/R6 gates remain, not waived.
Final discovered R2 UI gap addressed: Field details now lets authors choose a composite row key
using existing ImportProfile.key_fields. Rename/remove preserves stable IDs, 32-field contract
limit is respected, key diagnostics localized RU/EN/TT. Backend validation is unchanged.
Two API cases prove duplicate combinations/null keys block refresh without changing the snapshot
or exact amounts. Keys persist in the import profile, not arbitrary runtime dataset metadata.
48 ingestion/draft/update/normalization tests pass (15.12s), two PostgreSQL concurrency skips,
two known dependency warnings. Full frontend: 497 passed/104 files (34.12s); lint/types/default
production build pass, affected backend Ruff/format pass.
Four production keyboard journeys pass (25.9s): duplicate single key rejected, second field
completes a valid key, saved reload retains choices, exact report edit/refresh still succeeds at
desktop/compact/420px/doubled-root-text layouts. Evidence: .backups/r6-import-keys-verified-20261012.
Initial harness matched both the validation alert and Next route announcer; narrowed to the
actual key-error alert. Both range/relocation journeys also passed in the preceding combined run.
Owned test projects removed (final list empty), 8020/3020 stopped, default API build restored.
Next: audit remaining R1 forms for understandable errors, keyboard/focus and narrow/enlarged
layouts, starting with import validation feedback and history/update controls. Keep economist
and real screen-reader trials separate; no claim that R0–R6 or the thread goal is complete.
Latest replacement-reading UI: per-dataset range/header-count/skip/tail controls now preserve
sibling bindings, reset the edited dataset's column map and suppress stale check suggestions.
This prevents selecting an old suggested column from overwriting the newly chosen rectangle.
Two component regressions cover option edits/clearing and sibling/stale-check boundaries.
29 backend range/update/timezone cases pass (5.06s); relocated-table fixture verifies invalid
range CHECK_FAILED without changing the old report, explicit renamed/reordered mappings,
exact update, rollback and frozen restoration. No backend runtime change in this increment.
Full frontend: 494 tests in 104 files pass (28.91s). Lint, typecheck, OpenAPI consistency and
production build pass. Six production journeys pass (52.7s): two Excel range/relocation paths
and four existing CSV report paths. Evidence: .backups/r6-range-refresh-accepted-20261012.
Initial harness failures were incorrect error-prefix/rollback labels and assuming the selected
history entry reopens automatically after reload; tests now use the actual saved-draft history.
Strengthened settled capture waits for Apply to be enabled and both explicit mappings to be
present before checking narrow overflow/taking screenshots. Both repeated journeys pass (24.6s),
evidence .backups/r6-range-refresh-settled-20261012; inspected the completed narrow mapping.
All owned synthetic projects removed, final list empty, owned 8020/3020 services stopped and
default API production build restored. No unrelated services or user projects were changed.
Next: replace generic remaining R2 audit placeholders with explicit requirement/evidence gaps;
retain separate R1 accessibility and economist/screen-reader human acceptance gates.
Latest R2 delivery (ADR-193): explicit Excel rectangles, e.g. B2:F100, now bound header/data
reading and preserve physical col_N identities/positions. Top row starts headers; skip/tail
settings operate inside the range. Reject invalid/extending bounds, CSV range options and
partially selected merged headers; formula caches outside selection do not block selected data.
Existing whole-workbook safety limits remain. Absent range is omitted from initial apply receipt
hashes to preserve historical retries. No schema migration or automatic project conversion.
Tests cover case normalization, headers, empty data, exact report refresh 0.10 -> 0.40, rollback,
frozen restoration and unchanged old-profile hashes. 60 focused cases passed; strengthened
release/receipt cases passed separately in a 23-case run. Full backend: 1539 passed, 32 skipped,
two known dependency warnings (159.58s). Skips are PostgreSQL/migration/Docker opt-in gates,
not counted as passes. Full frontend: 492 passed across 104 files (30.98s).
Lint, generated API consistency, typecheck, default production build, backend Ruff/format and
mypy (175 app files) pass. Six production browser journeys pass (27.2s), including native
keyboard disclosure, range/row settings, saved reload, narrow dark layout and existing CSV
report edit/refresh. Screenshot inspected: no narrow horizontal overflow, visible focus.
Evidence: .backups/r6-import-range-verified-20261012. First run only failed test cleanup lacking
confirm=true; corrected harness and removed its two owned synthetic projects. Final project
list empty; owned 8020/3020 services stopped, default API build restored.
Next: expose/test range overrides in replacement-file UI when the table moves on the sheet,
including explicit field mapping and failed-refresh preservation. Then reconcile remaining R2
acceptance items. This does not close R1/R2/R6 or substitute for economist/screen-reader trials.
Latest timezone refresh audit: two complete API scenarios cover ambiguous autumn and nonexistent
spring local times. An initial Europe/Berlin dataset keeps two 02:30 records with different UTC
offsets as distinct report groups. Failed staged conversion refuses apply even with warning
acknowledgement, preserving active Parquet data and the unchanged report response. Explicit
rename/reorder mapping from UTC timestamps retains stable field IDs/timezone metadata; apply
updates exact decimal totals and rollback restores frame/schema/report rows/columns while report
revision advances. No runtime defect found. Test: backend/tests/test_timezone_refresh.py.
49 source/import/update/recovery regressions pass (8.19s), two PostgreSQL concurrency cases
skipped in this default local run, two known dependency warnings. Strengthened post-rollback
report/cache assertions pass separately (2 cases, 1.94s). Ruff/format and mypy (175 files) pass.
No frontend/runtime files changed and no acceptance services started. Next: reconcile R2
source/type/analytical coverage against explicit acceptance items and identify any genuine
remaining gap; don't leave generic audit placeholders standing in for concrete unfinished work.
Latest exact contribution audit: added independent integer-cent/Fraction oracles spanning Pareto,
waterfall and funnel on one seeded monetary population. Six cases cover normal and above-2^53
amounts under Decimal precision 3, tied/zero contributions, ranked shares, 12-place half-even
percentages, cumulative amounts, signed cancellation/checkpoints and zero-denominator retention.
No application numeric defect found. The oracle never calls production rounding functions.
119 related node/API/visualization tests pass (9.15s), with two existing upstream deprecation
warnings; Ruff check/format and mypy over 175 app files pass. No runtime/frontend changes or
acceptance services in this increment. Next: source normalization/type-change boundary coverage,
especially date/time metadata and failed refresh mapping, then reconcile the remaining R2 gate.
This cross-node audit does not certify all decimal operations or close human acceptance.
Latest helper-dialog reflow acceptance: both single/composite-Join production journeys pass
(36.6s), checking Join, calculated-field and grouping dialogs at 420px and doubled root text.
Assertions cover horizontal fit, sequential Tab traversal to Cancel, complete button bounds,
Enter-triggered discard confirmation and retained drafts after declining. Existing Escape/Cancel,
unapplied-condition confirmation, graph edits, exact expected dashboard total 60 and reload checks
remain intact. Cleanup uses an independent request context, including failed/expired scenarios.
Evidence: .backups/r6-helper-dialog-reflow-verified-20261012. Initial harness focused an already
active Cancel after resize; browsers need not scroll that unchanged focus. Replaced with actual
sequential traversal from the first form control. No runtime defect or code change was needed.
Lint/types and production build pass; isolated projects removed, owned services stopped, default
API build restored. Next: reconcile remaining R2 analytical decimal/authoring boundary coverage
and outstanding R1 form audits; this does not certify all dialogs or human/screen-reader trials.
Latest report-first reflow acceptance: wizard-focus now runs desktop/light, 1024px/dark,
420px/dark and 1280px with doubled root text/light. All four production journeys passed (23.9s):
CSV import, sequential field keyboard traversal, rejected invalid boolean conversion/correction,
leading-zero codes, exact decimal sum, edit to mean, reordered-column replacement, refresh/reload
and exact 0.35 result. The import field page has no document horizontal overflow. Final table
checks actual 14/28 px text, full row bounds and native End-key scrolling to a completely visible
last row. Evidence: .backups/r6-wizard-reflow-verified-20261012.
An initial screenshot suggested lost rows at enlarged text; direct geometry and keyboard tests
showed they are fully accessible through existing scrolling. No runtime fix was needed or made
in this increment. This is text enlargement, not browser zoom or complete dialog coverage.
Full lint/types/default production build pass. All test projects removed; owned 8020/3020
services stopped and default API build restored. Next: helper-dialog reachability/dismissal at
narrow/enlarged layouts and remaining R2 type/authoring boundary audit. Human gates stay open.
Latest text-enlargement verification: analytical row-level width was rem-based while sticky
offsets used pixels. Rendering now uses the same 160/200/100 px constants as layout calculations
for row level/data/selection; larger text wraps rather than changing the pin boundary.
A fail-first component assertion reproduced the mismatch; 14 affected/layout/localization tests
pass. Production test doubles root text size (table font 14 -> 28 px), verifies real row-level
width and sticky offset, then restores text size. This is text enlargement, not a claim of full
browser zoom or whole-app WCAG acceptance. Five repeated journeys passed (20.1s).
Also resolved flaky narrow-cell evidence: the test scrolled before responsive grid width
transitions finished. Captured bounds showed a 73 px clipping difference after the transition;
it now awaits actual active animation completion, then verifies full cell bounds/hit testing
and stability after capture. Settled screenshot visibly includes exact Total 4410.
Evidence: .backups/r6-table-text-settled-20261012. Earlier intermittent evidence is superseded
by this repeated pass, not counted as independent successful runs. Full lint/types/build pass;
isolated projects/owned services cleaned and default API build restored.
Next: continue cross-cutting keyboard/zoom acceptance beyond analytical-table geometry and
reconcile remaining R1/R2 items; economist/screen-reader user gates remain open.
Latest basic-table/pinning increment (ADR-192): the ordinary table renderer now has a localized
caption and named keyboard scroll region, including title overrides; legacy chart tables now
align numeric headers and identify their visualization in the region name. Two fail-first
component cases reproduced the omissions; 31 affected basic-renderer cases pass.
Found narrow analytical tables whose pinned row-level/dimension columns covered the card.
ResizeObserver now derives effective pinning from the actual scroll width, reserves a complete
200 px measure column and unpins the row-level column below 360 px. A RU/EN/TT notice explains
temporary unpinning. Widening restores saved intent; no spec/server writes. Boundary/localization
and affected component suite: 29 passed. Full lint/types and production build pass.
Browser evidence: two analytical/basic-chart journeys passed (5.9s), then the strengthened
complete-cell/hit-testing/post-capture bounds case passed (4.1s). Widening restores the 160 px
dimension offset and server spec still has pinned_columns=1. Evidence:
.backups/r6-basic-table-narrow-accepted-20261012 and r6-table-pinning-stability-20261012.
Earlier attempts incorrectly scrolled to the final column instead of the requested Total cell;
the test now scrolls to that cell and checks full bounds plus hit testing. Screenshots taken
during scrolling are not treated as independent proof of settled visibility.
All isolated projects were removed, owned services stopped and default API build restored.
Next: broader table keyboard traversal/zoom review and remaining R1/R2 acceptance matrix;
screen-reader users, real workbook acceptance and economist trials remain separate open gates.
Latest table accessibility increment: eleven complex-chart views now expose localized captions
and named tab-focusable scroll regions. Names include the visualization title; boxplot and radar
also distinguish summary/outliers and profiles/scales. AnalyticalTableView already had a caption
and named keyboard region and retains its behavior. Native browser scrolling is used, without
intercepting keys or adding a second interaction model. Eleven fail-first accessibility-name
cases reproduced the omissions; all 53 affected cases and the full 488-test frontend suite pass
(103 files, 52.78s). Full lint/types pass. Four production browser journeys pass (35.5s), including
real Tab focus, visible outline and ArrowRight/ArrowLeft scrolling on a genuinely overflowing
radar table at 420 px in both themes. Initial browser assertion wrongly assumed focus preserved
the right-edge scroll position; corrected the test setup rather than application behavior.
Evidence: .backups/r6-table-accessibility-verified-20261012. This verifies browser accessibility
semantics, not an actual screen-reader user trial. Next audit the basic table renderer and narrow
sticky-column behavior; general screen-reader, contrast and human acceptance remain open.
Remaining eight-family browser regression also passed: 15 scenarios, 46.8s, in
.backups/r6-table-accessibility-regression-20261012. All isolated projects were removed; owned
8020/3020 services stopped and default API production build restored successfully.
Latest remaining-table increment: all ten formerly 12 px complex-chart table components now use
14 px primary data text and shrinkable scroll wrappers. Numeric headers follow their corresponding
cell roles/types; boxplot headers now explicitly identify columns. No calculation or serialization
changed. Ten fail-first typography cases reproduced the gap; 46 affected cases pass, including
header/cell alignment, exact values, missing states, totals, selection and pagination.
17 production browser scenarios passed (1.3m), spanning boxplot, analytical table, combo,
waterfall, heatmap, bubble, bullet, funnel, hierarchy and Pareto. Additional boxplot assertions
exercise 420 px horizontal scrolling in both themes; analytical-table font/alignment assertions
retain existing pinned-column, formatting and complete-total checks. This does not imply narrow
layout checks for all ten families. Full lint/types and default production build passed.
Evidence: .backups/r6-complex-table-readability-20261012. Owned projects and 8020/3020 services
cleaned; default API build restored. Its next-step named-region work is delivered above; broader
keyboard and narrow-layout acceptance stays open.
Latest browser readability verification: radar and histogram production journeys passed (2 cases,
8.7s) at 420 px viewport in light/dark themes. Assertions inspect computed 14 px text, numeric
alignment/tabular digits and scroll-container bounds inside actual dashboard cards. A long radar
profile forces genuine horizontal overflow; scrolling reaches the final column. Keyboard table
activation, missing profiles, saved scales and histogram population accounting remain covered.
Evidence: .backups/r6-table-readability-verified-20261012. An earlier added overflow assertion
failed because the short fixture fit without scrolling; the fixture now uses a long source label,
not a weaker assertion or larger timeout. Full lint/types and default production build pass.
All isolated test projects were removed and owned 8020/3020 servers stopped.
The remaining ten text-xs table gap identified by that pass is now fixed above; full accessibility
and economist acceptance remain separate, unfinished gates.
Latest readability increment: radar profile/scale and histogram interval tables now use 14 px
primary text. Scale bounds and histogram counts have right-aligned headers/cells and tabular
digits; histogram headers have explicit column scope. Shrinkable scroll containers and wrapping
histogram controls preserve room in constrained cards without truncating exact value strings.
Two fail-first component cases reproduced the previous 12 px baseline; all 47 affected chart,
report and localization tests pass. Production narrow-card/theme verification is now delivered
above; neither these checks nor component assertions establish whole-page accessibility.
Full frontend lint, TypeScript and default production build also passed for this increment.
No backend/API contracts changed and no acceptance services were started.
Latest requirement reconciliation: inspected registry/renderer dispatch, source normalization/fake
1C adapter, manual/shared graph preservation and template/catalog release/receipt tests. Updated
stale R3/R4/R5 parent task statuses without closing cross-cutting R1/R2/R6 gates. Evidence matrix
is at the top of docs/PRODUCT_EVOLUTION.md. Historical 144-pass public browser artifact remains
passed; it was inspected, not rerun. New full regressions: backend 1516 passed/32 skipped,
2 upstream warnings (140.09s); frontend 488 passed/103 files (61.41s). Backend Ruff/format (325
files), mypy (175 files), full frontend lint/types/API agreement and production build passed.
The default backend skips PostgreSQL variants and owned daemon restart; earlier separate evidence
remains distinct. No runtime code changed this reconciliation increment, no services were started.
Next concrete gap: basic table semantics and narrow sticky-column behavior. Do not claim
whole-page accessibility or five-economist acceptance from automated regression counts.
Latest condition recovery increment (ADR-191): inspector scratch now persists under node/version
keys using the existing bounded document store. Validated current/baseline settings restore on
return/reload without graph writes; current schema still gates insertion. Explicit discard fails
closed; insertion retires scratch into ordinary graph autosave. Quota/read-write denial uses
latest memory fallback and a visible non-durability warning. Invalid payloads are not silently used.
46 affected component/localization tests passed, including stale storage, invalid payload, field
removal, failed discard and cleanup retirement. Five production browser scenarios passed (19.8s):
graph v1/v3 x formula v1/v2 return/reload/discard plus exact signed-value calculation regression.
Lint, types and production build passed. Evidence: .backups/r6-condition-recovery-20261012.
All test projects removed, owned servers stopped and default API build restored. This supersedes
the previous reset-on-selection limitation. Full reload after physical cleanup denial remains a
documented limitation; other helpers and full accessibility/human acceptance stay open.
Latest inspector isolation fix: NodeConfiguration now keys its configuration subtree by supplied
node identity/version. Both editors pass nodeId; repeated renders of the same node retain input.
Two failing tests reproduced condition scratch crossing same-type node boundaries for v1/v2.
The classic editor lacked isolation; the field editor already had an outer keyed details boundary,
now also explicitly supplies identity. 30 affected tests and four production combinations of
graph v1/v3 and formula v1/v2 passed (10.0s); edits to the second node leave the first unchanged.
Targeted lint, types and production build passed. Evidence:
.backups/r6-inspector-scope-verified-20261012. Two earlier browser attempts missed opening the
legacy advanced panel on first/second node; corrected selectors, not timeouts. Failed-run test
project was removed and independent cleanup context added. All projects/owned servers cleaned.
Historical scope was cross-node isolation only; scoped scratch restoration is now delivered above.
Latest parent-submit fix: saving a calculation with unapplied nested condition changes now
requires explicit omission confirmation. A localized visible notice points to Use condition;
declining preserves the draft and graph, accepting saves only the existing formula. Two failing
create/edit regressions reproduced silent omission before the fix. 39 affected cases passed,
then full frontend regression: 476 passed / 101 files (56.77s). Two production authoring journeys
passed (33.5s), verifying no added node after declined save, then correct calculation/dashboard
after explicit acceptance. Full frontend lint, OpenAPI agreement, TypeScript and default production
build passed. Evidence: .backups/r6-condition-submit-20261012. Test projects cleaned and owned
servers stopped. No backend/API behavior changed. Parent-submit policy is now closed for this
helper; next audit standalone inspector scratch recovery and remaining helper-dialog controls.
Latest numerical authoring fix (ADR-190): reproduced ConditionBuilder rounding integer/decimal
literal text through Number. Bounded grammar-validated token emission now preserves digits;
leading zeros normalize without floating conversion. Existing v2 exact calculation inspector
now exposes the condition helper with decimal/integer/text predicates and numeric-only results.
Legacy v1 remains Float64 and explicitly says so; no silent execution upgrade. 37 affected
frontend/localization tests and 59 backend exact conditional tests passed; lint/types/build pass.
Production regression: 3 scenarios passed (38.3s), then strengthened all-row signed exact-value
assertions passed separately (1 scenario, 7.0s). Evidence: .backups/r6-exact-condition-20261012
and r6-exact-condition-values-20261012. Owned projects/servers cleaned, default build restored.
Parent submission audit completed above; broader helper
recovery and human/accessibility gates stay open. Preserve v1's documented approximate semantics.
Latest nested-draft fix: ConditionBuilder reports unapplied scratch changes to TableStepDialog.
Declined Cancel/Escape now retain a condition even before Use condition inserts an expression.
Restoring initial/last-applied settings clears dirty status; successful insertion advances the
local baseline and unmount clears the callback. A new pre-fix regression failed as expected.
11 affected tests and two full production authoring journeys passed (32.6s), with nested scratch
retention before ordinary Join/calculation/dashboard completion. ESLint, types/build passed;
test projects removed, owned servers stopped and default build restored. Evidence:
.backups/r6-condition-discard-20261012. Not durable storage or standalone inspector recovery.
Numeric token fidelity (ADR-190) and parent submission audits completed above.
Latest helper safety increment: Join/calculation/group dialogs now confirm dismissal of edited
settings, prevent native Escape closure when declined, warn on beforeunload and stop keyboard
events bubbling into the graph. Join/calculation dialogs have localized accessible names.
Three pre-fix regressions failed; final 11 affected tests and two production single/composite-Join
journeys passed (32.4s), including declined Escape/Cancel in all three forms followed by successful
application/calculation/dashboard reload. Targeted ESLint, TypeScript and production build passed.
Evidence: .backups/r6-table-discard-20261012. Owned servers stopped and test projects removed.
This is guarded dismissal of mounted drafts, not durable recovery; nested ConditionBuilder local
drafts and other helpers still need separate audit. No graph/API/calculation contracts changed.
Latest authoring fix: CalculatedFieldsDialog now reuses the shared explicit-action focus hook.
Three failing regressions reproduced add leaving focus behind, delete losing focus, and reorder
retaining focus on a newly disabled move button. Add targets the new name, removal the nearest
survivor (or Add when empty), reorder the same moved field; typing does not steal focus.
11 affected unit/component tests, targeted ESLint, TypeScript and production build passed.
Three production browser journeys passed (40.6s): keyboard helper actions plus calculation,
undo/redo/reload/edit and two single/composite-Join authoring journeys. Evidence:
.backups/r6-calculated-focus-20261012. Initial test typing mistake (Playwright-only exact option
on Testing Library role queries) corrected before final build. Test projects removed, owned
servers stopped, default API production build restored. Remaining helper forms still need audit;
this does not claim full sequential keyboard/screen-reader or human acceptance.
Latest restart acceptance: test_process_restart now also runs an explicit opt-in against its
own PostgreSQL 17 container. Clean Alembic migration, eight-widget demo, exact financial/statistical
oracles, saved metadata, frozen results and restored-project recalculation pass after both API
replacement and database restart. SQLite/restart plus shared HTTP benchmark regression: 8 passed,
2 upstream warnings, 25.01s. Targeted Ruff/format and helper mypy passed. First run exposed stale
ephemeral-port reuse in the new fixture; fixed by inspecting the current port before each API start.
All owned containers/anonymous volumes cleaned; unrelated services untouched. This closes the
graceful demo database-restart evidence gap, not power-loss recovery or human/accessibility gates.
Latest PostgreSQL acceptance (2026-10-12): Docker Desktop became available; disposable PostgreSQL
17-alpine on a random loopback port, no working database/host volume, ran the current PostgreSQL
selection: 517 passed, 2 skipped, 1544 deselected, 2 upstream warnings in 392.19s; process exit 0.
The two skips are SQLite parametrizations whose test names matched `-k postgresql`; PostgreSQL
migration/locking variants passed. Each database case migrated a private UUID schema. Zero test
schemas remained; the owned auto-remove container was stopped. Other containers were untouched.
This supersedes the earlier unavailable-engine note, not the separate database-process restart,
whole-app accessibility or five-economist gates. No runtime code changed in this increment.
Latest statistical audit/regression: histogram, boxplot_stats and heatmap_stats exact decimal
paths verified against independent integer-cent/Fraction/stdlib-quartile references. New seeded
parity tests cover zero and +/-9007199254740993 monetary offsets, sub-Float64 cent differences,
259 observations + 2 nulls, outliers and a deliberately low Decimal context. All 9 passed; no
runtime numeric defect found or speculative rewrite made. Full regression collected before this
new file: backend 1506 passed/31 PostgreSQL skips, frontend 449 passed/99 files. Do not conflate
the separate 9-test run with that full run. Full backend lint/format, mypy (175 files), frontend
lint/typecheck and OpenAPI agreement passed. No application code changed this increment.
Latest dashboard increment (ADR-189): reproduced stale/lost names on history return under quota /
storage getter denial, then connected dashboard drafts to bounded document recovery. Confirmed
saves/pristine reverts retire stale copies; explicit discard fails closed; successful deletion
finishes despite cleanup denial. Layout undo now preserves recovered revision rather than rebasing.
27 affected unit/component tests and 3 production browser scenarios passed (18.5 s), including
both storage modes, competing-revision 409, safe failed discard, deletion and full workspace journey.
Targeted lint, typecheck via build and production build passed. Evidence:
.backups/r6-dashboard-recovery-before-20261012 (2 reproduced failures),
r6-dashboard-recovery-final-20261012 (3 passed). Test projects cleaned; owned servers stopped.
Latest recovery increment (ADR-188): classic/field graph drafts now reuse bounded document-memory
recovery when browser writes/access fail. Latest copy wins over stale disk, original revision stays
intact, and confirmed server saves retire old copies despite failed cleanup. Both editors show a
separate volatile-recovery notice even when a network error replaces save feedback. Oversized graph
disk writes remain supported; >1000000-char drafts have no memory-recovery guarantee.
37 affected unit/component tests and 9 production storage/history scenarios passed, including
v1/v2 x quota/denied getter and existing report/visualization recovery. Targeted lint, typecheck
and production build passed. Evidence: .backups/r6-graph-history-final-20261012 (21.6s).
First browser run exposed test races (autosave completed before Retry; Back before route settled);
fixed by waiting for actual failed request feedback / destination URL, not changing timeouts.
Latest reliability fix (ADR-187): denied sessionStorage property no longer crashes either graph
editor during render. Reproduced both route error boundaries before the lazy storage adapter.
Existing guarded recovery warns explicitly; server autosave still succeeds. Discard now fails
closed with localized feedback if storage removal is denied, retaining edits instead of throwing
or reloading; successful discard cannot reintroduce the draft during disposal.
16 autosave/localization tests and 15 production editor/field/formula/focus/storage scenarios
passed; targeted ESLint, TypeScript during build and production build passed. Evidence:
.backups/r6-graph-storage-repro-20261012 (before), r6-graph-storage-final-20261012 (15 passed).
All temporary projects removed; owned servers stopped. No API/schema/backend changes.
This closes the denied-property startup failure, not all storage-unavailable history recovery.
Latest graph focus audit: suspicion that outline-none hid the graph search focus was disproved
by production computed styles in both themes (solid 2px accent outline, 3px offset). No runtime
style changed. New graph-focus.spec.ts traverses Tab from the theme selector, types a search,
tabs to the matching operation and presses Enter; GET workflow verifies the saved node.
Two final browser cases passed (5.5s), targeted ESLint, full TypeScript and production build
passed. Evidence: .backups/r6-graph-focus-final-20261012, including focused search screenshots.
Latest contrast increment: CSS-source regression covers 86 opaque semantic color pairs across
light/dark themes, plus contrast-math oracles. Dark outline/raised was 2.8449:1; outline changed
from #62728e to #6b7c98, giving 3.2698:1. All audited text pairs meet 4.5:1 and reusable
border/external-focus pairs 3:1. This token policy is intentionally stricter than decorative-border
requirements; not a whole-page WCAG certificate. 23 affected tests and 2 production keyboard
journeys passed; lint/types and production build passed. Evidence: .backups/r6-contrast-20261012.
Earlier PostgreSQL environment check (superseded by the successful run above): Docker CLI exists but Linux-engine pipe is absent, Docker
service stopped; pg_ctl/initdb/psql not on PATH, no PostgreSQL service found. No service started
or existing database touched. PostgreSQL migrations/locking acceptance remains unverified.
Latest accessibility fix: import field editors now have native fieldset/legend groups named with
the field label (localized fallback ordinal for blank names), not indistinguishable repeated
controls. Reproduced missing groups in a failing regression before implementation. Native Tab /
Shift+Tab traverses dataset/grain/name/type/nullability/details and advances to the next field.
18 affected component tests passed (including EN/RU/TT names), both production keyboard journeys
passed in desktop-light/compact-dark, and both 100k-row browser regressions remained green.
Lint/typecheck and production build passed; compact-dark screenshot reviewed for focus/layout.
Evidence: .backups/r6-field-groups-final-20261012 (keyboard), r6-field-groups-20261012 (large data).
Initial keyboard run failed because a test's exact label locator included select options;
using the accessible combobox role fixed the locator, without weakening the focus assertions.
No claim of a real screen-reader audit or full WCAG conformance. Broader audit remains open.
Latest browser increment: large-report.spec.ts drives real 100000-row CSV import and report
authoring at widths 3/20 in an isolated production build. Final two scenarios passed (11.5 s):
bounded <=200-row / <500KB preview, preserved leading-zero codes, ten exact grouped totals and
reload. Native file selection produced no observed long tasks; large Buffer-based Playwright
injection had introduced an artificial ~0.9 s task, so the test now selects a generated disk file.
Full frontend lint/typecheck passed; production build passed. Temporary projects removed and
owned 8020/3020 servers stopped. Evidence: .backups/r6-large-final-20261012.
Latest cache increment: HTTP benchmark now verifies public graph-preview cache counters in a
separate fresh API process, staged source updates, one-cent changes and rollback. Both 100000 x 3
and x 20 passed: cold 0/2 hits, warm 2/2, staged original 2/2, changed 0/2, changed warm 2/2,
rollback 2/2 with exact original totals. Updated/rolled-back visualization results also verified.
Twenty affected benchmark/restart/dataset-update tests passed; targeted Ruff/format/mypy passed.
No product/domain/API/frontend behavior changed. No new defect/blocker found in this increment.
Latest increment: real HTTP CSV -> normalization/Parquet -> grouped decimal report benchmark
now runs in owned disposable SQLite/storage with process replacement. 100000 x 3 and x 20 passed
exact per-group totals before/after restart. Width 20 is the existing 2-million-cell import limit;
the previous 100-column engine fixture is not an import capability claim. Seven targeted tests
(including executive process restart) passed; targeted Ruff/format and script mypy passed.
Timings and limitations: docs/PRODUCT_EVOLUTION.md, HTTP performance evidence section.
Last completed: ADR-186 strict native decimal normalization, ~38.5 s to ~0.5 s on the identical
100000 × 100 clean-string fixture. Full backend: 1500 passed/31 PostgreSQL skips; seven affected
production-browser journeys passed. Lint/format, mypy and default frontend build passed.
Real API process-replacement checks and catalog UI delivery remain complete. The whole R0–R6
extension is not yet accepted.
The unified analytical route now creates histogram, box plot, heatmap, grouped analytical table,
Pareto, funnel, waterfall, treemap or sunburst
from imported/prepared data. Heatmap aggregation is explicit; table measures retain stable identities,
ordered hierarchy, optional totals, observation-based averages and ratio-of-sums. Preview is full-data
with bounded presentation; table pages do not change totals. Appearance is edited after creation.
The wizard creates ordinary graph nodes; no browser calculation or separate saved report recipe.
Compatible terminal histogram/boxplot/heatmap/rollup/Pareto/funnel/waterfall/hierarchy calculations can be edited via widget actions.
The graph is recognized structurally, including restored projects. Manual/shared preparation stays
intact; advanced/shared/context-bound terminal results are explicit graph steps, not silently rewritten.
Multiple widgets require acknowledgement. Table field rebinding is explicit and never drops rules.
Previous foundation: R0/ADR-114, workspace navigation, import/Parquet, exact report builder,
releases, universal-source refresh/rollback (ADR-115), resumable imports/crash safety (ADR-116),
safe report suffix editing (ADR-117), exact bounded decimal arithmetic (ADR-118), and stable
group_by@3 identities with row/after-total formula measures (ADR-119), and shared prepared-input
report branches (ADR-120), and named reusable measures (ADR-121).
Next actionable task: audit remaining sequential keyboard/screen-reader/contrast authoring gaps
and resolve demonstrated issues beyond the now-tested import field groups and opaque palette.
Graph search focus is now verified, not a pending defect. Next inspect rendered contrast for
opacity/overlays/charts and remaining authoring controls; token checks do not cover those.
Consolidate requirement-level R0-R6 evidence to distinguish implemented features from remaining
human/environment gates rather than indefinitely repeating already delivered journeys.
Authoring audit now covers graph property-denial startup/discard (ADR-187), bounded graph history
(ADR-188) and dashboard document/history cleanup (ADR-189). Next inspect remaining helper-dialog
authoring recovery and unresolved analytical decimal boundaries. Do not repeat these completed
history scenarios or claim memory copies survive reload/close. Histogram/boxplot/heatmap cent-level
parity is now additionally covered; do not treat deliberate Float64 branches as decimal defects.
Human/accessibility gates stay open; PostgreSQL migration/locking and graceful demo restart passed.
Narrow/wide 100k-row HTTP and browser import/report scenarios
are delivered; they do not certify every chart, device, PostgreSQL or human usability.
Audit remaining accessibility/authoring gaps. Do not repeat the delivered clean decimal
optimization; mixed/invalid columns intentionally retain scalar semantics/cost. Five scripted report-first journeys and the executive
showcase now pass in one isolated production browser run; keep human acceptance distinct. Use the evidence matrix from existing e2e/tests/benchmarks rather than duplicating delivered
features. Verify test API endpoints before running combined suites: use isolated disposable projects,
never the author's database. Exercise import/type correction, table preparation, report creation,
calculation edits, source refresh, release/restore and restart; compare exact/statistical results with
independent expectations. Include PostgreSQL clean migrations/locks and 100k-row narrow/wide evidence.
Inspect remaining R1/R2/R3 items for concrete gaps (keyboard/contrast, analytical decimal boundaries,
advanced graph preservation) and fix demonstrable failures. Human trials remain a separate open gate.
Both catalog families and /projects/[projectId]/templates are delivered. Do not rebuild their APIs/UI
or introduce a second calculation model. Other calculation-family templates are future work, not a
reason to postpone integrated acceptance indefinitely.
Cross-project libraries and template execution engines remain out of scope; do not copy manual graphs.
Waterfall, radar and combo guided creation/editing are delivered; do not repeat them.
These renderers are delivered: do not rebuild them. Keep explicit scale and aggregation rules,
safe preview/apply/revision behavior and editable graph calculations. This moves the richer chart
families into the primary analyst journey; it is not a second calculation model.
Decimal parameters (ADR-178), exact field_formula@2 and four exact field/scalar v2 operations are
delivered. Do not repeat them or silently upgrade old parameters/formulas. Broader decimal/authoring
audits and all five journey/human gates remain open, but must not displace guided analytical work.
Table exact operators are already delivered; do not repeat them. R4 typed read/write/editor
round-trip are delivered (ADR-174/175); saved bindings remain canonical and old projects untouched.
The registry marks basic binding_contract=spec_or_legacy_config/result_data=rows. Do not repeat the
completed registry work or substitute more recovery-only work
for the outstanding analytical product contracts. ADR-173 covers report/visualization client-history
recovery; legacy graph/dashboard/helper drafts and full cross-document navigation remain unaudited.
Analytical/alignment focus and latest-check feedback are delivered; complete sequential tab order,
screen-reader, contrast and human audits remain open. Do not repeat delivered focus/formatting fixes.
Basic report measure/filter focus
and import/report-check network feedback are covered by ADR-169; do not repeat them as new work.
The simple CSV import -> type-error correction -> report -> change sum to average ->
refresh/reload path now has production coverage in light/compact-dark; do not repeat it as new work.
Full sequential tab order, screen readers, contrast, all five broader journeys and economist trials
are not proven by that scripted test. ADR-171 now provides a separate reproducible eight-widget
executive showcase; neither synthetic scenario replaces the broader acceptance gates.
Field projection/conditional/Append metadata and downstream exact totals are fixed; do not repeat
ADR-167 or Join/Union/diagnostic precision. Exact v2 field arithmetic/sum/scalar and constants now
feed previews, publications and KPI (ADR-176); v1 retains its prior Float64/rejection behavior.
General exact field expressions and decimal parameters are delivered (ADR-177/178).
Do not convert money to Float64 or assume every legacy operator is now exact.
Full human and
accessibility gates remain open and must not be inferred from automated tests.
Exact Pivot, share/rank shortcuts, window@3, conditional formulas and decimal Unpivot correction
are done. Decimal-to-integer fractional truncation was reproduced and fixed; do not repeat it.
Helper durable drafts and remaining source-neutral/typed-registry acceptance still need auditing.
Same-workflow alignment/formula creation and guarded round-trip are delivered (ADR-127/158/159);
do not repeat them. Unsupported/shared/context/manual suffixes still use the graph.
Initial project-local templates for eight analytical wizard types are delivered (ADR-157),
extended to the ninth type, waterfall, by ADR-181.
Guided Pareto/funnel/treemap/sunburst creation and compatible hierarchy edits are implemented;
do not repeat them. Advanced/shared/multi-measure hierarchy edits remain graph steps.
Bullet and treemap/sunburst display verification are complete; do not repeat them.
Pareto preparation/chart/table and compact-card browser acceptance are complete; do not repeat them.
No implicit chart aggregation or browser calculations.
Bubble chart is delivered: full-input key/X/Y/size/label/group validation, proportional area, explicit
live pages, stable selection, save/retry, full frozen populations, restore and EN/RU/TT authoring.
Do not repeat completed bubble preparation/integration. Do not
let recovery work substitute for the requested richer analytical product. Reuse existing receipts
and ordinary graph contracts; no second recipe/calculation model.
Visualization pending requests now survive same-tab reload/history when storage is available.
Closed/cleared/denied storage still limits reload recovery; no cross-device/server autosave was
introduced. Dashboard attachment/layout remains a separate save. Deleted copy-source URLs cannot
be replayed; inspect the library for the saved copy instead of creating another one.
All five journeys and comprehensive accessibility/human audits remain open. R3 advanced round-trip
editing remains open. Basic typed adaptation and guided heatmap/rollup creation are delivered.
Aggregation/preparation remains in the graph; do not add a second browser calculation engine.
Old saved contracts remain compatible without auto-migration. Combo, waterfall, radar
and heatmap are delivered; do not repeat them. Radar and combo use prepared
unique rows, not a dedicated aggregation node. R3 derived composition formulas are now available
in guided alignment creation and compatible saved calculations are editable in the alignment wizard.
Shared/context-bound/unknown terminal chains and source rewiring remain graph steps.
No implicit cross-workflow copying. ADR-125 direct side-by-side
reuse still does not perform joins or derived formulas.
Comparisons support Table, Bar and
Line; charts require only the date dimension and show current/baseline values on one axis.
Remaining guided/analytical decimal parity is still open; window@3 is delivered.
Prepared-input contexts/cross-workflow references are not part of the delivered slice.
R4 has preparation/presentation for box plot/histogram/heatmap/waterfall/analytical table plus radar/combo.
The typed registry includes those seven plus bubble, Pareto, treemap, sunburst, bullet and funnel,
and all eight basic types via read/write adapters (ADR-174/175);
All named first/second-wave chart families are implemented; guided creation for all types and
additional calculation-family templates remain future work; catalog management is delivered.
Basic contracts now accept typed authoring
without an automatic migration of old saved projects.
Reusable analytical/standard templates and their catalog are delivered; consolidated acceptance remains open.
Contract: docs/PRODUCT_EVOLUTION.md. User approved the complete plan on 2026-10-08.

Latest R6 normalization optimization (ADR-186, 2026-10-12): clean decimal String columns are
checked in full against selected precision/scale and separator before native conversion. Any
ineligible value or native parser failure falls back for the whole column. No scale truncation,
new implicit type conversion, storage/API change or dependency. IDs/metadata/keys remain intact.
The new fast-path test failed against the original implementation before the change. Final 21
parity/dispatch tests include seeded distinct values, precision/scale 1..38, both separators,
unusual syntax, null/error policies, duplicate keys and errors beyond the preview/diagnostic cap.
Full backend regression: 1500 passed, 31 PostgreSQL-only skips, two upstream deprecation warnings
(117.95 s). Ruff check/format all 333 files and strict mypy all 175 app files passed.
Same fresh-process benchmark: normalization 100000 × 3 = 0.017/0.016 s cold/repeat, 86.43 MiB
resident peak; 100000 × 100 = 0.501/0.506 s, 541.64 MiB resident peak. Exact formulas unchanged:
3 columns 1.604/1.592 s, 109.04 MiB; 100 columns 1.617/1.634 s, 186.62 MiB.
About 76× improvement is specific to the same clean-string workload, not all files/contexts.
Seven production-browser scenarios passed together (51.8 s): CSV report creation, executive
refresh, renamed-field repair, frozen release/restore, retry feedback, light/compact-dark keyboard
import/correction/edit/refresh. Artifacts: .backups/r6-normalization-20261012.
Temporary projects cleaned; empty list confirmed, owned 8020/3020 servers stopped, default-API
frontend build restored and passed. Older 8010/3010 and author data untouched; no commits.
No new known P0/P1. Frontend source unchanged; previous full 435-unit/144-browser gates remain
historical, not rerun in full this slice. Broader end-to-end performance/accessibility/human gates open.

Previous R6 engine performance checkpoint (2026-10-12): scripts.benchmark_process runs four sequential
fresh child cases with OS lifetime memory counters and Python tracing disabled. Windows measurement
verified; Linux implementation present but not executed. Existing individual scripts keep their
default traced-memory behavior, with an optional untraced mode for this runner. No new dependency.
Final 100000-row results (cold/repeat seconds; resident peak MiB): normalization width 3,
1.096/1.118, 113.04; width 100, 38.603/38.366, 583.12. Conditional exact formula width 3,
1.751/1.748, 103.34; width 100, 1.740/1.771, 187.98. Full values/types and exact branches checked.
Environment, commit memory and limits are documented in docs/PRODUCT_EVOLUTION.md. Peak includes
runtime/imports/source/two runs/assertions; timings exclude source/assertions. Not file/API/browser
latency or a relaxation of ingestion limits. Wide input contains ten million repeated values;
do not generalize it to all cardinalities. No measured product optimization has been made yet.
Relevant test matrix: benchmark harness, ingestion, exact formulas/conditionals — 133 passed.
Changed-script Ruff/format and strict mypy with --explicit-package-bases passed; diff check passed.
No app/API/frontend/storage changes; prior frontend/browser gates below remain the latest.
No test processes or servers left running. R6 broader performance/accessibility/human gates remain open.

Previous R6 public-suite audit (2026-10-12): final uninterrupted run PASSED on isolated 8020/3020:
144 passed, 2 explicitly disabled private retained-project scenarios skipped, zero failed (11.3 min).
Evidence: .backups/r6-public-verified-20261012; .last-run.json status passed and failedTests empty.
All five scripted journeys, executive refresh demo, v1/v2/v3 compatibility, exact numeric/statistical
calculations, conflict/retry/recovery, catalog, language/theme, chart paging and graph history included.
Latest field-scale sample: 168 nodes/1024 columns ready in 1253 ms, navigation 559 ms; 335 handles,
4887 elements, one schema request. This is not a 100k-row or whole-app performance claim.

Earlier attempts in this audit (historical, superseded by the complete run above):
146 scenarios selected on isolated 8020/3020.
Last observed completed results before the owned processes/handles disappeared: 83 passed, 3 failed
(86 completed). No terminal suite report was produced; do not claim that all 146 ran. Read-only
process/port inspection confirmed both servers and the runner were gone before a fresh private
server was started. Traces/screenshots remain in .backups/r6-public-suite-20261012.
The executive eight-widget refresh/reload scenario passed; fresh light/compact-dark screenshots
were inspected. The 168-node/1024-column UI case passed: ready 1495 ms, navigation 628 ms,
335 handles and one schema request. These are one-run observations, not a 100k-row load guarantee.
Two navigation failures were obsolete inline Widget title/Configure navigation selectors. Tests now
use the existing visualization dialog and widget action menu, preserving dirty-title, conflict,
shared-use, lost-response and navigation assertions. Localization exposed eight genuinely missing
catalog descriptions; RU/TT entries and a unit regression were added. All catalog descriptions are
also checked against the live API by the retained browser test.
Affected final browser rerun: 5 passed (11.8 s), .backups/r6-navigation-localization-20261012.
Localization unit tests: 9 passed. Isolated production build passed. Remaining 60 selection finished:
55 passed, 3 failed, 2 private-data opt-ins skipped (.backups/r6-public-remainder-20261012).
Those three failures were obsolete parameter settings visibility, ambiguous Filter matching and
the previous green theme color. Corrected parameter/theme rerun: all 4 passed (10.3 s),
.backups/r6-parameter-theme-20261012. No numeric/recovery assertion or timeout was weakened.
Final uninterrupted run passed as recorded above. Final frontend regression: 435 tests / 98 files
passed (`npm test -- --maxWorkers=2`, 59.27 s); ESLint, TypeScript, OpenAPI consistency and the
default-API production build passed. `git diff --check` passed. No backend code/contracts changed.
Owned servers stopped, ports 8020/3020 clear; the sole leftover synthetic Named choices project from
the earlier timed-out test was deleted through its verified API ID, and an empty project list checked
before shutdown. No author data or old 8010/3010 services touched. Five-journey evidence map is recorded in
docs/PRODUCT_EVOLUTION.md, explicitly separate from economist/WCAG acceptance.
README's older isolated-startup section now sets both API variables explicitly, avoiding accidental
use of different databases by historical and evolution tests. No backend calculations/API/DDL changed.
No known new P0/P1 or environment blocker. Fresh whole-process memory/performance evidence,
remaining authoring/accessibility audits and five-economist trials remain open; R6 is not complete.

Previous R6 dashboard audit (ADR-185, 2026-10-12): three genuine P2 regressions were reproduced before
fixing. Layout history no longer records title/configuration edits or restores stale dashboard
metadata; attachment/removal/copy references remain undoable, with current saved revisions retained.
Empty navigation destinations expose explicitly configured selection controls. Returning exactly
to the saved dashboard clears its local draft, so reload shows a committed copy after response loss.
Final isolated production run: all 7 scenarios passed in one run (5.5 minutes): dashboard view,
navigation, authoring/copy recovery, modern workspace, bound v2 charts, four-book P&L and three-book
sales/gross profit. Legacy v1/v2 graphs are explicitly seeded through APIs; new creation remains v3
and publication/report-first. Financial expectations and graph/reference integrity checks remain.
Reviewed fresh P&L and Russian sales screenshots after canvas animation completes; prior partial
animation screenshots are not final visual evidence. Artifacts: .backups/r6-dashboard-verified-20261012.
Three pure layout regressions plus 15 workspace tests passed. Final full frontend run:
434 tests/98 files passed with `npm test -- --maxWorkers=2` after browser completion. A concurrent
unbounded run had five 5-second timeouts; no timeout or assertion was weakened. Final lint,
TypeScript, OpenAPI consistency and default-API production build passed. The isolated build is no
longer left pointing at the disposable API; no test servers remain on 8020/3020.
Backend/API contracts and calculations unchanged this session; prior backend evidence follows.
All test projects cleaned by their scenarios; empty isolated project list verified. Owned test
servers shut down, with no listeners on 8020/3020; old 8010/3010 and author's data untouched.
No new dependency/DDL, no commits or unrelated cleanup. No known remaining P0/P1 in this slice.
The broad 146-scenario audit, fresh performance/process-memory and human/accessibility gates are
still open; seven scenarios do not establish complete R6 acceptance.

Previous R6 audit (2026-10-12): focused backend restart/executive/ingestion/update matrix 24 passed.
PostgreSQL migration/concurrency selection: 31 passed, 1 SQLite-only variant skipped; this is not a
database-daemon restart test. Ruff/format and mypy passed. Initial public-fixture browser audit was
intentionally stopped after 47 completed scenarios (35 passed, 12 failed); 146 were selected, not all
executed. First targeted rerun: 17 passed/5 failed. Historical tests assumed unversioned operation
names, untyped preview headers, inline placement settings or fixed screen coordinates. Updates retain
legacy v1 numeric semantics and saved-graph checks. Draft-before-navigation, concurrent-tab recovery,
CSV evolution, executive refresh and light/compact-dark wizard journeys pass. Further reruns follow.
See docs/PRODUCT_EVOLUTION.md R6 evidence matrix for boundaries and reproduction instructions.
Subsequent targeted runs verified all 16 selected editor/formula/field/preparation/table-authoring/
combine/legacy-transform scenarios across final reruns (not one uninterrupted green suite).
The last 14-test run had 12 passes and two failures; both remaining tests then passed separately
after correcting field-port encoding and separating legacy chart-node authoring from new v3 graphs.
`transforms.spec.ts` now explicitly seeds an empty supported v1 workflow through the API, then checks
UI calculation, bar/KPI, drag/resize, save/reload and isolated widget errors; it does not claim the
removed legacy new-workflow UI exists. New v3 workflows and report-first wizards have separate tests.
Frontend 431 tests/97 files, lint, typecheck and OpenAPI consistency passed; backend Ruff/format
(330 files) and mypy (175 source files) passed. No production code, dependencies or migrations changed.
Remaining audit failures are not dismissed as application defects or declared fixed without reruns.
Dashboard authoring/navigation/view, bound visualizations, older business journeys and the complete
public-fixture suite remain pending. Their operator selectors were updated where applicable, but
their complete flows have not yet passed this audit. Comprehensive
human/accessibility and fresh process-wide memory evidence remain open; no new external blocker.
Cleanup: removed 13 identified leftover synthetic projects only, verified the isolated project list
empty, and stopped owned 8020/3020 servers. Older 8010/3010 instances and author's data untouched.
Default-API production build restored successfully; final typecheck/lint passed and no listeners
remain on 8020/3020. Diagnostic traces are retained in ignored .backups/r6-* and test-results folders.
No commit; unrelated dirty-tree changes and the font asset were preserved.

Previous catalog UI acceptance (ADR-184): Reports and both family pickers link to the project catalog.
Native search/filter/page controls, explicit name save/cancel, confirmed archive, restore, input-role
details, RU/EN/TT and light/dark responsive cards are implemented. Client-only recovery initialization
avoids hydration mismatch. Pending exact requests recover without list metadata; corrupt storage
blocks mutations and denied storage warns. Error/success/name focus and unsaved outside-link guards
reuse existing workspace infrastructure. Archive does not free the shared 200-template limit.
Production browser: 5 scenarios passed on final isolated build (catalog plus histogram/treemap/combo/
radar reuse regressions). Commit-then-disconnect/reload, offline list, conflicting edit, archive/restore,
search/filter, original graph/result integrity, cancelled navigation and pageerror-free hydration pass.
Light/wide and RU dark/narrow screenshots reviewed, no narrow horizontal overflow.
Final frontend regression: 431 tests/97 files, lint, TypeScript, OpenAPI consistency and production
build passed. Default-API build restored after stopping the isolated frontend.
Backend contracts unchanged this session; prior full regression and PostgreSQL results follow below.
Only disposable synthetic acceptance projects were removed; empty isolated project list verified.
Owned 8020/3020 servers stopped normally and no listeners remain. Older 8010/3010 instances untouched.
No dependencies, migrations, unrelated cleanup or commits. No known P0/P1 in this slice.
Catalog controls do not persist unsubmitted name edits across browser history; submitted pending
requests recover in the same tab when storage works. Comprehensive human/accessibility gates stay open.

Previous catalog API foundation (ADR-183): GET discovery uses Unicode-casefold name/row-meaning search,
family and active/archive filters with stable paging. PATCH edits separate display metadata/status,
not immutable captures; project locks, expected revisions and exact receipts guard repeated requests
and competing tabs. Archive/restore retains the original report graph/results and shared project cap.
Both family pickers send selected revisions and provide an explicit reload/reset after conflicts.
Frozen releases preserve renamed/archived metadata; legacy releases fall back to active original names.
Verification: full backend regression 1472 passed/31 PostgreSQL-only skips; affected template-family
SQLite/PostgreSQL matrix 95 passed/6 SQLite-only concurrency skips. Final catalog-only matrix:
26 passed/2 SQLite-only concurrency skips, including additional strict-boolean and semantic-token/no-op
assertions added after full-suite collection. Actual PostgreSQL competing edits passed.
Frontend 424 tests/96 files, lint, TypeScript, OpenAPI consistency and default-API production build
passed. Ruff/format (329 files) and mypy (175 files) passed. No DDL, dependencies, data deletion or
automatic project migration. Browser E2E was not rerun this session; no servers were started/stopped.
At that checkpoint the management screen was still pending; it is delivered in ADR-184 above.
No known P0/P1 or external blocker in the implemented API slice. Human/accessibility R6 gates remain open.

Previous report-template acceptance (ADR-182): the standard wizard captures saved grouped/formula
settings, maps new imported or prepared fields and creates independent graph-backed reports. Row and
after-total formulas, calendar comparisons, selected values, combo series and radar axes/scales follow
request-namespaced stable IDs. Canonicalization preserves decimal tokens, quoted literals, function
names and Python language constants; existing executors infer formula scopes. Legacy aggregation
identities change only in the explicitly created new report, never in the original graph.
Both families retain typed APIs and isolated recovery scopes, share input validation and the existing
200-template project cap, join revision fingerprints and survive complete release restoration.
The capture panel is reachable even if source report metadata fails after a lost response. Prepared
inputs append a new branch without copying upstream nodes. Loading settings needs a fresh preview.
Checks: frontend 422 tests/96 files, API consistency, lint, TypeScript and production builds passed.
Template SQLite/PostgreSQL matrix: 71 passed/4 SQLite-only concurrency skips, including receipt/CAS
capture races, renamed/reordered input mapping, exact ratios, calendar comparisons, legacy output
rebinding, prepared-result reuse, source/grain/type guards, mixed-family catalog and shared cap.
Production browser: 4 scenarios passed on the final build, covering both old analytical families
and combo/radar formulas on renamed data, lost capture response without metadata, restored drafts,
preview/save/reload, exact full calculation and unchanged original graphs. Rendered screenshots reviewed.
Final full backend regression: 1461 passed/29 PostgreSQL-only skips; affected PostgreSQL cases passed
in the separate matrix above. Ruff/format and mypy (173 files) passed. No dependencies, DDL or
automatic project migration. Test-fixture corrections
use real field IDs instead of assuming CSV labels are engine identifiers; full-calculation checks do
not assume a chart includes unbound measures. Numeric expected scales follow the saved settings.
Cleanup: disposable synthetic projects only; empty isolated project list verified. Owned 8020/3020
servers stopped, no listeners remain; older 8010/3010 instances untouched. Default-API build restored,
next-env.d.ts unchanged; unrelated work/font preserved and no commit. No known P0/P1 or blocker in
this slice. Catalog management, other report families and broad human/accessibility gates remain open.

Previous guided-waterfall acceptance (ADR-181): analytical wizard creates and edits waterfall_steps
with required explicit input-order or ascending unique nonempty integer/decimal/date/datetime keys.
Existing nodes without the additive field keep input order; reading them does not mutate the graph.
Markers, exact totals, empty input and 2000-step bounds keep their established semantics. Preview
uses the existing typed chart/step table and persists no report objects. Compatible edits preserve
identities/appearance; templates map all four roles and complete releases restore editable reports.
Checks: frontend 420 tests/96 files, lint, TypeScript, API consistency and production build passed.
Affected SQLite/PostgreSQL statistics/edit/template matrix: 125 passed/6 SQLite-only concurrency skips;
final waterfall API/legacy-empty-input matrix: 16 passed. Production browser suite: 4 passed,
including guided create/edit/reload, legacy graph settings and both chart viewport/orientation cases.
Light/wide and dark/narrow screenshots reviewed; narrow page has no horizontal overflow. Test-only
fixes wait for client navigation before reload and use combobox accessible names for filter selectors.
No application behavior was weakened. Ruff/format and mypy (170 files) passed. Final full backend
regression: 1445 passed/27 PostgreSQL-only skips; affected PostgreSQL cases passed separately above.
Only disposable synthetic acceptance projects were removed; isolated API returned an empty project
list. Owned 8020/3020 servers stopped normally and no listeners remain; earlier 8010/3010 instances
were untouched. Default-API production build and final frontend lint passed; next-env.d.ts is unchanged.
No new dependency or DDL. Unrelated working-tree files/font remain untouched; no commit.
Known defects/blockers: no P0/P1 found in this slice; broad human/accessibility acceptance remains open.

Previous guided-radar acceptance (ADR-180): standard report wizard uses one profile dimension and
3-8 explicitly bound aggregate/formula measures. Shared/min-max scales and exact text bounds are
chosen by the author; no inferred bounds or browser calculation. Existing full-result renderer
rejects outside-scale values and more than 20 profiles; missing axes stay in the exact table.
Incomplete drafts and exact pending requests recover; a fresh preview is required before saving.
Compatible saved/restored suffixes reopen, preserving axes/scales unless rebinding is explicit.
Round-trip tests found and fixed a shared apply defect: preview validated changed typed specs but
the persistence whitelist omitted spec/orientation. Radar/combo rebinding now persists; switching
back to table clears old axes. Revision/retry/shared-step guards and legacy receipts stay intact.
Checks: affected SQLite/PostgreSQL radar/combo/edit suite 75 passed/3 SQLite-only skips;
100,000-row CSV -> normalized snapshot -> full aggregation -> two radar profiles passed (2.61 s
test call, not a dedicated latency/memory benchmark). Full frontend 419 tests/96 files passed;
final targeted radar/draft/combo coverage 13 passed. Production radar, combo and formula E2E
passed on the final acceptance build (3 scenarios); creation, invalid-scale correction, draft
reload, saved reload, aggregation edits and explicit axis reorder/bounds are covered. Screenshot
review completed. Lint, API consistency, TypeScript and default-API production build passed.
Final full backend regression: 1432 passed/27 PostgreSQL-only skips. Ruff/format and mypy (170 files)
passed. PostgreSQL lock/migration cases are covered separately by the affected matrix, not by the
full SQLite run. No remaining failing check in this slice.
Test corrections: all-null decimal group sums deliberately remain null under existing node
semantics; 100k fixture increases only its local upload cap, not production limits. No calculator
behavior was changed to accommodate a test. No new dependency, DDL or migration.
Cleanup: only synthetic acceptance projects were deleted; isolated API returned an empty list.
Owned 8020/3020 instances stopped normally; earlier 8010/3010 instances untouched. Default-API
build restored; next-env.d.ts unchanged, unrelated work/font preserved and no commit.
No known P0/P1 remains in this slice; broader human/economist/accessibility R0-R6 gates remain open.

Previous guided-combo acceptance (ADR-179): standard report wizard creates grouped plan-fact bars/lines
with explicit typed fields and optional secondary axis. Existing graph aggregation and after-total
formulas preserve decimal totals and ratios; all categories feed chart preview while the result
table preview stays bounded to 50. Existing 2000-category/unit/currency checks remain enforced.
Compatible saved/restored suffixes reopen for aggregation/formula changes without losing series or
appearance. Rebinding is explicit; CAS, retry receipts, shared-step guards and atomic apply remain.
Bounded combo drafts and pending requests recover without inventing a saved preview; new input
clears bindings. A fresh preview restores checked output names after reload without reusing stale
schemas for changed calculations. Legacy payloads omit absent optional fields.
Production regression exposed a formula editor requestAnimationFrame focus race: a precision edit
could append to the formula. The deferred caret update now respects newer focus/selection/value;
three deterministic regressions cover it. Existing browser assertions were not weakened.
Checks: full backend 1415 passed/27 PostgreSQL-only skips (before the final ratio-of-sums test);
final combo SQLite/PostgreSQL matrix 22 passed, including large decimal values, mixed-unit axes,
rejected bindings, no-write previews, retries, stale edits, complete chart population and release
freeze/restore. Full frontend 411 tests/94 files passed; affected focus/editor tests 7 passed.
Ruff/format/mypy (170 files), frontend lint/OpenAPI/typecheck and production build passed.
Final production combo+formula journeys passed three repetitions each (6 browser passes), including
draft reload, exact table/chart, save/reload and sum-to-average editing. Screenshots reviewed.
No known P0/P1 defect remains in this slice. Human/economist/accessibility and full R0-R6 acceptance
remain open. Existing dirty work and unrelated font preserved; no commit or dependency/migration.
Acceptance used a separate temporary API on 8020 and frontend on 3020; earlier 8010/3010 instances
were not modified. The server script now accepts explicit API/frontend ports for isolated runs.
Cleanup: browser tests removed only their synthetic projects; the isolated API listed none.
Both new acceptance instances were stopped through their owned terminal sessions; ports 8020/3020
are no longer listening. No user project or pre-existing server was stopped. Default-API production
build restored, next-env.d.ts unchanged, whitespace review passed.

Previous decimal-parameter acceptance (ADR-178): explicit precision/scale, bounded plain-string
defaults/view values, canonical fixed scale without rounding, Decimal scalar/cache metadata,
lossless binding ranges, decimal filters/context selections and exact choice values/labels.
Workflow/dashboard settings and URL validation preserve digits. Explicit bindings expose parameter
controls on all-publication dashboards. Browser-tested default edit, selection change, KPI and reload;
frozen dashboard selections and restored exact formulas are tested on SQLite/PostgreSQL.
Checks: full backend 1404 passed/27 PostgreSQL-only skips (before one additional large-choice test);
final decimal unit/API SQLite/PostgreSQL matrix 26 passed. Full frontend 401 tests/91 files passed;
final affected navigation/dashboard/decimal regression 32 passed.
final focused parameter controls 10 passed, typecheck/lint/OpenAPI and production build passed.
Three production E2E scenarios passed (arithmetic, formula, parameter); parameter/KPI screenshot
reviewed. Final named-control caption change has component/type/build coverage; browser used the
preceding production build. Ruff/format/mypy passed. No new known P0/P1 defect in the slice.
Environment: a combined stop/rebuild/start command was rejected by tool policy and was not retried
or bypassed. Read-only inspection confirmed owned test processes 27016 (API 8010) and 2932 (frontend
3010) still live; they were left running. E2E removed its own synthetic projects; API listed none.
A separate final default-API compilation succeeded without restarting services. Do not assume the
still-running frontend serves that final build; revalidate runtime state before further acceptance.
Human/economist/accessibility and full R0-R6 completion remain open; the goal is not complete.

Previous exact-expression acceptance (ADR-177): field_formula@2 uses the existing bounded exact AST
engine and a shared physical input validator, not new calculation semantics in the browser. a/b/c
accept same-context fields or explicit scalars, with one final half-even rounding, lazy conditions,
constant/empty populations, Float64 rejection and strict error handling. Editor defaults/settings
and explanations are version-aware in EN/RU/TT; v1 is unchanged. Formula -> sum -> KPI survives
release/restore on SQLite/PostgreSQL and production editing/reload. Inspector screenshot reviewed.
Checks: full backend 1381 passed/27 PostgreSQL-only skips; focused backend 166 passed;
SQLite/PostgreSQL release matrix 4 passed; frontend
391 tests/90 files passed; three production browser tests passed (exact arithmetic, exact field
formula, exact calculated column). Ruff/format/mypy (169 files), lint, OpenAPI and acceptance build
passed, including the final default-API production build. The 27 PostgreSQL-only checks were not
part of the full SQLite run; the affected release/restore matrix was separately run on PostgreSQL.
100k exact expression -> sum benchmark: 2 columns 4.106 s first/3.120 s repeated; 100 columns
3.164/2.674 s. Python traced peak 12.68 MiB each; source Polars size 2.29/77.06 MiB. Run alongside
regression checks; uncached repeats, native allocations/source construction excluded. Not UI latency.
No new known P0/P1 issue or external blocker in this slice. Decimal parameters, human/economist
testing and comprehensive accessibility/R0-R6 acceptance remain open.
Final cleanup: tests removed only their synthetic projects; the isolated API listed no projects.
Verified owned acceptance processes 25560/28492 were stopped. next-env.d.ts is unchanged;
whitespace review passed and unrelated working-tree changes were preserved.

Previous exact-field acceptance (ADR-176): opt-in v2 constants/arithmetic/sum/single-value support
Decimal/integer inputs without Float64 conversion. ScalarValue validates precision/scale, previews
and bound charts preserve exact transport. Arithmetic rounds half-even per node; sum retains scale
and empty/all-null totals are zero; single value enforces one row. Constants remain strings in
EN/RU/TT editor settings and version-aware creation/drop defaults. No automatic migration/dependency.
Checks: full backend 1354 passed/27 PostgreSQL-only skips; final 21 focused cases include three
subsequently added actual-sum overflow, above-Int64 integer total and foreign-row-context tests.
SQLite/PostgreSQL exact/API/bound-node matrix 31 passed. Frontend 389 tests/90 files passed, lint,
typecheck, OpenAPI check, mypy and acceptance build passed. Three production browser tests passed:
exact field settings/edit/reload/KPI, legacy decimal field formulas, executive demo refresh/reload.
Preview/scalar publication/frozen result/restore are API-tested against 0.80000003, not rounded floats.
100k-row arithmetic->sum benchmark: 2 columns 1.472 s first/1.683 s repeated; 100 columns
1.831/1.748 s. Python traced peak 12.57 MiB each; source Polars size 2.29/77.06 MiB. Repeats are
uncached and memory excludes native allocations/source construction; no whole-app latency claim.
Known limitations: no decimal workflow parameters/general exact field_formula yet; arithmetic does
not infer units/currency. Human/economist/accessibility and whole R0-R6 gates remain open.
Final review: exact arithmetic inspector screenshot checked; fallback graph/inspector captions now
include the node version's exact name, with an additional focused caption regression (6 field-control
tests passed). Ruff/format/mypy, final frontend lint/types and default-API production build passed.
Only owned acceptance processes 22212/24292 were stopped; synthetic projects were removed by their
tests and the isolated API listed no projects. next-env.d.ts unchanged; unrelated work retained.

Previous typed-authoring acceptance (ADR-175): all eight basic types accept semantic specs in the
independent API/editor, normalized to one persisted binding representation. Typed/legacy forms
cannot be mixed. All-field tables and implicit scalar KPI keep their semantics; primary series
names are editable. Receipt fingerprints use canonical settings; old defaults serialize unchanged.
Basic public saves validate before commit. Nonempty appearance-only changes preserve fields; empty
legacy configs still reset defaults (caught and corrected by rollup regression). Wizard average
editing and typed table freeze/restore were explicitly verified, not inferred from compatibility.
Checks: full backend regression 1333 passed/27 PostgreSQL-only skips; subsequently added wizard and
typed-release cases passed in a 40-test SQLite/PostgreSQL set (basic input/spec/rollup). Earlier
bound-node/receipt/input matrix: 56 passed/1 SQLite concurrency skip, PostgreSQL case passed.
Frontend 387 tests/90 files passed; Ruff/format/mypy, ESLint/TypeScript/OpenAPI and acceptance build
passed. Five production browser scenarios passed: chart readability, wizard stale-tab editing,
typed table create/draft/history/conflict, and lost create/copy responses with exact replay.
No new blocker; R0-R6 and human/accessibility acceptance are not complete. Next task is the exact
field/scalar calculation boundary above, not another recovery or typed-registry implementation.
Browser tests removed their synthetic projects; isolated API listed no projects. Only owned test
processes 21416/22784 were stopped. Default-API production build restored successfully; next-env.d.ts
unchanged. Final Ruff formatting/check and whitespace review passed; existing unrelated work retained.

Previous typed-read acceptance (ADR-174, input restrictions superseded by ADR-175): all eight basic types project validated roles into result
specs; registry lists 21 families and explicitly distinguishes legacy input contracts. Frontend
resolves stable IDs, ordered series/columns and hidden selection context without changing values.
Old spec-less frozen releases remain supported. Basic typed spec INPUTS remain intentionally
rejected pending canonical write adaptation. No persisted configs, migrations or dependencies changed.
Checks: backend full suite 1322 passed/27 PostgreSQL-only skips; targeted SQLite/PostgreSQL basic
spec and bound-visualization suite 30 passed (fresh isolated schemas/migrations). Frontend 379 tests
in 89 files passed; backend Ruff/format/mypy, frontend lint/typecheck, OpenAPI consistency and
production builds for acceptance/default API passed. Two production browser scenarios passed:
chart readability/resizing/raw table and executive demo refresh/reload with eight widgets. Light
demo screenshot reviewed; scripted checks are not human/accessibility acceptance. API test covers
1101-row table release paging/restore with exact large integers; component tests cover old releases,
missing roles and text/exact KPIs. Known broader limitations remain above; no new blocker.
Synthetic browser projects were removed by their tests; isolated API listed no projects. Only owned
acceptance processes 26204/24800 were stopped; default build restored, next-env.d.ts unchanged.

Previous unavailable-storage acceptance (ADR-173): a failing regression restored Older stored draft
instead of Newest in memory after quota failure and remount. Shared document-drafts now mirrors
serialized report/visualization settings and exact requests, bounded to 1,000,000 characters per
entry, never datasets. Volatile data takes precedence over stale disk records; denied reads use only
already-known data. Existing validation, scopes, revision checks and pending-request bytes remain.
Confirmed saves/pristine resets retire memory with a tombstone on failed removal; failed explicit
discard retains recovery. Keep-and-leave still requires persistent success. Warnings distinguish
temporary memory from reload/tab-close recovery and confirmed saves from failed local cleanup.
Dashboard new-visualization discovery uses the same reader. No router/history patch, server autosave,
new calculation model, API, DDL or dependency. Tests reset module memory to model separate documents.
Full frontend: 369 tests / 88 files pass. Twelve production scenarios pass (ordinary report and
visualization recovery, independent create/copy retries, analytical creation, plus the three new
quota/privacy/history cases). The new cases also pass three consecutive repetitions (9 runs) on
the final acceptance build. They verify exact retry bodies and one saved report/visualization,
unchanged drafts, no unsent graph creation, and no stale pending recovery after confirmed save.
TypeScript, ESLint and OpenAPI checked; backend untouched, last full result remains 1312/27 skipped.
Acceptance and restored default-API production builds pass; whitespace check passes and
next-env.d.ts is unchanged. All this turn's synthetic projects were removed by test cleanup;
the isolated project list was verified empty. Only owned API 27728/frontend 17792 stopped.
No user project or existing worktree changes were removed.
No new known P0/P1 or blocker in this slice. R0-R6, full accessibility/human acceptance and legacy
editor history recovery remain open. Do not describe document memory as durable persistence.

Previous analytical/alignment acceptance (ADR-172): four regression failures reproduced missing focus
after list changes and older alignment errors masking newer checks. Shared explicit-action focus
now covers analytical grouping/measure add/remove/move, pre-statistics filters and Join/alignment
key pairs. Reordering requests focus after DOM commit despite unchanged count. Ordinary typing
and draft restoration never queue list focus; surviving IDs, scales and values remain unchanged.
Alignment create/edit uses last-action error feedback, separate from input loading failures.
New field/preview attempts clear previous feedback; localized failures receive focus. Statistical
preview failures use the same named panel. No backend, API, receipt, calculation or DDL changes.
Full frontend: 363 tests / 87 files pass. TypeScript, ESLint, OpenAPI and acceptance build pass.
Fourteen production browser scenarios pass: new analytical/align-create/align-edit feedback,
eight analytical editing families, alignment formula round-trip, summary formula chains and basic
wizard feedback. The compact analytical flow retains filters across reload and saves exact 0.30;
failed/successful preview checks leave stored graph revisions/settings untouched.
Initial browser assertions incorrectly used exact label text for option-containing selects and
an unnamed alert that also matched Next's route announcer. Selectors now use combobox roles and
the named Report check failed alert. Initial test timeout left two synthetic projects in the
isolated acceptance DB; finally cleanup now runs even if leaving the page fails. A direct shell
cleanup command was denied by tool policy and was not retried through another transport.
Earlier test-only typecheck misuse of RTL's exact option and callback-ref lint errors were corrected;
no suppressed rules or weakened behavioral assertions. Backend code is untouched; previous full
backend evidence remains 1312 passed / 27 skipped, not a new backend run this turn.
No new dependency, known P0/P1 in this slice or development blocker. R0-R6/human gates stay open.
Final verification: all three new browser scenarios pass three consecutive repetitions (9 runs).
Default-API production build and whitespace check pass; next-env.d.ts unchanged. Owned frontend
26724 and acceptance API 25960 are stopped. Successful runs removed their own synthetic projects;
the two early timeout projects existed only in the temporary acceptance DB, never the user's DB.
No recursive filesystem cleanup or retry of the denied cleanup operation was performed.

Previous executive acceptance (ADR-171): scripts.executive_demo creates a new synthetic project
through public APIs, with explicit decimal money, leading-zero text keys, ordinary financial
formula graphs and eight saved widgets. Initial/reordered replacement fixtures contain 136 orders.
Three KPIs, monthly plan/fact, heatmap, box plot, histogram and hierarchical totals share the imported
snapshot. Plan is expected revenue per order. Independent Decimal/statistics checks verify all
results before/after replacement, including absent versus zero cells, one missing delivery and
one 24-day outlier. Updating preserves widget/layout identity. The CLI never reuses user projects;
partial failure prints the new project ID. README contains launch/update instructions and controls.
The real dashboard exposed decimal KPI strings bypassing number/currency/percent settings.
Bounded BigInt presentation now preserves large values and locale affixes without Number conversion.
Display ties match existing Intl behavior; backend rounding and raw table values are unchanged.
Regression covers EN/RU/TT, large integers, decimal carry, negative zero and untouched text codes.
Full backend: 1312 passed / 27 skipped (PostgreSQL-specific concurrency/migration gates).
New demo checks on SQLite/PostgreSQL: 3 passed; demo/update subset: 15 passed.
Full frontend: 359 tests / 87 files passed. Full Ruff/format, app and script mypy, ESLint,
TypeScript, OpenAPI and acceptance/default-API production builds passed; whitespace check passed.
Executive production journey passed once then three consecutive repeats; six additional production
scenarios passed (formula chain, two keyboard journeys, three lost-response recovery paths).
Light and compact-dark screenshots were captured; compact-dark visually reviewed, with readable
charts and no document overflow. Screenshot capture waits for chart animation, and compact layout
assertions wait for data/resize completion. Browser cleanup leaves the page before deleting its
own data so teardown cannot fabricate graph errors in a failure screenshot.
Only synthetic test projects were removed; isolated API project list verified empty. Only owned
API 29368/frontend 24176 processes stopped; next-env.d.ts unchanged. No user project removed,
new migration/dependency or known P0/P1 in this slice. No blocker. Overall R0-R6, comprehensive
accessibility/performance and economist acceptance remain open.

Previous guided-calculation acceptance (ADR-170): backend already calculated ordered summary formulas,
but the wizard could not select a previous summary result by name. Opt-in include_summary on both
fields endpoints now resolves the ordinary graph schema through the requested chain and returns
summary_outputs with stable IDs/decimal metadata. Default field requests remain compatible and
ignore summary expressions. Checks never execute/save; edit CAS and advanced-step guards remain.
The wizard's Check after-total fields action exposes only checked unchanged dependency prefixes.
Producer edits/removal and aggregation changes invalidate dependent choices, while consumer edits
retain an unchanged producer. Shared row/summary/alignment Add/Remove now keeps useful keyboard
focus and preserves remaining formula IDs, expressions and precision.
Seven production browser scenarios pass, including guided Revenue/Cost -> Profit -> Margin ->
Target gap creation, save, reload and edit. Values 40.00/17.39/-2.61 become 30.00/13.04/-6.96 after
an upstream change; named selectors are used instead of entering field IDs. Existing report and
alignment editing, pending-save recovery and import/network feedback also pass.
Full frontend: 353 tests / 86 files pass; TypeScript, ESLint, OpenAPI, backend Ruff/format/mypy and
acceptance production build pass. Formula API tests pass on SQLite/PostgreSQL: 34 tests, including
schema-only division-by-zero inspection, exact output metadata, missing dependencies and stale CAS.
Full backend regression: 1310 passed / 27 skipped (PostgreSQL-only concurrency/migration checks).
The new production financial-chain scenario also passed three consecutive repetitions. Initial
new-test assertions assumed a 400/error envelope and a malformed stale token; corrected to the
existing 422/detail API contract and a well-formed stale token, retaining explicit error/CAS checks.
Default-API production build and whitespace check pass; next-env.d.ts is unchanged. Synthetic
projects were deleted and the isolated project list verified empty. Only owned API 23804/frontend
3936 processes were stopped; no user projects removed. No new blocker or known P0/P1 in this slice.
No new migration, dependency, execution engine, saved recipe or receipt format was introduced.
Executive demo, remaining authoring/accessibility and economist gates remain open; goal stays active.

Previous UI acceptance (ADR-169): regression tests reproduced missing dynamic-row focus and import
errors without a focus target. Basic report Add focuses the new first control; Remove focuses the
next/previous survivor or Add when empty. A small queued-focus hook runs after DOM commit, not
during typing/restoration; native Button accepts React 19 refs. Import/report checks show the latest
attempt's feedback, not the first historical mutation error. New attempts clear prior feedback;
failure focuses an explicitly opted-in, localized named panel. Ordinary panels never steal focus.
Settings, graph contracts, CAS guards and existing draft save/receipt behavior are unchanged.
Full frontend: 349 tests / 85 files pass. TypeScript, full ESLint, OpenAPI and acceptance build pass.
Six production scenarios pass: new feedback/dynamic-row test, both light/compact-dark integrated
journeys and create/edit/alignment lost-response recovery. New scenario also passes 3 repetitions.
It verifies an import committed before connection reset retries the identical request and leaves
one dataset; failed field/preview checks retain settings and create no saved workflow. The test
initially counted Next's empty route-announcer alert and assumed an unwrapped workflow list; both
test assumptions corrected. Ref registration uses commit callbacks after React lint validation.
RU/EN/TT panel focus and unchanged-render focus preservation have component coverage. No backend
changes this slice; last full backend remains 1309 passed / 27 skipped, not rerun here.
Default-API production build also passes; next-env.d.ts is unchanged. Synthetic projects were
deleted by their test cleanup and the isolated API project list was verified empty. Only owned
servers (3010 PID 28468, 8010 PID 8196) were stopped; no user projects were removed.
Full keyboard/screen-reader/contrast, dynamic formulas, other authoring forms and economist tests
remain open; no whole-product completion claim. No new blocker or known defect in this slice.

Previous UI acceptance (ADR-168): production keyboard Next/Tab originally skipped new import inputs
and focused Back. Shared semantic WizardHeading focuses on mount/stage identity change in import
and basic report wizards and import completion; editing/translation on the same stage does not
steal focus. Existing report-completion focus is retained. No calculation or save changes.
Rendered review also found legacy report tables had left-aligned numbers and 12 px text; they now
use 14 px, schema-driven numeric header/cell right alignment and tabular numerals, retaining text
codes, selection and server pagination. Unit tests protect unchanged-stage focus and decimal/text
alignment. A production scenario checks exact values 0.30 -> 0.15 -> 0.35, leading-zero codes,
blocked invalid conversion, field correction, wizard edits, swapped incoming columns and reload.
The test uses Enter/Space and selected Tab assertions, but also programmatic focus/file/value input;
it is not a claim of fully keyboard-only operation. Initial test issues were an implicit select
label locator and capturing the URL before navigation; both corrected without weakening assertions.
Repeated browser testing found a real upload transition race: an intermediate Tables stage mounted
before route continuation and could steal focus after Tab. Only the saved-import route now presents
that step; the old wizard stays busy to prevent duplicate uploads until navigation completes.
Full frontend: 343 tests / 85 files pass; TypeScript, ESLint, OpenAPI and acceptance build pass.
Seven final production scenarios cover light/compact-dark journey, import/rollback, manual-step
editing/stale tabs and create/edit/alignment pending-request recovery. Backend code unchanged this
slice; last full backend result remains 1309 passed / 27 skips from ADR-167, not rerun here.
The two new light/compact-dark scenarios also passed three consecutive repetitions each after
the upload race fix. Final affected component checks: 20 passed. USABILITY_REVIEW updated without
claiming human acceptance. Default-API build and whitespace checks pass; next-env.d.ts unchanged.
Synthetic projects deleted, isolated API list verified empty; only owned 8010/3010 servers stopped.
No user projects removed. No new blocker; whole-product R0-R6 completion remains unproven.

Previous field-wire correction (ADR-167): reproduced Copy(1.00000001) -> exact sum 1.00 because
Append Field dropped scale. CompiledFormula/ValueSchema now propagate metadata across direct fields,
coalesce/if_else/nullif, append, previews, legacy calculated-column pass-throughs and bound role
columns. Common decimal branch scales/units are validated; nullif preserves left scale, predicate
fields do not change result scale. Physical-scale mismatch/overflow fail, never round silently.
Decimal scalar output was already unsupported at runtime; now preflight identifies the value input
before loading data. No new decimal scalar arithmetic contract or graph/persistence migration.
Full SQLite backend: 1309 passed / 27 PostgreSQL-dependent skips. Targeted SQLite/PostgreSQL matrix:
32 passed / 1 SQLite migration skip; PostgreSQL migration counterpart passed. Field-wire report
preview/results/release restoration pass on both engines. Frontend: 340 tests / 85 files pass;
TypeScript, ESLint, OpenAPI pass. Production browser: 4 pass (new exact decimal field totals/reload,
exact formula editing/reload and two field-diagnostic scenarios including EN/RU/TT). One retained
six-dashboard financial test skipped because its external retained fixture is not configured;
this is not evidence for that demo. Ruff 290 files, mypy 164 app files pass. Acceptance build passed.
No known P0/P1 remains in this slice. Default-API production build and whitespace checks also pass;
next-env.d.ts unchanged. Synthetic projects deleted and isolated API list verified empty before
stopping only the owned 8010/3010 servers. No user projects removed. No new blocker; R0-R6 remains active.

Previous composition correction (ADR-166): shared Decimal128(38,max scale) casting fixes decimal
Union truncation and false Join v1/v2 matches. Physical-scale mismatches, conflicting known units/
currencies and rescale overflow fail explicitly. Independent source IDs stay independent; the
existing Union contract still requires explicit name alignment (tested using Rename Columns).
Diagnostic unmatched/duplicate records reuse Join inference and the same casts without materializing
the join; they preserve exact transport, not upstream diagnostic summaries. Null/relationship/bounds
and nondecimal semantics remain unchanged. Reexecuted live reports can change correctly; frozen
artifacts are never rewritten. EN/RU/TT errors added. No known P0/P1 remains in this slice.
SQLite/PostgreSQL targeted matrix: 30 passed, including three import -> composition -> report ->
release -> restore scenarios on both engines. The initial integration test correctly hit separate
source field-name alignment and unmatched-row warning acknowledgement; it now models both explicitly.
Frontend: 340 tests / 85 files, TypeScript, ESLint and OpenAPI pass. Three production-browser scenarios
pass: single/composite Join authoring + diagnostics + shared dashboards, and exact Pivot reload.
Two 100k-row, three-column in-memory inputs at scales 8/10: Union 200k rows in 0.005 s; one-to-one
Join 100k rows in 0.046 s with no unmatched rows. One cold smoke measurement, excluding construction,
import, serialization and memory profiling; not a complete R6 performance acceptance.
Final full backend SQLite regression: 1288 passed / 27 PostgreSQL-dependent skips. The separate
targeted PostgreSQL matrix above passes; the entire PostgreSQL suite was not rerun in this slice.
Ruff: 288 files; mypy: 164 app files pass. Acceptance/default-API production builds and whitespace
checks pass. Isolated browser projects deleted; API list verified empty. Only owned
8010/3010 servers stopped; next-env.d.ts unchanged. No product blocker; broader acceptance remains open.

Previous Exact Pivot (ADR-164): pivot@2 computes exact full-input sums, averages, extrema and nonempty
counts. Decimal/integer numeric outputs use Decimal128, averages have explicit 0-38/default-6 scale
with half-even rounding. Missing numeric cells remain null, counts zero. Native equality handles
null/NaN groups. Dynamic fields retain the shared stable identity contract and old category/output
limits; schema resolution/cache/release restoration use the common engine. Only three projected roles
enter grouping, not wide rows. No implicit Float64 conversion; pivot@1 is unchanged. EN/RU/TT editor
controls expose exact naming and average scale. Changing the output schema still requires explicit
visualization rebinding (the API test initially hit this correct stale-field guard, then rebound).
Full backend SQLite suite: 1258 passed / 27 PostgreSQL-only skips, before the decimal conversion fix.
Final affected Pivot/conversion/preparation suite: 57 passed. Combined SQLite/PostgreSQL Pivot,
report-cycle and prepared-input integration: 40 passed / 2 SQLite-only concurrency skips; PostgreSQL
counterparts pass. Frontend: 340 tests / 85 files pass. Three production browser scenarios pass:
Pivot precision/reload/dynamic report fields, exact analytical helper and report formulas.
100k-row benchmark: 3-column cold/repeat 0.388/0.393 s; 100-column 0.380/0.408 s. Python traced peak
6.46 MiB; output Polars 0.016 MiB. Native allocations/source construction excluded; repeat recomputes.
Wide engine benchmark bypasses import limits and does not claim wider file import is supported.
Decimal conversion audit reproduced P1 truncation: 1.25 -> 1 with on_error=error. ADR-165 applies the
existing whole-value guard to decimal as well as Float64. Fractions obey error/null policy, including
negative/precision-tail/late rows; large whole Int64 values and overflow behavior remain unchanged.
Frozen artifacts are not rewritten. New focused tests pass; no known P0/P1 remains in this slice.
Ruff (285 app/test/script files), mypy (163 app files), TypeScript, ESLint, OpenAPI and production
acceptance/default-API builds pass. next-env.d.ts unchanged; whitespace checks pass. Synthetic projects
cleaned, isolated API list empty, owned 8010/3010 servers stopped; no user data removed. No new
dependency, API shape or DDL. R0-R6, full accessibility and human usability gates remain open.

Previous exact analytical authoring (ADR-162): decimal share/rank plans use window@3 and, for shares,
calculated_column@2. Integer inputs offer explicit exact opt-in; Float64 stays approximate. Share
scale 0-38/default 6 is explicit. PlannedStep.version is respected; omitted versions remain v1 and
unavailable versions fail before editor mutation. Optional parameter selection remains a trailing
filter, preserving denominator/rank population. Exact ranks reject residual ties, not dense-ranking.
EN/RU/TT labels, invalid-scale feedback and version-aware node names are integrated. Existing saved
graphs are not upgraded. Narrow 760px dialog screenshot reviewed; controls/footer remain readable.
Four production-browser scenarios pass, covering the unchanged legacy helper, decimal share/rank,
empty/zero fallback, large close values, full-group parameter scope, persistence, exact windows and
report formulas. Frontend: 339 tests / 84 files pass. Focused backend exact suite: 158 passed;
combined SQLite/PostgreSQL exact/window/formula/release integration: 119 passed.

Decimal audit discovered and fixed P1 Unpivot truncation (ADR-163): 1.00000001 previously became
1.000000 through a generic six-place cast, without scale metadata. Unpivot now uses maximum declared
scale, precision 38, common known units/currency and exact transport. Missing/mismatched scales,
conflicting units/currencies and overflow fail explicitly. Non-decimal paths/IDs/limits are unchanged.
Frozen artifacts are not rewritten; recalculate live graphs from original retained sources.
Focused final Unpivot/preparation/analytical composition suite: 26 passed, including scale 0/2/8/18/38,
empty inputs/nulls, mixed scales, overflow and downstream exact formula correctness.
Full backend SQLite regression: 1234 passed / 27 PostgreSQL-only skips, collected before the final
downstream Unpivot formula test. The final affected suite above includes that additional passing test.
Ruff (280 app/test/script files), mypy (162 app files), TypeScript, ESLint, OpenAPI and production
acceptance/default-API builds pass. next-env.d.ts unchanged; whitespace checks pass. Existing
dependency deprecation warnings remain. Synthetic browser projects cleaned; isolated API list empty;
owned 8010/3010 servers stopped. No user data removed, no dependency/DDL change. The discovered
Unpivot P1 is fixed; no known P0/P1 remains in this slice. R0-R6 remains open.

Previous exact windows (ADR-161): opt-in window@3 supports exact partition sums, cumulative sums/maxima,
previous-row values and row numbers. Decimal/integer fields preserve scale and large values; Float64
is not silently converted. All ordered operations require unique keys per partition. Null rows stay
empty without resetting cumulative state; previous includes null rows. Overflow is explicit; v1/v2
remain unchanged. Input metadata/lineage/stable output IDs survive reports and frozen restoration.
The shared EN/RU/TT editor offers decimal fields only in v3; palette labels distinguish versions.
Output bounds: 250k rows, 1024 columns, 20m cells for one-column expansion. Import and legacy/join
2m-cell limits are unchanged. Narrow-group indices/value-only materialization avoids Python wide rows.
Full backend SQLite regression: 1222 passed / 27 PostgreSQL-only skips. Combined SQLite/PostgreSQL
window/measure/formula/report-cycle integration: 86 passed. Frontend: 335 tests / 82 files pass.
Three production-browser scenarios pass across final runs: exact window edit/reload/results, exact
conditional formulas and report formulas. Initial failures exposed palette naming (fixed) and an
incorrect label selector (now selects the actual combobox by accessible role/name).
The first full regression also found UUID-prefix-dependent restore failure introduced by ADR-160:
0b-prefixed source IDs were tokenized as Python binary literals. Equal-length bracket masking before
string-token discovery fixes this; four explicit prefix regressions and the full rerun pass.
100k-row cumulative benchmark: 3-column cold/repeat 0.883/0.849 s; 100-column 1.223/1.158 s;
Python traced peaks 24.62/24.55 MiB, output Polars 4.58/78.58 MiB. Native allocations/source building
excluded; repeat recomputes. Wide engine test bypasses import limits and does not claim wider import.
Ruff (278 app/test/script files), mypy (162 app files), TypeScript, ESLint, OpenAPI and production
acceptance/default-API builds pass. next-env.d.ts unchanged; diff whitespace checks pass.
Synthetic projects cleaned; isolated API list empty; owned 8010/3010 servers stopped. No user data
removed; no dependency/DDL change or known P0/P1. R0-R6, accessibility and human acceptance stay open.

Previous exact conditions (ADR-160): calculated_column@2 supports typed comparisons, is_null,
and/or/not and lazy numeric if_else. Numeric branches remain exact rational arithmetic with one
explicit half-even output boundary. String/boolean/date/datetime fields are condition-only; no
Float64 coercion. Unknown comparisons remain unknown; false/unknown selects otherwise. Both branches
are statically checked and included in lineage. Graph, row, after-total and alignment editors share
the same EN/RU/TT controls. Release restoration now preserves quoted business literals while remapping
generated references; escaped/multiline/raw/Unicode-separator literals have regression coverage.
Full backend SQLite suite: 1182 passed / 27 PostgreSQL-only skips, before one additional Unicode
literal test and its offset fix. Final affected remapping/report-formula suite: 27 passed.
Exact arithmetic/conditional/remapping suite before that final test: 130 passed. Separate combined
SQLite/PostgreSQL formula/alignment/report-cycle matrix: 82 passed. Clean PostgreSQL migration check:
1 passed / 1 SQLite-only skip. Full PostgreSQL matrix was not repeated in this slice.
Frontend: 334 tests / 81 files pass. Three production-browser scenarios pass: conditional graph
calculation/reload, report formulas/editing and alignment editing/recovery. Acceptance/default-API
production builds, ESLint, TypeScript, OpenAPI, Ruff (274 app/test/script files), mypy (161 app files)
and whitespace checks pass. next-env.d.ts is unchanged. Existing dependency deprecation warnings remain.
100k-row conditional benchmark: 2-column cold/repeat 2.446/2.551 seconds; 100-column 2.481/2.629
seconds, 12.84 MiB traced Python peak. Output Polars size 3.81/78.58 MiB. Measurements ran alongside
other tests; source construction/native allocations excluded and repeat is not a cache hit.
Synthetic browser projects deleted; isolated API returned an empty list; owned 8010/3010 servers
stopped. No user data removed. No new dependency/DDL or known P0/P1. Remaining decimal windows,
full UX/accessibility and five-economist human acceptance remain open; R0-R6 is not complete.

Previous guarded alignment editing (ADR-159): edit key pairs, measures, null policy and ordered exact
formulas without rebuilding either prepared input branch. Retain manual preparation, retained node/
edge identities, publication identity, appearance, table order and dashboard layout. Adding/removing
fields requires explicit rebinding; dangling formatting/navigation references fail without mutation.
Shared/context/container-bound suffixes stay advanced steps. Multiple widgets require acknowledgement.
Read-only fields/preview and atomic CAS/apply share the creation engine. Exact target-bound receipts
and separate same-tab drafts recover commit-then-disconnect even when metadata is unavailable.
Successful preview now supplies checked field/prefix schemas, avoiding false missing-schema labels
after draft restoration; newer explicit field checks supersede earlier preview schemas.
Full SQLite/PostgreSQL regression: 1525 passed / 27 SQLite-only skips, collected before seven final
editing tests and the preview-schema presentation improvement. Final affected regression after that
change: 86 passed / 6 SQLite-only skips; final editing suite including deletion retry: 34 passed /
2 SQLite-only concurrency skips. PostgreSQL counterparts pass; no skipped PostgreSQL checks.
All 334 frontend tests / 81 files pass. All 15 production browser edit/create/recovery/release
scenarios pass on the final build. Narrow 760px editor screenshot reviewed and readable labels fixed.
Ruff (284 files), mypy (161 app files), TypeScript, ESLint, OpenAPI and acceptance/default-API builds
pass. next-env.d.ts unchanged; diff whitespace check passes. Synthetic projects cleaned; isolated API
list empty; owned 8010/3010 servers stopped. No user data removed; unrelated edits preserved.
No new dependency/DDL or known P0/P1. R0–R6 is still in progress; human/accessibility gates remain open.

Previous alignment formulas (ADR-158): up to 16 exact calculated_column@2 nodes after align_measures,
with stable identities, dependent formulas and per-node precision/scale/half-even rounding. Schema
field discovery uses the common resolver without row execution or writes. Full-data preview/apply
preserves both reused measures, presence flags and complete match counts. No repeated aggregation,
implicit Float64 coercion, inferred unit conversion or second browser calculation engine.
Schema/identity/runtime errors leave existing graphs untouched. Old receipt hashes stay compatible;
drafts recover formula IDs/settings but require fresh preview. Frozen release remapping preserves
the complete formula chain and exact results. Saved alignment editing remains graph-only for now.
Focused SQLite/PostgreSQL regression: 147 passed / 4 SQLite-only concurrency skips; PostgreSQL
counterparts pass. Tests include rollback, concurrent formula applies, backward/invalid references,
16 formulas, large exact values, empty sets, Float64 rejection and division failure beyond preview.
Frontend: all 331 tests / 80 files pass. All six selected production browser scenarios pass,
including dependent formula draft/retry, ordinary formula edits and full report-cycle restore.
Initial browser test selector ambiguously matched a presence flag; exact decimal-role selection fixed
the test, without weakening result assertions. Narrow 760px formula form screenshot reviewed.
Ruff (281 files), mypy (159 app files), TypeScript, ESLint, OpenAPI and acceptance build pass.
Final default-API production build passes; next-env.d.ts unchanged and diff whitespace check passes.
Synthetic browser projects cleaned; isolated API list empty; owned 8010/3010 servers stopped.
No user data removed; unrelated worktree edits preserved. No dependency/DDL or known P0/P1.
Full backend baseline remains ADR-157; it was not rerun globally in this focused slice.
Comprehensive accessibility and five-economist human acceptance remain open; no completion claim.

Previous analytical templates (ADR-157): capture saved recognized calculations/filters as immutable
project-local metadata with neutral field roles and explicit row meaning. No source rows/references,
manual preparation or appearance are copied. Explicit mapping validates logical types, known unit/
currency and current source revision. Loading writes nothing; ordinary full-data preview and atomic
wizard apply create the graph. Templates survive source-report deletion, restart and release restore.
Pending capture retries preserve the exact request across same-tab reload even without source metadata.
Eight analytical types are supported; catalog rename/archive/cross-project sharing remain open.
No new dependency or DDL. Limit 200 templates/project; reload a saved report after template capture
before further calculation edits because the project revision has changed.
Full SQLite/PostgreSQL suite: 1465 passed / 21 SQLite-only skips (before three extra test cases).
Final focused template suite including currency and concurrent capture: 39 passed / 2 SQLite-only
concurrency skips; PostgreSQL counterparts pass. Frontend: 330 tests / 80 files pass.
All 21 selected production-browser scenarios pass, covering template mapping/retry, eight guided
analyses/edits and report-cycle/recovery. Initial new browser failures were incorrect label selectors
and reload before completed navigation; corrected tests pass without weakened business assertions.
Ruff (280 files), mypy (159 app files), TypeScript, ESLint and OpenAPI agreement pass.
Acceptance and final default-API production builds pass; next-env.d.ts unchanged and diff whitespace
check passes. Synthetic browser projects cleaned; isolated API project list empty. Owned servers
on 8010/3010 stopped. No user data removed; unrelated worktree edits preserved.
No known P0/P1. Comprehensive accessibility/human acceptance remains separate and open.

Previous hierarchy editing (ADR-156): compatible one-additive-measure treemap/sunburst calculation
settings project to the wizard while retaining their table_rollup node, manual prefix, publication,
appearance and dashboard layout. Reordering/replacing grouping or measure identity requires explicit
rebinding. Dangling formatting/navigation references fail without mutation. Multi-measure/shared/
unknown/context-bound rollups remain graph steps, not simplified copies. Exact totals survive
release/restore; draft/retry and CAS reuse existing contracts. No dependency or database migration.
All 327 frontend tests and 19 production browser authoring/editing/restore/recovery scenarios pass.
Ruff (276 files), mypy (156 app files), TypeScript, ESLint, unchanged OpenAPI and acceptance build pass.
Focused SQLite/PostgreSQL regression: 186 passed / 4 SQLite-only concurrency skips; PostgreSQL
counterparts pass. The full 1402-test baseline was verified in ADR-155, not rerun in this slice.
Final default-API production build passes; next-env.d.ts unchanged, diff whitespace check passes.
Synthetic browser projects cleaned; isolated API list empty; owned servers on 8010/3010 stopped.
No user data removed; unrelated worktree edits preserved.
No known P0/P1; templates and comprehensive accessibility/human acceptance remain open.

Previous guided profiles (ADR-155): full-data preview and atomic creation for Pareto/funnel/hierarchy,
shared prepared branches without copying, CAS/receipt recovery, upstream filters and typed views.
Hierarchy requires grouping levels, one additive measure and every total. Pareto/funnel duplicate
keys fail rather than aggregate silently. Compatible suffix edits retain manual nodes, stable IDs,
appearance and layout. EN/RU/TT settings and tab-local recovery use existing components.
Focused SQLite/PostgreSQL regression: 126 passed / 4 SQLite-only concurrency skips; counterparts pass.
Full SQLite/PostgreSQL regression: 1402 passed / 21 SQLite-only skips; PostgreSQL counterparts pass.
Final frontend: 325 tests / 79 files pass. All 63 selected production browser scenarios pass:
58 in the broad run and 5 on rerun with NODEBI_E2E_API=http://localhost:8010. The initial five
failures were connection refusals to the absent default :8000 API, not product regressions.
The 15 focused authoring/editing/recovery scenarios also passed together before the broad run.
Ruff (275 files), mypy (156 app files), TypeScript, ESLint, OpenAPI, acceptance and final default-API
production builds pass. Narrow hierarchy form/table screenshot reviewed; misleading 20000-row
rollup guidance is replaced by the actual 5000-node hierarchy limit. next-env.d.ts unchanged.
Synthetic browser projects were cleaned; isolated API list empty. Owned acceptance servers stopped.
No user data removed; unrelated worktree edits preserved; diff whitespace check passes.
No new dependency/DDL or known P0/P1; hierarchy editing/templates/human acceptance remain open.

Previous funnel work (ADR-154): funnel_steps@1 explicit integer stage order, unique nonempty stages,
non-increasing finite/nonnegative values and exact losses/previous/initial retention. Zero
denominators remain undefined; empty/single/zero sequences have explicit states. Whole <=50-stage
chart/summary results, exact tables, normalized widths, flat final stage and keyboard scrolling.
Population matching/aggregation remains upstream; aggregate ratios do not prove individual events.
CAS/retry/copy, full freeze/restore, extra navigation and pre-statistics context restrictions reuse
existing contracts. Restored projects have new node/point namespaces and unchanged business values.
Full backend SQLite/PostgreSQL matrix: 1368 passed / 21 SQLite-only skips; PostgreSQL counterparts
pass. Afterward added complete 50-stage release/upstream-context coverage: 35 focused tests pass.
Final frontend 321 tests / 79 files pass. All 57 production browser scenarios pass together (4.1 min).
Final focused frontend tests also cover positive drawing underflow without a false zero marker.
Desktop/420px light/dark screenshots reviewed; complete sequence scrolling and exact table verified.
Ruff lint/format (274 files), mypy (156 app files), TypeScript, ESLint, OpenAPI and acceptance build
pass. No DDL/dependency/known P0/P1. Guided authoring was subsequently delivered by ADR-155 above.
Final default-API production build passes; owned acceptance servers are stopped (8010/3010).
Synthetic test projects were cleaned and the temporary API list is empty. No user data was removed.
next-env.d.ts is unchanged; diff whitespace check passes; unrelated working-tree changes are preserved.
100k-row ordinary exact Group By -> 50-stage funnel benchmark: widths 3/100 cold 0.067/0.147 s,
repeat 0.092/0.194 s, Python peak 0.51 MiB. Source construction, native allocations and browser
latency excluded; repeat uncached and timing overlapped regression. Reproduce benchmark_funnel.

Previous bullet work (ADR-153): explicit shared zero-inclusive scale and 1–5 labelled ranges;
prepared unique category/actual/target fields with matching units. Full-input finite/range/identity
guards precede paging. Exact Fraction membership and original numeric text are separate from drawing
positions. Zero/missing remain distinct; keyboard windows adapt to card height. CAS/retry/copy,
context navigation, local drafts, complete frozen populations/restore and EN/RU/TT are integrated.
Backend matrix: 1335 passed / 21 SQLite-only skips; PostgreSQL counterparts pass. Final strengthened
large-decimal membership check: 44 affected tests pass across SQLite/PostgreSQL. Final frontend:
317 tests / 78 files pass. Ruff (268 files), mypy (153 app files), ESLint, TypeScript, OpenAPI and
production acceptance build pass. All 55 production browser scenarios pass together (3.7 min).
Final focused two-scenario rerun also verifies settled canvas dimensions at 420px; light/dark
screenshots inspected. Compact cards show fewer indicators instead of hiding labels. Synthetic
acceptance projects were removed by their test cleanup; the temporary API project list is empty.
Owned acceptance servers are stopped (8010/3010); the final default-API production build also passes.
next-env.d.ts is unchanged, diff whitespace check passes; unrelated user changes remain untouched.
100k-row benchmark, widths 3/100: first 0.005/0.003 s, repeated 0.004/0.004 s, Python peak 0.13 MiB;
100 rows/3 columns transported. Excludes input construction, native allocations and browser latency;
repeated execution is uncached. No new dependency/migration or known P0/P1 in this slice.

Previous hierarchy work (ADR-152): complete treemap/sunburst backed by ordinary table_rollup@1, not
a new calculation engine. Additive sum/count measures, all levels/totals, complete <=5000-node trees,
stable path selection, exact tables/fractions, explicit zero/null-category states and keyboard group
navigation. Full save validation, CAS/retry/copy, freeze/restore and schema-aware EN/RU/TT controls.
Full SQLite/PostgreSQL matrix: 1287 passed / 21 SQLite-only skips; PostgreSQL counterparts pass.
Subsequently added count and 1203-node freeze/upstream-context cases: final affected hierarchy/rollup
matrix 95 passed with both databases. All 53 production browser scenarios passed before the final
measure/unit labels and positive-underflow explanation. Final frontend: 312 tests / 77 files pass,
including 6 new hierarchy cases. Final five-scenario browser display rerun passes. The final missing
Actions translation was added afterward; no diagram/data behavior changed.
Ruff lint/format (262 files), mypy (150 files), TypeScript, ESLint, generated OpenAPI and acceptance
production builds pass. No dependency/migration or known P0/P1; no blocker. Screenshots inspected
at desktop/narrow sizes in both themes; actual diagram/table/group navigation is covered.
100000-row rollup+hierarchy benchmark: width 3 cold 0.484s / repeat 0.487s; width 100 0.686s / 0.614s.
Both yield 1011 exact nodes; traced Python peak 2.17/2.18 MiB; Polars output 0.110 MiB. Construction,
native memory and browser latency excluded; repeated runs uncached and timing overlapped tests.
Reproduce with python -m scripts.benchmark_hierarchy. Tree display cap is 5000 nodes, not input rows.
Float parent-child reconciliation uses 1e-12 relative tolerance; exact integer/decimal remains exact.
Tiny positive values may be undrawable but are never described as zero; exact table remains available.
Full R0–R6, one-step hierarchy/Pareto wizard creation and human/accessibility gates remain open.
Existing dirty work/font preserved, no commit. Synthetic projects deleted by test cleanup; empty
API project list verified. Own acceptance backend/frontend stopped via Ctrl-C, ports 8010/3010
confirmed no longer listening. Final default-API production build, ESLint and OpenAPI recheck pass.
Diff check passes, next-env.d.ts unchanged. No manual recursive cleanup or user-project changes.

Previous Pareto work (ADR-151): complete ordinary pareto@1 preparation, typed chart API/registry,
exact table, graph/editor EN/RU/TT settings, save/retry/copy, full release/restore and paging.
Full SQLite/PostgreSQL matrix: 1257 passed / 21 SQLite-only skips; PostgreSQL counterparts pass.
The final upstream-context/identity case was added afterward; final focused Pareto matrix: 42 passed.
Frontend 306 tests / 76 files pass. All 51 production browser scenarios passed before the final
compact-card layout improvement. The new geometry assertion caught the shared chart minimum height
overlapping the fixed footer; Pareto now gets flexible chart height. Final six-scenario rerun passes,
including geometry assertions for chart/navigation separation on desktop and narrow cards. Final
screenshots inspected; full frontend rerun passed before the last one-line chart minimum-height fix.
Ruff lint/format (258 files), mypy (148 files), TypeScript, ESLint, OpenAPI and acceptance production
build pass. No dependency/migration or known numeric P0/P1; no external blocker.
100000-row benchmark: width 2 cold 5.705s / repeated 6.230s; width 100 9.667s / 7.589s. Both retain
100000 exact ranked rows, Python peak 89.19 MiB, Polars output 12.292 MiB. Construction/native memory
excluded; repeated execution is uncached. Run overlapped regression, so timings are preliminary,
not latency promises. Reproduce with python -m scripts.benchmark_pareto. Optimize before claiming
instant 100k-row interaction. Guided Pareto creation remains future work; use the ordinary graph.
Existing dirty work/font preserved, no commit. Test cleanup deleted synthetic projects; empty API
project list verified. Own acceptance servers stopped via Ctrl-C; final default-API production build
passes; final ESLint/OpenAPI recheck passes. Ports 8010/3010 confirmed no longer listening.
Diff check passes and next-env.d.ts is unchanged. No manual recursive cleanup or user-project changes.
Full R0–R6 and human acceptance remain open.

Previous bubble integration (ADR-150): 1215 backend tests passed / 21 SQLite-only skips; PostgreSQL
counterparts pass. Full matrix preceded final display-label adjustments and the extra navigation
test. Final affected bubble/radar/combo SQLite/PostgreSQL matrix: 131 passed. Frontend: 300 tests /
74 files pass; after the last padding adjustment all five bubble unit cases and five production
browser regressions pass. All 49 production browser scenarios passed before that final geometry-only
adjustment. Ruff lint/format (252 files), mypy (146 files), TypeScript, ESLint and OpenAPI pass.
Acceptance and final default-API production builds pass; final OpenAPI recheck passes. Synthetic
API projects were deleted by test cleanup and the empty project list verified. Own acceptance
servers stopped via Ctrl-C; ports 8010/3010 confirmed not listening. No manual recursive cleanup.
Diff check passes, next-env.d.ts unchanged; preexisting dirty work and font preserved, no commit.
Coverage includes 2301-row releases beyond the live page cap, exact final-page restore, no-write
preview, invalid full-input save rollback, CAS/copy/appearance preservation, idempotent retry,
context filtering/stable selection, extra navigation fields, draft reload and narrow/dark rendering.
Real browser review found overlapping/indistinguishable long axis labels; exact relative tick labels
with a visible base equation fix this, and viewport padding keeps circles away from axis labels.
Other long labels use scientific display only; original data/ticks remain exact. Screenshots inspected.
No dependency/migration or new known P0/P1; no blocker. Full R0–R6 and human acceptance remain open.
The bubble API deliberately pages live rows/points together while computing full scales/counts.
Freeze uses the internal full_data path once and retains all rows/points; frozen reads page matching
identities without recomputation. Existing release byte limits reject, never silently truncate.

Previous bubble foundation (ADR-149, before integration): internal only; ChartType, public VisualizationSpec, registry,
OpenAPI and frontend are intentionally unchanged. Full-input key/finite/nonnegative validation,
rational coordinate differences, exact ticks/transport and radius ratios for proportional area are implemented.
Zero/missing rows remain distinct. Selected-role pages (default 1000, cap 2000) do not change full
extents/counts; no hidden aggregation/sampling. Public save/render/release/editor work is pending.
Checks: full SQLite/PostgreSQL matrix 1195 passed / 21 SQLite-only skips (PostgreSQL counterparts
pass). That run started before the final Null-storage/decimal-context guards. Final affected matrix
after those changes: 111 passed with both databases, including 46 new preparation cases; SQLite-only
run: 99 passed. Ruff lint/format (250 files), mypy (145 source files), unchanged OpenAPI and diff check
pass. No frontend files changed, so browser/frontend/build checks were not repeated this session;
their previous ADR-148 evidence remains below. Existing dependency deprecation warnings remain.
The 100000-row benchmark after final changes: 4 columns 0.041s cold / 0.041s repeated; 100 columns
0.037s / 0.038s. Both serialize 1000 rows / 4 roles, traced Python peak 1.54 MiB. Source construction
and native allocations are excluded; repeat is not cached. These are local preparation timings,
not end-to-end/browser latency. Reproduce with python -m scripts.benchmark_bubble.
Review found and fixed physical Null-buffer comparison failure, including empty key buffers; decimal
radius approximation now uses an isolated context. No dependency/migration or known new P0/P1;
no blocker. Existing dirty work/font preserved, no commit, next-env.d.ts unchanged. Tests use isolated
database schemas; no user source/project writes or acceptance servers started in this session.
Known caveat for integration: frozen results must bypass page truncation explicitly and retain all
observations from one execution; do not rerun the graph once per page. Partial graphical pages must
be visibly labelled and navigable, not represented as the complete point population.

Previous analytical-editing checks (ADR-148): full SQLite/PostgreSQL matrix 1151 passed / 21 SQLite-only
skips; PostgreSQL counterparts pass, including concurrent same/different request edits. Full frontend:
295 tests / 73 files. TypeScript, ESLint, OpenAPI, Ruff lint/format and mypy pass. Acceptance production
build and all 47 production browser scenarios pass; focused five-scenario regression passes too.
Final default-API production build and OpenAPI recheck pass. Synthetic projects were removed by test
cleanup; empty API list verified before stopping own acceptance servers via Ctrl-C. Ports 8010/3010
confirmed no longer listening. No manual recursive cleanup or changes to user data.
Coverage includes structural recognition after release restore, all four kinds, exact preview/apply,
upstream/filter/identity/appearance/layout preservation, explicit table rebinding and dangling-rule
rejection, shared widgets/outputs, unknown configs, stale state, transaction rollback, deleted receipts,
draft original-token recovery and pending replay while metadata is offline. Legacy distribution
receipts and aggregation editing remain compatible. Three new frontend cases and four real browser
editing flows added. Browser acceptance found a real sticky-table/menu stacking defect; isolated
table layers fix ordinary pointer access without force-click tests. Desktop/narrow screenshots inspected.
Initial test corrections: compare graph identities rather than array position, distinguish normalized
API rules from raw persisted rules, and use the existing asynchronous checks/report-jobs endpoint.
No new dependency/migration or known P0/P1 defect. No blocker. Full R0-R6/human acceptance remains open.
Existing dirty work and alabuga-sans.ttc preserved; no commit. Diff check passes; next-env.d.ts unchanged.

Previous analytical-authoring checks (ADR-147): 292 frontend tests / 73 files, TypeScript, ESLint,
generated OpenAPI, acceptance and final default-API production builds pass. Full backend
SQLite/PostgreSQL matrix: 1111 passed / 19 SQLite-only skips; PostgreSQL counterparts pass.
Focused analytical matrix: 26 passed. All 43 production browser scenarios pass (including the two
new imported heatmap/rollup creation flows); the focused five-scenario run also passes. Tests cover
explicit aggregation, exact observation-based totals, upstream filters, same-result pagination,
no-write preview, prepared-input CAS/shared branch preservation, idempotency, old distribution
receipt fingerprint compatibility, release/freeze/restore, draft reload and lost-response retry.
Narrow screenshots inspected; wide tables intentionally scroll horizontally. Ruff lint/format and
mypy pass. No new dependency/migration or known P0/P1 defect; no blocker. User acceptance, the full
R0-R6 roadmap and advanced calculation editing remain incomplete. Docs/contracts updated.
Existing dirty work and alabuga-sans.ttc preserved; no commit. Diff check passes; next-env.d.ts
unchanged. Synthetic API projects deleted by test cleanup, empty API list verified, own acceptance
servers 8010/3010 stopped via Ctrl-C; listeners confirmed absent. No manual recursive cleanup.

Previous statistical-authoring checks (ADR-146): 289 frontend tests / 73 files,
TypeScript, ESLint, generated OpenAPI and acceptance production build pass. Full backend
SQLite/PostgreSQL matrix: 1081 passed / 17 SQLite-only skips before the final offset guard/new
concurrency tests. Subsequent final statistical/box-plot/histogram matrix: 47 passed / 2 SQLite-only
concurrency skips; PostgreSQL counterparts pass. Shared dashboard/bound/draft matrix: 44 passed.
Ruff lint/format and mypy pass. An oversized offset reproduced a native Polars overflow; preview
and shared visualization request validation now rejects it. Exact large-decimal membership,
transaction rollback, stale-source guards, deleted receipts and shared-branch concurrency are covered.
Initial browser tests raced Next navigation: one reloaded before navigation completed, another
filled the previous report form. Trace confirmed the old /build URL during input. Explicit target
heading/URL/render waits fix the tests; no production semantics or assertions weakened. All three
new scenarios pass three consecutive runs (9 passes). Full 41-scenario rerun on restarted final
backend passes. Narrow/desktop screenshot inspection performed; final screenshots wait for Canvas
animation to settle. Full R0-R6/human acceptance remains incomplete; no blocker or known new P0/P1.
Diff checks pass; next-env.d.ts unchanged. API contracts/types/docs updated; no migration/dependency.
Existing dirty work and alabuga-sans.ttc preserved; no commit. Test cleanup removed synthetic projects;
empty API list verified before stopping own acceptance servers. No manual recursive cleanup.
Own acceptance servers 8010/3010 stopped via Ctrl-C (Windows exit 1). Final default-API production
build passes after shutdown. Calculation editing for saved statistical reports still uses the graph.

Previous named-measure checks (ADR-145): 284 frontend tests / 72 files; four added component cases
cover restored settings/original token, lost-response retry without metadata, catalog refresh errors,
and stored target validation. All 38 production-browser scenarios pass, including both named-measure
journeys with draft restoration, fresh-preview requirement and exact pending retry without duplicates.
The focused five-scenario browser rerun also passed. An initial test queried object counts before
async save completion; waiting for the success heading fixed this race without weakening assertions.
Backend unchanged; relevant measures/composition SQLite/PostgreSQL matrix: 57 passed, no skips.
TypeScript, ESLint, OpenAPI, acceptance and final default-API production builds pass. Diff check
passes; next-env.d.ts unchanged. No new migration/dependency/API or known P0/P1 issue. Synthetic
projects removed by test cleanup; empty project list verified before stopping own acceptance servers.
Existing dirty work and alabuga-sans.ttc preserved; no commit or manual recursive cleanup.
No blocker. Guided statistical authoring is not implemented yet; full R0-R6/human acceptance remains open.

Previous wizard-recovery checks: 280 frontend tests / 72 files; ten new cases cover three exact retry
modes, restored edit CAS, prepared-input token refresh/offline remounts, navigation, failed local
writes, uncertain abandonment, proxy failures and malformed scopes/state. Full 38-scenario production
browser regression passed. After final recovery-heading/name/spacing/focus polish, all four affected
browser scenarios passed again, including keyboard-only retry/success focus and a narrow viewport.
New browser checks persist ordinary drafts through history/reload, require fresh preview, commit an
apply then abort its response, block metadata GETs, restore/retry and verify identical requests,
unchanged graph/revision, object counts and local cleanup. Existing manual-step/conflict scenarios pass.
Backend unchanged; relevant SQLite/PostgreSQL report-builder/edit/alignment matrix rerun: 44 passed,
5 SQLite-only skips; PostgreSQL counterparts pass. Full 1057-pass matrix below is historical here.
Initial new browser tests used incorrect label selectors for two selects; actual combobox accessible
names fixed the test, without weakening assertions or changing product semantics. Existing component
tests now isolate session storage; the conflict mock distinguishes network loss from a real 409.
TypeScript, ESLint, OpenAPI, acceptance build and diff checks pass; next-env.d.ts unchanged.
Narrow recovery screenshot inspected. No dependency/migration/backend/API changes or new P0/P1 found.
No blocker; expanded product and human acceptance remain incomplete. Existing dirty work and
alabuga-sans.ttc preserved; no commit. All synthetic projects removed by test cleanup, empty API list
verified. Own acceptance servers 8010/3010 stopped via Ctrl-C (Windows exit 1); final default-API
production build passes. Temporary store: C:\Users\bb\AppData\Local\Temp\nodebi-evolution-den_hymc.
No manual recursive cleanup.

Previous save-recovery checks: full backend SQLite/PostgreSQL matrix 1057 passed / 17 SQLite-only skips;
all PostgreSQL counterparts passed, including the new concurrent retry case. After the final
populate-existing replay refinement and concurrency start barrier, affected matrix rerun: 13 passed /
1 SQLite-only skip. Ruff lint/format and mypy pass. Frontend 270 tests / 71 files, TypeScript,
ESLint and OpenAPI pass. All 35 production-browser scenarios pass on the final acceptance build.
New browser scenarios commit create/copy, abort the response, change workflow/source revisions,
reload, restore and retry the identical request: one object and no leftover local draft. API tests
cover changed payload/operation, later edits, deleted results, rollback and old clients; component
tests include retry without readable current metadata and definitive rejection correction.
No migration/dependency required. Full R0-R6/human acceptance remains open; no new P0/P1 or blocker.
Test cleanup removed all synthetic projects; the empty project list was verified. Own servers
8010/3010 stopped via Ctrl-C (Windows exit 1). Temporary acceptance store:
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-57zacjqq. No manual recursive cleanup.
Existing dirty work and alabuga-sans.ttc preserved; no commit. Diff checks pass; next-env.d.ts unchanged.
Final default-API production build also passes after acceptance-server shutdown.

Previous readability-session checks: frontend 265 tests / 71 files, including four new cases for
resize-only presentation patches, unchanged multi-series/exact strings, tiny nonzero values and
percentage ticks, tabular null/zero distinction, stable selection, 100-row paging/truncation and empty
states. TypeScript, ESLint, OpenAPI and acceptance build pass. Targeted production browser checks
passed (readability, workspace, first-time usability); all 33 production-browser scenarios passed
together. The readability scenario was then strengthened and passed again: same-theme/locale
700 -> 1600 -> 700 resizing increases/reduces drawn numeric labels without recreating the chart.
Readability test records actual Canvas text bounds across 700/1600px viewports and EN/RU/TT themes,
checks numeric-label separation, enters the exact table by keyboard and verifies unchanged graph.
Light/narrow and dark/wide screenshots inspected. Series data are not regenerated on resize; only
axis/grid presentation is patched. ECharts automatic nice bounds may change with suggested tick
density; typed statistical scale contracts are untouched. No dependency/migration/backend change.
Previous backend matrix (1044 pass/16 SQLite-only skips) is historical, not rerun here.
The P2 narrow legacy-axis overlap is addressed for this tested Cartesian path. This is not complete
WCAG/human usability acceptance or a blanket claim about all possible chart sizes and configurations.
Both acceptance and final default-API production builds pass; next-env.d.ts unchanged; diff checks
pass. All synthetic projects were removed through their test cleanup and the empty list verified.
Own acceptance servers 8010/3010 stopped via Ctrl-C (Windows exit 1). Temporary store:
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-ecvigmdo. No manual recursive cleanup.
Existing dirty work and alabuga-sans.ttc preserved; no commit. No new P0/P1 found and no blocker.
R1/R2/R3/R4/R5/R6 and human acceptance remain open; do not declare the expanded product complete.

Previous recovery-session checks: frontend 261 tests / 70 files (10 additional tests), without unhandled
errors. Coverage includes original CAS revision, new-draft resume, legacy failed-draft compatibility,
explicit recovery/discard, ownership/type/revision validation, scope isolation, external-link replay,
modifier/hash exclusions, failed writes/read fallback and reverting back to saved settings.
Full 32-scenario production-browser regression passed. A final cleanup-on-revert correction followed;
the complete component suite and all three affected browser scenarios passed afterward.
TypeScript, ESLint, OpenAPI and acceptance production build pass. The old independent-dialog test
mock returned only id/revision: replaced with a typed complete server response after an unhandled
render exception exposed it; no production fallback or meaningful assertion was weakened.
Backend matrix remains historical (1044 pass/16 SQLite-only skips); no backend code changed.
No dependency/migration/commit; existing work and alabuga-sans.ttc preserved. Full R0–R6 and human
acceptance remain incomplete. Local recovery is explicitly not server persistence or an all-form
navigation guarantee. No new P0/P1 found in this slice.
Recovery screenshot inspected: the explicit restore/discard choice is visible and preview explains
why restoration is required. Acceptance and final default-API production builds pass; next-env.d.ts
unchanged; diff checks pass. Synthetic projects were removed by test API cleanup; the empty project
list was verified. Servers 8010/3010 stopped via Ctrl-C (Windows exit 1). Temporary acceptance store:
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-u33lh2yq. No manual recursive cleanup.

Previous workbench-session checks: frontend 251 tests / 68 files; eight additional cases cover typed
field actions/search, bounded wide schemas, scalar/advanced roles, shared portal state, decimal scatter,
metadata refresh failure and unavailable-source preview states. TypeScript/production acceptance
build, ESLint and OpenAPI pass. All 31 production-browser scenarios passed together on the final
implementation. The first combined run exposed an analytical-table test capturing a grid animation's
viewport coordinate; it now checks the exact 160px pinned offset relative to its scrolling region
before/after scrolling, preserving pinning coverage. Final default-API build and diff checks pass;
next-env.d.ts unchanged. Acceptance servers 8010/3010 stopped via Ctrl-C (Windows exit 1).
Passing scenarios removed their synthetic projects through their existing API cleanup. One project
from the initially timed-out period test remains only in the isolated temporary acceptance store
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-hcyyax7e (id 4f72cc7e-9ac1-4b44-a1da-343e001aa480).
Manual cleanup command was denied by tool policy and not bypassed; no recursive cleanup attempted.
Initial targeted editor/usability scenarios passed. Legacy period scenario initially timed out
because Group By now has multiple versions: its legacy check explicitly selects v1 and then passed.
A duplicate translation key was caught by TypeScript and removed. Existing complex calculation
definitions remain untouched. Both theme and three-locale workbench screenshots inspected; narrow
layout uses anchor navigation without an overlay. Full WCAG and human acceptance remain open.
No backend changes/dependencies/migrations/commits. Backend 1044-pass matrix below is historical,
not rerun here. Existing dirty work and alabuga-sans.ttc preserved. No new P0/P1 found in this slice.
The cross-route draft-loss risk is recorded as remaining R1 work, not claimed fixed.
Visual follow-up: dense legacy numeric axis labels can overlap in half-width widgets on a narrow
screen (P2 readability); responsive chart label spacing remains part of the R1 accessibility polish.

Previous overview-session checks: frontend 243 tests / 67 files, including 12 new overview cases.
Coverage: empty versus loading/error state, search/six-card paging and immutable populated-first
sorting, view/edit URLs, all five check statuses, failed-refresh cached-success suppression/retry,
independent section availability, resumable imports, restored period/parameters, inline rename,
blank-input guard and keyboard focus return. TypeScript, ESLint, OpenAPI and diff checks pass.
Acceptance and final default-API production builds pass; next-env.d.ts is unchanged.
All 29 production-browser scenarios passed together: previous 25, new overview, legacy first-time
author journey and both data-update/release/restore scenarios. Overview covers real saved report
opening in view mode, prepared snapshot counts, drafts, pagination/search, rename, isolated HTTP 503
recovery, EN/RU/TT, desktop/mobile and both themes. Corrected screenshots inspected: the initial
mobile header squeezed the name beside the action; stacked small-screen layout fixes it. Browser
alert assertions are scoped to the section to exclude Next's separate route announcer. Legacy
usability navigation now targets the named Data navigation link, and its API URL is configurable.
No semantic checks were removed. This is not complete WCAG/five-economist acceptance.
Backend production code/contracts are unchanged in this slice; the previous full backend matrix
1044 passed / 16 SQLite-only skips remains historical and was not rerun. No new dependency,
migration or commit. Existing dirty work, user projects and alabuga-sans.ttc preserved. Synthetic
projects were deleted through the API and the empty list verified. Acceptance ports 8010/3010
stopped via Ctrl-C (normal Windows exit 1); temporary store
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-yn4uxp2g. No manual recursive cleanup.
No P0/P1 known in this slice and no blocker. Remaining R1/R2/R3/R4/R5/R6 work and human gate stay open.

Previous analytical-table checks: full backend matrix 1044 passed / 16 SQLite-only skips, with
corresponding PostgreSQL variants passing. 26 new cases cover exact comparisons under tiny Decimal
context, invalid rules/roles, first-match/null behavior, bounded preview/result pages, CAS/copy,
omitted-spec preservation, upstream filters, rejected post-preparation restrictions, 1103-row full
frozen pages and restored rule bindings. Frontend 231 tests / 66 files, including four new component
tests. TypeScript, lint, OpenAPI, Ruff/format/mypy (138 source files) and production build pass.
The dedicated production-browser scenario passed; light/dark screenshots inspected. It verifies
real horizontal scrolling/pinning, rule edits/reload, empty values and final totals on page two.
Full production-browser regression: all 25 scenarios passed together. This covers the previous 24
plus the analytical-table scenario. Both acceptance and final default-API production builds passed;
next-env.d.ts unchanged. Synthetic projects were deleted through the API, with an empty project list
verified afterward. Acceptance ports 8010/3010 stopped via Ctrl-C (normal Windows exit 1); temporary
store C:\Users\bb\AppData\Local\Temp\nodebi-evolution-g51trlca. No manual recursive cleanup.
User projects, prior dirty work and alabuga-sans.ttc preserved. No known P0/P1 in this delivered slice
or blocker. R0–R6, broader workspace redesign and human acceptance remain incomplete.
Initial checks found missing RU/TT field labels (fixed); copy-test setup used a stale revision
(corrected); browser exact-label selection prompted explicit aria-labels and separate rule-label
spans. No numerical behavior or meaningful test coverage was weakened. Sticky headers and stronger
total backgrounds were added after visual review. No dependency/migration/commit added.

Previous rollup-session checks: full backend matrix 1014 passed / 16 SQLite-only skips; corresponding
PostgreSQL variants passed, including migrations/concurrency. That run included the first 33 rollup
cases. Final review corrected ratio unit metadata (known quotient units, never invented units), added
date/boolean/large-integer grouping and extended the 1103-row frozen-table check. All final 37 rollup
cases (33 unit + 4 SQLite/PostgreSQL API) passed afterward; the whole matrix was not rerun after that
isolated metadata correction. Tests cover unweighted/weighted-group pitfalls, independent ratio
sums, null/zero denominators, all-null groups versus totals, configurable levels/parent links, empty/
dimensionless output, exact cancellation/ties/overflow/non-finite errors, 100001 source rows, capacity,
invalid settings/types/fields, stable measure/row identities, before-pagination complete totals,
full frozen data beyond 1000 rows, restoration and upstream contextual population changes.
Frontend: 227 tests / 65 files; two new tests cover explicit operations, schema-aware fields, stable
measure identity, keyboard ordering, unavailable bindings and total switches. TypeScript, ESLint,
OpenAPI, Ruff/format/mypy (137 source files; benchmark linted too) and diff checks pass. All 24
production browser scenarios passed together; the rollup scenario passed again after restarting the
isolated backend on the final metadata code. Its graph/preview screenshot was inspected: it is an
advanced preparation/audit view with technical IDs, not a claim of finished analytical-table UX.
The 100000-row / two-level / three-measure benchmark returned 111 output rows with verified exact
sum/average/ratio. Narrow (4 columns): first 1.135s, repeat 1.351s, Python traced peak 0.23 MiB;
wide (100 columns, four selected): 1.388s / 1.480s / 0.25 MiB. Output Polars size 0.015 MiB in both.
Source construction and native allocations are excluded; repeat is uncached, memory is a separate
traced run. These are local synthetic executor observations, not end-to-end/R6 performance acceptance.
The final normal production build restored the default API; next-env.d.ts unchanged. Synthetic
projects were removed via API and empty project lists verified before stopping servers. Temporary
stores: C:\Users\bb\AppData\Local\Temp\nodebi-evolution-dy6pywoz (initial),
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-as93pf5s (final). Ports 8010/3010 stopped via Ctrl-C
(normal Windows exit 1). No manual recursive cleanup, new dependency, migration or commit. Existing
dirty work, user projects and alabuga-sans.ttc preserved. No P0/P1 known in this preparation slice;
no blocker. Dedicated analytical-table rendering, overall R0–R6 and human acceptance remain open.

Previous combo-session checks: full backend matrix 977 passed / 16 SQLite-only skips; corresponding
PostgreSQL variants passed, including clean migrations/concurrency. This run contained the first
31 combo cases. After extending dual-axis release/restore and context coverage, all 35 combo cases
passed separately (19 unit + 16 SQLite/PostgreSQL API); the extra four cases were not in the earlier
full run. No backend production code changed after that full run. Coverage includes exact decimal
under tiny context, Float64 extremes/non-finite values, null/zero/empty results, duplicate beyond
100000 rows, capacity, stable identities, unit equality/explicit second axis, invalid fields/specs,
failed-save non-mutation, preview/CAS/copy/omitted spec preservation, 1101-row full releases/restores
for both axis modes, and legitimate context-filter scale recalculation without identity changes.
Frontend: 225 tests / 64 files. Five combo tests protect renderer positions, explicit custom ticks,
null line gaps, exact tooltips/table, stable selection, 101-row paging, keyboard windows and authoring.
TypeScript, ESLint, OpenAPI, Ruff/format/mypy (136 source files) and diff checks pass. All 23 production
browser scenarios passed together: prior 21 plus combo single/dual axes and 45-category windows.
Four corrected light/dark screenshots were inspected; default-widget canvas containment is tested.
Visual review found missing interior labels on asymmetric cross-zero scales: ECharts automatic ticks
did not coincide with exact server ticks. Passing explicit axisLabel/axisTick customValues fixes it;
a regression test protects the contract. Slider details are hidden rather than showing internal IDs.
The final normal production build restored the default API; next-env.d.ts is unchanged. New test
fixtures initially lacked required output defaults and asserted a one-element array against two
rows; fixtures/assertions were corrected, no product behavior or meaningful coverage was weakened.
Synthetic acceptance projects were removed via API; the empty project list was verified. Temporary
ports 8010/3010 stopped (normal Windows Ctrl-C exit 1); no listeners remain. Temporary store:
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-h6xal246. No manual recursive cleanup, new dependency,
persistence migration or commit. Existing dirty work, user projects and alabuga-sans.ttc preserved.
No known P0/P1 defect in the delivered slice or blocker. R0–R6 and human acceptance remain incomplete.

Previous graphical-waterfall checks: full backend matrix 946 passed / 16 SQLite-only skips; corresponding
PostgreSQL variants pass, including clean migrations and concurrency. The adapter adds 5 unit and
6 SQLite/PostgreSQL API cases covering rational scale/ticks with tiny Decimal context, zero-inclusive
cross-zero ranges, empty/zero/sub-pixel/extreme values, non-finite errors, exact roles/versions/types,
navigation/additional-series rejection, preview/CAS/copy/appearance-only preservation, complete 1101-step
frozen data, restoration and upstream-only restrictions. Existing 36 waterfall-preparation cases stay
in the full matrix. Frontend: 220 tests / 63 files. Five new frontend tests cover rectangle geometry
in both orientations, exact tooltip/identity selection, zero versus sub-pixel markers, dense-label
behavior, keyboard viewport switching, 101-row exact-table paging/selection and empty state.
Ruff/format/mypy (135 source files), TypeScript, ESLint, OpenAPI and diff checks pass. The final normal
production build restores the default API; next-env.d.ts is unchanged. All 21 production browser
scenarios passed together (previous 19 plus waterfall cross-zero and keyboard-window cases).
Real canvases, settings/reload, orientation, exact table/final balances, 47-step viewports and both
themes were exercised; four screenshots were inspected after the visual fix. Initial opaque label
backgrounds covered small bars; text halos plus density-aware label omission corrected it without
removing steps. Slider inset was tightened; default-widget canvas containment is tested.
No known P0/P1 in the delivered slice and no blocker. R0–R6 and human acceptance remain incomplete.
Synthetic acceptance projects were deleted via API, its empty project list verified, and temporary
ports 8010/3010 stopped (Windows Ctrl-C exit 1). Store: C:\Users\bb\AppData\Local\Temp\nodebi-evolution-_ncdrz66;
no recursive cleanup. No user project, user-owned alabuga-sans.ttc or unrelated dirty work was changed.
No dependency, persistence migration or commit added. ADR-135 records the presentation contract.

Previous waterfall-preparation checks: full backend matrix 935 passed / 16 SQLite-only skips; corresponding
PostgreSQL variants pass, including clean migrations and concurrency. New coverage: 32 unit cases
and 4 SQLite/PostgreSQL API cases. Tests cover negative/cross-zero paths, explicit initial/subtotal/
final roles, no double-counting, exact large decimal cancellation under tiny Decimal context,
stable identities under reordering, typed labels, localized source markers, empty input, null
contributions, mismatched expected totals, invalid order/fields/configs, numeric/decimal overflow,
non-finite inputs, complete calculation beyond preview limits and explicit rejection of 100001 steps.
API checks verify node-attributed errors, input contexts recomputing balances, immutable releases,
restored field IDs and a 1101-step frozen table with its final total beyond the first 1000 rows.
Frontend: 215 tests / 62 files. Ruff/format/mypy (134 source files), TypeScript, ESLint, OpenAPI and
diff checks pass. Production browser regression: all 19 scenarios pass together (previous 18 plus
waterfall-steps.spec.ts). The new scenario starts unconfigured, maps source row-type text, appends
a named total, autosaves/reloads and verifies exact negative/subtotal/final values. Its screenshot
was inspected; it is a graph/table scenario, not a graphical waterfall claim. Both acceptance and
restored normal builds pass; next-env.d.ts remains unchanged. No P0/P1 defect known in this slice,
no blocker, and R0–R6/human acceptance still incomplete. Synthetic projects were deleted via API;
the empty project list was verified before stopping ports 8010/3010. Ctrl-C reports exit 1 on Windows.
Temporary acceptance store: C:\Users\bb\AppData\Local\Temp\nodebi-evolution-b42oqv_3; no recursive
cleanup was performed. No user projects or user-owned alabuga-sans.ttc were touched; prior dirty work
is preserved. No dependency/migration/commit was added. ADR-134 records full role/precision/order rules.

Previous radar-session checks: full backend matrix 899 passed / 16 SQLite-only skips; corresponding
PostgreSQL variants pass, including clean migrations and concurrency. Radar has 30 unit/API cases;
after adding negative large-decimal/tiny-context assertions to an existing test, all 30 passed again.
Coverage includes uniqueness beyond 100000 rows, missing/empty profiles, exact integer/decimal scale
differences, non-finite/outside values, mixed units, invalid axes/specs, preview/save/copy/CAS,
appearance-only spec preservation, unchanged documents on failed save, complete frozen data and
restoration/context filtering. The first restore assertion incorrectly expected imported logical
field IDs to change; it now checks stable source fields and new publication-based profile identities.
Affected box-plot/histogram/heatmap/radar API regression: 69 passed. Frontend: 213 tests / 61 files.
Ruff/format/mypy (133 source files), TypeScript, ESLint, OpenAPI and diff checks pass. Acceptance
production build passed all 18 browser scenarios together (the previous 17 plus radar.spec.ts).
Radar settings/reordering, real canvas, reload, incomplete profiles, exact table/scales and both
themes are covered; screenshots were inspected and canvas containment in the default widget verified.
The final normal production build restores the default API; next-env.d.ts remains unchanged.
No P0/P1 issue is known in the delivered slice; no blocker. Overall R0–R6 and human acceptance remain
incomplete. No new dependency/migration or user-project mutation. Synthetic acceptance projects were
deleted through the API and the empty project list verified; temporary servers were stopped. Windows
Ctrl-C reports exit 1 normally. Temporary store: C:\Users\bb\AppData\Local\Temp\nodebi-evolution-a3t9cf4k;
do not recursively delete it without resolving/validating its exact path. User-owned alabuga-sans.ttc
is untouched. Existing dirty/untracked feature work is preserved; no commit was created.

Previous heatmap-session full backend matrix: 867 passed / 16 SQLite-only skips; corresponding PostgreSQL variants
pass, including migrations and concurrency. After full-suite collection, one additional >1000-cell
release test was added for SQLite/PostgreSQL: the complete heatmap adapter module rerun has 20 passed.
Do not call the full run 869. Current frontend: 209 tests / 60 files; TypeScript, ESLint and OpenAPI
checks pass. Ruff/format/mypy (132 source files) and diff checks pass. Final normal production build
passes and restores the default API configuration; next-env.d.ts is unchanged. The acceptance build passed all 17 browser scenarios
together (the prior 15 plus heatmap-stats and heatmap-visualization). Heatmap settings, real canvases,
reload, exact table/missing states, explicit fixed-range counts and both themes are exercised.
Screenshots inspected after the final layout fix show all X/Y labels inside the default-size widget.
Canvas containment is now an explicit browser assertion. A first test assumed a single canvas,
whereas the three heatmap layers render three; its locator was corrected without dropping data checks.
Early visual review found clipping: compact toolbar/help, tighter grid margins and a lower heatmap-only
canvas minimum corrected it. Heatmap layers each have their own required ECharts visualMap.
Backend coverage checks exact decimal differences beyond JS safe integer range, tiny Decimal context,
constant/empty/missing-only populations, symmetric/fixed scales, float extremes, explicit clipping
counts, invalid specs/roles/ranges, CAS/copy/older-client preservation, upstream filters, rejected
post-aggregation restrictions, immutable frozen data, restoration and complete 1100-cell artifacts.

Previous histogram-session full matrix: 817 passed / 16 SQLite skips; corresponding PostgreSQL variants passed,
including clean migrations and concurrency. After the final backwards-compatible spec-union change
and added legacy-default/context coverage, affected API/contract rerun: 19 passed on SQLite/PostgreSQL.
The new standalone legacy-default test was added after full-suite collection; do not call that full
run 818. Histogram has 21 unit cases, including 100001 observations, exact large decimal and repeating
edges, float extremes, empty/constant/null populations, endpoint ownership and outside accounting.
API checks cover limits independent of statistics, invalid roles, appearance-only edits, stale CAS,
upstream filters affecting both datasets, rejected downstream restrictions and immutable frozen data.

Previous heatmap-preparation session checks: 231 backend tests passed / 1 SQLite
concurrency skip, including PostgreSQL counterparts, heatmap/histogram/box plot, graph validation,
typed execution, publications, workflow APIs and arithmetic/preparation nodes. Heatmap adds 29 unit
cases and 2 SQLite/PostgreSQL API cases. Coverage includes 100001 input rows, all five operations,
null/absent/zero cells, empty input, typed axes, exact cancellation/half-even averages, float extremes,
non-finite/overflow errors, identity under reordering, category/matrix bounds and node-attributed
missing-field errors. API coverage checks full aggregation despite pagination, upstream context,
frozen table immutability and remapped field IDs after release restoration. Import carries incidental
decimal-scale metadata on integer fields; a failed integration assertion exposed it, and integer
sum/min/max now explicitly use scale zero. A reserved context-role name in the test was corrected.
Frontend: 205 tests / 59 files pass. Ruff/format/mypy (131 source files), TypeScript, ESLint, OpenAPI
and diff checks pass. Acceptance and restored normal production builds pass; next-env.d.ts is unchanged.
Three production browser scenarios passed together: heatmap-stats, boxplot-stats and histogram.
New heatmap flow starts with no aggregation, selects X/Y/value/average/scale, autosaves/reloads and
checks exact preview plus absent/all-null states. No graphical heatmap acceptance is claimed yet.
The previous full matrix and fifteen-browser run below remain historical, not rerun in this session.
Box-plot API coverage includes one-execution instrumentation, 1100 outliers beyond preview/release
page limits, exact statistics, null/empty filtered groups, bad fields/spec versions/ports, forbidden
post-statistics contexts, copy/old-client omission, stale revisions, frozen data and restored IDs.
The earlier 16 statistical unit cases remain in the full suite.
Ruff/format/mypy (130 source files), OpenAPI and diff checks pass.
Frontend: 203 tests in 58 files pass; TypeScript/ESLint and production builds pass.
Fifteen browser scenarios passed together against an isolated acceptance production build:
evolution.spec.ts, report-editing.spec.ts, exact-formula.spec.ts, report-formulas.spec.ts,
report-inputs.spec.ts, measures.spec.ts (single and combined), report-comparison.spec.ts (three
presentations), align-measures.spec.ts (graph settings and wizard creation/reload), and
boxplot-stats.spec.ts (settings reload, named outputs, downstream field choices and filtered outliers),
box-plot-visualization.spec.ts (authoring, canvas, reload, orientation, exact summary and outlier paging),
and histogram.spec.ts (default/editable bins, range persistence, canvas, reload, exact table/accounting).
Histogram screenshot was inspected: contiguous bars and visible interval/count labels, no frontend
statistical transform. The initial full browser run exposed an alignment test navigation race: trace
showed its name fill hit the previous form before the URL transition. The test now waits for the
alignment heading; all existing result assertions remain and the full fifteen-case rerun passed.
The graphical case was rerun with a nonconstant 610-observation population and 110 outliers; Q1=153.25
and page sizes 100/10 are verified. Screenshot inspection identified an invisible same-color median;
translucent box fill now contrasts with the border/median. Browser schema-load race is fixed by
resolving suggested bindings when the publication schema arrives, without rewriting saved bindings.
An obsolete table field now produces INVALID_VISUALIZATION (422), not a generator RuntimeError/500.
The initial browser run found two controls named Outliers (table output and summary count). The count
is now labeled Outlier count; the individual scenario and full thirteen-scenario rerun passed.
The alignment wizard scenario selects two prepared results, chooses fields/keys, previews full counts,
saves a dashboard and reloads it; API inspection verifies the original nodes/edges are unchanged.
Combined reuse verifies both values after reload/catalog removal and unchanged calculation nodes/edges.
Each comparison
scenario groups raw dates into months, saves/reloads, reopens the wizard and switches to quarters,
then checks results and unchanged node/edge IDs after reload. Chart scenarios verify actual canvas
rendering and the selected baseline series. Missing March does not make April
compare with February. API regression covers transient previews, idempotent retry, stale tokens,
explicit remove/re-add, old-client omission and shared/manual/incompatible-chain protection.
API/unit regression covers ratio-of-totals comparison, raw-date filter scope, exact integers/decimal,
missing/null/zero/negative baselines, calendar year/quarter/leap boundaries, duplicate keys beyond
preview, non-finite/overflow rejection, atomic creation, idempotent retry and release ID restoration.
Previous exact/formula/editing regressions remain in the full matrix. Schema inspection uses the
common resolver (including its existing dynamic upstream resolution), not a second calculation engine.
Release restore remains covered through API, not a new full process-restart acceptance claim.

The existing PostgreSQL container was used only through isolated UUID test schemas; user projects
were not migrated or changed. Use 127.0.0.1 and connect_timeout=5 for local tests.
Acceptance servers on 8010/3010 were stopped; each synthetic project was deleted via API in test
cleanup. Final ordinary production build restored the default API configuration; next-env.d.ts has no diff.
No dev-only frontend instruction files were generated in this production-only browser session.
Previous isolated store C:\Users\bb\AppData\Local\Temp\nodebi-evolution-u3928kvu remains after
server interruption; all its synthetic projects were removed through the API (empty project list
verified before shutdown). Earlier nodebi-evolution-500s4e2d remains, also empty via API cleanup.
Previous store nodebi-evolution-3lynl09y remains. Earlier stores
nodebi-evolution-0ek4plja and nodebi-evolution-maaro__w remain with their synthetic projects API-deleted.
Previous isolated store C:\Users\bb\AppData\Local\Temp\nodebi-evolution-jonv13ew remains.
Previous interrupted store C:\Users\bb\AppData\Local\Temp\nodebi-evolution-5usrqrky remains;
its synthetic projects were API-deleted before restarting the acceptance backend for the label fix.
Previous stores C:\Users\bb\AppData\Local\Temp\nodebi-evolution-ynn85ul9,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-ksj3b7_9,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-hjnt9l0c,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-dgv8rl76,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-y3bodad9,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-evzoj5uq,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-r8xpes9w,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-jfegaj1o,
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-umdwfq3m and
C:\Users\bb\AppData\Local\Temp\nodebi-evolution-2du45i5k also remain.
No real project store was touched. Older temporary stores are listed below.
User-provided untracked alabuga-sans.ttc remains untouched.

Previous isolated acceptance store: C:\Users\bb\AppData\Local\Temp\nodebi-evolution-igenc9h1.
Synthetic projects were deleted through the API; empty project list verified before server shutdown.
Acceptance servers stopped; no listeners on 8010/3010 remain. No user projects were changed.
No new database migration or dependency was required.

Latest isolated store: C:\Users\bb\AppData\Local\Temp\nodebi-evolution-ykongtw8. Every synthetic
project was API-deleted (empty project list verified); servers stopped after final browser run.
No listeners remain on ports 8010/3010.
PostgreSQL tests used UUID-isolated test schemas only. User stores and alabuga-sans.ttc are untouched.

No known P0/P1 in the delivered flows. R1/R2/R3 and the entire extension remain IN PROGRESS.
Unfinished functionality is not accepted: guided derived composition/alignment editing, partitioned comparison charts,
remaining chart types, complete redesign/accessibility, broader exact operations and full R6 QA.
Human acceptance requires five economists and remains separate; it has not been performed.
No credentials or product decision blocks the next implementation step.

Important continuation context:

- HeatmapSpec@1/heatmap_chart joins the typed registry with cells roles and color_scale:
  extent/zero_centered/fixed, optional plain-decimal minimum/maximum only in fixed mode. The adapter
  validates heatmap_stats@1.dataset, exact bindings and upstream-only contexts, then reads all cells
  from one execution. HeatmapScaleResult has exact bound strings, positions keyed by stable cell IDs,
  and below/above counts. Normalize rational differences server-side before [0,1] float conversion.
  Constant extent -> 0.5; empty/missing-only automatic extent -> null bounds. Fixed bounds saturate,
  never drop rows. Stored result datasets.cells includes every <=10000 cell, also in frozen releases.
  ECharts renders numeric/absent/missing layers with independent visual maps; missing markers remain
  distinct from numeric zero. Exact table uses local pages of 100; click resolves cellIdentity,
  not dataIndex. Small canvases use min-h-24; other chart minimums unchanged. Graphical/scale settings
  have EN/RU/TT controls. Statistical creation remains graph-based, not yet part of the report wizard.

- heatmap_stats@1 is a preparation node, not a registered chart type. Required config: x_column_id,
  y_column_id, value_column_id and explicit aggregation (sum/average/min/max/count). average_scale
  defaults to 6, accepts 0–18. Fields must be separate. Axes: string/integer/boolean/date, nulls kept.
  Output dataset has cell_id/x_id/y_id/x/y/value/present/row_count/valid_count/missing_count; IDs use
  heat_{node.hex}_{role}. Cells contain the full sorted Cartesian product of observed categories,
  bounded at 200 per axis and 10000 cells. Absent value=null/present=false; observed all-null has
  present=true/value=null (count=0). Numeric zero is retained. Full-data counts precede pagination.
  Rational intermediates -> Decimal128 for integer/decimal, Float64 for approximate inputs. Count
  returns integer with no currency; exact averages round half-even once. Overflow fails explicitly.
  Frontend HeatmapConfiguration and RU/TT strings are integrated. ADR-132 adds the graphical
  renderer above without changing this preparation node or automatically migrating legacy charts.

- histogram@1 is a typed transformation (not the independent histogram_chart). Outputs: dataset
  intervals and summary accounting from one input. Defaults: 20 bins; 1–200 supported; optional
  paired plain-decimal range. Automatic constant input has one closed interval, empty automatic
  input no bins. Explicit empty ranges retain zero-count bins. Null/outside counts are explicit.
- Bin intervals are left-closed/right-open, final upper bound included. Integer/decimal membership
  uses Fraction without Float64; bounds serialize as exact decimal or numerator/denominator text.
  Float inputs use shortest round-trip decimal spellings and remain approximate. Boundary fields
  are deliberately STRING, count/index INTEGER. UUID5(node + boundaries/inclusion) preserves bin
  identity under row reorder. No arbitrary unequal-width edges, density or weights in this slice.
- HistogramSpec@1 has bins and summary roles. VisualizationSpec is a union of disjoint role models,
  preserving omitted BoxPlotSpec type/version defaults. The histogram adapter validates upstream
  filter ownership, renders all <=200 bins and summary, and freezes/restores both outputs.
  Frontend uses contiguous equal-width category bars with exact labels and a table, not approximate
  numeric boundary coordinates. It displays included/missing/below/above counts and empty states.

- box_plot is an independent visualization, not a legacy graph display node. BoxPlotSpec@1 has
  explicit summary/outlier field roles. Publication schema suggests bindings for boxplot_stats@1's
  dataset port; /visualization-types lists box_plot and histogram_chart. Do not claim all
  legacy types were migrated. Config/results omit absent specs/datasets to preserve old payloads.
- Save/preview/render validate graph/port/spec. Context filters must be upstream of statistics;
  both layers come from one WorkflowExecutionService result.outputs. Main rows mirror full summary.
  result.datasets.outliers is offset/limit paged. Internal full_data=True retains all outliers when
  creating releases; frozen routes page that archive. No separate statistical browser calculation.
- Box-plot UI offers chart/summary/outlier views. Exact strings remain in tables/tooltips; only
  canvas coordinates use Number. Clicks map groupIdentity, not dataIndex; table buttons offer the
  same navigation. Query placeholder data preserves the chosen table view while paging.
- Guided creation of statistical graph steps remains unfinished; users configure/publish statistics
  in the graph, then select Box plot in the independent visualization editor.

- boxplot_stats@1 is a typed node (workflow_format >=2) with dataset/outliers ports. Infer both schemas
  statically; compute both outputs from one input in execute_outputs. Statistical arithmetic stays
  on the backend. It is not a chart or a separate browser transformation.
- Linear quartile position=(n-1)*p, inclusive 1.5-IQR observation whiskers. Null observations are
  counted separately; null group keys are a group, not dropped. Ungrouped empty input yields one
  zero-count/null-stat row; grouped empty input has no groups. All-null existing groups remain visible.
- Rational intermediates preserve exact integer/decimal values and avoid Float64 fence overflow.
  Integer summary scale=2 regardless of irrelevant import metadata; decimal scale=input+2, input<=36.
  Reject Decimal128 overflow/inconsistent scale instead of rounding. Float input stays approximate.
  Original outlier dtype/metadata is retained. Summary count is labeled Outlier count, not Outliers.
- Group UUID5=node+typed key; point UUID5=node+group+exact numeric value+duplicate occurrence. These
  are stable multiset identities across row reorder, not business row IDs. Maximum 2000 groups,
  existing row/cell limits. Summary/outliers share group field IDs but distinct RowContexts.
- Fixed both editors' field selectors via outputColumns: named output ports are authoritative; no
  fallback to the first table when a named port disappears. Legacy schemas without outputs still work.
- Narrow 100k integer-observation smoke: 0.257 s cold / 0.265 s repeated, full count verified while
  other checks ran. Not import/browser/memory profiling or the R6 benchmark gate.

- The alignment builder is /build?alignment=1, linked from Create report and Reusable measures.
  Typed /alignment-reports/preview and /apply APIs append one align_measures node and two edges to
  one existing workflow. Both publications pass ReportInputService eligibility; parameter defaults
  apply, contexts are excluded. Preview persists nothing. Apply checks project token under lock;
  graph CAS/publication/guarded table/dashboard/widget/alignment_report_receipt commit together.
  Stable UUID5 identities derive from request_id with alignment-specific namespaces. Same-ID retries
  precede token checks; different payloads conflict. Graph input endpoints, not publication aliases,
  own dependencies after creation. Generic release remapping handles outputs/visual guards.
  Settings and explicit reload invalidate preview; mismatched input tokens block submission.
  Saved two-input reports remain graph-only for calculation edits; no silent one-input conversion.
- align_measures@1 supports two inputs in one workflow, 1–8 explicit key pairs and one numeric
  field per side. Full outer alignment preserves left order then right-only rows. No aggregation,
  implicit casts or cross-workflow references. Supported keys are identical
  string/integer/date/boolean logical AND physical types; datetime needs explicit upstream handling.
- null_keys defaults to reject; explicit match checks uniqueness including null tuples. Missing
  measures stay null. left_present/right_present distinguish absent rows from present empty values.
  Numeric dtypes/scale/currency remain unchanged; non-finite values fail. Output size is checked
  using key-only matching before materializing the value join. Full diagnostics belong only to
  the alignment node; downstream previews do not inherit potentially stale counts.
- Output IDs are align_<node hex>_key_<left field ID> and align_<node hex>_<side>_value/present.
  They survive key order/name edits and generic release remapping. No migration/dependency added.
- Narrow prepared-input smoke: two 100k integer-measure datasets, 50k matching keys, 150k output
  rows; 0.110 s first / 0.063 s repeated execution (other checks concurrent). This excludes import,
  browser/network and memory profiling; full R6 performance acceptance remains open.

- Comparisons compile row formulas -> filters -> calendar_period@1 -> group_by -> summary formulas
  -> period_comparison@1. Date is an explicit grouping dimension; other dimensions are partitions.
- Both nodes have graph configuration forms. ADR-124 enables Table/Bar/Line comparisons; chart
  bindings select the configured current value plus comparison_field_id(terminal, "previous").
  The comparison selector overrides a former primary output selection for charts. Only the date
  dimension is accepted; no percent/difference/availability/unrelated fields are auto-added as series.
  Empty additional-series names follow schema labels. Changing the compared measure requires rebind.
  Frontend preserves exact strings/nulls and explicitly disables connecting null points; ECharts
  pixel coordinates remain approximate. Prepared row ordering is unchanged. Decimal additional
  series are available in manual configuration as well (fixed missing selector option).
  ADR-123 recognizes matching calendar/comparison pairs around the aggregate/summary chain. Existing
  IDs/positions/UI and appearance survive editing; shared/manual/incompatible steps stay graph-only.
  Adding/removing comparison requires rebind_fields. Removal also removes calendar grouping.
  Existing comparison edits must explicitly provide comparison (null for intentional removal);
  legacy omission fails with 409. Historical receipt canonicalization is unchanged.
- Calendar periods require date (not datetime) and reject null dates. Month/quarter/year starts and
  unique full-data keys are required for lookup; previous means a precise calendar offset, not lag.
- Missing/null baselines remain null; baseline-exists distinguishes absent rows. Zero denominator
  leaves percentage null, retaining the difference. Percent = (current - previous) / previous * 100,
  not a fractional rate; do not apply another x100 when formatting. Negative denominator retains sign.
- Decimal differences preserve scale (metadata required); integer differences are exact Decimal128.
  Percentage uses explicit 0–18 places, half-even rounding; Float64 remains approximate. Overflow fails.
- The new comparison request default is omitted from historical receipt fingerprints. No migration
  or dependency added. Source refresh and release remapping use ordinary graph contracts.
- Narrow 100k prepared-row comparison smoke timing was 1.681 s cold / 2.000 s repeated (other checks
  concurrent). It excludes import/network/browser/memory and is not the full R6 performance gate.

- Named measures live in publication metadata (ADR-121), not copied formulas. Registration checks
  the entire prepared result. Reuse creates only presentation objects and a receipt; no new graph
  nodes/publications. ADR-125 adds up to seven additional_measure_ids from that publication and
  identical grain sets; preserve primary grain order and selection order. Different fields only.
  Multiple measures require Table; single-measure Bar/Line/KPI behavior is unchanged.
- measure_column_ids persists all selected field IDs for composed tables; absent means legacy.
  The executor validates every selected value before pagination. Structural appearance/copy guards
  preserve the list even for old clients and reject hiding a selected measure/unsupported chart type.
  Deleting a catalog definition does not remove the selection guard. Release remapping covers it.
  Empty additional_measure_ids is removed from receipt hashes for historical retry compatibility.
  The UI retains unavailable selections after catalog reload until explicit deselection.
- grain_column_ids=None is legacy, [] is a single total. Persist the guard through saves/copies and
  release restore. Tables include all grain fields; charts use one grain field; KPI has no grain.
  Never reaggregate prepared ratios/averages. Null keys count as equal for uniqueness.
- Definitions permit name/description changes, not field/grain rebinding. Catalog deletion preserves
  existing reports. Old graph clients omitting measures preserve them; revalidate IDs after merge.
- Directly reused reports stay graph-only in the calculation wizard, even without other consumers.
  Appearance editors cannot silently remove the grain guard or retarget the numeric field.

- Prepared inputs append an ordinary branch to the existing workflow (ADR-120). Keep workflow
  name, parameters, containers, publications and unrelated nodes/edges. No source/preparation copy.
- The selection resolves a publication to a concrete node/port. The saved graph edge is authoritative:
  retargeting a publication does not rewire the branch. This is not a cross-workflow dependency API.
- Use workflow parameter defaults. Context-filtered publications remain graph-only; scalar outputs
  aren't table inputs. Inside manual blocks, require an exposed full-table output port.
- Preview/apply validate the project token under project locking, then workflow CAS. Failed creation
  must roll back the shared graph and all new objects. Idempotent receipt lookup precedes stale checks.
- Input reload retains local measures, disables editing while pending and invalidates old previews.
  Source schema keys include workflow/publication identity as well as revision. Changing input clears
  input-specific settings. Empty published_input defaults are omitted from legacy receipt fingerprints.
- New wizard measures use stable UUID output identities (group_by@3); old graphs/API requests
  without IDs remain v2. Do not silently upgrade aggregation versions or rewrite positional IDs.
- Row formulas run before filters/aggregation; after-total formulas run afterward. Every exact
  node rounds its own output. Formula IDs and the UI scope marker identify ordinary graph nodes.
- Legacy v2 reports can add row formulas; after-total formulas require stable measures.
  Integer/Float64 sums and averages retain legacy Float64 semantics. Import monetary fields as
  decimal explicitly; exact expressions accept only decimal/integer/unknown-null fields.
- Recognized exclusive row/summary chains are editable; manual upstream steps remain unchanged.
  Summary formulas in manual containers and shared/contextual outputs remain graph-only.
  Display bindings are preserved unless explicitly rebound; multiple widgets require acknowledgement.
- Empty newly added request defaults are omitted from receipt hashes to preserve existing retries.
  Report-edit drafts remain in-memory; import/update drafts are persisted.
- After-total selectors list aggregate measures, not previous summary formulas. Limits are 16
  row formulas, 16 measures and 16 after-total formulas. Full preview executes all selected rows.
- Reserve artifact intents before project locking (separate-transaction FK); hold lock through
  write/adoption. Run file_cleanup only during startup, never alongside live writes.
- Replacement checks preserve types/precision; schema-changing import profile editing is separate.
- Exact engine-only 100k-row timings remain the ADR-118 baseline: narrow 1.247/1.213 s cold/repeat,
  wide 1.314/1.266 s; separate Python peaks 12.74/12.31 MiB, excluding native allocations.
  This turn did not rerun that benchmark or claim complete R6 performance acceptance.

The sections below record previous deliveries, not completion of this new extension.

Temporary acceptance artifacts remain at
`C:\Users\bb\AppData\Local\Temp\nodebi-evolution-ylq7kc_r`: only synthetic test data;
the environment rejected the cleanup command. Do not confuse this with the real project store.
Additional isolated-server stores remain at `C:\Users\bb\AppData\Local\Temp\nodebi-evolution-2x_500zb`
and `C:\Users\bb\AppData\Local\Temp\nodebi-evolution-ht137mdf`, plus this session's
`C:\Users\bb\AppData\Local\Temp\nodebi-evolution-36rnk655`; synthetic browser projects were
deleted through the application API and the temporary servers are stopped.
The earlier isolated store `C:\Users\bb\AppData\Local\Temp\nodebi-evolution-xajdzjpw`
also remains; its synthetic projects were deleted through the API in the previous session.
No user data or the untracked font was removed. Startup-generated frontend agent guide files
were removed from this change; next dev may regenerate them automatically.

Normalization-only measurements (2026-10-08, local machine): 100,000 x 3 decimal cells,
cold 1.061 s / repeat 1.021 s, separate Python allocation peak 13.55 MiB and Polars result 4.58 MiB;
1,000 x 100: 0.352 s / 0.344 s, 1.21 MiB Python peak and 1.53 MiB result. These exclude upload,
workbook parsing, storage, HTTP, browser and native peak allocations; repeat is not a cache hit.
Reproduce with `python -m scripts.benchmark_ingestion` from backend. This is not full R6 acceptance.

## Current milestone and last completed task

Current task completed: guide-first synthetic sales/gross-profit business example.
Guide: docs/BUSINESS_SALES_GUIDE.md; three public workbooks, generator and independent oracle
under fixtures. Authored through the UI: 14 calculation nodes, 3 publications, 6 visualizations
and a saved dashboard. Monthly/region/total values and reload verified by business-sales.spec.ts;
TypeScript, focused ESLint and generator Ruff/format checks pass. Application code, API and
database schema did not change; the full-suite results below belong to the preceding delivery.
No known defect in the example; two automation issues (canvas click timing and an already-matched
layout template) were corrected without changing application behavior. No human speed claim.
Local project: 11e9479a-d363-4f34-994a-3203ea4c9323.
Dashboard: /projects/11e9479a-d363-4f34-994a-3203ea4c9323/dashboard?dashboard=879cad4b-dbdb-4ed5-8466-2c4051d4c1f4&mode=view
Next: economist walkthrough using this guide, followed by the regular-report operator trial.
Real second-report data and participants remain unavailable acceptance inputs.

## Previous delivery: reliable report cycle

Current delivery: reliable report cycle implemented and technically verified (ADR-113).
Last completed: immutable source versions, mapped atomic updates, period collections/history,
full-data checks, provenance, frozen releases and restoration into independent editable projects.
Operator entry: project -> report cycle. Guide: docs/REPORT_CYCLE.md.

Checks: 419 backend tests passed with PostgreSQL; 7 SQLite variants intentionally skipped
because their migration/concurrency equivalents run on PostgreSQL. 149 frontend tests passed.
Ruff, formatting, mypy, ESLint, TypeScript, OpenAPI consistency and Docker production builds pass.
Six targeted browser scenarios passed across runs: report cycle, mapped two-book update,
dashboard workspace, both Join authoring journeys and synthetic four-book P&L.
Coverage includes three languages, both themes, keyboard controls and narrow viewport.

Fresh financial regression: 164 slices / 1551 widget pages match
(.backups/report-cycle-financial-parity.json). PostgreSQL/backend restart restored 12 existing
documents and 60 visualization results. Separate release restart verification restored all
1205 table rows, a pending draft, version history and editable project/view bookmarks.
Migration 0010 was tested on clean PostgreSQL and applied locally after database/file backups.
Existing user projects were not reset or automatically converted.

No known P0/P1 in the tested delivery. Deployment supports one backend worker; job cancellation
is cooperative between stages. Historical files are retained and require storage capacity planning.
Next task: five-economist operator trial and confirmation on real second-report workbooks.
Those acceptance items remain open: second-report evidence is synthetic only, no human timings
or productivity improvement percentage is claimed. Protocol: docs/UX_OPERATOR_PROTOCOL.md.

## Previous delivery: authoring usability

Current milestone: authoring usability follow-up (ADR-112).
Last completed: reproducible premature-preview fix, chart purpose/completeness guidance,
searchable ordered table columns including deleted-field repair, three-step project entry,
import-to-calculation link, accessible upload/delete, keyboard tabs and search empty states.
Review and limits: docs/USABILITY_REVIEW.md. Dashboard guide updated.

Current checks: 144 frontend tests pass; ESLint, TypeScript (production build), OpenAPI
consistency and Docker frontend production build pass. Four targeted browser scenarios passed:
workspace editing (three locales, both themes, conflicts/copy/reload/narrow screen), single-key
and composite-key two-book authoring, and the new guided keyboard/import/chart scenario.
After the final frontend deployment, workspace and guided authoring passed again.
Backend execution/API/storage did not change; the previous backend/PostgreSQL and 164-slice
regression results below are historical evidence, not newly rerun tests in this session.
No data reset, project conversion or migrations. No known P0/P1 introduced by this delivery.
Remaining: human usability measurements, large-graph novice tasks and full screen-reader audit.
Next task: operator comparison with real workbook/rule confirmation; no speed percentage claimed.

## Previous delivery: dashboard workspace

Current milestone: dashboard workspace UX completed (ADR-111).
Last completed: compact widget headers, right-side data/appearance/placement editor, contextual
in-place previews, shared-copy disclosure, conflict recovery, on-demand library, free-space
placement, keyboard positioning and undo/redo of local layout changes. Guide: docs/DASHBOARD_WORKSPACE.md.

Checks: 401 backend tests passed with PostgreSQL (7 SQLite-only skips), 141 frontend tests passed.
Ruff/format/mypy, ESLint, TypeScript, OpenAPI consistency and Docker production builds pass.
Seven targeted browser scenarios passed across final runs: workspace authoring/conflicts/copy,
publications, both table-authoring joins, four-book P&L, shared period and six financial screens.
Workspace checks include table selection/order, series, local currency preview without execution,
three locales, both themes, narrow viewport, keyboard controls and canvas/panel separation.

Fresh financial regression: 164 slices / 1551 widget pages match (.backups/dashboard-workspace-financial-parity.json).
After restarting PostgreSQL/backend and deploying the frontend, all 12 captured documents and
60 visualization results restored (.backups/dashboard-workspace-restart.json); workspace browser
acceptance passed again. Snapshots capture the current project revisions; older restart snapshots
can be stale and must not be used to revert live graphs. No user data was reset or converted.

No known P0/P1 in this delivery. Historical node-owned charts retain their compatibility dialog;
independent visualizations use the new panel. Layout and shared visualization saves remain separate.
Human economist timings are unmeasured. Next: operator trials and real-workbook mapping/rule confirmation.
Screenshots: .backups/dashboard-workspace-ru-light.png and dashboard-workspace-ru-dark.png.

Previous delivery evidence (simple dashboard constructor S1-S5, ADR-109/110):
Last completed: generic safe expressions, condition form, Window v2, Calendar, Excel row bounds,
Join diagnostic record pages, independent Bar/Line series and synthetic four-book P&L authoring.
The retained editable example has 28 nodes, 3 publications, 5 visualizations; six monthly rows
match the independent Decimal oracle (net profit total 693.76). See docs/ALMA_SIMPLE_DASHBOARD.md.

Checks: 399 backend tests passed with PostgreSQL enabled (seven SQLite-only skips), 135 frontend
passed; Ruff/format/mypy, TypeScript, ESLint, OpenAPI consistency and Docker production builds pass.
Fourteen targeted browser scenarios passed across the final relevant runs: four-book authoring,
retained P&L language/theme review, calendar/condition form, two Join authoring journeys, five
field-editor journeys, 168-node scale, independent publications, period and financial screens.
Fresh financial comparison: 164 slices / 1551 widget pages match (.backups/simple-dashboards-financial-parity.json).
After restarting PostgreSQL/backend/frontend, 12 persisted documents and 60 visualization results
match the pre-restart snapshot for the financial, multi-key and P&L projects. P&L browser review
was repeated after restart. No existing user data was reset.

Local retained demo: .backups/alma-demo.json. Fresh automated authoring took 79.85 seconds; this
is not a human productivity estimate. Graph contains 4 sources, 3 joins, 15 calculated fields,
3 grouped aggregates and 3 windows. Dashboard uses 2 tables, Bar (4 series), Line and KPI.
All books are public synthetic fixtures. Explicit tax base/rates and differences from AlMaBi
are documented; no financial-specific production executor or hidden reconciliation was added.

Resolved during acceptance: missing Join fields now give 422 diagnostics; compact-widget title
inputs retain usable width. Tests compare DAG node/edge sets rather than incidental SQL order.
Use documented PostgreSQL address 127.0.0.1: localhost added 5.14 seconds per connection and
caused two synchronization timeouts; unchanged concurrency assertions pass on 127.0.0.1.
No known P0/P1 in this delivery. Next: real workbook mapping/rule confirmation and human operator
protocol, including first-time preparation versus chart creation on an existing publication.
Human speed gains remain unmeasured. Batch source replacement/history and interactive drill-down
remain deferred by scope. Review guide gives an impartial complexity assessment, not percentages.

Previous completed milestone:

Current milestone: guided table authoring usability follow-up (ADR-108), implemented.
Simple calculated-column creation and editing share one form; complex expressions remain intact.
Next step offers Join, calculation, grouping and publication; the full catalog is expandable.
Bottom preview supports A/B and full-input Join matching/expansion diagnostics. Captions follow
configured names and dimensions. No data migration, financial conversion or calculation change.

Checks this session: 379 backend tests passed with PostgreSQL enabled (seven SQLite skips),
131 frontend tests passed; Ruff/format/mypy, ESLint, TypeScript, OpenAPI and production builds pass.
Browser checks passed for the expanded two-book authoring journey (including edit and grouping),
publications, period/navigation, format protection, all five field-editor scenarios and large
graphs. Scale sample: 168 nodes, 1024-column workbook, 335 handles, 4887 DOM elements, one schema
request and no eager previews; timing is environment-specific, not human productivity evidence.
Six financial screens passed browser checks in both themes and three languages. Full 164-slice
numeric parity remains the previous milestone's evidence and was not rerun this session.
Retained demo graph, result position, visualization results and dashboard match the saved baseline
after application rebuild/restart. PostgreSQL was not restarted again this session.

Resolved test issues: modal mock lacked native open state; source caption now uses sheet name;
old field-editor expectation still asserted v2 although the documented default is v3. Visual
review also removed a browser-generated Details heading from ordinary configuration forms.
No known P0/P1 in this delivery. Next task: human operator protocol in docs/TABLE_AUTHORING.md;
no speedup percentage is claimed. Join remains single-key inner/left; preview reports counts,
not a separate browsable list of unmatched records. Existing data was not reset.

Previous completed milestone:

Current milestone: table-driven node authoring and visible published results (ADR-107).
Implemented result cards, named Join creation and calculated-column creation from table outputs.
Each operation creates ordinary nodes/wires in one undo step. Calculated fields expose a pinned
field port and complete table; existing branches remain unchanged. Publication cards share the
existing catalog and visualization documents, and their wires never enter the execution DAG.
Positions save through existing JSON/CAS, survive older clients omitting the new field, and
remain visible outside collapsed blocks. Used publications show their consumers and cannot
be removed. Creating a visualization flushes pending graph changes and requires acknowledgement.

Checks: 371 backend tests passed with SQLite/PostgreSQL (seven PostgreSQL-only SQLite skips);
128 frontend tests passed. Ruff/format/mypy, TypeScript/ESLint/OpenAPI and production Docker
builds pass. Browser checks cover two books -> Join -> Quantity * Price -> published result ->
chart + table -> dashboard, undo/redo, card movement, used-publication protection and reload.
Existing publication/period tests, delayed responses, two tabs, format guard, six financial
screens in both themes/three languages and 168-node/1024-column scale checks pass.
Numeric parity: all 164 slices / 1551 widget pages match the financial oracle. A backend and
PostgreSQL restart restores the new demo graph, card position, visualization data and dashboard.

Initial failures were test expectations for the additive results=[] API field and a wrong
chart-field selector. Two simultaneous Playwright commands collided in the shared trace
directory; sequential reruns passed. Visual review found overlapping initial Join placement;
new Join nodes now start to the right of both inputs, with a regression assertion.

Guide: docs/TABLE_AUTHORING.md. Synthetic public fixtures: join-orders.xlsx and join-prices.xlsx.
Retained UI-built demo: project fea71ce7-ca29-41cb-b727-56794803fd77,
workflow 8138d4a7-8935-4b52-af56-ec03979324ef (four nodes, one publication, two visualizations).
Private evidence: .backups/table-authoring-demo.json, table-authoring-restart.json (verified),
table-authoring-financial-parity.json. The financial project was not edited or reset.
Next: human operator measurements. Other table-header operations remain deferred; Join retains
the existing single key-pair/inner/left scope. No known P0/P1; no human speed percentage claimed.

Previous completed milestone:

Current milestone: independent visualizations and simple interactive dashboards (ADR-106).
D1-D5 completed. Post-restart browser verification passed. Next: human operator measurements;
no further feature expansion is part of this completed plan.
New workflow format 3 is the default. Outputs are published without extra nodes; Visualization
owns configuration and an independent revision. Separate project Visualizations page supports
creation before any dashboard. Library placement, independent copy, shared-edit usage review,
period presets/coverage, named navigation suggestions and highlight-only are available.
Author-selected context boundaries compile into generic Polars steps; no financial executor.

The financial workflow b5daab58-f13b-4de1-bf90-980060fb919a in project
908f1522-f6cd-42e4-93e0-0a59ae0749e8 is now revision 19: 142 nodes / 187 edges,
28 publications / 53 independent visualizations / 55 widgets / six dashboards.
Removed 53 chart nodes and 30 single-value helpers. Equality parameter filters retain stable
Select Columns boundaries and apply selections through the context profile. Seven blocks and
the workbook presentation persist. Backup and dry-run rollback were verified before conversion.
All 164 slices / 1551 result pages match values, rows, series, formatting and highlighting.
Backend/PostgreSQL restart restores all documents and 55 exact widget samples.

Checks: 371 backend tests pass with PostgreSQL, seven PostgreSQL-only checks skip on SQLite;
124 frontend tests pass; Ruff/format/mypy, ESLint/TypeScript/OpenAPI consistency and Docker
production builds pass. Five distinct browser scenarios cover new authoring, period/navigation,
financial screens (both themes / three locales), 168-node/1024-column scaling and format guard.
The extended date scenario includes a UI-configured transition and delayed prior-period responses.
A test initially timed out because a PowerShell-generated selector corrupted the middle-dot;
correcting the test selector fixed it, with no application workaround.

Synthetic date demo retained for review: project fc0c9e02-99c7-4827-a852-a0d7d3dbfd07,
workflow 94cb32cb-532e-4e2e-aebc-debd935e792c. Three visualizations / two dashboards;
all-time total 210, January 30, February 70, selected service A in January 10.
Its saved URL/context and data are restored after restart. Financial data has no dates.

Private evidence (ignored): before-publications.dump, before-detach.dump,
published-financial-before/dryrun/after.json, published-financial-parity.json,
published-financial-restart.json (verified=true), published-date-demo.json and
published-date-restart.json (verified=true). Private workbooks/secrets are not staged.
Guide: docs/PUBLISHED_DASHBOARDS.md. Remaining usability validation: human operator measurements.
No known P0/P1; elapsed human time/percentage speedup remain unmeasured. Do not infer them from
83 fewer nodes / 134 fewer wires. Future UX work must retain the explicit data-context boundaries.

Previous slice (2026-09-22, ADR-105): new financial dashboard assembled with field nodes.
Owner priority is new constructor capability, not preserving the old dashboard implementation.
Project 908f1522-f6cd-42e4-93e0-0a59ae0749e8; workflow b5daab58-f13b-4de1-bf90-980060fb919a.
225 nodes / 321 wires, six dashboards / 55 widgets, seven composites and a workbook container.
All 27 calculated columns use field_formula + append_field; all 10 bars/30 KPI use v2 bindings.
Generic field_scalar requires exactly one row and preserves type/null; KPI optional context
table preserves navigation explicitly. No financial execution service or DB schema change.

Numerical checks: 164 slices / 1551 widget pages match the reference values, rows, series,
formats and highlighting. PostgreSQL/backend restart restores graph/boards and 55 exact sample
results. Full checks: 360 backend tests passed, six PostgreSQL-only SQLite skips; 121 frontend
tests passed; Ruff/format/mypy, TS/ESLint, OpenAPI consistency and Docker production builds pass.
Eight distinct browser scenarios pass: the real six-screen financial project, named typed
authoring/visualizations, workbook operations, composite editing, slow save and two tabs. Real
table/KPI transitions, both themes/three locales, formula edit/undo and full node/edge preservation
pass. Fixed a reproduced P2: block expansion reset the found-node zoom to the entire graph.
The regression now requires the found card to be visible and over 200 px wide. An initial test
assertion incorrectly relied on SQL node-list order; full records are now compared by ID.

Next: human operator measurements / one-action authoring UX (see the proposed review priorities).
No known P0/P1. P2 usability limitation: full graph fit makes labels too small, and the 80-node
preparation block still requires search/panning. Human speed is unmeasured; the new graph adds
34% nodes and 87% wires. See docs/FIELD_FINANCIAL_REVIEW.md for the candid assessment.
Private .backups/field-financial-project.json records API assembly/remappings; parity JSON records
all cases/comparisons; field-financial-restart.json verified=true records restoration evidence.
Private assembly/verification scripts, workbook, screenshots and DB dump remain ignored.

Previous completed slice:

Latest slice: F3 field-bound Bar Chart/scalar KPI and initial F4 acceptance (ADR-104, 2026-09-22).
bar_chart@2 uses explicit table/category/value wires; kpi@2 uses a scalar. Common typed execution
validates row context/types, preserves null/text/order/cardinality, rejects non-finite values and
oversized charts, and retains shared caching. Strict appearance config has no duplicate selectors.
UI supports named binding/drop-to-create, on-demand rendering and dashboard settings/copy/navigation.
Copies retain input bindings, export new composite boundaries and remap selected-widget role IDs.
Existing visualization v1 remains available. No migration or OpenAPI shape change was required.

Checks: 349 backend tests with SQLite/PostgreSQL pass (six PostgreSQL-only checks skipped on SQLite);
118 frontend tests, Ruff/format/mypy, TypeScript/ESLint, API generation consistency and production
Docker builds pass. Twelve distinct browser scenarios pass including UI-built Excel → arithmetic → append →
Filter → Group By → Bar Chart + Sum field → KPI → dashboard, settings/copy/reload, both themes and
three languages, navigation, calculation links, composite blocks, slow saves and two tabs. Fresh PostgreSQL migrations
run in isolated test schemas. Separate saved typed graph/block/dashboard/results match exactly
after PostgreSQL/backend restart. Six retained project snapshots are unchanged.

F3 is complete; F4 remains open for retained financial-copy 164-slice parity and operator evaluation.
No known P0/P1 or blocker in this slice. Next: retained-copy compatibility acceptance.
Original financial project was not converted; private data remain ignored. The disposable restart
fixture was removed after verification. Local ignored .backups files retain comparison evidence.

Previous version-aware catalog slice:

Latest slice: F3 version-aware editor catalog prerequisite (ADR-103, 2026-09-22).
Fixed type-only contract lookup in field wires, selected inspector and source labels. Creation
menus and classic next-step insertion retain version identity; duplicate types have version labels.
Regression confirms catalog order cannot substitute ports, and unavailable versions do not fall back.
Checks: 116 frontend tests, TypeScript/ESLint and frontend production Docker build pass; deployed
frontend is healthy. Ten browser scenarios pass, including injected incompatible catalog versions,
typed authoring, workbook connections, slow saves/two tabs, classic authoring and undo/redo.
Six retained project snapshots unchanged. Backend/API/DB unchanged; backend/164-slice parity not
rerun. No known P0/P1 in this change. Next: implement Bar Chart field and KPI scalar executors,
rendering and UI bindings. This prerequisite does not complete that feature or F3/F4.

Previous block-settings slice:

Latest slice: F3 block membership and public-port settings (ADR-102, 2026-09-22).
Edit block stages membership, names and public inputs/outputs/fields; Apply is one history/CAS
operation. Cancel/Escape do not save. Removed members remain in the graph with all wires.
Required boundary ports cannot be hidden; surviving endpoint IDs are retained. Public aliases
appear on the card, with named endpoints in tooltips. No backend/API/DB changes.
Checks: 112 frontend tests, TypeScript/ESLint and production Docker build pass. Six existing
field-editor/scale browser scenarios pass; expanded composite acceptance passes after correcting
an exact-text selector to include the output arrow. It verifies cancellation, one-revision Apply,
unchanged nodes/edges/result, mandatory-port protection, optional hide, input/output exposure,
rename, membership change, undo/redo and reload. Six retained snapshots unchanged.
Next: direct field Bar Chart and scalar KPI bindings. F3/F4 and F2 operator acceptance remain
open. No known P0/P1 or blocker in this slice. Full backend/private 164-slice parity not rerun.

Previous initial composite slice:

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
