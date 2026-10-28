# TASKS.md

## Persistent spreadsheet formatting · ADR-219

* [x] Editable XLSX font/fill/alignment/wrap with source persistence.
  * [x] Typed style operations, row identity/protection, surgical OOXML style writing.
  * [x] Range toolbar, unified undo/redo, paged draft restoration and save/reopen.
  * [x] Exact numeric source preservation, browser acceptance, checks/build/deployment and live QA.

## Editable showcase and editor usability · ADR-218

* [x] Repair the source picker and verify editing across all three business demos.
  * [x] Reproduce blocked mouse input; verify all seven existing source files are readable.
  * [x] Interactive picker, file switch, narrow layout, active-input toolbar and search feedback.
  * [x] Restore deleted rows before preparation, append/edit/save/reopen and exact data recovery.
  * [x] New sales demos derive Pareto from the same prepared sales data; regression covers updates.
  * [x] Repair the existing sales Pareto binding, finish browser/regression checks and deploy.

## Highest priority · Excel-like browser workspace · ADR-217

* [x] Native formula interaction, synchronized selection and faithful data display.
  * [x] Replace duplicate formula input with native formula bar/inline editor and reference UI.
  * [x] Correct text/empty cell types, typed number display, raw editing, source formats/colours/borders.
  * [x] Selection operation bridge, qualified addresses, readiness and cached row painting.
  * [x] Native formula clipboard with relative references and literal values-only alternative.
  * [x] Mouse/reference/render regressions, compatibility, production build/deploy and real-book QA.
* [ ] Subsequent editor parity: persisted physical worksheet structural commands, advanced
  spreadsheet capabilities and independent business-user acceptance; keep ahead of new BI features.

## Editable workbook calculations · owner request 2026-10-26 · ADR-216

* [x] Replace blanket formula/merged/protected rejection with explicit calculation editing.
  * [x] Typed formula/value/override operations; sparse draft/history compatibility.
  * [x] Formula bar/native entry, merged anchors, Russian formula normalization and safe server checks.
  * [x] Surgical formula replacement, chain invalidation and existing atomic recalculate/check/apply.
  * [x] Resolve and edit shared formula masters/followers without changing neighbouring references.
  * [x] Finish regressions, isolated browser acceptance, production build/deployment and live opening.

## Spreadsheet window · owner correction 2026-10-26 · ADR-215

* [x] Replace modal editor with a standalone familiar spreadsheet interface.
  * [x] Evaluate compatible libraries; integrate pinned Univer OSS without Pro/cloud/file conversion.
  * [x] Native grid/tabs/ranges/editing; corporate ribbon, formula/address bar, shortcuts and view tools.
  * [x] On-demand typed blocks/appearance, literal search, exact values/protection and atomic paste.
  * [x] Guarded chunked save/check/apply, warnings, continued editing and parent-tab refresh.
  * [x] CSV header/row operations, undo/redo and cancel-all; SDK lifecycle isolation and view restore.
  * [x] Isolated native F2/clipboard/long-ID/literal-formula/Ctrl+S/save and popup/CSV acceptance.
  * [x] Native hidden-editor clipboard routing; await active-cell commit for Ctrl+S/button save.
  * [x] Two reproducible browser regressions: exact clipboard, active-cell save and reload.
  * [x] Final regression/build/deployment and read-only live verification.

## Direct workbook editing · owner correction 2026-10-26 · ADR-214

* [x] Replace data_example download fallback with actual browser worksheets.
  * [x] Bounded cell access, preserved original parts, formula/protection/merge guards.
  * [x] Server recalculation, original precision, explicit saved external-cache handling.
  * [x] Worksheet selection, formula/value bar, paste/undo, paging/row jump and one-action save.
  * [x] Regression and real25-sheet isolated edit/check/apply; original cache comparison13219/13219.
  * [x] Final Linux/runtime deployment, real live25-sheet opening, sticky save actions and390px acceptance.

## Reliability, UX and maintainability audit · owner request 2026-10-26

* [x] ADR-213 technical audit fixes, deployment and verification delivered.
  * [x] Restore frontend regression after corporate UI changes; fix real contrast/localization issues.
  * [x] Exact check-job/revision guard, lost-response reconciliation and unmount cancellation.
  * [x] Visible project deletion failures, retry/dismiss actions and consistent project terminology.
  * [x] Upgrade vulnerable runtime/dev dependencies; verify npm/OSV results without claiming a pentest.
  * [x] Native editor and clipboard regressions; full backend/frontend runs and targeted PostgreSQL.
  * [x] Safe update command, volume/database preflight, build-before-stop, consistent backups,
    checksum manifest and readiness; restore copied data in a disposable PostgreSQL database.
  * [x] Pin Node/Python base digests; prepare CI quality gates and updater failure-path checks.
  * [x] Finish final read-only browser/health/inventory and audit handoff.
  * [ ] Remaining independent human/accessibility/load and complete PostgreSQL/E2E matrix in R6;
    full formula-workbook editing and remote hosting require separate scoped work.

## Fast, actionable data correction · owner feedback 2026-10-21

* [x] ADR-212 implementation/manual acceptance delivered; automated regression resumed in ADR-213.
  * [x] Independent editor/template gates and safe plain legacy Excel input editing/native types.
  * [x] Direct editor opening, source cards and same-base draft reuse; collapse history/advanced UI.
  * [x] Save changes orchestrates staged file/check/apply; errors and warning confirmation inline.
  * [x] Complex-workbook download/replacement form uses the same one-action save flow.
  * [x] Manual legacy opening without template, draft reuse, native integer/float/text preservation,
    browser direct open/single-save apply and empty-data warning confirmation without JS errors.
  * [x] Corrected-file upload/check/apply within fallback dialog; warning acknowledgement and
    390px layout checked. Types/lint/generated API/production build pass; no automatic suites run.
  * [x] Automated lifecycle/conflict/retry/native-type regression resumed and passed in ADR-213.
  * [ ] Separately scope full formula-workbook editing/recalculation; not silently supported here.

## Browser source-table editor · owner request 2026-10-21

* [~] ADR-211 implementation and manual verification; automated regression remains deferred.
  * [x] Typed paged read/save/prepare/discard contracts; sparse persisted revisioned drafts.
  * [x] Cell edits, Excel TSV paste, row add/delete/restore, local undo and reload/resume controls.
  * [x] Protected headers, literal strings/IDs/decimal values, safe plain-XLSX boundary and CSV
    encoding/control validation; original-file fallback and bounded processing.
  * [x] Integrate staged version generation with existing checks/apply, preserving mappings,
    source-base/CAS/replay guards and preventing mixed pending editor/upload operations.
  * [x] Manual CSV and XLSX prepare/check/apply; browser save/reload/add/delete/restore/undo/paste,
    full apply and 390px containment without JS errors. Demo content unchanged.
  * [x] Disposable PostgreSQL prepare/check/apply, field binding preservation/replay/discard/stale
    guard, cross-sheet formula fallback and untouched-sheet integrity. 100k-row CSV paged read.
  * [x] Backend lint/format/mypy, frontend generated API/types/lint and production builds/deployment.
  * [ ] Targeted automated draft/conflict/retry/pagination/serialization regression when suites
    resume; broader accessibility/localization/load and economist acceptance remain open.

## Download/edit/upload file updates · owner approval 2026-10-21

* [~] ADR-210 implementation/manual verification delivered; automated regression remains deferred.
  * [x] Dashboard/Data/history entry and source selection, idempotent saved source-bound draft.
  * [x] Byte-exact current input downloads and compatible CSV/simple XLSX blank templates;
    safe headers, retained input names/options and legacy/complex/XLSM original-file fallback.
  * [x] Reuse upload/mapping/check/apply; preserve source/field identities and base-version guards;
    single-source whole replacement, empty-replacement warning and explicit acknowledgement.
  * [x] Manual CSV original/template/replacement/stale checks and legacy byte-exact fallback;
    browser XLSX download/fill/upload/check/apply, KPI 0.30→0.40 without JavaScript errors.
  * [x] Backend lint/format/mypy, generated API consistency, frontend types/lint and production build.
  * [ ] Targeted automated regression, broader accessibility/locale/load acceptance when suites resume.

## Stable dashboard editing and protected layouts · owner request 2026-10-21

* [~] ADR-209 implementation delivered with manual checks; automated regression remains deferred.
  * [x] Disable drag/resize neighbour pushing, retain explicit undo/redo and existing layouts.
  * [x] Add collapse-gaps and type-based auto-size/arrange operations; direct numeric placement,
    single-widget sizing and explicit insertion at beginning through widget-menu dialog.
  * [x] Add immutable default/named layout persistence, additive API, generated types and migration.
    Normal saves preserve default; named capture is atomic, revision-checked and replay-safe.
  * [x] Include layouts in release snapshot/remapping; verify one restored default after saving.
  * [x] Check API save/replay/conflict/restore, browser drag/resize/undo/variant/reload/default restore,
    390px dialog containment, PostgreSQL clean upgrade/down/up and SQLite new-migration reversal.
  * [x] Backend lint/format/type checks, frontend API/types/lint/production build; deploy demo after
    local database backup without rewriting existing dashboard layouts.
  * [ ] Automated regression for collision behaviour and layout lifecycle when suites resume;
    broader accessibility/human acceptance and full release-creation regression remain R6 gates.

## Functional and guided-use-case review · owner request 2026-10-21

* [~] Functional/UX audit increment (ADR-208): implementation and manual verification delivered;
  automated regression acceptance remains deferred, not satisfied.
  * [x] Connect overview/import/report/update journey; select the current imported dataset;
    explain totals, distributions and dataset comparison entry points in RU/EN/TT.
  * [x] Guard missing measures and incompatible KPI/Bar/Line grouping before preview, with
    explicit recovery; show recovery for empty/unavailable datasets.
  * [x] Put wizard settings/step navigation before preview on narrow screens while preserving
    the wide three-panel composition and the same form/draft instances.
  * [x] Open reports in view mode; prefer a populated summary over required-selection detail;
    keep explicit edit and direct report URLs compatible.
  * [x] Distinguish missing required filters, invalid selections, loading, read failures and
    confirmed empty reports. Preserve selection controls and expose read retry.
  * [x] Manually verify exact decimals, ratio of totals, idempotent apply, stale-edit rejection,
    column-reorder replacement and dependent recalculation on an isolated temporary API.
  * [x] Browser walkthrough of save/reload, OPIOP summary/detail, unavailable source and
    empty project; frontend types/lint and production build/deployment.
  * [ ] Add/run targeted regression suites when owner resumes automated testing; continue R6
    accessibility, broader edge cases/load and economist acceptance. This is not full R6 completion.

## Corporate frontend · owner request 2026-10-21

* [x] Inspect and pin the Alabuga Framework package, tokens, fonts and brand assets.
* [x] Integrate shared corporate shell, project navigation/catalog, controls, tables,
  dashboard widget styling and chart typography; retain both themes and RU/EN/TT.
* [x] Production build, browser presentation review and update of the running demo frontend.
* [x] Correct report-builder hydration divergence found during review; browser reload/restore
  preserves a changed report name without creating a saved report or raising React #418.
* [ ] Resume R6 contrast/accessibility and regression gates when automated testing resumes.

## Current owner priority · business demonstration

* [x] Add existing OPIOP to the showcase as a separate preserved copy: six screens,
  original Excel/graph, 53 visualizations and 55 widgets, internal drill-through links.
  Browser summary → class/service walkthrough completed; no automated suite run.
* [x] Prepare three persistent demo projects: executive finance, commercial portfolio/funnel,
  and delivery quality/SLA; 22 widgets across 17 presentation types, Excel and CSV sources.
* [x] Start isolated PostgreSQL-backed demo on localhost:3030 with persistent storage;
  provide direct links and a business-oriented walkthrough in README.
* [ ] Resume remaining R6 acceptance gates after demonstration priority; automated tests
  explicitly deferred by owner for this delivery, not waived or counted as passing.

## Product evolution R0–R6 (approved 2026-10-08)

Implementation contract: docs/PRODUCT_EVOLUTION.md. Existing MVP acceptance stays historical.

Current finite residuals are reconciled in docs/PRODUCT_EVOLUTION.md (2026-10-13):
* [x] A5 chart-render recovery: reproduced sticky error after changed result and absent retry;
  result-scoped failure, local retry, failed-resource disposal and one-shot keyboard focus.
  Two unit regressions and both-theme real canvas-failure injection/keyboard retry pass;
  exact table and graph retained. Full 643 frontend tests; 3 browser cases (10.4s).
* [x] A4-L1: Shared keyboard visibility controls mirror interactive canvas legends using public
  renderer actions/events. Native buttons, pressed states, Escape focus return and EN/RU/TT.
  Full frontend 647 tests pass; 20 scoped browser cases pass. Actual Tab/Space bar/line and
  pie/donut hide/restore preserve exact tables and saved graphs. Human screen-reader trial
  remains H2, not certified by these automated checks.
* [ ] A4-M1: Representative mark/boundary contrast, separate from completed text/base-fill checks.
  * [x] Waterfall/combo/Pareto normal mark paint: both-theme real SVG covers waterfall
    solid/outlined/zero/tiny marks in both orientations, all eight combo colours, Pareto
    contribution/share/reference and absence of drawable share/reference at zero total.
    No runtime edit; arbitrary antialiasing/overpainting remains outside this measurement.
  * [x] Basic bar/line/area/scatter and radar paint: real SVG verifies normal fills/strokes
    after alpha composition, area contour against its translucent interior, eight radar
    profile colours and 24 markers in both themes. Radar selected/muted contour opacity is
    explicitly checked. No runtime edits; arbitrary profile overlap is not certified.
  * [x] Box-plot/histogram contours: real SVG checks both orientations/themes, normal and
    context-highlighted states. Normal outlines pass >=3:1 against CSS surfaces and composited
    translucent interiors; muted stroke alpha is checked separately. No runtime change needed.
  * [x] Bubble normal-alpha composition: both-theme real SVG samples all eight group colours
    and verifies fill opacity 0.75 against CSS panel/surface backgrounds at >=3:1. Highlight
    metadata preserves selected normal opacity and explicit muted 0.2. No palette/radius/
    coordinate change was necessary. Arbitrary overlapping or antialiased pixels not certified.
  * [x] Pie/donut normal fills and separators: SVG reproduced default colours below 3:1
    (light lime 1.659:1). Shared thematic palette, stable category colours and 2px boundaries
    now pass four real SVG cases in both themes; full frontend 651 tests pass.
    Pattern paint, antialiased edge pixels and intentionally dimmed states are not certified
    by this base-fill check. Remaining renderer inventory is in docs/PRODUCT_EVOLUTION.md.
* [x] A4-T1: Actual pointer hover contrast for line/area/scatter/pie/donut/Pareto passes in
  both themes. Seven browser cases pass (42.1s), including Pareto zero/populated regressions.
  Opaque popup backing and computed text contrast measured; existing graph remains unchanged.
* [x] P2 Pareto short-card axis crowding: real canvas geometry regression first failed;
  native axis-label collision handling preserves endpoints/server scales and restores labels
  on height increase. Full 647 frontend tests pass; 3 browser cases (30.0s) verify populated/
  zero Pareto, real container resize and executive demo. Zero scale explicitly retains one
  exact zero tick. Light/narrow-dark screenshots inspected; saved widget sizes unchanged.
* [ ] A1/A3-R: Named release date/checkbox/focus-return and native-zoom residuals.
* [ ] A5-S1: Seven-screen-family EN/RU/TT state-to-evidence ledger; distinguish inapplicable states.
* [ ] A6 final candidate regression; H1/H2 observed human trials remain separate.

* [x] R6 scoped pie/donut category cues and scatter missing-coordinate verification:
  eight patterns stable under row reordering, repeated-label rows retained, native legend
  decals verified by real SVG in both themes; over-eight EN/RU/TT warning keeps all table rows.
  Scatter SVG verifies signed point and true origin remain, incomplete coordinate pairs do not
  turn into origin points. Full frontend 641/114 passes (41.78s); five browser cases pass
  (25.5s), .backups/r6-pie-category-cues-20261013. Light pie/dark donut screenshots inspected.
  Arbitrary dense charts/mark contrast and human perception remain outside these scoped checks.

* [x] R6 pie/donut zero-share correctness: real SVG tests reproduced two invented sectors
  after hiding the only positive category. Disable zero-sum/empty-circle synthesis and retain
  missing drawing values; add EN/RU/TT guidance. Both-theme browser pixel checks verify
  disappearance/restoration, zero-vs-null exact tables and unchanged graph after reload.
  Full 635 frontend tests, 3 browser cases (17.4s), 10 existing backend input checks pass.
  .backups/r6-pie-zero-shares-20261013. Remaining mark distinctions/A4/A5/H1/H2 stay separate.

* [x] R6 scoped rendered tooltip contrast: common settled-HTML assertion checks actual text
  and background colours, refuses translucent popup ancestry as insufficient evidence, and
  has positive/negative browser oracles. Both-theme checks now cover bar, box plot, heatmap,
  histogram, radar, waterfall, combo, bubble, bullet, funnel, treemap and sunburst.
  25-case browser batch passes (2.1m); separate box-plot/oracle/executive batch 3 passes (21.9s).
  Executive demo validates eight real widgets, exact KPI refresh and unchanged saved layout.
  Initial bar harness captured pre-resize width; live bounding-box polling fixed the harness.
  No application behavior changed; other chart/mark checks and human acceptance remain open.

* [x] R6 scoped basic multi-series cues: eight bar patterns/line markers, stable under field
  reordering, unique repeated-field series IDs. Regression tests reproduce one cue instead
  of eight before the fix; real SVG checks both-theme bar/legend patterns and hide/restore.
  Both-theme production-browser review completed for eight-series fixtures: settled screenshots,
  actual canvas label disappearance/return through legend toggles, exact table values and reload.
  Four browser regressions pass (33.3s), .backups/r6-basic-series-contrast-20261013.
  Light palette contrast regression first fails at 2.1423:1; darker hues now pass 3:1 against
  panel/surface backgrounds. Full 633 frontend tests pass; this does not close whole-chart accessibility.

* [x] R6 scoped statistical/hierarchy keyboard alternatives: box-plot summary/outlier pagination,
  radar profiles/scales/scroll-region entry, treemap/sunburst group exploration and return;
  4 production-browser cases passed (17.7s), .backups/r6-statistical-keyboard-20261012.
  Setup remains pointer/API driven; this does not close A4 canvas contrast or human acceptance.

2026-10-12 evidence reconciliation: R2–R5 functional deliverables below are complete;
R1 boundary/readability audits and the cross-cutting R6 accessibility/human acceptance
remain open. Feature delivery is not a claim of whole-product usability certification.

* [x] R0: Record approved scope, architectural boundaries and compatibility (ADR-114).
* [~] R1: Neutral light/dark design system, project workspace, accessible navigation and five journeys.
  * [x] Light-default neutral tokens, theme preservation, project navigation, distinct data states and density controls.
  * [~] Complete overview/report workspace redesign and all five journeys; accessibility audit.
    * [x] Task-oriented overview: saved reports, isolated check/data states, resumable imports, view/edit links and keyboard rename; localization/component/production-browser acceptance (ADR-139).
    * [~] Report editor: fields left, preview center, contextual settings right; preserve drafts and advanced calculations.
      * [x] Shared-draft three-region workbench, typed field buttons/search, central preview, responsive keyboard anchors and schema-failure states (ADR-140).
      * [x] Guard workspace links from the report editor and recover new/edited/copied visualization drafts across reload/history with original CAS revision (ADR-141).
      * [ ] Audit remaining authoring forms and unavailable-storage history navigation; tab-local recovery is not durable server storage.
        * [x] Release-form settings recovery (ADR-195): name/period label/comment/dashboard IDs/applied date period/parameters, explicit restore/discard, malformed/missing-reference guards, denied-storage fallback and departure protection; component and production freeze/restore/navigation regression.
        * [x] Review unapplied date-control scratch and recovery focus in release/dashboard forms. Keep background-job receipt/retry semantics distinct from form persistence.
          * [x] Release date scratch survives recovery independently from the applied period; pending dates block freezing until explicit Apply/All time, validation retains input, recovery/discard focuses name once (ADR-195 follow-up).
          * [x] Dashboard date scratch recovery/departure (ADR-196): isolated dashboards, explicit restoration, changed-URL warning, denied-storage fallback, native unload protection and stable Apply focus; no implicit filters or dashboard saves.
        * [x] Dashboard configuration recovery boundary (ADR-197): render-safe nested shapes, same-project identity, preserved original CAS, explicit retry/discard/saved-state choice and focused feedback. Component cases and production malformed-JSON/nested-shape/real-conflict regression pass; executive showcase unchanged.
        * [x] Reconcile the remaining R1 authoring/five-journey acceptance matrix: finite A1–A6 and H1–H2 packages in docs/PRODUCT_EVOLUTION.md; earlier missing PostgreSQL/restart/load evidence is historical, not a new implementation backlog.
        * [ ] A1: Sequential keyboard/focus audit across the named screen families; distinguish real Tab navigation from programmatic focus.
          * [x] Release primary actions/name/label/comment/selection/restore/freeze/open and storage-denied in-app recovery use real keyboard navigation; 5 cases passed (1.0m). Frozen five rows remain isolated from four working rows. Date entry, warning checkbox and some surrounding setup/restore still use harness/pointer actions; not whole-suite keyboard certification. Move next to A4 while keeping residual A1 exceptions explicit.
          * [x] Dashboard keyboard creation/table/save/view/reload/edit: 2 desktop/narrow scenarios pass (4.8s), five rows and source graph preserved. Six malformed/stale-draft cases use real keyboard actions (10.0s), including explicit discard/reload after 409 and name focus restoration. Native confirmation handling is a harness action; release history/focus-return reconciliation remains.
          * [x] Both graph editors: keyboard add/connect/preview/reconnect/reload plus node-local condition scratch/edit/discard across both formula versions, 6 cases passed (1.2m). Preparation type/missing/error-repair/undo/redo uses keyboard in 3 layouts (54.1s), exact large integer retained. Wizard regression 4 passed (50.7s). Dashboard/release and focus-return completion remain separate.
          * [x] Overview/import/repair/report-create/edit/source-update path uses real Tab/Shift+Tab, radio/select keys and typed input instead of focus/click/fill/selectOption shortcuts. Four layout/theme scenarios pass (50.4s), exact 0.30 -> 0.15 -> 0.35 retained. API project fixture and file payload injection remain explicit; both graph editors/preparation and other A1 paths still open.
        * [x] A2: Inventoried graph/dashboard drag actions have ordinary pointer/keyboard-capable controls; functional acceptance covers placement, panning, groups, connections, operation/sheet insertion, panel width and widget layout. Complete sequential traversal remains A1, not implied by this gate.
          * [x] Final non-drag authoring matrix: 10 production scenarios passed; selector-only 420px calculation equals independent 1121 fixture total, panel clicks/End do not save the graph, eight widget controls preserve data and bounds. Full frontend 563 passed; collision/minimum-size component regression added. docs/PRODUCT_EVOLUTION.md records evidence scope.
          * [x] ADR-200 classic grouping checkboxes: controlled selection, bounded search, explicit all-selection scope. 560 frontend tests, 12-case graph/reflow regression and final two-path grouping journey (checkboxes at 420px) passed; unchanged computation/edges, rename/undo/dissolve and selection-only no-save verified.
          * [x] ADR-201 readable repeated captions and viewport direction buttons: 562 frontend tests and final 14-case both-editor distant-node/pan/unchanged-graph/reflow matrix pass. Duplicate-caption/filter stability and exact saved-graph equality verified; no calculation changes.
          * [x] ADR-199 placement controls reuse ordinary graph history/save; production tests verify nodes plus field book/block/result positions and unchanged calculation results. Initial action inventory in docs/PRODUCT_EVOLUTION.md; group selection/canvas navigation remain separate. Full frontend 559 passed; separate 10-case reflow, 10-case container/history and final 2-case placement runs pass.
        * [ ] A3: Reproduce and fix graph-editor narrow-layout/reflow issues, then audit the remaining named screens and dialogs.
          * [x] Advanced dashboard parameter/navigation forms, shared legacy visualization consent/conflict dialog and modern publication navigation: five scoped scenarios pass across three runs (14.6s/17.0s/17.1s), preserving selected slices, revision protection, period, KPI 10.00 and graph identity. Primary named form geometry inventory covered; native zoom and broader accessibility are not certified. Next acceptance priority is A1 sequential journeys.
          * [x] ADR-204 dashboard workbench: stacked fields/settings/full-width preview at narrow/enlarged layout, retained desktop locale/theme geometry. Final 11 browser cases (36.2s) include malformed/stale draft and period recovery; 563 frontend tests passed. Root-font-before-resize simulation, not native browser zoom. Advanced/navigation dialogs and finite inventory reconciliation remain.
          * [x] Publication/group helpers and dashboard period controls: two full single/composite Join-to-dashboard journeys (52.1s), all dialog bounds and sequential publication Tab; four normal/enlarged/denied-storage period journeys (9.5s), explicit draft restore leaves URL filters/revisions unchanged. Other dashboard authoring/recovery states remain open.
          * [x] Overview and analytics/grouped-Unpivot helpers: 9 final browser journeys passed (1.7m) across desktop/narrow/doubled text; preserve share scope, stable ranks, repeated labels and reload. Fixed overview heading/pagination overflow at 390px/32px RU. Full frontend 563 passed. Dashboard states and remaining helpers still need reconciliation.
          * [x] ADR-203 preparation table: fixed 420px dialog overflow with one-tree stacked labeled cells; calculated-field dialog checked across three layouts. Final 8 preparation/calculation/single-and-composite-Join journeys passed (1.5m); exact large integers/undo/reload retained. Full frontend 563 passed; other helpers and overview/dashboard states remain to reconcile.
          * [x] Waterfall/analytical-template/Excel acquisition: 12 desktop/narrow/doubled-text journeys passed (1.4m), with exact balances, template mapping/retry, multi-header ranges, conflict retention and invalid-update protection. Preparation dialogs and remaining overview/dashboard state coverage still require reconciliation.
          * [x] Alignment + heatmap/analytical-table/Pareto/funnel/treemap/sunburst authoring: final 22 cases passed (1.4m), desktop/420px/doubled-root-text, retained viewport through retry/save/reload. Whole-input diagnostics, upstream preservation, exact totals and missing-cell semantics retained. Waterfall/analytical-template/Excel/preparation-dialog checks remain separate.
          * [x] Template catalog and combo/radar reuse: nine desktop/narrow/doubled-text scenarios pass (46.4s), including recovery, competing revisions, archive/restore and exact 6.00/10.00/0.6000 results on renamed fields. Fixed catalog pagination and global theme/language controls overflowing at 390px/32px root text in RU; geometry regression checks both left and right overflow. Full frontend 563 passed.
          * [x] Statistical histogram/box-plot forms: screenshot review found cramped enlarged-text preview despite passing control bounds. ADR-202 container follow-up fixes it; two pre-fix geometry failures, final 10 browser cases and 563 frontend tests pass. Includes range/outlier pagination, recovery and duplicate-safe retry. Remaining statistical types/template/alignment/Excel forms are not implied covered.
          * [x] Populated release form: desktop/420px/doubled-root-text update/check/recovery/period/freeze/restore journeys pass; five frozen rows remain unchanged after working graph drops to four, including reload and restored project. Final 4 cases passed (49.7s) with two-book mapping regression; All-time freeze, not filtered-release certification.
          * [x] CSV import/update/rollback reflow: three full journeys at desktop, 420px and 1280px with 32px root text pass (39.6s), including expanded field metadata, RUB currency/key draft restoration, remapped columns and exact 0.30 -> 0.70 -> 0.30 results. Release authoring, Excel-specific acquisition and other report/template forms remain separate.
          * [x] ADR-202 report wizard populated-form reflow: fixed doubled-text page overflow with a text-relative container query. Three creation/edit journeys pass at desktop, 420px and doubled text (36.5s); independent average-of-ratios 2.0000, ratio-of-totals 2.5000 and edited difference 6.0000 retained. Full frontend 563 passed. Import/history/template and other report families remain open.
          * [x] Populated classic filter/formula/grouping/decimal-parameter controls fit their panels at desktop, 420px and doubled root text. Three full calculation/reload journeys passed (43.3s), exact parameter persistence and preview-only no-save verified; independent total 500 retained. Report/import/history/template forms remain open.
          * [x] ADR-198 graph reflow: corrected page/panel overflow and enlarged-text canvas/preview overlap without remounting editors. Final 15 production scenarios pass, including 320/420/1280 doubled-text/1600 layouts, resize/save/reload, canvas containment and field wiring/pins/conflicts. Other populated configuration forms remain to audit.
        * [ ] A4: Rendered contrast, target size, focus and non-colour chart/table meaning in both themes.
          * [x] Basic-chart tooltips: long-name right clipping reproduced in a narrow horizontal bar widget. Shared bounded escaped HTML now reads original row/series values, retaining exact decimal, numeric X, dates and missing values. Eight new regressions cover six types/additional series/source coordinates. Full 627 frontend tests and two browser journeys pass (18.4s); both-theme 420px content/bounds and dark screenshot inspected. Browser long-hover case is bar-specific; other types retain unit/functional coverage.
          * [x] Six basic chart label families: actual SVG regressions reproduce alpha 0.35, then verify normal/muted themed opaque text in both themes and both bar orientations; marks retain original opacity. Full 619 frontend tests pass; two browser journeys pass (11.3s) with labels enabled, canvas 4.00 paint observed and settled light screenshot inspected. Browser muted-state coverage remains SVG-based, not six independent selection journeys.
          * [x] Analytical-table conditional-format contrast: four UI-authored persisted tones retain labels/symbols, computed composited text contrast >=4.5 in both themes, including grand-total badge/value. Exact 4410 totals, empty measures, pinning and paging retained. Eight analytical/shared-contrast browser cases pass (35.4s), ten focused unit tests pass. No runtime change needed; shared sampler extracted with independent colour/alpha oracles preserved. Highlight-background permutations remain separate.
          * [x] Histogram long-interval tooltip: 16-digit endpoints fit; 30-digit decimal endpoints reproduced right clipping. Shared bounded escaped HTML retains both exact endpoints, bracket and count at 420px in both themes. New real CSV decimal(38,2) journey preserves cent differences, counts [1,2,2,3] and missing/below/above accounting. Full 613 frontend tests and four histogram/hierarchy browser cases pass (30.7s).
          * [x] Histogram count-label opacity: real SVG regressions reproduce inherited alpha 0.3, then pass both themes/orientations with opaque text/backing and unchanged counts/bar opacity. Actual browser canvas confirms 2/3 labels under injected highlight metadata; dark narrow screenshot inspected. Full 612 frontend tests and three histogram/hierarchy browser cases pass (20.9s). Exact long-interval hover audit remains separate.
          * [x] P2 hierarchy label contrast: themed opaque text with a neutral text halo fixes white-on-pastel labels in both variants without covering tiles. SVG normal/emphasis tests and actual canvas A/B/C paint after hover pass in both themes; full 610 frontend tests and two browser journeys pass (14.0s). First background-based attempt hid treemap fills despite passing tests; screenshot review caught it and final halo screenshots preserve fills. Dense-label/mark-boundary audit remains separate.
          * [x] Hierarchy tooltip clipping: both treemap/sunburst 420px screenshots reproduce right-clipped long measure names. Shared bounded escaped HTML retains path/value/share and viewport bounds in both themes; two source-escaping/exact-decimal regressions and full 608 frontend tests pass. Two browser journeys pass (11.0s), including keyboard group navigation/reload/zero leaf.
          * [x] Bubble/bullet tooltips: 420px screenshots reproduce long bubble field-name right clipping and bullet band-text bottom clipping. Shared bounded escaped HTML fixes both-theme full content/bounds; exact values and source-text escaping protected by two new regressions. Full 606 frontend tests and six bubble/bullet/funnel browser cases pass (40.9s). Other tooltip permutations and the finite family audit remain open.
          * [x] Funnel tooltip clipping: narrow scrolled-stage screenshot reproduced hidden initial-retention/loss rows. Shared bounded escaped HTML fixes full content and viewport bounds in both themes at 420px. Unit regression protects exact large decimals and source-text escaping; full 604 frontend tests and four funnel/bullet browser cases pass (25.0s). Bubble/bullet tooltip audit remains separate.
          * [x] Bullet first-label clipping: real renderer reproduces y=8.48 text against y=15 clip, then passes six supported heights after including existing top padding when labels are enabled. Marks/scales unchanged. Full 603 frontend tests and four bullet/funnel browser scenarios pass (38.0s); narrow dark -50.00 screenshot inspected. Other label/tooltip states remain separate.
          * [x] Bubble label opacity: two real SVG regressions first fail at normal alpha 0.75, then pass normal/muted in both themes with opaque text/backing and unchanged radii/mark opacity. Actual browser canvas paint confirms A/B under injected highlight/legend metadata. Full 602 frontend tests and six bubble/bullet/funnel browser cases pass (49.8s). Bullet/funnel optional label geometry remains separate.
          * [x] Combo long-name tooltip clipping reproduced after waiting for canvas resize; shared bounded escaped HTML fixes both-theme 420px content/bounds. Five combo/Pareto browser cases pass (33.5s), full frontend rerun 600 passes. Initial unrelated catalog focus race corrected by awaiting the existing focus requirement. Pareto adapter reuse/functional regression is not a dedicated long-name hover test.
          * [x] Combo non-colour series cues: field-ID-stable line symbols/bar patterns with matching legend; two regressions first fail then pass for seven same-kind series. Full 599 frontend tests and five browser cases pass (38.2s), including eight-series authoring/reload. Four-bar/four-line screenshot inspected; full perceptual discrimination still needs human observation.
          * [x] Fix P2 dense numeric-label overlap: ECharts collision layout hides conflicting labels and restores them after resize. Real SVG regression first fails, then checks short/tall states and exact tooltip values. Full 600 frontend tests and five browser cases pass (34.9s); eight-series screenshot inspected and all first-row table values retained. Shared Pareto adapter follows the same layout.
          * [x] Waterfall long-name tooltip: wide normal hover fits, but 420px screenshot reproduced title/right and running-balance/bottom clipping. Shared radar bounded escaped-HTML renderer fixes it. Four browser scenarios pass (32.1s), including both-theme content/bounds and radar regression; full 597 frontend tests pass. Very short viewports/arbitrary text length remain separate.
          * [x] Combo/Pareto/waterfall muted-label readability: four regressions first fail at alpha 0.3, then pass; exact text now opaque while marks stay muted. Two Pareto adapter cases retain exact contribution/share values. Full 597 frontend tests and six browser scenarios pass (35.7s), including both-theme canvas paint observation for combo/waterfall under injected highlight metadata. Not selection-wiring or dense-label certification.
          * [x] Eight-axis radar tooltip: screenshot reproduced clipped last axis, then narrow HTML rerun reproduced x=-195 overflow. Escaped body-level text, chart-width wrapping and confinement pass content/bounds in both themes at 1600/420px. Four browser regressions pass (36.0s), full 591 frontend tests pass. Box-plot legend/median synchronization also verified with real SVG rendering. Not all tooltip/contrast states certified.
          * [x] Box-plot optional median labels: actual SVG renderer reproduced ignored native labels; silent scatter text layer fixes both orientations with exact opaque themed text and no null-to-zero conversion. Full 590 frontend tests pass; browser canvas paint in both themes and existing tables/reload/tooltip journey pass (7.4s). Muted-label evidence is SVG-based; wider A4 remains open.
          * [x] New wizard-created radar widgets use 12 grid rows instead of 8, without resizing saved layouts. Failing-then-passing backend regression preserves manually changed size during calculation editing. Full backend 1542 passed/32 separately gated skipped (149.90s); browser creation/edit/reload and canvas height >=300px pass (5.5s). Other chart creation paths unchanged.
          * [x] Radar optional numeric labels keep opaque themed ink/backing under profile highlighting. Two failing-then-passing unit cases; full 588 tests pass. Real canvas paint-alpha checks in both themes pass after fixture binds actual category_field (8.6s). Dense overlap and selection wiring are not claimed.
          * [x] Radar non-colour cues: explicit 7px marker shapes and matching legend icons, combined with existing line styles. Failing-then-passing 20-profile uniqueness/reorder/missing-profile regression; full 586 frontend tests and 2 browser cases (18.5s) pass. Dense-profile human perception and comprehensive contrast remain separate.
          * [x] Box-plot tooltip clipping reproduced in short widget; shared escaped HTML tooltip with heatmap fixes it. Both-theme exact quartile/last-line/viewport checks pass; 3 browser cases pass (22.2s), full frontend 585 pass. Settled chart marks and wider radar contrast remain open.
          * [x] P2 heatmap numeric-label contrast: luminance-selected foreground and opaque muted-label backing; explicit hover fill prevents ECharts darkening from breaking contrast. Three full scale sweeps first fail then pass, canvas text-alpha observations and both-theme numeric/missing hover pixel comparisons pass (6.8s). Full 585 tests pass. This closes the scoped label defect, not all A4 chart readability.
            * [x] Foreground luminance selection and opaque muted-label backing implemented. Three scale sweeps (1001 positions/both themes) now pass, plus two missing-marker checks; full frontend 584 tests pass (32.43s). Keep parent open until rendered/highlight/hover verification.
            * [x] Actual hover captures reproduced canvas-clipped tooltip rows; escaped body-level HTML tooltip fixes this (ADR-205). Both-theme last-line/viewport assertions and executive regression pass: 2 cases (18.1s); full frontend 585 tests pass. Numeric hover/highlight contrast remains separate.
            * [x] Canvas fillText observer verifies opaque black/white numeric labels under injected highlight metadata in both themes; real numeric hover tooltip and screenshots pass (1 browser case, 7.2s). No selection-wiring claim. Check automatic emphasis fill lift before closing full colour-contrast scope.
          * [x] Narrow settings footer occlusion reproduced by centre hit-test, then fixed using normal-flow actions below the existing 80rem threshold. Workbench browser case passes (18.8s): narrow/enlarged name-field hit-testing and sequential Tab. Full 585 frontend tests pass. Wide panels unchanged; not whole-form occlusion certification.
          * [x] A5 version-list failure/retry: disabled unknown version selection/bindings, pending feedback and read-only retry without changing selected update. Three EN/RU/TT regressions first fail then pass; full 576 frontend tests and 3 CSV update lifecycle browser cases pass (40.7s). Browser outage injection not claimed.
          * [x] A5 report history: confirmed-empty/loading/error and retry, job/state/update readiness gates for update/check/apply and release-history gate for freeze. Failing-then-passing delayed/error/retry component regression; 573 frontend tests and 5 browser lifecycle cases pass (1.3m). Injected browser history outage remains separate from this evidence.
          * [x] A5 alignment create/edit parity: pending/empty/stale feedback, hide prior results during recalculation/error, preserve matching-preview save gate. Two failing-then-passing component regressions; full 572 tests and 3 browser cases pass (4.8s), including delayed real responses. Empty alignment browser fixture not newly exercised.
          * [x] A5 statistical state correction: no contradictory incomplete panel on failed preview; edited settings have explicit outdated state; retained paging data labelled during loading. Regression reproduced before fix; 570 frontend tests and 3 statistical/alignment browser cases pass (4.7s). Pending-page notice not separately delayed-browser certified.
          * [x] Previous-result notice contrast and actual delayed plain-table paging: 7 browser cases pass (25.0s) in .backups/r6-pagination-state-20261012. Fixed enabled-looking no-op pagination without setOffset; failing-then-passing regression and full 567 frontend tests pass.
          * [x] A5: successful zero-row ReportBuilder preview now has an explicit localized explanation while preserving schema and saveability. EN/RU/TT failing-then-passing regressions; 2 real filtered-zero-row save/open/reload cases pass in both narrow themes (4.1s). Full frontend 570 tests pass.
          * [x] Six comparison/contribution families and analytical-table viewer controls use sequential Tab/Enter: 13 cases passed (1.1m), .backups/r6-comparison-keyboard-20261012. Authoring setup and geometry scroll probes are not keyboard evidence; chart/tooltip contrast still open.
          * [x] A5 follow-up P2: retained previous visualization data has visible EN/RU/TT status; stale row/chart selection suspended. Locale delayed-refetch/error/retry component regressions, delayed-pagination browser test and 10-case regression pass. Final existing-token background cleanup checked by build; wider A5 remains open.
          * [x] Inventory all 21 ChartType entries with explicit evidence limits and remaining checks in PRODUCT_EVOLUTION.md. Heatmap/histogram sequential switching, missing-versus-zero semantics and interval accounting: 2 cases passed (10.4s), .backups/r6-cell-interval-keyboard-20261012. Canvas/tooltip contrast remains open.
          * [x] Report exact data-table contrast and switch focus/target sizes in light/dark; native Tab/Enter chart/table access retains exact decimals and graph identity. Canvas numeric-label resize/locale geometry regression retained. Combined 6 cases pass (24.0s); chart mark/tooltip contrast and remaining visualization families not implied covered.
          * [x] Overview browser-computed text/background alpha composition, focus and button dimensions: light/dark initial/error states plus independent numeric oracles, 3 passed (18.0s). Browser handles Oklab-to-sRGB conversion; unsupported paint fails. Canvas/hover/placeholders/pseudo-elements and other screens remain separate.
        * [ ] A5: Finite three-language state/copy audit.
          * [x] Reconcile seven surface families to actual state/locale evidence and explicit remaining boundaries in PRODUCT_EVOLUTION.md (2026-10-13). Common five-state accessible labels/roles now checked in EN/RU/TT; 119 focused tests pass (6.43s). This does not close all locale/browser/human gaps.
          * [x] Translate heatmap sum/average/min/max labels in RU/TT; four component regressions check EN/RU/TT rendering and unchanged exact values.
        * [~] A6: Fresh consolidated public browser regression; preserve separate PostgreSQL/restart/performance evidence scope.
          * [x] 2026-10-13 public checkpoint: 253 passed in one run (23.5m), .backups/r6-public-state-reconciled-20261013. Includes executive showcase and 100k-row browser cases; private opt-in files excluded. Projects cleaned, owned services stopped, default build passes. 579 frontend tests passed before three new red heatmap contrast regressions; the identified P2 and remaining acceptance gates keep A6/R6 open.
          * [x] Uninterrupted isolated regression: 170 passed / 2 private-data opt-ins skipped (13.1 min), .backups/r6-public-reconciled-20261012. Translation-only follow-up: rebuilt executive/heatmap 2 passed; final frontend 558 passed plus lint/types/API/build. Earlier PostgreSQL/restart evidence remains separate.
        * [ ] H2: Observed screen-reader trials; H1 economist gate remains separately listed below.
        * [x] Node/version-scoped inspector condition recovery (ADR-191): validated tab-local snapshots, current-schema insertion guards, explicit discard and bounded memory fallback. 46 affected cases and five production return/reload/exact-calculation scenarios passed. Not server-durable storage or full-reload cleanup-denial recovery.
        * [x] Scope generic inspector local state to node identity/version; classic editor no longer leaks condition scratch between same-type nodes. Field editor retains existing isolation. 30 affected tests and four graph/formula browser combinations passed. Scratch restoration is delivered in ADR-191 above.
        * [x] Parent calculation save explicitly confirms omitting unapplied nested conditions; declined save leaves graph and draft intact. Visible localized guidance, create/edit regressions and two production single/composite-Join journeys passed (33.5s).
        * [x] Parent calculation dismissal includes nested condition-builder scratch changes, even before insertion; baseline/revert/unmount contract and real declined Escape/Cancel verified (11 affected tests, two complete authoring scenarios). Inspector recovery and parent-submit policy are delivered in the separate completed items above.
        * [x] Guard changed Join/calculation/group helper settings on Cancel/Escape/reload, isolate keyboard events and name dialogs. Three failing regressions corrected; 11 affected tests and two complete production authoring journeys passed. Confirmation is not persistence; nested condition drafts and other helpers remain separate.
          * [x] Verify these three dialogs at 420px and doubled root text: no horizontal overflow, real Tab traversal to fully visible Cancel, Enter-triggered declined discard, retained settings and final graph/dashboard parity. Both single/composite Join production journeys pass (36.6s); other forms remain outside this acceptance slice.
        * [x] Dashboard bounded document/history recovery, latest-over-stale copy, original CAS through layout undo, safe discard and successful-delete cleanup (ADR-189). 27 affected tests and 3 production scenarios passed, including competing-save rejection and workspace authoring. Helper dialogs and full-document recovery remain separate.
        * [x] Extend bounded document-memory recovery to classic/field graph history (ADR-188): latest copy over stale disk, original revision, persistent volatile notice, confirmed-save retirement and oversized disk compatibility. 37 affected tests and 9 production recovery scenarios passed. Dashboard/helper forms and full-document recovery remain separate.
        * [x] Denied sessionStorage property no longer prevents classic/field graph startup or server autosave; guarded discard retains edits on failure and cancels discarded queued drafts on success (ADR-187). 16 unit/localization and 15 production regression scenarios passed. Same-document history recovery follows in completed ADR-188; full-document storage-denial limitations remain explicit.
        * [x] Report/visualization same-document fallback on denied/quota storage, newest-draft precedence, exact pending retry and confirmed-save tombstones (ADR-173); component and production Back/Forward regression. Legacy dashboard/graph/helper forms remain to audit.
        * [x] Atomic independent-visualization save receipts and exact pending-request recovery after lost responses; PostgreSQL concurrency and commit-then-disconnect browser acceptance (ADR-143).
        * [x] Recover ReportBuilder/AlignmentReportBuilder drafts and original pending requests across reload; reuse existing receipts and preserve CAS/graph semantics, with unavailable-metadata and keyboard/browser acceptance (ADR-144).
        * [x] Extend the same recovery guarantees to named-measure report authoring; preserve compatible-measure/grain guards (ADR-145).
      * [x] Responsive legacy numeric axes/category labels and same-result raw tables; real Canvas overlap/resize and keyboard/browser acceptance (ADR-142).
    * [ ] Complete all five journeys and audit keyboard/focus/contrast/drag alternatives; human usability gate remains separate.
      * [x] Addressable update history/direct rollback continuation (ADR-194), entry/error focus and unavailable references. Five new component cases, 504-test regression, six import/report journeys and four legacy/report-cycle/executive-showcase scenarios pass; no automatic apply or discarded revision guards.
      * [x] Import validation repair actions: deduplicated field/key review, one-shot focus/open-details, explicit sampled-issue count and named keyboard preview table. Two focused component cases, 499-test frontend regression and six production import/report/range journeys pass, including 420px/doubled-root-text correction focus and visible preview focus.
      * [x] Align complex-chart data-table typography with the 14–16 px reading baseline: all twelve component families use 14 px primary text, numeric header alignment and shrinkable scroll containers. Radar/histogram narrow production acceptance plus 46 affected component cases and 17 remaining-family browser scenarios pass. Boxplot additionally checks 420 px scrolling/both themes; analytical table retains pinned columns and totals. Full accessibility is separate below.
      * [~] Audit named table regions/captions and keyboard horizontal scrolling: complex and basic tables have localized captions/named tab stops. Radar production test exercises actual Tab/visible focus/native arrows at 420 px. Basic header alignment corrected; analytical-table pinning now reserves room for measures and restores saved intent on expansion (ADR-192), covered by boundary and browser full-cell/hit tests. Remaining: broader keyboard/zoom/narrow-layout checks and actual screen-reader trial; do not claim whole-page accessibility.
        * [x] Analytical table text enlargement: shared pixel geometry avoids rem/pixel pin mismatch; actual 14-to-28 px text and restored offsets verified in five production repeats. Narrow-cell test awaits real grid transitions, with settled exact-value screenshot; this is not whole-app browser zoom acceptance.
      * [x] Calculated-field helper dynamic focus: add/remove/reorder keep a usable target, stable row identity and no typing focus theft. Three reproduced failures fixed with the existing shared hook; 11 affected tests and 3 production authoring scenarios pass. Full helper-dialog audit remains open.
      * [x] Correct import/basic report wizard step focus (ADR-168); production regression for import, invalid-type correction, report creation/edit and refresh in one scenario. Whole-app tab order and human testing remain open.
        * [x] Extend this complete journey to 420px/dark and doubled-root-text/light alongside desktop/compact cases: four production passes (23.9s), exact sum-to-mean/update parity, no import-field page horizontal overflow and native End-key access to a fully visible final table row. Not browser zoom or all-dialog acceptance.
      * [x] Correct standard report table typography: 14 px, schema-driven right-aligned numeric headers/cells and tabular digits; text-code, selection and pagination regression.
      * [x] Import/basic-report failure feedback and dynamic measure/filter focus (ADR-169): retained settings, latest-action errors, existing idempotent import retry and read-only report checks; component and production browser acceptance.
      * [x] Analytical/alignment dynamic control focus and latest-check feedback (ADR-172): preserved settings/identities, grouping/measure reordering, Join/alignment keys and failed previews; component and production create/edit/recovery regression pass.
* [x] R2: Common connector/resource/profile/snapshot contracts, Excel/CSV, import wizard, exact types,
  immutable Parquet, refresh/history/release integration and migration acceptance.
  * [x] Common contracts, file adapters, strict full-data normalization, exact decimal and safe large integer transport.
  * [x] Migration 0011, immutable snapshots, generic source node, five-step initial-import wizard.
  * [x] Optional composite row-key authoring through existing profile key_fields: identity-safe rename/remove, saved draft recovery, duplicate/null rejection during initial import and refresh. Four full keyboard/report journeys and API/component tests pass; no implicit deduplication.
  * [x] Expose header-count and leading/trailing row exclusions in the import wizard; draft/request/component/adapter tests and production keyboard/reload acceptance pass.
  * [x] Explicit Excel rectangular cell-range selection (ADR-193): physical IDs, merged-header guards, bounded formula checks, old-profile receipt hashes, exact report refresh/rollback and frozen release restoration. Two production range journeys plus four existing CSV report journeys pass; whole-workbook safety caps remain.
  * [x] Per-dataset range/header-count/row-exclusion overrides in replacement-file mapping (ADR-193). Changed options clear that dataset's bindings and hide stale suggestions; sibling settings survive. Relocated/renamed fields, blocked invalid range, saved reload, exact update and rollback pass in API and two production browser journeys, plus four CSV regressions.
  * [x] Idempotent/CAS profile apply, affected workflow revision bump, source/project cleanup and release restoration.
  * [x] File replacement/mapping UI, staged complete checks, atomic apply/rollback and monotonic source/workflow revisions.
    * [x] Timezone-aware refresh boundary: ambiguous/nonexistent local times reject staged apply without changing active data/report; explicit UTC-offset fold identities survive rename/reorder mapping, Parquet, aggregation and rollback with advancing revisions. 49 related regressions pass; two PostgreSQL concurrency cases remain separately gated, not counted as local passes.
  * [x] Durable artifact intents for replacement files/staged Parquet; repeat-check reuse and caught write-failure cleanup.
  * [x] Resume initial-import drafts with revision guards and stable apply receipts; crash-recoverable initial raw/Parquet writes (ADR-116).
  * [x] Extend decimal beyond aggregation/filtering to safe expressions and the remaining analytical operations.
    * [x] Explicit calculated_column@2 exact arithmetic, final half-even rounding, UI, graph/release/browser regression and 100k-row benchmark (ADR-118).
    * [x] Typed conditional exact expressions, lazy branches, null logic, shared editor and literal-safe release restoration (ADR-160); unit/API/PostgreSQL/browser and 100k-row checks pass.
    * [x] Exact window@3 partition/running totals, maxima, previous rows and numbering with deterministic order, null/overflow rules, editor, release restore and 100k-row narrow/wide benchmark (ADR-161).
    * [x] Version-aware exact share/rank helper for decimal and opt-in integer fields, explicit scale and unchanged trailing selection scope (ADR-162).
    * [x] Fix decimal Unpivot truncation and missing scale metadata; preserve digits/common units or fail explicitly (ADR-163).
    * [x] Exact pivot@2 dynamic cross-tabs with decimal sums/extrema, explicit average scale, compatible IDs, editor and release/browser/100k-row verification (ADR-164).
    * [x] Fix fractional decimal-to-integer conversion to respect existing error/null policy (ADR-165).
    * [x] Fix decimal Union truncation, Join false matches and diagnostic key precision; common scale/unit checks, exact transport and SQLite/PostgreSQL release regression (ADR-166).
    * [x] Audit decimal field-wire boundaries; fix lost projection/conditional/append metadata and downstream rounding, and reject unsupported scalar output in preflight (ADR-167).
    * [x] Exact field/scalar constants, arithmetic, sum and single-value v2, metadata/transport through Append and bound KPI; unchanged v1, graph editor, release/restore, SQLite/PostgreSQL/browser and 100k-row narrow/wide checks (ADR-176).
    * [x] Exact field_formula@2 reuses bounded expressions over a/b/c, preserves row contexts and final rounding; editor, independent unit references, release/restore and production reload/KPI verified (ADR-177).
    * [x] Decimal workflow/dashboard parameters with explicit precision/scale and string transport; scalar/cache/filter/binding/choice/release integration, unchanged legacy contracts and editor/URL/KPI reload acceptance (ADR-178).
    * [x] Reconcile delivered exact-node contracts and source/authoring boundaries: independent statistical/contribution oracles below, exact composition/window/field/parameter suites, timezone refresh and range/key authoring. Cross-cutting R1/R6 human/accessibility acceptance remains open, not waived.
      * [x] Preserve condition-builder numeric tokens; expose typed exact conditions in existing calculated_column@2, with numeric results and explicit legacy Float64 warning (ADR-190). 37 frontend/59 backend cases, production exact signed-value/reload checks and two Join journeys passed. No implicit v1 upgrade.
      * [x] Cross-statistic histogram/boxplot/heatmap audit against independent cent/rational references: 9 seeded signed/large-offset cases, full counts/nulls/outliers/quartiles/bounds/sums and low Decimal context. No new numeric defect. Full pre-addition backend 1506 pass/31 PostgreSQL skips and frontend 449 pass; new 9 cases passed separately.
      * [x] Cross-node Pareto/waterfall/funnel monetary parity: six seeded populations with normal/large values, ties/zero contributions, exact ranked/cumulative shares, independent half-even percent rounding, signed cancellation/checkpoints and zero-denominator retention under Decimal precision 3. No new defect; 119 related node/API/visualization regressions pass. Remaining source/type/authoring audit is separate.
* [x] R3: Guided report preview/atomic apply, editable DAG, dimensions/measures/filters,
  simple/steps/graph views and preservation of advanced calculations.
  * [x] Initial dataset/measure/dimension/filter/presentation wizard, non-persistent preview and atomic idempotent apply.
  * [x] Ordinary dataset_source -> optional filter -> group_by@2 graph, publication, visualization and dashboard.
  * [x] Exact decimal aggregation, preview/save guards, graph access and browser reload acceptance.
  * [x] Edit the recognized suffix of existing reports; preserve advanced upstream steps, appearance/layout and revision conflicts (ADR-117).
  * [x] Expand graph editing beyond the supported suffix; published-dataset inputs, formulas/comparisons and reusable measures.
    * [x] Stable aggregation output identities and graph-backed row/after-total formulas, schema-aware authoring and round-trip editing (ADR-119).
    * [x] Guided chained after-total formulas with optional schema-only create/edit API, unchanged-prefix field choices, dynamic formula focus and financial-chain production round-trip (ADR-170).
    * [x] Published-dataset input selection and a shared ordinary graph branch with preview/CAS/apply, release restore and browser acceptance (ADR-120).
    * [x] Named graph-backed measures with explicit grain, direct reuse without reaggregation, persisted report guards and API/release/browser regression (ADR-121).
    * [x] Dedicated period comparisons and broader reusable-measure composition.
      * [x] Calendar bucketing and exact previous-period/year comparison nodes; table-report creation, graph configuration and API/release/browser regression (ADR-122).
      * [x] Safe comparison round-trip editing with shared/manual graph protection and revision checks (ADR-123); explicit add/remove rebinding, SQLite/PostgreSQL and production browser regression.
      * [x] Comparison Bar/Line charts with explicit current/baseline bindings, safe wizard edits, release restore and production browser regression (ADR-124).
      * [x] Multiple reusable measures from one publication and identical grain in a guarded table; full-data validation, legacy receipts, copy/release and browser regression (ADR-125).
      * [x] Cross-result measure composition with explicit alignment and calculation semantics.
        * [x] Explicit full one-to-one measure alignment node and graph controls; exact values, unmatched-row visibility, full-data diagnostics and release restoration (ADR-126).
        * [x] Wizard selection of separate prepared results and explicit alignment within one workflow; atomic/CAS/idempotent apply, preserved branches, release and browser acceptance (ADR-127).
        * [x] Guided derived cross-measure formulas and safe alignment round-trip editing; unsupported advanced/shared suffixes remain in the graph.
          * [x] Exact formula chains after explicit alignment, server field inference, ordinary graph apply and draft/release compatibility (ADR-158); full-data boundaries, SQLite/PostgreSQL concurrency and production-browser checks pass.
          * [x] Safe alignment wizard round-trip preserving shared branches, manual steps and visualization bindings (ADR-159); keys/formulas/rebinding, CAS/retry/release, SQLite/PostgreSQL and production browser regression pass.
* [x] R4: Versioned visualization registry, statistical nodes, heatmap/boxplot/radar/histogram,
  waterfall/combo/analytical tables, full snapshot and legacy compatibility.
  * [x] Extend guided first-wave creation to combo/radar/waterfall; reuse existing renderers/specs and ordinary graph calculations.
    * [x] Plan-fact combo: exact graph aggregation/formulas, explicit axes/series, chart/table preview, guarded edits and draft/release recovery (ADR-179); SQLite/PostgreSQL and production browser acceptance. Fix shared formula insertion focus race found during regression.
    * [x] Guided radar creation/editing with explicit normalization/scales, ordinary graph aggregation/formulas, preview/draft/release recovery (ADR-180); SQLite/PostgreSQL, 100k-row correctness and production browser acceptance. Persist typed spec/orientation on explicit radar/combo rebinding.
    * [x] Guided waterfall creation/editing through existing preparation with explicit step order/roles and exact reconciliation (ADR-181); legacy input-order compatibility, template mapping, releases, SQLite/PostgreSQL and production-browser regression.
  * [x] Guided histogram/box-plot creation from imports or prepared results; full-data preview, upstream filters, atomic apply and draft/retry recovery (ADR-146).
  * [x] Guided heatmap/analytical-table creation with explicit aggregation, ordered hierarchy, exact totals, preview/recovery, shared-branch guards and browser/release regression (ADR-147).
  * [x] Safe statistical/analytical wizard round-trip editing: structural terminal recognition, preserved manual preparation/appearance, explicit table rebinding, CAS/receipts/recovery and release/PostgreSQL/browser regression (ADR-148). Shared/advanced terminal bindings remain explicit graph steps.
  * [x] Full-data box-plot statistics with exact quartiles, stable group/point identities and named summary/outlier outputs; graph settings, release/API/browser regression (ADR-128).
  * [x] Versioned visualization registry and typed role bindings; explicit rows/named-datasets transport contracts for rendering (ADR-174/175).
    * [x] Typed box-plot/histogram/heatmap/radar/waterfall/combo/analytical-table specs and registry, common-execution named datasets, exact tables and complete frozen datasets (ADR-129/130/132/133/135/136/138).
    * [x] Extend registry/specs to remaining charts; existing eight legacy contracts stay compatible, not automatically migrated.
      * [x] Read-side versioned specs for all eight basic types and registry coverage of all 21 families; stable-ID rendering, legacy frozen-result fallback, exact paging/release/restore and SQLite/PostgreSQL/browser regression (ADR-174).
      * [x] Basic typed input contracts and canonical write adapter; preserve editor/wizard field rebinding, pending receipts, graph-bound nodes and old projects without dual binding sources (ADR-175). Explicit all-fields/scalar semantics, first-series names, atomic invalid-save rejection, SQLite/PostgreSQL and production-browser regression.
  * [x] Histogram: exact equal-width preparation, full observation accounting, typed chart/table, release/restore and production browser regression (ADR-130).
  * [x] Heatmap preparation and typed rendering.
    * [x] Explicit full-data aggregation, exact numbers and distinct absent/null/zero cells; graph settings, table publications, release/restore and browser regression (ADR-131).
    * [x] Typed heatmap specification/renderer, exact colour normalization, explicit scales and saturation counts, table/tooltips, stable navigation and release/browser regression (ADR-132).
  * [x] Radar: prepared unique profiles, 3–8 explicit axes/scales, mixed-unit normalization, exact table, stable selection, release/restore and production browser regression (ADR-133).
  * [x] Waterfall: backend preparation with explicit intermediate/final totals, exact signed contributions and typed rendering/table.
    * [x] Ordered waterfall_steps@1, exact balances, configurable row-type markers and reconciled totals; graph settings, table publication, complete release/restore and browser regression (ADR-134).
    * [x] Typed waterfall spec/registry and graphical renderer with exact table, negative/cross-zero bars, stable selection, upstream-only contexts, keyboard viewport controls and release/browser regression (ADR-135).
  * [x] Combo and analytical table preparation/rendering.
    * [x] Typed prepared bar/line combo, explicit secondary axis, exact scale/table, full release/restore and production browser regression (ADR-136).
    * [x] Analytical table: graph-owned grouping/totals, pinned columns and conditional formatting.
      * [x] table_rollup@1 observation-based hierarchy, exact measures/ratios, graph configuration, full-release/restore/browser checks and 100k-row benchmark (ADR-137).
      * [x] Typed analytical-table renderer with hidden technical roles, pinning, conditional formatting and full-release/browser acceptance (ADR-138).
* [x] R5: Bubble/Pareto/treemap/sunburst/bullet/funnel and reusable graph-backed templates.
  * [x] Bubble chart: typed prepared observations, full-input scales and explicit area encoding (ADR-149/150).
    * [x] Backend preparation contract, stable keys/groups, exact paged table, full-input validation and 100k-row narrow/wide benchmark (ADR-149); 46 focused cases, SQLite/PostgreSQL regression, lint/types and unchanged OpenAPI verified.
    * [x] Integrate public specs/registry, full-data save validation, rendering API, complete frozen releases and restore; CAS/retry, matching point/row pages and navigation fields verified (ADR-150).
    * [x] Schema-aware editor, chart/table/page controls, EN/RU/TT, stable selection and production browser acceptance; large-number relative labels and viewport clearance preserve readability (ADR-150). Comprehensive accessibility/human gate remains open.
  * [x] Pareto: exact graph preparation and typed chart/table (ADR-151); full-input validation, deterministic ranks, explicit zero-total state, reference line, stable paging/selection, save/release/restore, 100k-row benchmark and production browser acceptance. Compact cards retain visible navigation without chart overlap.
  * [x] Treemap/sunburst: shared rollup preparation, typed complete tree, exact table and keyboard branch exploration (ADR-152); full-input/additive guards, complete release/restore, 100k-row benchmark and production browser acceptance. Shares retain the full-root denominator during exploration.
  * [x] Bullet: typed actual/target/explicit ranges, exact full-input guards, responsive keyboard windows, exact table, save/retry/copy and complete release/restore (ADR-153); narrow/wide 100k-row benchmark and production browser acceptance.
  * [x] Funnel: explicit ordered-stage node, exact retention/loss, typed complete chart/table, keyboard scrolling and release/restore (ADR-154); 100k-row grouping-to-funnel benchmark and production-browser regression.
  * [x] Guided Pareto/funnel/treemap/sunburst creation through the existing atomic analytical route; explicit prepared roles/additive totals, shared-branch revision guards, draft/retry recovery, release/restore and production browser regression (ADR-155). Compatible Pareto/funnel suffix editing preserves manual preparation/appearance.
  * [x] Hierarchical wizard round-trip preserving advanced rollups (ADR-156): explicit field rebinding, protected manual/shared/multi-measure settings, atomic/CAS/retry, exact release restoration, SQLite/PostgreSQL and production browser regression.
  * [x] Initial reusable graph-backed analytical templates for eight guided analytical types: immutable project-local capture, explicit schema/grain mapping, ordinary wizard application, retry/release/restore and SQLite/PostgreSQL/browser acceptance (ADR-157).
  * [x] Extend standard/analytical template families and catalog management; calculation definitions remain immutable and project-local (shared limit 200). Other calculation-family/cross-project templates remain future work.
    * [x] Include waterfall in analytical templates with explicit label/value/row-type/order mapping and release restoration (ADR-181).
    * [x] Extend templates to standard grouped/formula reports, including combo/radar, with stable output bindings and explicit input schema/grain mapping; preserve existing statistical template contracts (ADR-182). Formula/calendar/legacy/prepared-input mapping, release/recovery, shared catalog cap, SQLite/PostgreSQL concurrency and production browser acceptance passed.
    * [x] Project-local catalog management: discover/filter templates and safely rename/archive entries without affecting already-created reports; preserve immutable calculation definitions and revision guards (ADR-183/184).
      * [x] Typed catalog API, immutable definitions, exact edit receipts, archive/revision prepare guards and compatible release metadata (ADR-183); full backend/frontend regression, affected SQLite/PostgreSQL matrix, lint/types/API/build passed. Dedicated catalog UI/E2E remains below.
      * [x] Dedicated catalog screen with search/family/state filters, rename/archive/restore, keyboard feedback and same-tab pending-edit recovery; Reports navigation and production-browser acceptance, both families, lost response/offline metadata, competing edits, light/wide and dark/narrow verified (ADR-184).
* [~] R6: PostgreSQL/migrations, browser/restart/numeric regression and 100k-row/width benchmarks.
  * [x] Owned-container PostgreSQL/API restart acceptance for eight-widget executive demo: clean migrations, exact financial/statistical controls, metadata/frozen-result identity and release restoration. Opt-in fixture never restarts a configured/user database; SQLite/shared HTTP regressions included (8 passed). Graceful restart, not crash recovery.
  * [x] Rerun current PostgreSQL selection in disposable PostgreSQL 17: 517 passed, 2 SQLite-name-match skips, 1544 deselected (2026-10-12, 392.19s). Clean UUID-schema migrations, locking and integration checks passed; zero schemas left, owned container removed. Database-process restart and human gates remain separate.
  * [x] Verify graph search sequential Tab focus via actual computed outline in both themes, search -> keyboard operation creation -> persisted workflow. Two production cases passed; suspected outline-none defect disproved, no runtime rewrite.
  * [x] Guard 86 actual CSS opaque theme color pairs plus contrast-math oracles; improve dark outline/raised from 2.8449 to 3.2698. 23 affected tests and 2 production keyboard journeys passed. Transparent layers/chart colors and whole-page compliance are not covered by this token policy.
  * [x] Fix missing accessible grouping of repeated import controls using native fieldset/legend; locale-aware names/blank-name fallback, rename identity and actual Tab/Shift+Tab/details traversal. 18 component tests and 2 light/dark keyboard scenarios passed; both 100k browser regressions remained green. Full screen-reader/contrast audit remains open.
  * [x] Isolated HTTP CSV/Parquet/report benchmark: 100000 x 3 and x 20, exact grouped totals and real process replacement. Seven targeted tests passed; script lint/format/types passed. No import-limit bypass or production database access.
  * [x] Verify explicit HTTP graph-preview cache counters at 100k x 3/20: cold/warm, staged original, one-cent source refresh and rollback; exact visualization totals after changes. Twenty affected tests and targeted lint/format/types passed.
  * [x] Verify actual-browser import/report responsiveness at 100k x 3/20: bounded preview, leading zeros, exact grouped totals, saved/reloaded report, per-stage long-task evidence; 2 production scenarios passed. Native disk selection avoids measuring Playwright Buffer injection overhead. Not every chart/device or human acceptance.
  * [x] Fresh-process 100k-row narrow/wide normalization and exact-formula benchmark with native peak memory; Windows baseline and correctness verified, scope separate from file ingestion/end-to-end latency (133 relevant tests passed).
  * [x] Optimize measured wide normalization with unchanged strict conversion and row-error semantics (ADR-186): identical clean 100000 × 100 text-to-decimal fixture ~38.5 s -> ~0.5 s; full backend 1500 passed/31 PostgreSQL skips, seven affected production-browser scenarios passed. Mixed/invalid columns retain scalar fallback.
  * [x] Extend 100k-row evidence within configured limits: file import, Parquet, API execution/cache/update/rollback and real-browser import/report responsiveness delivered; broader accessibility and human gates remain open.
  * [~] Consolidate evidence and run the five report-first journeys plus executive showcase on isolated production builds; audit remaining R1/R2/R3 gaps and fix verified defects. Keep human trials distinct.
    * [x] Real API process replacement over private persisted SQLite/storage: independent financial/statistical expectations, frozen widget results and restored project recalculation survive replacement (test_process_restart.py).
    * [x] Refresh historical browser journeys for versioned operations and current report-first controls without changing legacy numeric expectations; final uninterrupted public-fixture run: 144 passed, 2 private-data opt-ins skipped (2026-10-12, 11.3 min).
    * [x] Map all five scripted report-first journeys to production-browser evidence; fix eight missing RU/TT operation descriptions discovered by the live catalog check. Economist trials and full accessibility remain separate open gates.
    * [x] Fix R6-reproduced dashboard P2 regressions: layout undo preserves later metadata; empty navigation destinations expose configured parameter controls; reverted edits cannot leave a clean stale draft hiding a committed copy after reload (ADR-185). Seven final production-browser scenarios passed, including modern workspace, v1/v2 compatibility, two multi-book business journeys and independent-copy lost-response recovery.
  * [x] Reproducible eight-widget executive demo through public APIs, immutable synthetic fixtures, independent financial/statistical oracles, SQLite/PostgreSQL and production refresh/reload/theme checks (ADR-171).
  * [x] Fix exact KPI currency/percent formatting without Float64 conversion; retain raw tables, text codes and calculation rounding (ADR-171).
* [ ] R6 human gate: five economists, >=4 independent successes and no unnoticed data errors.


## Synthetic business walkthrough (2026-09-24)

* [x] Write the economist guide before dashboard construction; define independent expected values.
* [x] Generate three public sales/cost/plan books with documented business assumptions.
* [x] Follow the guide through the UI, retain an editable six-widget dashboard and verify reload.

## Reliable report cycle (2026-09-24)

* [x] Immutable source versions, staged mapping and atomic complete replacement.
* [x] Period collections, duplicate protection, history and compatible rollback.
* [x] Full-data quality checks, previous control values, lineage and operator route.
* [x] Frozen full-result releases and restoration into a separate editable project.
* [x] Expanded PostgreSQL/browser/regression acceptance, documentation and operator protocol.
* [ ] Five-economist trial (requires participants); real second-report acceptance awaits data.

## Authoring usability review (2026-09-24, ADR-112)

* [x] Reproduce premature preview; add explicit completeness guidance without implicit calculations.
* [x] Consolidate table columns, add search feedback and clarify project/import next steps.
* [x] Keyboard workbook actions, visible focus, tab navigation and one dashboard undo history.
* [x] Component/browser regression, production build and review documentation.
* [ ] Human operator comparison: time, errors, completion and help requests; no unmeasured speed claim.

## Dashboard workspace (authorized 2026-09-24)

* [x] Compact headers, right panel, reusable visualization editor and explicit placement controls.
* [x] Context-aware draft preview, local appearance updates, shared copy and conflict recovery.
* [x] On-demand library, free-space placement, recoverable layout history and dirty-layout creation.
* [x] Browser regression, language/theme review, persistence and operator guide.


## Simple dashboard constructor (authorized 2026-09-24)

Plan: docs/SIMPLE_DASHBOARDS_PLAN.md. All users can author; no account system or new navigation.

* [x] S1: Composite Join v2, relationship checks, forms and two-book dashboard acceptance.
* [x] S2: Safe conditional/text/date expressions, condition form, cumulative Window and calendar.
* [x] S3: Excel row bounds and bounded Join diagnostic record views.
* [x] S4: Multiple numeric series for Bar/Line using shared published results.
* [x] S5: Synthetic AlMaBi rule matrix, editable P&L graph/dashboard, financial parity and restart.

## Guided authoring usability follow-up (2026-09-23, ADR-108)

* [x] U1: Shared simple create/edit calculation form preserving identities and complex formulas.
* [x] U2: Next step actions, Group By shortcut, localized publication dialog and expandable catalog.
* [x] U3: Wide on-demand preview, A/B views and typed full-input Join diagnostics with regression tests.
* [x] U4: Configuration-derived captions; browser authoring and existing editor regression checks.
* [ ] U5: Measure actions, errors, help requests and completion time with human operators.

## Table-driven node authoring (authorized 2026-09-23)

* [x] T1: Publication cards, layout CAS and omission compatibility, independent visualization entry.
* [x] T2: Join creation from a table with named source/key selection and one undo action.
* [x] T3: Calculated-column form, explicit division policy and pinned new field output.
* [x] T4: Browser acceptance, existing financial parity, restart verification and documentation.

Guide: docs/TABLE_AUTHORING.md. No additional header transformations in this scope.

## Independent visualizations and shared dashboard context (authorized 2026-09-22)

* [x] D1: Format-v3 published table/scalar outputs, shared context declarations, standalone revisioned visualization CRUD/schema/preview/copy and authoring UI.
* [x] D2: Shared date period, explicit compiled context restrictions before totals, selective caching and coverage diagnostics; no financial-specific executor.
* [x] D3: Dashboard placement/search/preview, inherited period/context transitions, highlight-only exceptions, URL restoration and stale-result protection.
* [x] D4: Back up and atomically convert the field financial project; remove display nodes and unused helpers, preserve six screens and 164 slices.
* [x] D5: Synthetic date workbook, UI authoring, SQLite/PostgreSQL/concurrency/restart/browser checks, both themes and three languages; update docs and candid operator evidence.

Defaults: period/navigation only; no categorical filter panels or chart cross-filtering. One-time
data contract setup; visualizations shared across placements, with explicit independent copy.
No data reset or invented dates for the financial workbook. Human speed remains unmeasured.

## Functional nodes and field connections (authorized 2026-09-21)

Plan and acceptance: docs/FIELD_EDITOR_PLAN.md. Existing UX/U5 history is retained below.

* [x] F1: Typed connections, persistence and execution.
  * [x] Table/field/scalar value foundation, row-context checks, shared expression compiler, explicit arithmetic/null policies, parameter scalars and legacy named-table adapter.
  * [x] Explicit save-format acknowledgement and CAS upgrade guard; reject old-client overwrite and unsupported v2 fields; regenerate OpenAPI types.
  * [x] Persist source_column_id through API/ORM/domain with migration 0007, v1 wire compatibility, CAS/format guards and loss-preventing downgrade.
  * [x] Persist typed workbook/composite presentation metadata with revision-safe validation, omission preservation and migration 0008; detached sheets/public ports reference existing nodes (ADR-092).
  * [x] Register eight typed operations, static schema/context preflight and named routing through the common legacy-compatible engine (ADR-090).
  * [x] Named field/scalar preview and output/column/parameter-aware cache; API persistence/execution regression on SQLite/PostgreSQL.
  * [x] Adapt DATA_DEPENDENT legacy schemas in mixed typed branches through validated prefix execution; Pivot field IDs, parameter changes, cache, limits and error attribution verified (ADR-091).
  * [x] Preserve precise input/configuration paths and offending wire IDs for typed arithmetic/logic, row-context, sum/filter and scalar/name schema errors; localize repair messages (ADR-098).
  * [x] Attribute comparison compiler and typed execution-boundary errors; retain runtime issues/wires, identify null policy and highlight current schema controls with accessible invalid state (ADR-099).
  * [x] Attribute direct field-output failures, report scoped runtime preview issues to inspector controls and translate known typed value/schema errors; verify late responses and draft/parameter invalidation (ADR-100).
* [~] F2: Opt-in editor, workbook/sheets, interactive fields/cards, compatible wires and A/B previews.
  * [x] Explicit new-v2 mode, shared autosave/history, typed field cards and eight operation forms, drag/list connections, bounded field search and A/B named-output previews (ADR-093).
  * [x] Preserve usable schemas in partial drafts; parameter-aware schema requests and revision/output-aware preview handling.
  * [x] Workbook browser with lazy bounded sheet lists, search, named click/drag insertion and identity-preserving reopening of configured instances. Uses ordinary source nodes and shared undo/save.
  * [x] Workbook canvas cards with projected real field endpoints, persistent collapse/movement, sheet selection, drag/button detach/return, ungroup and atomic membership repair on deletion/source change (ADR-094).
  * [x] Drag-time compatible/blocked/pending input hints and conservative explicit field paths through expression nodes, with workbook proxy normalization and local-only selection (ADR-095).
  * [x] Registry-based compatible operation/input chooser on blank-canvas output drop, keyboard alternative, exact row-context table wiring and atomic node/wire undo (ADR-096).
  * [x] Virtualize unconnected fields, keep connected/focused ports pinned, compact large graphs, navigate by node search and eliminate duplicate schema GET (ADR-097).
  * [x] Browser acceptance on a synthetic 168-node graph and real generated 1024-column workbook; no eager previews or view-only revision changes.
  * [ ] Complete retained financial-copy/operator large-graph acceptance.
* [x] F3: Atomic one-level composite blocks, navigation/public ports, field Bar Chart and scalar KPI.
  * [x] Pack named nodes, render collapsed boundary ports, reopen/edit, unpack, pin extra output and preserve undo/save identities (ADR-101).
  * [x] Atomic block membership/public-port settings, saved aliases, optional port hiding, explicit input/output exposure and protected connected endpoints (ADR-102).
  * [x] Resolve exact node versions in field connections/inspector and distinguish versioned creation choices before introducing visualization v2 (ADR-103).
  * [x] Complete field Bar Chart/scalar KPI integration, common typed execution, versioned forms, on-demand rendering and dashboard settings/copy/navigation (ADR-104).
* [~] F4: UI-built end-to-end scenario, restart/compatibility/164-slice parity and operator evaluation.
  * [x] Build Excel → arithmetic → append → Filter → Group By → field Bar Chart + scalar KPI → dashboard using named UI controls; edit/copy/reload and verify both themes/three languages.
  * [x] Verify a saved typed graph, composite block, dashboard and both chart results after PostgreSQL/backend restart on disposable synthetic data.
  * [x] Assemble a new financial field-node project (owner priority clarification, 2026-09-22): 27 field expressions/appends, 30 explicit scalar boundaries, 10 Bar Chart@2, 30 KPI@2, six dashboards and seven blocks (ADR-105).
  * [x] Compare all 164 slices / 1551 widget pages; verify the real saved graph, six dashboards and 55 representative results after PostgreSQL/backend restart.
  * [x] Complete real-project browser editing/navigation checks and document the impartial usability review; fix readable node-search focus inside large blocks.
  * [ ] Run the human operator protocol; do not claim measured authoring speed without participants/results.
  * [ ] Next UX priority: one-action computed-field and explicit KPI authoring, then large-block overview/path layout. See docs/FIELD_FINANCIAL_REVIEW.md; these improvements are not implemented by this slice.

## Manual-authoring UX review and proposed redesign (2026-09-15)

* [x] Review current manual journey, saved graph and editor forms; distinguish functional acceptance from human usability.
* [x] Document findings and staged redesign in docs/CONSTRUCTOR_UX_REVIEW.md.

Implementation authorized; stages below remain incomplete until their acceptance passes:

* [~] U0: Human baseline tasks and prototypes; collect time, errors and assistance needed.
  * [x] Define operator tasks, evidence collection and comparison protocol (docs/UX_OPERATOR_PROTOCOL.md).
  * [ ] Conduct baseline with actual operators; no measurements claimed yet.
* [x] U1: Meaningful node cards, groups, dependency focus, layout, next-step insertion and undo/redo.
  * [x] Presentation names, dependency view, connected next-step creation and atomic input replacement (40 frontend tests, 19 browser scenarios including restart).
  * [x] Dependency layout and bounded undo/redo through normal revision-aware autosave.
  * [x] Reject deletion of attached visualizations, including concurrent widget attachment (PostgreSQL race and browser recovery checked).
  * [x] Persistent flat groups, collapse with boundary connections, member navigation and configurable panels; projection/revision/undo/output regression verified.
* [x] U2: Named formula tokens and batch preparation forms backed by ordinary explicit nodes.
  * [x] P2: Field-specific configuration feedback replaces raw Pydantic dumps; nested errors retained in English/Russian/Tatar; empty Filter repair verified.
  * [x] Named formula token view, cursor/selection insertion, schema-aware field lookup and signature hints; canonical text editing retained (ADR-073).
  * [x] Revision-aware server diagnostics adjacent to the expression; hide stale errors during edits and schema refresh.
  * [x] Saved-graph value origins in the single-node formula editor: workbook/sheet/header/column, searchable labels, graph-scoped Join/Union and explicit missing metadata (ADR-077).
  * [x] Calculated-field table: dependent rows, atomic creation, undo/redo, graph-derived existing-chain editing and reload acceptance (ADR-074).
  * [x] Preparation table: selection, rename, explicit type/error/null policies, node preview, exact integer fill and atomic ordinary branch creation (ADR-075).
  * [x] Grouped Unpivot authoring: ordinary branches/Union, independent duplicate labels, stable field IDs, manual edits, atomic undo/reload acceptance (ADR-076).
* [x] U3: Share/rank builders with explicit denominator scope and parameter dependency explanations.
  * [x] Share/rank dialog creates ordinary Window/Calculated Column/trailing Filter, shows selected input scope and upstream filters; atomic undo/reload and result invariance acceptance (ADR-078).
  * [x] Explicitly chosen Window/Group By scope: input/subsequent path highlights, before/after/other-branch filters and parameter locations; pre-selection output reused through UI with invariant comparison rows (ADR-079). Human usability evaluation remains U0.
* [x] U4: Widget creation/editing from dashboards, ID/label selectors, guided navigation and view mode.
  * [x] Edit existing visualization settings from widgets through the shared node form; saved-use disclosure/acknowledgement, CAS conflict recovery and dashboard draft preservation (ADR-080).
  * [x] Create/copy visualization + widget atomically with both revisions, stable retry IDs, rollback and independent settings (ADR-081).
  * [x] Exact calculation-branch navigation from dashboard widgets: URL targets, project membership, collapsed-group reveal, ancestor highlight, missing-target feedback and draft/reload/history acceptance (ADR-082).
  * [x] ID/label parameter selectors: optional display field, typed URL/filter values, duplicate-name identity, bounded search, off-page selected labels and ambiguity feedback (ADR-083).
  * [x] Guided navigation.
    * [x] Per-widget staged dialog, typed mappings, unique-name suggestions, required/missing-reference feedback and sample preview; preserve unrelated dashboard drafts (ADR-084).
    * [x] Propose missing context fields; review shared uses and save graph/widget action atomically with all revisions, late rollback, concurrent-write and lost-response recovery acceptance (ADR-085).
  * [x] URL view mode, draft-preserving toggles and two previewable grid templates with guarded placement undo; browser/restart acceptance (ADR-086).
* [~] U5: Apply to a project copy, repeat 164-slice parity/restart checks and human usability evaluation.
  * [x] Backup database/source artifacts and retain an independently identified API-created project copy; apply groups and layouts without calculation changes.
  * [x] Fix large-graph collapsed-group overlap and fit limits; 164 slices / 1551 widget pages match; six-screen restart and browser regression pass (ADR-087).
  * [x] Configure service-name selectors through UI; preserve typed IDs and 18 affected widget results; restore labels after restart.
  * [ ] Conduct U0/U5 operator sessions; record raw measurements and compare with baseline.

## Approved constructor/dashboard parity extension (2026-09-14)

* [x] Excel layout, real content bounds, merged headers, row identity and formula diagnostics.
* [x] Convert Types and typed string/null/safe division formulas.
* [x] Unpivot and Window with configuration forms and UI acceptance.
* [x] Build and verify the editable overview graph on the supplied workbook (29 nodes, 9 widgets).
* [x] Horizontal Bar, text KPI and per-column table formats with persistence and regression checks.
* [x] Typed workflow declarations/defaults, Filter references, execution values and cache isolation.
* [x] Editor parameter forms, preview values, stale response protection and UI acceptance.
* [x] Dashboard parameter bindings, URL state, value selectors and navigation actions; UI and restart regression pass.
* [x] Parameterized titles and stable-ID highlighting; preserve complete comparison data.
* [x] Five detailed saved dashboards, following the verified overview.
  * [x] Class: editable branches, four-slice parity, overview actions, URL restoration.
  * [x] Service: shared strict article preparation, full 36-service parity, class navigation.
  * [x] Cost-type overview: totals, leaders, services, classes and article charts; all three types match.
  * [x] Class/Service layout authoring via drag/resize with preserved bindings/navigation.
  * [x] Cost/class: all 12 slices, global class ranks, service shares and article detail.
  * [x] Cost/service: all 108 slices, peer ranks/highlighting, article shares and navigation.
  * [x] Six-screen transitions, normalized labels and reference display precision through UI.
  * [x] Search/open distant workflow nodes; retain draft and avoid selection-only graph saves.
  * [x] All detail layouts, complete restart/theme/language acceptance and final quality gates.
* [x] Reference parity, UI construction/editing, restart and full quality checks.

Specification and screen matrix: docs/OPOP_CONSTRUCTOR_PLAN.md.
Completed: docs/OPOP_CONSTRUCTOR_ACCEPTANCE.md (164 slices, 168 nodes, six dashboards).

## User-requested light theme — 2026-09-14

* [x] Semantic light/dark palette, persistent selector and matching initial server rendering.
* [x] Theme-aware workflow canvas, diagrams, forms and dashboards; preserve unsaved state.
* [x] Browser checks, visual review, documentation and local frontend deployment.

Verified: 26 frontend tests, 13 browser scenarios, ESLint/TypeScript/OpenAPI drift and production build.

## User-requested localization — 2026-09-11

* [x] Russian default, English and Tatar interface, persisted language selector and SSR locale.
* [x] Localized forms, node catalog, errors, dashboards, accessibility, numeric/date presentation.
* [x] Catalog completeness, language-switch/draft preservation and browser acceptance tests.
* [x] Update product/architecture documentation and deploy the checked local frontend.

Verified 2026-09-14: 26 frontend tests, 11 browser scenarios including full restart,
ESLint/TypeScript/OpenAPI check and Docker production build. See docs/LOCALIZATION.md.

## 1. Purpose

This file is the implementation roadmap for the Node BI MVP.

It is intended to be used by an autonomous coding agent.

The roadmap is hierarchical:

Epic
→ Milestone
→ Feature
→ Task
→ Subtask

Task statuses:

* `[ ]` TODO
* `[~]` IN PROGRESS
* `[x]` DONE
* `[!]` BLOCKED

A task must not be marked complete until its acceptance criteria are satisfied.

---

# 2. Global Execution Rules

Before starting any task:

1. Read `AGENTS.md`.
2. Read `STATUS.md`.
3. Read relevant sections of `PRODUCT_SPEC.md`.
4. Read relevant sections of `ARCHITECTURE.md`.
5. Read relevant entries from `DECISIONS.md`.
6. Inspect existing implementation.
7. Confirm prerequisites.
8. Mark the task `[~] IN PROGRESS`.

After implementing:

1. run relevant tests;
2. fix failures;
3. run tests again;
4. review implementation;
5. update documentation if needed;
6. mark task `[x] DONE`;
7. update `STATUS.md`;
8. continue to the next actionable task.

Do not stop between normal tasks.

---

# 3. Global Definition of Done

The MVP is complete only when:

* all release-blocking milestones are complete;
* all P0 defects are fixed;
* all P1 defects are fixed;
* backend tests pass;
* frontend tests pass;
* E2E critical journey passes;
* lint passes;
* TypeScript typecheck passes;
* frontend production build succeeds;
* migrations work from a clean database;
* documented Docker Compose startup succeeds;
* canonical user journey succeeds;
* project persists across restart.

---

# 4. Milestone Dependency Graph

## Astra revision gate (2026-09-09)

Preserve completed milestone history; the findings below reopen their affected acceptance criteria.
See `docs/ASTRA_HANDOFF.md` for provenance and the original defect reproductions.

* `[x]` A01: reject foreign graph IDs atomically; regress on SQLite and PostgreSQL.
* `[x]` A02/A03: collision-safe Excel headers and explicit full-sheet type conversion.
* `[x]` A04/A05: separate format/revision, optimistic concurrency, durable autosave and stale-result handling.
* `[x]` A06/A07: source validation before cache, scoped keys, memory bounds and source/schema reuse.
* `[x]` A08: application boundaries, editor decomposition, generated API types and structured errors.
* `[x]` A09: compensating upload cleanup and repeatable source/project file deletion.
* `[x]` A10: PostgreSQL regressions and browser acceptance automation.
* `[x]` Review ADR-001–ADR-049 individually and record evidence/limitations/disposition.
* `[x]` Revalidate deployment, resource limits, dependency reproducibility and documentation.
* `[x]` After M10, build an early Bar Chart + KPI + dashboard acceptance slice, then
  complete M11 and all remaining M12/M13 requirements before M14–M16.


```text
M0 Specification
      ↓
M1 Repository Bootstrap
      ↓
M2 Persistence Foundation
      ↓
M3 Project Management
      ↓
M4 Excel Data Sources
      ↓
M5 Dataset + Schema Domain
      ↓
M6 Workflow Persistence + Node Registry
      ↓
M7 Workflow Editor
      ↓
M8 Validation + Schema Propagation
      ↓
M9 Execution Engine
      ↓
M10 Core Transformation Nodes
      ↓
M11 Advanced Transformation Nodes
      ↓
M12 Visualization System
      ↓
M13 Dashboard System
      ↓
M14 Persistence + Recovery Hardening
      ↓
M15 QA + Performance + Security
      ↓
M16 MVP Release Gate
```

Some frontend and backend tasks may be developed in parallel when dependencies permit.

---

# 5. Milestone M0 — Product and Architecture Baseline

Status:

`[x] DONE`

Goal:

Establish the persistent documentation and architectural boundaries required for autonomous development.

## Tasks

* `[x]` M0.1 Create `AGENTS.md`
* `[x]` M0.2 Create `PRODUCT_SPEC.md`
* `[x]` M0.3 Create `ARCHITECTURE.md`
* `[x]` M0.4 Create `TASKS.md`
* `[x]` M0.5 Create initial `STATUS.md`
* `[x]` M0.6 Create initial `DECISIONS.md`
* `[x]` M0.7 Create initial `README.md`

## Acceptance Criteria

* all required root documentation files exist;
* responsibilities of each document are clear;
* MVP scope is explicit;
* architecture boundaries are explicit;
* roadmap exists;
* Codex can determine the next task from repository state alone.

---

# 6. Milestone M1 — Repository Bootstrap

Status:

`[x] DONE`

Goal:

Create a runnable frontend/backend development environment.

Depends on:

M0.

## M1.1 Repository Structure

* `[x]` Create `frontend/`
* `[x]` Create `backend/`
* `[x]` Create `tests/e2e/`
* `[x]` Create `fixtures/excel/`
* `[x]` Create Docker-related files
* `[x]` Add `.gitignore`
* `[x]` Add `.env.example`

Acceptance:

Repository structure matches architectural boundaries.

---

## M1.2 Frontend Bootstrap

* `[x]` Initialize Next.js application
* `[x]` Enable TypeScript strict mode
* `[x]` Configure Tailwind
* `[x]` Configure shadcn/ui
* `[x]` Configure ESLint
* `[x]` Configure frontend tests
* `[x]` Add base application shell

Acceptance:

* frontend starts locally;
* lint succeeds;
* typecheck succeeds;
* production build succeeds.

---

## M1.3 Backend Bootstrap

* `[x]` Initialize Python backend
* `[x]` Configure FastAPI
* `[x]` Configure Pydantic settings
* `[x]` Configure SQLAlchemy
* `[x]` Configure Alembic
* `[x]` Configure test framework
* `[x]` Configure formatter/linter
* `[x]` Add application startup
* `[x]` Add `/health`
* `[x]` Add `/ready`

Acceptance:

Backend starts and health endpoint returns success.

---

## M1.4 PostgreSQL

* `[x]` Add PostgreSQL service to Docker Compose
* `[x]` Add database environment configuration
* `[x]` Verify backend connection
* `[x]` Verify migrations can run

Acceptance:

Fresh local environment can connect to PostgreSQL.

---

## M1.5 Docker Compose

* `[x]` Add frontend service
* `[x]` Add backend service
* `[x]` Add PostgreSQL service
* `[x]` Add persistent database volume
* `[x]` Add persistent source-file volume
* `[x]` Verify internal networking

Acceptance:

```text
docker compose up
```

starts the complete development stack.

---

## M1 Quality Gate

Run:

* backend tests;
* frontend tests;
* lint;
* typecheck;
* frontend production build;
* clean Docker Compose startup.

Do not start M2 until this gate passes.

---

# 7. Milestone M2 — Persistence Foundation

Status:

`[x] DONE`

Goal:

Establish database, repository, transaction, and storage foundations.

Depends on:

M1.

---

## M2.1 Base Database Model

* `[x]` Create UUID strategy
* `[x]` Create timestamp conventions
* `[x]` Create SQLAlchemy base
* `[x]` Create migration infrastructure
* `[x]` Define cascade conventions

---

## M2.2 Initial Database Tables

Create migrations for:

* `[x]` `projects`
* `[x]` `data_sources`
* `[x]` `workflows`
* `[x]` `workflow_nodes`
* `[x]` `workflow_edges`
* `[x]` `visualizations`
* `[x]` `dashboards`
* `[x]` `dashboard_widgets`

Acceptance:

All tables can be created from a clean database using migrations.

---

## M2.3 Repository Interfaces

Create interfaces or equivalent abstractions for:

* `[x]` ProjectRepository
* `[x]` SourceRepository
* `[x]` WorkflowRepository
* `[x]` VisualizationRepository
* `[x]` DashboardRepository

---

## M2.4 PostgreSQL Repository Implementations

* `[x]` Implement project repository
* `[x]` Implement source repository
* `[x]` Implement workflow repository
* `[x]` Implement visualization repository
* `[x]` Implement dashboard repository

---

## M2.5 StorageProvider

* `[x]` Define `StorageProvider`
* `[x]` Implement `LocalStorageProvider`
* `[x]` Generate backend-controlled storage keys
* `[x]` Prevent path traversal
* `[x]` Add delete behavior
* `[x]` Add existence checks

---

## M2.6 Transaction Behavior

* `[x]` Define transaction boundaries
* `[x]` Implement atomic workflow save
* `[x]` Add rollback tests

Acceptance:

Partial workflow persistence cannot remain after failed transaction.

---

## M2 Quality Gate

Tests must verify:

* clean migrations;
* CRUD repository behavior;
* storage persistence;
* path safety;
* transaction rollback.

---

# 8. Milestone M3 — Project Management

Status:

`[x] DONE`

Goal:

Allow users to create and manage BI projects.

Depends on:

M2.

---

## M3.1 Project Backend

Implement:

* `[x]` create project
* `[x]` list projects
* `[x]` get project
* `[x]` rename project
* `[x]` delete project

API:

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{project_id}
PATCH  /api/v1/projects/{project_id}
DELETE /api/v1/projects/{project_id}
```

---

## M3.2 Project Validation

* `[x]` validate project name
* `[x]` handle missing project
* `[x]` implement deletion confirmation contract
* `[x]` verify cascade behavior

---

## M3.3 Project Frontend

* `[x]` project list page
* `[x]` create-project interaction
* `[x]` open project
* `[x]` rename project
* `[x]` delete project
* `[x]` loading states
* `[x]` empty state
* `[x]` error states

---

## M3.4 Project Shell

Within an open project provide navigation for:

* `[x]` Data
* `[x]` Workflow
* `[x]` Dashboard

---

## M3 Acceptance

User can:

1. create `Sales Analysis`;
2. reload browser;
3. see project;
4. open project;
5. rename project;
6. delete a separate test project.

---

# 9. Milestone M4 — Excel Data Sources

Status:

`[x] DONE`

Goal:

Allow users to upload and inspect Excel workbooks.

Depends on:

M2, M3.

---

## M4.1 WorkbookReader Contract

* `[x]` define `WorkbookReader`
* `[x]` define WorkbookInfo
* `[x]` define WorksheetInfo
* `[x]` define worksheet loading options

---

## M4.2 Excel Inspection

Support:

* `[x]` `.xlsx`
* `[x]` `.xlsm`
* `[x]` worksheet discovery
* `[x]` workbook metadata
* `[x]` sheet dimensions where practical
* `[x]` basic validation

---

## M4.3 Upload Pipeline

* `[x]` multipart upload endpoint
* `[x]` validate extension
* `[x]` enforce upload size limit
* `[x]` generate storage key
* `[x]` persist DataSource metadata
* `[x]` inspect workbook after upload
* `[x]` return structured errors

---

## M4.4 Excel Security

* `[x]` macros never execute
* `[x]` filenames are metadata only
* `[x]` source path cannot be provided by frontend
* `[x]` corrupt workbook produces controlled error

---

## M4.5 Worksheet Metadata

* `[x]` sheet list API
* `[x]` column discovery
* `[x]` type inference
* `[x]` nullability inference where practical
* `[x]` row preview

---

## M4.6 Excel Edge Cases

Test:

* `[x]` empty workbook
* `[x]` empty sheet
* `[x]` multiple sheets
* `[x]` blank headers
* `[x]` duplicate headers
* `[x]` unicode headers
* `[x]` dates
* `[x]` booleans
* `[x]` null values
* `[x]` mixed-type columns

---

## M4.7 Data Source Frontend

* `[x]` upload interface
* `[x]` upload progress/loading
* `[x]` source list
* `[x]` worksheet selector
* `[x]` schema display
* `[x]` table preview
* `[x]` source errors
* `[x]` delete unused source

---

## M4.8 Source Dependency Protection

* `[x]` prevent deleting source used by workflow
* `[x]` return dependency error
* `[x]` display user-friendly message

---

## M4 Acceptance

User can:

1. open project;
2. upload Excel workbook;
3. inspect sheets;
4. select `Sales`;
5. inspect columns;
6. preview rows;
7. reload project;
8. still see uploaded source.

---

# 10. Milestone M5 — Dataset and Schema Domain

Status:

`[x] DONE`

Goal:

Create source-independent analytical data abstractions.

Depends on:

M4.

---

## M5.1 Logical Data Types

Implement:

* `[x]` STRING
* `[x]` INTEGER
* `[x]` FLOAT
* `[x]` BOOLEAN
* `[x]` DATE
* `[x]` DATETIME
* `[x]` UNKNOWN

---

## M5.2 ColumnSchema

Define:

* `[x]` stable ID
* `[x]` internal name
* `[x]` display name
* `[x]` logical type
* `[x]` nullable
* `[x]` metadata

---

## M5.3 DatasetSchema

* `[x]` ordered columns
* `[x]` lookup by stable ID
* `[x]` lookup by name
* `[x]` duplicate label support
* `[x]` serialization

---

## M5.4 Dataset

* `[x]` define runtime Dataset abstraction
* `[x]` define metadata
* `[x]` wrap Polars representation cleanly
* `[x]` prevent Excel-specific semantics leaking downstream

---

## M5.5 Polars Type Mapping

Implement:

```text
Polars dtype
→
Logical Data Type
```

and relevant reverse mappings.

Status: `[x] DONE`

---

## M5.6 Column Identity Strategy

* `[x]` finalize internal column identity approach
* `[x]` record decision in `DECISIONS.md`
* `[x]` implement duplicate header behavior

---

## M5 Acceptance

A selected worksheet can be loaded as a source-independent Dataset with deterministic schema.

---

# 11. Milestone M6 — Workflow Persistence and Node Registry

Status:

`[x] DONE`

Goal:

Create persistent workflow graph and extensible node system.

Depends on:

M5.

---

## M6.1 Workflow Domain

Implement:

* `[x]` Workflow
* `[x]` NodeInstance
* `[x]` WorkflowEdge
* `[x]` Position
* `[x]` ports
* `[x]` workflow version

---

## M6.2 Workflow Persistence

Backend:

* `[x]` create workflow
* `[x]` get workflow
* `[x]` save complete graph
* `[x]` delete workflow
* `[x]` atomic save
* `[x]` reload graph

---

## M6.3 NodeDefinition

Define:

* `[x]` type
* `[x]` version
* `[x]` category
* `[x]` input ports
* `[x]` output ports
* `[x]` config schema
* `[x]` schema inference mode
* `[x]` executor binding
* `[x]` display metadata

---

## M6.4 Node Registry

* `[x]` create registry
* `[x]` lookup by type/version
* `[x]` duplicate registration protection
* `[x]` unknown node handling
* `[x]` node catalog listing

---

## M6.5 Node Executor Contract

Implement common contract for:

* `[x]` validate
* `[x]` infer_schema
* `[x]` execute

---

## M6.6 Initial Excel Source Node

Implement:

```text
ExcelSource
```

with:

* `[x]` source selection
* `[x]` sheet selection
* `[x]` schema inference
* `[x]` execution
* `[x]` errors

---

## M6.7 Node Catalog API

Expose node definitions required by frontend.

At minimum:

* `[x]` type
* `[x]` version
* `[x]` category
* `[x]` display name
* `[x]` port metadata

---

## M6 Acceptance

A workflow containing one Excel Source node can be persisted, reloaded, schema-resolved, and executed.

---

# 12. Milestone M7 — Workflow Editor

Status:

`[x] DONE`

Goal:

Provide visual graph editing using React Flow.

Depends on:

M6.

---

## M7.1 Editor Canvas

* `[x]` React Flow integration
* `[x]` pan
* `[x]` zoom
* `[x]` fit view
* `[x]` node movement

---

## M7.2 Node Library

* `[x]` source category
* `[x]` transformation category
* `[x]` visualization category
* `[x]` searchable or clearly browsable node list
* `[x]` add node to canvas

Search functionality may remain simple.

---

## M7.3 Node Rendering

Node card should display:

* `[x]` node name
* `[x]` node type/icon
* `[x]` input ports
* `[x]` output ports
* `[x]` node state
* `[x]` error indicator

---

## M7.4 Selection

* `[x]` select node
* `[x]` deselect
* `[x]` selected state
* `[x]` configuration panel opens

---

## M7.5 Edges

* `[x]` connect nodes
* `[x]` disconnect edges
* `[x]` validate local compatibility
* `[x]` display connections clearly

Backend validation remains authoritative.

---

## M7.6 Delete Operations

* `[x]` delete node
* `[x]` delete edge
* `[x]` remove associated edges from local state
* `[x]` persist deletion

---

## M7.7 Workflow Persistence

* `[x]` load graph
* `[x]` map backend nodes to React Flow
* `[x]` save graph
* `[x]` debounced autosave
* `[x]` save status UI
* `[x]` failed-save UI

---

## M7.8 Editor State

Use:

* TanStack Query for server state;
* Zustand where appropriate for editor interaction state.

Do not duplicate persistent workflow state unnecessarily.

---

## M7 Acceptance

User can:

1. open workflow;
2. add Excel Source;
3. move it;
4. add another node;
5. connect nodes;
6. reload browser;
7. see same graph positions and edges.

---

# 13. Milestone M8 — Validation and Schema Propagation

Status:

`[x] DONE`

Goal:

Make graph configuration type-aware and fail early.

Depends on:

M6, M7.

---

## M8.1 Graph Validator

Implement:

* `[x]` duplicate node ID detection
* `[x]` invalid edge detection
* `[x]` missing node detection
* `[x]` port validation
* `[x]` required-input validation
* `[x]` maximum-input validation

---

## M8.2 Cycle Detection

* `[x]` detect cycles
* `[x]` reject cyclic graph execution
* `[x]` expose structured error
* `[x]` optionally prevent cycle in frontend

---

## M8.3 Topological Ordering

* `[x]` deterministic topological sort
* `[x]` tests for independent branches
* `[x]` tests for invalid DAG

---

## M8.4 Schema Propagation

Implement:

```text
source schema
→
node inference
→
downstream schema
```

* `[x]` schema resolution service
* `[x]` per-node schema result
* `[x]` validation errors
* `[x]` warnings

---

## M8.5 Schema Inference Modes

Implement support for:

* `[x]` STATIC
* `[x]` DATA_DEPENDENT
* `[x]` UNKNOWN_UNTIL_EXECUTION

---

## M8.6 Frontend Schema Integration

* `[x]` fetch resolved schemas
* `[x]` populate column selectors
* `[x]` show logical types
* `[x]` invalidate removed fields
* `[x]` display schema errors

---

## M8 Acceptance

Removing an upstream field causes affected downstream config to become visibly invalid without crashing the application.

---

# 14. Milestone M9 — Execution Engine

Status:

`[x] DONE`

Goal:

Execute target workflow branches deterministically.

Depends on:

M8.

---

## M9.1 ExecutionContext

Implement:

* `[x]` project ID
* `[x]` workflow ID
* `[x]` execution ID
* `[x]` repositories
* `[x]` storage
* `[x]` logger
* `[x]` settings
* `[x]` cache

---

## M9.2 Execution Planner

Given target node:

* `[x]` discover ancestors
* `[x]` create execution subgraph
* `[x]` topologically order dependencies
* `[x]` exclude unrelated branches

---

## M9.3 Runtime Input Routing

* `[x]` map edge outputs to target ports
* `[x]` support one-input nodes
* `[x]` support two-input nodes
* `[x]` validate missing runtime values

---

## M9.4 Node Execution

* `[x]` resolve NodeDefinition
* `[x]` resolve NodeExecutor
* `[x]` execute node
* `[x]` retain intermediate results
* `[x]` attribute errors to node

---

## M9.5 Execution Result

Define structured result containing:

* `[x]` status
* `[x]` output
* `[x]` schema
* `[x]` metadata
* `[x]` warnings
* `[x]` duration

---

## M9.6 Execution Errors

Support structured failures:

* `[x]` validation failure
* `[x]` source failure
* `[x]` transformation failure
* `[x]` type failure
* `[x]` internal failure

---

## M9.7 Cache

Implement simple cache.

* `[x]` cache key generation
* `[x]` source identity included
* `[x]` node version included
* `[x]` config included
* `[x]` upstream identity included
* `[x]` descendant invalidation behavior

Initial implementation may use memory.

---

## M9.8 Preview API

Implement:

```text
POST /api/v1/workflows/{workflow_id}/nodes/{node_id}/preview
```

with:

* `[x]` server-side row limit
* `[x]` schema
* `[x]` preview rows
* `[x]` duration
* `[x]` total rows where practical
* `[x]` structured errors

---

## M9.9 Frontend Preview

* `[x]` preview panel
* `[x]` table
* `[x]` schema
* `[x]` row count
* `[x]` execution duration
* `[x]` loading state
* `[x]` error state
* `[x]` empty result state

---

## M9 Acceptance

User can select an Excel Source node and preview data through the generic workflow execution system.

---

# 15. Milestone M10 — Core Transformation Nodes

Status:

`[x] DONE`

Goal:

Implement the most common data manipulation operations.

Depends on:

M9.

Implementation sequence:

1. Select Columns
2. Rename Columns
3. Filter
4. Sort
5. Limit
6. Calculated Column
7. Group By / Aggregate

Each node must include:

* config model;
* validation;
* schema inference;
* execution;
* frontend configuration;
* unit tests;
* integration tests.

---

## M10.1 Select Columns

* `[x]` backend definition
* `[x]` executor
* `[x]` schema inference
* `[x]` config UI
* `[x]` tests

Acceptance:

Output contains only selected fields in configured order.

---

## M10.2 Rename Columns

* `[x]` backend definition
* `[x]` collision validation
* `[x]` schema inference
* `[x]` executor
* `[x]` config UI
* `[x]` tests

---

## M10.3 Filter

Support:

Numeric:

* `[x]` equals
* `[x]` not equals
* `[x]` greater than
* `[x]` greater/equal
* `[x]` less than
* `[x]` less/equal

String:

* `[x]` equals
* `[x]` not equals
* `[x]` contains
* `[x]` does not contain
* `[x]` starts with
* `[x]` ends with

Null:

* `[x]` is null
* `[x]` is not null

Combination:

* `[x]` AND

Optional if stable:

* `[ ]` OR

---

## M10.4 Sort

* `[x]` multi-column sort
* `[x]` ascending
* `[x]` descending
* `[x]` schema unchanged
* `[x]` tests

---

## M10.5 Limit

* `[x]` positive limit
* `[x]` reject invalid limit
* `[x]` schema unchanged
* `[x]` tests

---

## M10.6 Formula Engine

Before Calculated Column:

* `[x]` select parser strategy
* `[x]` record ADR
* `[x]` parse allowlisted arithmetic
* `[x]` build safe AST
* `[x]` reject arbitrary function access
* `[x]` reject imports/code execution
* `[x]` validate column references
* `[x]` infer output type

Security tests are mandatory.

---

## M10.7 Calculated Column

* `[x]` output field name
* `[x]` expression
* `[x]` formula validation
* `[x]` executor
* `[x]` schema inference
* `[x]` config UI
* `[x]` error UI
* `[x]` tests

Canonical acceptance:

```text
revenue = quantity * price
```

---

## M10.8 Group By / Aggregate

Group dimensions:

* `[x]` one field
* `[x]` multiple fields

Aggregations:

* `[x]` count

* `[x]` sum

* `[x]` average

* `[x]` min

* `[x]` max

* `[x]` distinct count if practical

* `[x]` generated output names

* `[x]` custom output names where appropriate

* `[x]` type validation

* `[x]` schema inference

* `[x]` config UI

* `[x]` tests

Canonical acceptance:

```text
group by category
sum revenue
```

---

## M10 Quality Gate

Verified 2026-09-10: browser-built Excel -> Filter -> Calculated Column -> Group By,
preview and reload restoration. 155 backend tests, 14 frontend tests, 4 browser scenarios.


Canonical pipeline must work:

```text
ExcelSource
→ Filter
→ CalculatedColumn
→ GroupBy
```

User must be able to preview final aggregated result.

---

# 16. Milestone M11 — Advanced Transformation Nodes

Status:

`[x] DONE`

Goal:

Complete required MVP transformation set.

Depends on:

M10.

---

## M11.1 Join

Support:

* `[x]` two dataset inputs
* `[x]` inner join
* `[x]` left join
* `[x]` one join key
* `[x]` compatible key validation
* `[x]` duplicate field strategy
* `[x]` schema inference
* `[x]` executor
* `[x]` config UI
* `[x]` tests

Optional after stable implementation:

* `[ ]` multi-column joins
* `[ ]` right join
* `[ ]` full outer join

---

## M11.2 Union

* `[x]` two inputs
* `[x]` matching column validation
* `[x]` type compatibility
* `[x]` deterministic column order
* `[x]` executor
* `[x]` config UI
* `[x]` tests

---

## M11.3 Pivot

* `[x]` index/group field
* `[x]` pivot field
* `[x]` value field
* `[x]` aggregation
* `[x]` data-dependent schema handling
* `[x]` preview
* `[x]` config UI
* `[x]` tests

---

## M11.4 Advanced Node Failure Cases

Test:

* `[x]` incompatible join keys
* `[x]` missing join key
* `[x]` duplicate column conflict
* `[x]` incompatible union
* `[x]` pivot with unexpected values
* `[x]` empty datasets

---

## M11 Acceptance

Verified 2026-09-10: 9 focused node/schema tests and browser Join/Union/Pivot/downstream field-selection scenario.


All transformation nodes listed in `PRODUCT_SPEC.md` operate through the common NodeExecutor architecture.

---

# 17. Milestone M12 — Visualization System

Status:

`[x] DONE`

Goal:

Create reusable semantic visualization system.

Depends on:

M10.

M11 is not required for initial visualization work.

---

## M12.1 Visualization Domain

Implement:

* `[x]` Visualization entity
* `[x]` VisualizationSpec
* `[x]` semantic field encodings
* `[x]` number formatting config
* `[x]` chart configuration validation

---

## M12.2 Visualization Persistence Decision

Finalize and record:

* `[x]` relation between workflow visualization nodes and persisted visualization entities
* `[x]` source node reference behavior
* `[x]` deletion semantics

---

## M12.3 Table

* `[x]` semantic config
* `[x]` bounded data endpoint
* `[x]` frontend table renderer
* `[x]` loading
* `[x]` empty state
* `[x]` errors

---

## M12.4 KPI

Support:

* `[x]` metric field
* `[x]` single-value result
* `[x]` title
* `[x]` number format
* `[x]` frontend renderer

---

## M12.5 Bar Chart

* `[x]` X field
* `[x]` Y field
* `[x]` title
* `[x]` legend
* `[x]` frontend ECharts adapter

---

## M12.6 Line Chart

* `[x]` X field
* `[x]` Y field
* `[ ]` optional series (deferred; not required for MVP)
* `[x]` date handling
* `[x]` renderer

---

## M12.7 Area Chart

* `[x]` line-compatible semantic config
* `[x]` area rendering
* `[x]` tests

---

## M12.8 Pie / Donut

* `[x]` category
* `[x]` value
* `[x]` pie mode
* `[x]` donut mode
* `[x]` renderer

---

## M12.9 Scatter

* `[x]` numeric X
* `[x]` numeric Y
* `[x]` type-aware selector
* `[x]` renderer

---

## M12.10 Chart Data Limits

* `[x]` server-side maximum chart points
* `[x]` controlled warning/error behavior
* `[x]` no silent arbitrary aggregation

---

## M12.11 Visualization Invalidations

Test:

```text
upstream field removed
→
visualization invalid
→
clear UI error
```

---

## M12 Acceptance

Canonical aggregated dataset can produce:

* Bar Chart;
* KPI.

Both must survive project reload.

---

# 18. Milestone M13 — Dashboard System

Status:

`[x] DONE`

Goal:

Allow visualizations to be arranged into persistent dashboards.

Depends on:

M12.

---

## M13.1 Dashboard Persistence

Backend CRUD:

* `[x]` create dashboard
* `[x]` list dashboards
* `[x]` get dashboard
* `[x]` rename dashboard
* `[x]` delete dashboard

---

## M13.2 Dashboard Widget Persistence

Support:

* `[x]` visualization ID
* `[x]` title
* `[x]` x
* `[x]` y
* `[x]` width
* `[x]` height
* `[x]` widget config

---

## M13.3 Dashboard Layout Library

* `[x]` evaluate suitable grid library
* `[x]` record ADR
* `[x]` integrate library

---

## M13.4 Dashboard Editor

* `[x]` empty state
* `[x]` add visualization
* `[x]` remove visualization
* `[x]` drag
* `[x]` resize
* `[x]` save layout
* `[x]` loading states

---

## M13.5 Dashboard Rendering

Per-widget:

* `[x]` loading
* `[x]` success
* `[x]` empty
* `[x]` error

One failed widget must not break unrelated widgets.

---

## M13.6 Dashboard Persistence

Verify:

```text
move
resize
save
reload
```

produces the same layout.

---

## M13.7 Multiple Dashboards

If architecture remains simple:

* `[x]` support multiple dashboards per project

Otherwise:

* Not applicable: multiple dashboards are implemented.

At least one dashboard is mandatory.

---

## M13 Acceptance

Create dashboard containing:

* Revenue by Category Bar Chart
* Total Revenue KPI

Move and resize widgets.

Reload and verify layout.

---

# 19. Milestone M14 — Persistence and Recovery Hardening

Status:

`[x] DONE`

Goal:

Ensure user work survives expected application lifecycle events.

Depends on:

M13.

---

## M14.1 Browser Reload

Verify persistence of:

* `[x]` project
* `[x]` sources
* `[x]` workflow
* `[x]` nodes
* `[x]` positions
* `[x]` edges
* `[x]` configs
* `[x]` visualizations
* `[x]` dashboards
* `[x]` widget layouts

---

## M14.2 Backend Restart

* `[x]` restart backend
* `[x]` reopen project
* `[x]` execute workflow again

---

## M14.3 Database Restart

* `[x]` restart PostgreSQL
* `[x]` verify persistent volume
* `[x]` reload project

---

## M14.4 Source Storage Restart

* `[x]` verify workbook remains
* `[x]` source can execute after container restart

---

## M14.5 Broken References

Test and resolve:

* `[x]` missing source artifact
* `[x]` visualization references deleted node
* `[x]` widget references deleted visualization
* `[x]` edge references missing node

---

## M14.6 Autosave Reliability

* `[x]` debounce behavior
* `[x]` save-failure feedback
* `[x]` retry behavior if appropriate
* `[x]` no silent loss of unsaved state

---

## M14 Acceptance

Canonical project survives full normal stack restart.

---

# 20. Milestone M15 — QA, Security, Performance, UX Hardening

Status:

`[x] DONE`

Goal:

Review the product critically before MVP release.

Depends on:

M14.

---

## M15.1 Dedicated QA Pass

Act as an independent QA engineer.

Do not assume implementation choices are correct.

Create defects for all discovered issues.

---

## M15.2 Excel QA

Test:

* `[x]` unsupported extension
* `[x]` corrupt workbook
* `[x]` empty workbook
* `[x]` empty sheet
* `[x]` large sheet
* `[x]` multiple sheets
* `[x]` blank headers
* `[x]` duplicate headers
* `[x]` unicode
* `[x]` nulls
* `[x]` mixed types
* `[x]` dates

---

## M15.3 Workflow QA

Test:

* `[x]` disconnected node
* `[x]` missing input
* `[x]` invalid port
* `[x]` cycle attempt
* `[x]` node deletion
* `[x]` edge deletion
* `[x]` upstream schema changes
* Not applicable: node duplication is optional and deferred.
* `[x]` browser reload during edits

---

## M15.4 Transformation QA

Test:

* `[x]` empty filter result
* `[x]` divide by zero behavior
* `[x]` invalid formula
* `[x]` unknown field
* `[x]` null arithmetic
* `[x]` sort with null
* `[x]` group empty dataset
* `[x]` incompatible aggregation
* `[x]` join missing key
* `[x]` join incompatible type
* `[x]` union mismatch
* `[x]` pivot unusual categories

---

## M15.5 Visualization QA

Test:

* `[x]` empty result
* `[x]` one-row result
* `[x]` invalid field
* `[x]` large category count
* `[x]` large point count
* `[x]` null values
* `[x]` date values
* `[x]` negative numbers
* `[x]` invalid numeric format

---

## M15.6 Dashboard QA

Test:

* `[x]` empty dashboard
* `[x]` add widget
* `[x]` remove widget
* `[x]` drag
* `[x]` resize
* `[x]` reload
* `[x]` failed widget
* `[x]` multiple widgets sharing upstream data

---

## M15.7 Formula Security QA

Prove that formulas cannot execute:

* `[x]` Python code
* `[x]` imports
* `[x]` filesystem access
* `[x]` shell commands
* `[x]` network access
* `[x]` arbitrary attributes/callables

---

## M15.8 Upload Security QA

Test:

* `[x]` fake extension
* `[x]` path traversal filename
* `[x]` oversized file
* `[x]` invalid source ID
* `[x]` `.xlsm` macro remains inert

---

## M15.9 API Robustness

Test:

* `[x]` invalid UUID
* `[x]` nonexistent project
* `[x]` malformed JSON
* `[x]` domain validation
* `[x]` unexpected server error format
* `[x]` request correlation

---

## M15.10 Performance Pass

Measure representative workload.

Record:

* `[x]` upload time
* `[x]` workbook inspection time
* `[x]` source preview time
* `[x]` filter preview time
* `[x]` group-by preview time
* `[x]` dashboard load time
* `[x]` browser responsiveness

Do not optimize without identified bottleneck.

---

## M15.11 Obvious Performance Problems

Fix issues such as:

* `[x]` unnecessary workbook reload
* `[x]` duplicate executions
* `[x]` full dataset sent to frontend
* `[x]` repeated schema execution
* `[x]` inefficient Python row iteration

---

## M15.12 UX Pass

Review whether user can understand:

* `[x]` where to upload
* `[x]` how to add node
* `[x]` how to connect
* `[x]` how to configure
* `[x]` how to preview
* `[x]` why a node failed
* `[x]` how to create visualization
* `[x]` how to add to dashboard
* `[x]` whether changes are saved

---

## M15.13 Defect Classification

Classify all defects:

* P0
* P1
* P2
* P3

Rules:

* `[x]` all P0 fixed
* `[x]` all P1 fixed
* `[x]` important P2 fixed
* `[x]` deferred P2/P3 documented

---

# 21. Milestone M16 — MVP Release Gate

Status:

`[x] DONE`

Goal:

Prove the complete product meets Definition of Done.

Depends on:

M15.

---

## M16.1 Clean Environment Test

From a clean environment:

* `[x]` copy `.env.example`
* `[x]` start PostgreSQL
* `[x]` run migrations
* `[x]` start backend
* `[x]` start frontend
* `[x]` verify health
* `[x]` verify readiness

Prefer verifying through documented Docker Compose workflow.

---

## M16.2 Canonical Acceptance Workbook

Create or verify deterministic:

```text
fixtures/excel/sales.xlsx
```

Required columns:

```text
order_id
order_date
country
category
product
quantity
price
```

Include:

* multiple countries;
* multiple categories;
* dates;
* nulls;
* representative numeric values.

---

## M16.3 Canonical End-to-End Journey

Execute:

### Project

* `[x]` Create project `Sales Analysis`

### Data

* `[x]` Upload `sales.xlsx`
* `[x]` Select `Sales`
* `[x]` Preview data

### Workflow

Build:

```text
Excel Source
    ↓
Filter
    ↓
Calculated Column
    ↓
Group By
    ↓
Bar Chart
```

Filter:

```text
country = Korea
```

Calculated column:

```text
revenue = quantity * price
```

Group By:

```text
dimension = category
aggregation = SUM(revenue)
```

Bar Chart:

```text
X = category
Y = sum_revenue
```

Verify:

* `[x]` graph valid
* `[x]` preview valid
* `[x]` chart renders

---

## M16.4 KPI Acceptance

Create KPI showing:

```text
Total Revenue
```

Verify correct numeric value.

---

## M16.5 Dashboard Acceptance

Create dashboard.

Add:

* `[x]` Bar Chart
* `[x]` KPI

Then:

* `[x]` move Bar Chart
* `[x]` resize Bar Chart
* `[x]` move KPI
* `[x]` save

---

## M16.6 Browser Reload Acceptance

Reload.

Verify:

* `[x]` project
* `[x]` source
* `[x]` workflow
* `[x]` nodes
* `[x]` edges
* `[x]` node config
* `[x]` chart
* `[x]` KPI
* `[x]` dashboard
* `[x]` layout

---

## M16.7 Stack Restart Acceptance

Restart normal application stack.

Verify:

* `[x]` project remains
* `[x]` workbook remains
* `[x]` workflow executes
* `[x]` dashboard renders

---

## M16.8 Full Automated Checks

Run:

Backend:

* `[x]` unit tests
* `[x]` integration tests
* `[x]` lint/format checks

Frontend:

* `[x]` tests
* `[x]` lint
* `[x]` typecheck
* `[x]` production build

E2E:

* `[x]` canonical journey

---

## M16.9 Migration Validation

From empty database:

* `[x]` run all migrations
* `[x]` verify application startup
* `[x]` run critical persistence tests

---

## M16.10 Documentation Review

Verify:

* `[x]` `AGENTS.md` current
* `[x]` `PRODUCT_SPEC.md` current
* `[x]` `ARCHITECTURE.md` current
* `[x]` `TASKS.md` current
* `[x]` `STATUS.md` current
* `[x]` `DECISIONS.md` current
* `[x]` `README.md` startup works

---

## M16.11 Final Defect Gate

Required:

```text
P0 = 0
P1 = 0
```

Remaining P2/P3 must be documented.

---

## M16.12 Release Status

Only after all M16 acceptance criteria pass:

* `[x]` mark MVP COMPLETE in `STATUS.md`
* `[x]` update README limitations
* `[x]` record final MVP test state
* `[x]` mark milestone DONE

---

# 22. Technical Debt Passes

Technical debt review should occur after major architecture-heavy milestones.

Recommended after:

* M6
* M10
* M13
* M15

Review:

* duplication;
* oversized modules;
* architecture violations;
* missing types;
* poor errors;
* missing tests;
* unstable interfaces;
* inefficient execution;
* undocumented decisions.

Only fix debt that:

* blocks upcoming work;
* creates correctness risk;
* creates serious maintainability problems;
* violates architecture.

Do not perform aesthetic rewrites.

---

# 23. Decision Checkpoints

The following decisions must be recorded in `DECISIONS.md` before the related implementation becomes deeply coupled.

## ADR-041

Column identity strategy.

Required before:

M5 completion.

---

## ADR-050

Workflow graph persistence update strategy.

Required before:

M6 completion.

---

## ADR-010

Node registry structure.

Required before:

M6 completion.

---

## ADR-042

Formula parser / safe expression engine.

Required before:

M10 Calculated Column.

---

## ADR-043

Visualization persistence model.

Required before:

M12.

---

## ADR-044

Dashboard layout library.

Required before:

M13.

---

## ADR-052

Execution cache strategy.

Required before:

M9 completion.

---

## ADR-046

Excel worksheet loading strategy.

Required before:

M4/M5 completion.

---

## ADR-053

Frontend/backend API type synchronization.

Required before substantial frontend API integration.

---

# 24. Optional MVP Features

These features may be implemented only if they do not materially delay release:

* `[ ]` OR condition grouping
* `[ ]` workflow node duplication
* `[ ]` undo/redo
* `[x]` multiple dashboards
* `[ ]` right/full joins
* `[ ]` multi-column join
* `[ ]` advanced formula functions
* `[ ]` graph auto-layout

Optional tasks must never become accidental release blockers unless `PRODUCT_SPEC.md` is explicitly updated.

---

# 25. Explicit Post-MVP Backlog

Do not implement during MVP without product-scope change.

## Data Sources

* `[ ]` CSV
* `[ ]` PostgreSQL
* `[ ]` MySQL
* `[ ]` SQL Server
* `[ ]` REST API
* `[ ]` Google Sheets

## Platform

* `[ ]` authentication
* `[ ]` users
* `[ ]` organizations
* `[ ]` roles
* `[ ]` permissions
* `[ ]` project sharing

## Execution

* `[ ]` background queue
* `[ ]` scheduled refresh
* `[ ]` distributed workers
* `[ ]` Redis
* `[ ]` persistent execution history

## BI

* `[ ]` dashboard filters
* `[ ]` slicers
* `[ ]` drill-down
* `[ ]` cross-filtering
* `[ ]` semantic metrics
* `[ ]` reusable datasets

## Export

* `[ ]` CSV export
* `[ ]` Excel export
* `[ ]` PDF dashboard export
* `[ ]` image export
* `[ ]` PowerPoint export

## AI

* `[ ]` AI workflow creation
* `[ ]` natural language queries
* `[ ]` formula generation
* `[ ]` chart recommendations
* `[ ]` automatic insights

---

# 26. Autonomous Task Selection Algorithm

When selecting the next task:

1. identify the first incomplete milestone whose prerequisites are complete;
2. locate the first actionable TODO task;
3. skip tasks explicitly marked BLOCKED;
4. inspect whether additional technical subtasks are needed;
5. add those subtasks if they are within existing scope;
6. mark active task IN PROGRESS;
7. implement it;
8. test it;
9. mark DONE only after acceptance criteria pass;
10. continue.

Do not jump to visually interesting frontend work if foundational dependency tasks are incomplete.

---

# 27. Blocker Handling

If blocked:

1. mark task `[!] BLOCKED`;
2. explain blocker in `STATUS.md`;
3. identify whether another independent task can proceed;
4. continue independent work if safe;
5. stop only when no meaningful unblocked work remains.

Examples:

```text
BLOCKED: external credential required
```

is valid.

```text
BLOCKED: unsure which button color to use
```

is not valid.

---

# 28. Failed Task Handling

If implementation attempt fails:

1. do not mark task DONE;
2. preserve useful diagnostics;
3. identify root cause;
4. add regression test where appropriate;
5. implement corrected approach;
6. rerun relevant checks;
7. update `STATUS.md` if work spans sessions.

---

# 29. Regression Policy

When a previously completed milestone breaks because of later work:

1. reopen the affected task or create regression task;
2. mark it IN PROGRESS;
3. fix the regression;
4. rerun affected quality gates;
5. only then continue.

Completed status does not override evidence of a real regression.

---

# 30. Progress Reporting

`STATUS.md` should summarize progress rather than duplicating this entire file.

This file contains roadmap truth.

`STATUS.md` contains current execution truth.

Example:

```text
Current milestone:
M10 — Core Transformation Nodes

Current task:
M10.6 Formula Engine

Completed:
M0–M9

Known blockers:
None

Tests:
Backend 142 passing
Frontend 61 passing
E2E 4 passing

Next:
M10.7 Calculated Column
```

---

# 31. MVP Completion Rule

Do not declare completion because:

* most screens exist;
* the happy path works once;
* screenshots look finished;
* code compiles;
* most tests pass.

MVP is complete only when M16 passes in full.

The highest priority is a reliable end-to-end analytical workflow, not the number of implemented files.

## Release evidence (2026-09-11)

Required M0-M16 acceptance is complete. See docs/QA_REPORT.md for test counts,
clean PostgreSQL installation, full browser/restart evidence, findings and deferred limitations.
Optional OR, advanced functions, multi-key/right/full Join, multiple series, duplication,
undo/redo and automatic layout remain outside the required release gate.
