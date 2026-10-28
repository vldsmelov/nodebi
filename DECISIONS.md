# DECISIONS.md

# ADR-219 - Persist bounded XLSX cell appearance without changing calculation semantics

Date: 2026-10-27. Status: ACCEPTED. Continue the owner's highest-priority browser spreadsheet
work with actual source formatting: bold/italic, size6–72, text/fill colours, alignment and wrap.
CellFormatPatch is a domain contract. Separate typed EditorSave.formats operations never replace
a cell value or formula. Sparse format deltas/options stay in the existing revisioned browser
draft. Pages declare capability/protection and return style overrides; CSV rejects format writes
atomically. Simple-table operations map stable row IDs to final coordinates after deletes/appends.
Physical worksheet formatting checks protection at save and preparation. Unprotected formula
appearance can change without authoring its expression; protected values/styles use the explicit
calculation override, preserving original worksheet protection. Structural formula/merge guards stay.
Append cloned font/fill/xf records to original styles.xml and change only targeted s references.
Preserve original style records/namespaces/number formats/protection/precision and all unrelated
archive members. Share identical source-style/patch combinations within a request. Never export
the SDK workbook as the user's source or round-trip complex original assets through openpyxl.
Plain XLSX styling-only saves also bypass whole-book serialization. A regression reproduced an
untouched numeric9007199254740993 becoming9007199254740992 through openpyxl's numeric writer.
For plain-table value/row edits, restore unchanged numeric XML at stable mapped row positions
(including unselected worksheets), and serialize explicitly converted integers/decimals exactly.
This preserves input precision while retaining the existing controlled type conversions.
The existing server recalculation/check/apply remains authoritative. Number-format authoring is
excluded from this step because fullPrecision=false can make it change numerical results.
Frontend keeps format/value histories in one undo order and uses the same dirty/save/discard flow;
Ctrl+B/Ctrl+I format outside native text editing. Panels explain protected selections. No migration,
new dependency, formula engine or structure authoring. Physical sparse writes validate dimensions
from parsed metadata rather than materializing the entire worksheet just to count rows.
Existing value-only retry digests exclude the additive empty formats field for upgrade compatibility.
Reserve a fixed explanation area so protected-cell hints cannot move the grid on selection changes.
Alternatives: SDK-only styling disappears after reopening; rewriting a whole complex workbook risks
assets/caches/protection; mixing value and appearance writes could overwrite exact values/formulas.

# ADR-218 - Editable showcase sources and a reachable spreadsheet entry

Date: 2026-10-26. Status: ACCEPTED. Owner cannot edit the three showcase projects and requests
an additional editor usability pass. The source picker incorrectly inherited pointer-events:none
from the not-yet-mounted canvas readiness state. Gate only actual loading/initialization; an idle
picker is interactive without a mounted canvas. Preserve explicit choice when several files exist,
explain the next action, provide a same-window file switch protected by the existing dirty guard,
and keep long source names within narrow viewports. Toolbar operations finish native input before
acting on session history/data; values paste captures its destination before asynchronous reads.
Search distinguishes an unsubmitted query from no matches. Discard also covers active native edits.
Simple-table row deletions can be restored by stable IDs in the current window until preparation
or apply/discard; preparation materializes a replacement with new row identities and clears recovery.
All three showcase scenarios already have real synthetic CSV/XLSX sources. Do not replace them
with unrelated files. Sales Pareto must reuse the normal prepared sales aggregate, rather than
an independent static category-totals export. Seed new demos through published_input; repair the
existing dedicated Pareto graph through the revisioned API, retaining its visualization/publication
and dashboard identities. Keep historical source files because report history may reference them.
Rebinding changes point keys and source lineage to the actual upstream fields; compare values,
ranks, numeric types/scales and currency, rather than requiring old-origin identity/provenance.
Source preparation/calculation/check/apply remains on the backend. No migration or new dependency.
Acceptance includes ordinary mouse source selection, edit/save/reopen and changed connected chart
data in finance, sales and logistics; no force-click shortcuts or model-only assertions.

# ADR-217 - Native spreadsheet formula interaction is the highest-priority editor path

Date: 2026-10-26. Status: ACCEPTED; owner requires Excel-like interaction/appearance and reports
missing reference highlighting and a stale formula bar on real mouse selection. Supersedes
ADR-215/216's duplicate plain input for formulas. Prioritize this workspace over new BI features.
Use Univer's native formula bar and inline editor with actual f metadata and cached values:
coloured references, mouse range picking, formula tips and native editing/cancel/confirm belong
to one SDK editor. No independent React formula buffer. The app retains staged save/check/apply,
bounded data loading, explicit calculation mode and source protections. Server calculation remains
authoritative. Disable the local formula engine and result application before initialization; the
formula UI/lexer remains for editing. Do not enable worker-only RPC formula mode without a worker.
Fix the SDK binding: CellValueType.NUMBER=2, STRING=1; the prior hardcoded2 mislabeled every text
and empty cell. Raw values remain exact strings; formula-like literals use FORCE_STRING. Numeric
formatting is a view interceptor over explicitly typed source number metadata. BEFORE_CELL_EDIT
restores raw strings; native entry is captured before numeric coercion. No JS number round-trip
for stored identifiers/money. Preserve number/date formats, workbook date system, theme/indexed
colours and borders for display. Source fonts/fills/dimensions/merges remain authoritative.
The pinned SDK facade SelectionChanged can miss events; observe its actual SetSelectionsOperation
after execution and use the workbook selection facade. Name-box routing handles qualified sheet
addresses. Paint newly loaded rows even when preloaded before activation, without repeatedly
repainting the editing cell during reference selection. Readiness gates native controls. A labelled
name box, formula-bar region and live selected-value output provide an accessible bridge.
Native rich clipboard uses the SDK's local copy cache for relative formula translation; destination
cells are loaded and checked before paste. Values-only paste retains literal TSV semantics. Cutting
continues to move values; source structural move semantics are not implied.
No major stack/library replacement or migration. No arbitrary ECharts/browser calculation model.
Full Excel compatibility is not claimed: source format/structure authoring, arrays/macros and
other advanced Office capabilities remain separate work in the highest-priority editor backlog.
Validation must include physical mouse/keyboard and rendered pixels/text, not only the model or
address jumps: selection changes, reference colours, range insertion, empty cells vs actual zero,
formatted numbers/dates, exact codes, save/reopen and source preservation.

# ADR-216 - Explicit calculation editing in the workbook window

Date: 2026-10-26. Status: ACCEPTED; owner requests changing the previously blocked cells.
Supersedes ADR-214/215's blanket formula/locked-value exclusion for supported physical XLSX.
Decision: an explicit Edit calculations toggle permits ordinary formula authoring and locked
cell-value corrections in this local single-author workspace. Each API cell operation carries
separate formula/override_protection flags; literal equals remains literal outside this mode,
and apostrophe-prefixed equals remains text inside it. This changes source content, not application
authorization, worksheet passwords or protection metadata. No global Excel unprotect is performed.
F2/double-click on an existing formula focuses the editable formula bar; new formulas may also
be typed/pasted into the grid. Results stay pending until server recalculation, never calculated
by Univer. Undo/redo retain the formula/value distinction. Common Russian function names, decimal
commas and semicolon arguments normalize outside quoted strings/names; English formulas remain
supported. Backend allowlist and saved-external-cache guards run before draft persistence and again
before rendering; no network/DDE/macros/add-ins or new external links. A calculation error leaves
the sparse draft editable and active report unchanged. Existing revision/receipt/check/apply remains.
Patch formula XML surgically, invalidate stale calcChain and its package references, retain original
precision/assets/protection/merges, and calculate the same stripped copy with pinned LibreOffice.
Merged-area selection resolves to its top-left anchor. Resolve shared-formula members with
openpyxl Translator, then expand only an edited group to explicit formulas before recalculation;
other members retain their relative/absolute references. Array/data-table groups and their occupied
ranges remain structurally protected; editing individual members would corrupt them.
CSV/imported-table formula semantics, style/merge/row/column authoring stay outside this change.
No migration, new engine, dependency or permission workflow is introduced. A mode toggle resets
on window reload and survives save/continue in the current window. Sparse operation metadata is
additive; old drafts/default API writes retain their literal/protected behavior.
Alternatives: removing readonly only in React loses formulas and bypasses backend guarantees;
unprotecting or rewriting the entire workbook would discard intentional source structure/assets.
Consequence: ordinary calculations become editable with the same atomic update path, while
unsupported structural groups receive a distinct explanation instead of the old blanket ban.

# ADR-215 - Standalone spreadsheet window using Univer OSS

Date: 2026-10-26. Status: ACCEPTED; owner rejected the modal/table UI and requested an
Excel/Sheets/Calc-like workspace. Keep ADR-214's proven source patch/recalculation pipeline.
Decision: integrate pinned Univer Sheets OSS1.2.0 (Apache-2.0) as the interaction/rendering
surface in /spreadsheet/{projectId}. Source/report links open it in a separate browser window
from the user gesture. Legacy update links still work; a generic entry chooses a source (or
opens the only one). No project navigation chrome in the editor window. Custom corporate title,
Home/View ribbon, formula/value/address bar, native worksheet tabs/grid/range selection/inline
editing/zoom, clipboard values, search, undo/redo, freeze and save shortcuts. Excel fonts/fills,
merges and dimensions are read for presentation. Native formatting/structural authoring commands
are not exposed as if they persisted. Column sizing/zoom/freeze are editor view preferences,
retained through saves in the same window, not changes to source-file formatting.
Univer never evaluates source formulas or exports the original workbook. Disable its formula
engine before startup, feed literal strings/cached results with text formatting, and show original
formula text in our protected formula bar. This avoids Float64/client recalculation changing exact
IDs/money or the workbook's precision-as-displayed semantics. Pasted ranges validate atomically;
formula/protected/merged followers and unloaded cells cannot be overwritten. Calculations remain
on the backend. Only OSS packages are used; no Pro importer/exporter, account, server or cloud.
Add typed workspace/appearance and literal find APIs. Rows still load in <=100-row/2000-cell
blocks on viewport demand with revision checks; never transfer100k rows just to show the grid.
Unloaded cells are not editable empty cells. CSV/plain tables have a protected synthetic header
and stable server IDs, plus existing staged row operations. Drafts remain sparse revisioned
ReportDocuments; save chunks use existing replay receipts, then prepare/check/exact apply.
Warnings stay inline; cancel-all abandons the update with CAS and starts explicitly fresh data.
After save reopen a current-base draft and retain the selected cell/view. BroadcastChannel
invalidates the parent report tab after apply. App source/history/layout state remains backend.
SDK instances are isolated in owned DOM mounts; deferred initialization/disposal avoids React19
StrictMode/SDK roots racing. Gate interaction/scroll restoration on SDK Steady lifecycle, not
the appearance of a canvas element. Releasing the old SDK before creating the next prevents
stale controller injection after save. Native SDK strings fall back to Russian for Tatar; Node BI
controls remain RU/EN/TT. Window close protects unsaved edits; saved drafts can be resumed.
Use the public isCellEditing() facade to distinguish native cell text editing from the SDK's
hidden contenteditable focus target: range copy/paste/undo must not silently use that empty field.
Await endEditingAsync(true) before testing/sending pending changes, restore the active cell,
and guard native edit sessions on close. Ctrl+S and the enabled Save button must include text
still being entered, without requiring an extra Enter; serialize this commit against repeat saves.
Coalesce in-flight opening requests by their receipt ID so React StrictMode does not submit
concurrent identical draft inserts (also important for the disposable SQLite acceptance server).
Disable both force-string and number-format text alerts/marks because literal transport is
intentional; normal source identifiers and cached values must not appear as cell warnings.
Alternatives: Handsontable's current commercial terms need a separate purchase decision;
Glide's latest stable peer range excludes React19; full hosted office/WOPI adds a service and
operational scope. Univer supports current React and native worksheet interactions, while our
backend adapters avoid its commercial file-conversion layer. The dependency/bundle cost is
isolated to the standalone dynamically loaded editor; Next/React/Polars/graph remain unchanged.
References: https://github.com/dream-num/univer and
https://docs.univer.ai/guides/sheets/getting-started/installation .
Consequences: this delivers a familiar input workbook workspace, not unrestricted Excel formula,
macro, chart, style or structural authoring. Existing formula/cache/source-base safety still applies.

# ADR-214 - Interactive complex-workbook inputs with server recalculation

Date: 2026-10-26. Status: ACCEPTED; owner explicitly rejected the Excel download fallback
for data_example and requested direct browser editing. Supersedes ADR-211/212's formula-book ban.
Decision: retain the simple table/CSV editor and add physical XLSX worksheet editing automatically
when table editing is unavailable. Show sheet selection, Excel coordinates, cell/formula bar,
paste, undo, paging and row navigation. Formulas and merged followers are read-only; worksheet
protection respects explicitly unlocked cell styles. Preserve structural rows/columns in this mode.
Patch only edited input cells and recalculated formula caches in original OOXML worksheet parts;
all unrelated ZIP parts retain original bytes. Never openpyxl-save the original complex workbook.
Recalculate a stripped data/formula/number-format/name copy with pinned LibreOffice26.2.6,
checksum verified in the amd64 Docker image. Copy workbook calculation precision: the real input
uses fullPrecision=false; omitting it changed6645 formula caches without any user correction.
With the setting and manual-hidden/active-filter distinction preserved all13219 original results
agree within1e-6/1e-10 relative tolerance, including Linux with network access disabled.
Literal input values remain unchanged by calculation; no JS number conversion/evaluation.
Only allowlisted functions enter Calc. Substitute numeric-index external references with literal
saved external cache sheets; never forward file paths, external relationships, macros or embedded
assets. Explicitly display this limitation and require existing check-warning acknowledgement
before applying a prepared version using those external caches. Missing caches/unsupported
functions/new formula errors/timeouts leave the original and browser draft unchanged.
Use a fresh restricted macro/link profile, single-process concurrency gate and90s conversion
timeout with process-tree cleanup. New API fields are additive; no migration or alternate graph
engine. Existing revision/base/check/apply guards remain authoritative. All parts remain source
artifacts accessed through StorageProvider. This is input editing, not arbitrary formula authoring,
macro execution, network refresh, full Excel compatibility or structural workbook design.
Alternatives: sending users back to Excel fails the requested journey; openpyxl round-trip drops
caches/features; a browser spreadsheet evaluator would duplicate backend execution and precision.
Consequence: larger backend image/first build; Docker bundles the runtime, local Python execution
needs supported LibreOffice (>=26.2.5) or NODEBI_SPREADSHEET_BINARY. Windows26.2.6.3 verified.
References: official LibreOffice command-line and macro-security documentation and26.2.5 fixes
at https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html and
https://www.libreoffice.org/security/. No claim of unrestricted Excel or cloud safety.

# ADR-213 - Audit-driven reliability, dependency security and safe local updates

Date: 2026-10-26. Status: ACCEPTED; owner requested full audit and implementation improvements.
Context: runtime code was functional, but recent UI changes had14 failing frontend checks and
manual update practices lacked a verified joint DB/file backup. An auto-save could accept a newer
checked revision, and a dropped apply response showed failure despite a successful server commit.
Decision: bind quick-save completion to exact job/update/token/revision; reconcile only an exact
applied receipt after failure; abort future polling/auto-apply on editor unmount. Surface failed
project deletion, improve control-boundary contrast and synchronize chart separator panel colours.
Update obsolete test expectations for the approved corporate palette/view-mode/collapsed history,
without weakening contrast, exact-statistics, field identity or conflict assertions. Add targeted
input editor, clipboard and lost-response/conflict regression. Resume regression under this audit.
Dependency scans on this date require Next16.4.3, sharp0.35.5, source-map-js1.2.2 and Mako1.4.2;
Vitest/dev transitive fixes remain within existing compatible ranges. No replacement stack.
Add a Compose-aware PowerShell updater with read-only preflight, per-stack lock, build-first,
quiesced pg_dump/source backup and checksum manifest, guarded restart/readiness, explicit recovery.
Refuse volume/root/external-DB changes. No destructive down -v, git reset/pull, automatic data
restore, schema downgrade or PostgreSQL major upgrade. Pin already-used container base digests.
Alternatives: restarting on mutable tags can change the runtime unexpectedly; snapshotting only
PostgreSQL omits immutable files; automatically restoring on any update error risks data loss.
Consequences: short planned API/UI downtime during a consistent local snapshot; private backups
must be protected/offsite-copied. CI configuration is added but not remotely executed in this
session. This does not certify unrestricted Excel/formula editing, remote hosting or full WCAG.

# ADR-212 - Direct correction and one-action guarded save

Date: 2026-10-21. Status: ACCEPTED; owner rejected the disabled editor and multi-step workflow.
Context: editor availability was incorrectly tied to template availability, excluding all legacy
Excel. Normal corrections exposed draft/prepare/check/apply as separate user actions and cluttered
the history with empty drafts. Read-only inspection of data_example confirms25 sheets and13219
formula cells on24 sheets; its browser limitation is real, not just missing import metadata.
Decision: source-specific links open directly, source cards select among multiple inputs. Reuse
safe same-base browser/empty drafts. One Save changes stages the file, runs the existing backend
check job and applies the checked revision only when no issues exist. Errors remain in the dialog;
warnings require explicit inline acknowledgement/confirmation. Save is the user's explicit apply
intent; no passive autosave activates data. Advanced operations/draft controls/history are collapsed.
Decouple template availability from editor opening. Plain legacy XLSX derives physical input
profiles from existing node layouts and uses shared strict backend conversion to preserve native
types. Never migrate existing source/node IDs. Conflicting/complex layouts and period sets remain
unsupported. For formula/complex books, offer download and corrected-file upload in the same
dialog and run check/apply with Save changes. No general Excel evaluator, cache invalidation or
formula flattening is introduced. Formula recalculation still belongs in Excel for these inputs.
Alternatives: removing backend checks risks incorrect reports; enabling general workbook saves
with openpyxl destroys formula caches. A full spreadsheet engine requires a separate scoped design.
Consequences: additive reuse_existing input flag, shared client orchestration/download helpers,
public scalar converter and bounded legacy profile adapter; no DB migration or dependency.
Automated suites remain deferred by owner; manual checks/types/lint/build are reported separately.

# ADR-211 - Staged browser editing of source input tables

Date: 2026-10-21. Status: ACCEPTED; owner requested in-browser file editing.
Context: file round trips now work, but small corrections still require an external editor.
Decision: add a paged browser table editor to the source-bound update draft, not the dashboard
result table. CSV and plain XLSX use the existing profiles/storage and selected source version.
Protect headers; allow text cells, row addition/deletion, last-row restoration, local cell undo
and bounded Excel TSV paste. Persist sparse edits in the revisioned ReportDocument, with stable
row IDs, source-key binding, CAS and idempotent save/prepare. No client numeric coercion/evaluation.
Prepare stages an immutable replacement version; existing normalization/check/apply owns activation.
Block other update mutations while an editor draft is pending. Retain existing field mappings;
resource renames or reading-option changes use the original upload/mapping workflow instead.
Release the project lock before the uploader's separate artifact reservation transaction; reacquire
and CAS afterward. A conflict may leave an inactive staged version, never a silently overwritten
active source/draft. Select version plus prepare receipt in the same transaction.
CSV preserves raw text/encoding/delimiter. XLSX preserves untouched native cells/styles and other
plain sheets, writes changed cells as literal text, rejects formulas anywhere in the workbook,
macros, names/external links, merges, tables, charts/images, validation and conditional formatting.
openpyxl cannot preserve evaluated formula caches after save; pretending to support general Excel
would break subsequent ingestion. Validate controls and CSV encoding before saving cell edits.
Bound page size, workbook dimensions, patch count/bytes and paste length. Original files remain
immutable. No new dependency or database migration. Alternatives: full spreadsheet embedding or
direct edits to normalized/aggregated data introduce a new engine or bypass reproducibility.
Consequences: this is an input-table correction tool, not a full workbook editor. Download/Excel
remains the fallback. Manual API/browser checks and lint/types/build do not replace deferred suites
or independent accessibility/economist acceptance.

# ADR-210 - Source-bound file download/edit/upload updates

Date: 2026-10-21. Status: ACCEPTED; owner approved the preceding analysis.
Context: staged source-version checking/apply existed, but users could not download current
inputs or a compatible empty template and return it through an obvious report-level action.
Decision: expose Update data from a file on dashboards, source cards/data and history. A new
source chooser creates an idempotent persisted update document with immutable source/base-token
metadata. Continue through the existing update editor, version upload, checks, explicit apply,
revision guards and rollback. File updates are single-source complete replacements, including
legacy Excel; advanced legacy period operations remain separate. A source-specific digest covers
the input storage key/metadata; save/check/apply/download reject a superseded base. Layout or
unrelated report changes do not invalidate an offline input edit. Download is an attachment via
StorageProvider, never a filesystem path or an aggregated visualization. Current-file downloads
are byte-exact. Responses are no-store/nosniff with safely encoded filenames.
Generate header-only CSV in its confirmed delimiter/encoding and Excel templates retaining
active sheet names/single header positions, field comments and text column defaults. Do not
instantiate formatted empty data rows. Templates preserve raw source headers, not renamed logical
labels, so automatic mapping remains valid. Reject formula-like CSV template headers rather than
silently changing mapping or generating executable spreadsheet expressions. Complex ranges,
multirow/skip/footer layouts, legacy workbooks and XLSM fall back to the original input file;
do not pretend a flattened template preserves arbitrary workbook formulas/macros. Excel template
header cells are plain strings. CSV users receive an explicit text-import/precision warning.
An empty replacement of nonempty data emits a warning requiring existing acknowledgement before
apply; empty results remain supported deliberately. Existing generic updates retain their behavior.
Alternatives: export a report, reimport as a new source, silently append rows, or treat a downloaded
old file as current. These break input meaning/field identity or risk data loss. Exact row diffs are
not introduced; schema/row counts/check metrics remain the existing backend-owned review contract.
Consequences: additive typed routes and optional UpdateRead.file_exchange; metadata in existing
ReportDocument envelope, no schema migration/new dependency. Real source files and chart/layout
templates remain separate concepts. No generic append/patch/upsert or new scheduling scope.
Automated suites stay deferred; manual API/browser checks and types/lint/build do not close R6.

# ADR-209 - Protected dashboard baseline and stable explicit arrangement

Date: 2026-10-21. Status: ACCEPTED; owner-requested dashboard editing correction.
Context: noCompactor disabled automatic packing but left collision pushing enabled. A dragged
card repeatedly displaced neighbours; existing layout presets were algorithms, not saved variants.
Decision: preventCollision=true with noCompactor. Ordinary drag/resize never pushes other widgets.
Packing and recommended sizing are explicit draft operations covered by existing layout undo/redo.
Packing preserves columns/widths/heights; recommended sizing repacks KPI/charts/tables by type,
not by sampling or changing data. Position/size gets its own widget-menu dialog, numeric controls,
single-widget recommended size and explicit insert-at-beginning (one shift of other cards).
Persist immutable per-dashboard layout templates in a separate table (migration 0012). Preserve
the first nonempty saved composition as the default. For existing dashboards the current saved
composition is the baseline, frozen transactionally before the first subsequent save; read-only
lists synthesize that identical baseline until then. No historical original can be reconstructed.
Ordinary save updates the active dashboard, never its default or named template snapshots.
Named capture atomically saves the dashboard and an additional immutable template, with revision
checking, request-identity/digest replay protection, case-insensitive name checks and a 50-template
cap including the default. Applying a saved template replaces only the draft widget set; undo and
an explicit save remain available. Missing visualizations disable application with an explanation.
Templates store widgets/titles/configuration/geometry, not independent visualization definitions,
data, shared filter definitions or calculation copies. UI states this distinction. Source refresh
and shared visualization edits are not frozen by a layout. Include template rows in release
document snapshots and remap their embedded widget/reference IDs on restore; locate the protected
baseline by dashboard/is_default, not only its derived original ID. A partial unique index enforces
one default on SQLite/PostgreSQL, including restored projects with remapped IDs.
Alternatives: allow overlaps, enable live vertical compaction, overwrite a default on every save,
or store layouts only in browser storage. These retain jumping or lose a recoverable server baseline.
Consequences: additive API/table, no replacement of the grid/rendering stack. Named variants are
dashboard-local and immutable; rename/delete/cross-project layout catalogs are not added. Automated
suites remain deferred by the owner; manual API/browser/migration checks do not close full R6.

# ADR-208 - Guided report entry and recoverable incomplete selections

Date: 2026-10-21. Status: ACCEPTED; owner-requested functional/UX review.
Context: import completion ended at Data; report navigation entered authoring, and direct
detail reports treated missing drill-through selections as calculation failures. Initial
dashboard-list failures could resemble an empty project. Invalid KPI/chart breakdowns
were accepted by the wizard until server validation.
Decision: expose Connect data → Create report → Review updates on the overview. Import
completion links to the active dataset for that resource (fresh apply takes precedence),
not an obsolete initial-import snapshot after replacement. New report entry links use view
mode; explicit edit actions and old URLs remain compatible. Default entry prefers a populated
dashboard with no required selections lacking defaults; an explicit selection always wins.
Separate loading, failed reads, empty projects and incomplete required selections. Keep filter
controls available for published-context parameters even without legacy workflow bindings.
Validate supplied types and unknown parameter names as before; only absent required values
are classified as incomplete, and visualization requests remain blocked until selection.
The wizard explains basic presentation cardinality and offers explicit recovery actions before
preview; backend graph validation/calculation remains authoritative.
Narrow wizard layouts put settings and step navigation before preview and field reference
in DOM order; wide layouts use named grid areas to retain the three-panel composition.
Alternatives: silently discard breakdowns, auto-fill mandatory filters, change saved dashboard
defaults/layouts, or duplicate calculations in the browser. These hide meaning or mutate reports.
Consequences: no persistence/API/dependency changes. RU/EN/TT guidance uses existing translation
infrastructure. Manual isolated API/browser checks plus types/lint/build verify this increment;
automated regression and user acceptance remain open while suites are deferred by the owner.

# ADR-207 - Alabuga Framework corporate frontend

Date: 2026-10-21. Status: ACCEPTED; owner-directed visual integration.
Context: the owner selected vldsmelov/alabugaframeworkconstructor as the corporate
design source for Node BI and its existing demonstration projects.
Decision: vendor @alabuga/framework 0.6.0 tokens.css, styles.css, four WOFF2 fonts and
two logo assets from revision b048bc2546a3e05131f4451a1115f7282b13523b. Keep the upstream
CSS unchanged, imported in the components layer; app/globals.css maps semantic colours
and app/corporate.css adapts the application shell, project catalog and widgets.
Use Alabuga Sans/Heading locally, corporate deep-blue header and blue/cyan accents.
Keep the React component lifecycle, forms, native controls and ECharts/React Flow;
do not initialize upstream DOM event handlers, document renderer or its editor/AI server.
Dark mode is a Node BI adaptation because the selected framework supplies light tokens.
Analytical multicolour palettes remain distinct from interface accents.
Alternatives: install the full private monorepo as a dependency, embed exported HTML,
or approximate the brand with unrelated fonts. These add runtime coupling or lose fidelity.
Consequences: no new npm dependency/API/database migration. Existing reports, graph IDs,
layout and calculations are retained. Shared chart text uses Alabuga Sans. Shell height
is included in graph viewport sizing. Attribution and asset provenance live in
frontend/vendor/alabuga/NOTICE.txt; files are pinned, never downloaded at runtime.
The previous contrast/a11y measurements predate this visual change and must be revisited
when the owner resumes R6. Automated suites remain deferred by the owner's instruction;
type/lint/build and browser presentation review are the current delivery checks.
Browser review also reproduced React #418 on direct report-builder loads: the draft boundary
read sessionStorage in its server initializer, yielding different server/client recovery UI.
A useSyncExternalStore hydration gate now mounts the unchanged recovery session on the client,
before any form autosave can replace a saved draft. Browser walkthrough confirms name recovery
after reload and no #418 on that path. This is a targeted UI correction, not a storage redesign.

# ADR-206 - Keyboard visibility controls mirror the renderer legend

Date: 2026-10-13. Status: ACCEPTED.
Context: canvas legends accepted pointer actions, but the exact table did not provide an
equivalent keyboard hide/restore operation.
Decision: native disclosure/buttons project existing generated legend entries and formatted
labels. Public ECharts actions/events synchronize both interaction paths. Exclude hidden or
non-interactive legends; duplicate helper names remain one control. Explain table invariance.
Alternatives: replace the canvas legend entirely, or maintain separate client-side data
filtering. Neither is needed; separate filtering risks inconsistent statistics and snapshots.
Consequences: transient presentation state only, unchanged backend/spec/graph. Escape/Close
returns focus. Disclosure consumes a small row, with a bounded scrolling overlay for entries.
Unit coverage checks extraction/events; actual browser keyboard and pointer paths verify
bar/line and pie/donut behavior. This is not screen-reader or full accessibility certification.

# ADR-205 - Heatmap contrast and unclipped plain-text tooltips

Date: 2026-10-13. Status: ACCEPTED.
Follow-up: ECharts default hover lift(-0.1) reproduced contrast below 4.5:1 at scale
boundaries. Each cell now supplies its original fill as explicit emphasis colour; the border
still indicates hover. Three scale sweeps pass and browser pixels stay unchanged on sampled
numeric/missing cells, including muted states in both themes (6.8s focused case).
Context: fixed text thresholds produced sub-4.5:1 labels on interpolated fills; actual
light/dark screenshots also showed rich-text tooltip rows clipped by short widget canvases.
Decision: choose black/white labels using rounded sRGB fill luminance. Muted fills keep their
opacity, but their labels use opaque matching backing. Render heatmap tooltips as body-level
HTML with all source text escaped; retain line breaks, exact values and the table alternative.
Alternatives: shrink tooltip text or enforce large minimum widgets; neither preserves the
existing layout and readable text. Unescaped HTML is not acceptable for source-derived data.
Consequences: no saved contract or calculation changes; body-level tooltip escapes widget
clipping. Browser tests check visibility and vertical viewport bounds in both themes.
Full canvas contrast, numeric hover emphasis and highlighted-label rendering still need
their scoped evidence; this decision does not establish complete A4 accessibility.

# ADR-204 - Dashboard workbench adapts to text-relative available width

Date: 2026-10-12. Status: ACCEPTED.
Context: fixed 16rem/24rem workbench panels at a viewport-only breakpoint filled a 1280px
screen with doubled root text, hiding section navigation and leaving no useful preview.
Decision: an outer inline-size container and a below-80rem rule stack the same fields/settings
instances, show section links and remove fixed panel positioning. Desktop retains its existing
composition. No alternate draft, calculation, save path or persisted layout is introduced.
Alternative: hide or shrink controls, or duplicate a mobile editor; neither preserves usable
configuration and one owner of state. Consequence: longer vertical page when text is enlarged.
Browser assertions cover non-overlapping panels, control bounds and preview width. Tests set
root font before viewport resizing: font mutation after resize did not refresh the query in
the observed Chromium run. Native browser zoom and assistive technology remain separate gates.

# ADR-203 - Preparation settings reflow without a second form state

Date: 2026-10-12. Status: ACCEPTED.
Context: populated Prepare data table overflowed its dialog at 420px. It is an editing form,
not a result table whose columns require horizontal comparison. Decision: below a 60rem
dialog-container width, render existing table rows/cells as vertical blocks with localized
headings. Desktop retains the six-column table. Header semantics and control labels remain;
no duplicate hidden controls, alternate form state, conversion rules or graph commands.
Alternatives: clipping hides fields; a second responsive component risks draft/focus loss.
Consequence: narrow forms scroll vertically. Browser tests inspect every visible control
inside viewport/dialog bounds and reject dialog overflow. Human screen-reader acceptance
remains separate; explicit table/row/header roles are retained for the changed CSS display.

# ADR-202 - Report wizard columns follow available space and text size

Follow-up: StatisticalReportForm uses the same text-relative 78rem container boundary for
its settings/preview pair. At 1280px/32px root text its former 24rem settings column left a
very narrow chart even without page overflow. Below the threshold the preview takes the full
available width beneath settings. Geometry regression checks this for histogram and box-plot;
the initial controls-only tests did not detect the cramped preview.

Date: 2026-10-12. Status: ACCEPTED.
Context: the populated report-formula journey overflowed at 1280px with doubled root text.
Viewport breakpoints retained fixed 16rem/22rem side panels even when their enlarged widths
left no usable preview space. Decision: use an inline-size container and a 78rem container
query for three columns; otherwise keep the existing mounted panels in a single column.
Container-query rem units track root text enlargement. No form state, calculation, persistence
or panel order changes. Alternative: hiding page overflow would conceal controls rather than
make them usable. Consequence: enlarged-text users scroll vertically; desktop retains the
fields/preview/settings arrangement when space permits. Browser regression covers populated
formulas, independent statistical values, saved report editing and both narrow/enlarged layouts.

# ADR-201 - View navigation and readable selection labels stay presentation-only

Date: 2026-10-12. Status: ACCEPTED.
Context: large canvases needed drag-free panning and repeated captions required users to
distinguish technical ID suffixes or identical entries in selection lists.
Decision: shared CanvasNavigation keeps existing zoom/fit controls and adds four localized
direction buttons. They shift the current viewport by 200 CSS pixels with zero animation,
retaining zoom; no node, graph history or saved workflow mutation is involved. Shared choiceLabels
adds ordinal suffixes only for repeated captions, before search filtering, and avoids collisions
with authored labels. NodeFinder retains ID search for diagnostics but no longer displays ID
fragments; group and placement lists use the same helper. Underlying values remain stable IDs.
Alternatives: graph-unit panning would vary in screen distance with zoom; persisting display
ordinals as identities would break saved references. Renaming user data is not permitted.
Consequences: ordinal labels are temporary display disambiguators, not durable names: they can
change when nodes are renamed/reordered. Search alone does not renumber them. No API/migration
or calculation changes. Human screen-reader and broader accessibility acceptance remain open.

# ADR-200 - Classic group selection is available through native checkboxes

Date: 2026-10-12. Status: ACCEPTED.
Context: classic group authoring depended on canvas multi-selection. A named checkbox list
offers direct pointer and keyboard access without changing grouping semantics.
Decision: GroupPanel receives controlled selection from existing node selected flags and the
inspected node. Unchecking that inspected node clears its implicit selection as well. Clear
selection resets both representations; search never silently clears selected nodes. Existing
assign/rename/dissolve/history remain the only group mutations. Limit rendered search matches
to 100 and explicitly ask for a narrower query; all selected nodes remain in the grouping scope.
Alternatives: a separate pending membership list could disagree with canvas selection; automatic
selection loss on filtering could omit nodes silently. No new persisted selection or API is added.
Consequences: ordinary Shift-click still works; native Tab/Space can select members. Selection
alone is not a graph save. Large-canvas navigation and other accessibility gates remain separate.

# ADR-199 - Button placement uses existing graph position changes

Date: 2026-10-12. Status: ACCEPTED.
Context: graph keyboard movement and automatic arrangement did not provide a discoverable
single-pointer alternative for individually positioning every rendered movable item.
Decision: a shared CanvasPlacement disclosure lists visible movable items by name/coordinates,
with four ordinary buttons moving 20 graph units. Selection is local presentation state;
movement uses existing setNodes/changeNodes, autosave, revision checks and undo. Classic group
proxies are excluded because their positions are derived, not independently saved. Field
workbooks, composite blocks and result cards use their existing presentation-position paths.
Hidden members are positioned after expanding/detaching through existing controls.
Alternatives: new layout persistence or a second movement model would duplicate graph state;
keyboard arrows alone would not supply a single-pointer button alternative.
Consequences: no API or computation changes. Missing/deleted selections disable actions rather
than moving a different item. Canvas pan/zoom, multi-selection and remaining drag inventory
still need separate acceptance; this increment does not close all A2 requirements.

# ADR-198 - Graph panels reflow without remounting calculation editors

Date: 2026-10-12. Status: ACCEPTED.
Context: both graph editors overflowed 320/420 px pages. Their fixed three-column layouts
and non-wrapping page toolbar pushed authoring controls outside the viewport. Inspection of
the initial passing enlarged-text screenshot also found the field canvas overlapping preview.
Decision: preserve desktop columns and saved classic panel widths; below 64rem, stack the
existing library, canvas, settings and preview. Use CSS, not alternate editor instances or
conditional mounts, so resizing cannot replace drafts, selection or autosave state. Name the
library/settings scroll regions and make them keyboard focusable. Wrap the route toolbar;
stack paired previews on narrow screens. Reserve a minimum desktop field-canvas row and
workspace height so enlarged text cannot make the drawing spill into preview.
Alternatives: horizontal page scrolling leaves forms inaccessible; hiding panels or rendering
separate mobile editors adds state/recovery risk. A tabbed compact editor remains unnecessary
for this correction and is not silently added to the product scope.
Consequences: no graph/API/schema changes, no project migration. Tests cover 320/420 px,
desktop and doubled root text, real Tab/Enter node insertion, editing across resize, save/reload,
and canvas containment. This does not certify all node forms, drag alternatives or screen readers.

# ADR-197 - Explicit dashboard recovery failures before rendering

Date: 2026-10-12. Status: ACCEPTED.
Context: dashboard recovery silently ignored invalid JSON/read failures and accepted any object
with matching ID and a widgets array, including unsafe nested configuration and missing revision.
Decision: read recovery after hydration in a boundary before mounting editor/widgets. Validate
project/dashboard identity, original positive revision, widget geometry/identity uniqueness and
rendered configuration/navigation/parameter shapes. Bound raw parsing to 10 million characters;
collection limits match existing server contracts. Unknown object fields are rejected rather than
passed into rendering/dirty-state serialization with arbitrarily nested payloads. Preserve incomplete editable names/bindings,
exact scalar strings and optional legacy configuration: this is render safety, not a second
business-validation engine. Valid drafts continue automatic restoration with their original CAS.
Failures offer Retry, confirmed discard, or explicit continuation with the saved dashboard.
No automatic write/delete/fallback; failed discard remains blocked. Continuing leaves the raw
draft untouched until the author makes a new edit, with an explicit replacement warning. Error
entry receives focus; successful recovery decisions focus the dashboard name/view heading once.
Alternatives: silent fallback conceals lost work; permissive parsing can crash controls; duplicating
all backend semantic rules would reject valid unfinished authoring and drift from the engine.
Consequences: no API/migration changes, no normalization of saved projects, original revisions
retained and malformed recovery cannot render or trigger option-data requests via unsafe shapes.


# ADR-196 - Dashboard date scratch is scoped recovery, not a view filter

Date: 2026-10-12. Status: ACCEPTED.
Context: shared-period inputs were component-local and disappeared on dashboard navigation;
the applied period already belongs to the URL and drives backend execution contexts.
Decision: keep a bounded versioned project/dashboard-scoped date draft in the shared document
store. Preserve the applied-period baseline plus partial start/end inputs. Restore/discard is
explicit, with first-date focus; different current URL periods produce a visible warning. Neither
editing nor restoration changes URL filters, dashboard revisions, widgets or execution contexts.
Apply/All time still use the existing URL callback and retire scratch; returning to pristine inputs
also retires it. Failed explicit discard retains recovery, denied reads require an explicit choice,
and denied writes use the shared bounded document fallback with honest reload-loss guidance.
Ordinary client navigation can return to recovery; beforeunload protects active date edits. Keep
the control mounted across period URL changes to retain Apply focus. Skip recovery re-read once
for its own explicit application: denied reads after successful cleanup must not disable the
control immediately after applying. External URL changes still inspect saved scratch normally.
Dashboard deletion retires both configuration and date recovery keys after server success.
Alternatives: merging scratch into dashboard configuration dirties saved reports for view-only
interactions; automatically restoring dates into URL filters silently changes calculations;
per-URL draft keys accumulate stale copies and hide return-path recovery.
Consequences: no backend/API migration, no automatic filtering and no durable storage promise
when the browser denies access. Existing visualization/graph/dashboard draft guards remain intact.


# ADR-195 - Recover release settings without conflating them with release jobs

Date: 2026-10-12. Status: ACCEPTED.
Context: release form settings disappeared on reload; release POST returns a background job,
not a completed release or an idempotent creation receipt.
Decision: use the existing bounded document-draft store with a versioned project-scoped envelope.
Persist explicit edits to name, period label, comment, selected dashboard IDs, applied date period
and scalar parameter values. Require explicit recovery; validate payload and project identity.
Never restore warning consent/check tokens and never submit automatically. Missing dashboards
block submission until explicitly reselected. Unreadable recovery requires discard or explicit
continuation; failed discard keeps settings. Storage failures retain the latest bounded document
copy with honest reload-loss guidance. The reports route keys component state by project.
Reuse departure protection without adding another guard when update/rule editors are dirty.
Keep settings after enqueue success and failures; prompt authors to inspect jobs/releases before
repeating. Explicit discard is the retirement operation in this increment.
Alternatives: clearing on HTTP success loses settings if the job fails; automatic retry can
duplicate releases; introducing a second server-side draft/job receipt system is separate work.
Consequences: same-tab recovery, no backend/API migration, no claim of durable browser storage,
job-aware duplicate-safe recovery.
Follow-up: preserve optional start/end dateScratch independently from DatePeriod. Partial or
reversed ranges stay editable; they are never applied by restoration. Existing drafts without
scratch remain valid. Disable release creation while scratch differs from the applied period,
with explicit guidance to Apply period or All time. Restore/discard focuses the release name
once. The shared dashboard control also discloses pending edits; dashboard-route scratch
recovery remains unfinished. No API execution or date-filtering semantics change.


# ADR-194 - Addressable update history and direct rollback continuation

Date: 2026-10-12. Status: ACCEPTED.
Context: the selected saved update was component-local, so reload lost the working context;
preparing rollback created a draft but left the author in the previous applied update.
Decision: use the reports route's update query parameter as selected-update identity. Selection
replaces the current URL without adding browser history entries or discarding other query
parameters. Resolve it only against the current project's update list; missing/foreign IDs show
an explicit unavailable state and an action to return to history, never another implicit update.
Successful create/rollback responses enter the query cache before selection; server persistence,
CAS revisions, staged checks and explicit apply remain unchanged. New rollback opens its editor
but is not applied automatically. Editor heading focuses once on entry; action failures focus
the error panel, while background-query failures do not steal focus. Existing unsaved-update
confirmation remains before switching drafts. URL stores identity only, not edits or receipts.
Alternatives: tab storage would hide shareable context; auto-apply would bypass required checks;
new history entries per selection would add navigation burden without improving persistence.
Consequences: reload/deep-link continuity for saved updates, predictable keyboard entry and
explicit missing-reference behavior; this does not add durable unsaved update/release drafts.


# ADR-193 - Explicit Excel import rectangles preserve physical field identity

Date: 2026-10-12. Status: ACCEPTED.
Context: the approved import plan requires a cell range, but the universal wizard only exposed
the first header row. Reading an unrelated table or footer can change inferred data and totals.
Decision: add optional ReadOptions.cell_range, an explicit A1 rectangle such as B2:F100.
The upper row starts headers, overriding header_row while selected; header count, skipped data
rows and tail exclusions operate inside the rectangle. Blank UI input means the existing full
sheet behavior. CSV rejects this Excel-only option. Normalize case/outer whitespace at validation.
Keep physical col_N identities/source positions instead of renumbering selected columns. Reject
out-of-populated-extent bounds and partially selected merged headers. Missing formula caches
outside the selected columns/data rows do not invalidate this dataset. Existing whole-workbook
security/size limits remain in force; a rectangle is not a resource-limit bypass.
No database migration: profiles, drafts and releases already store typed JSON. Existing whole-
sheet apply receipt hashes omit absent cell_range, preserving retries of historical requests.
Alternatives: cropping a fully inferred dataset allows outside values to affect validation;
renumbering columns breaks mapping; implicit current-region detection hides source selection.
Consequences: explicit source-bound selection survives draft reload, refresh, rollback and
release restoration. It is a single rectangle, not named tables, disjoint ranges or a sheet editor.
Refresh authoring also exposes per-dataset overrides, rather than a workbook-wide Excel range.
Changing these options retires old column bindings; suggestions from a check with different
reading options are hidden so mapping edits cannot overwrite the new rectangle. Sibling dataset
bindings remain intact. CSV uses existing version reading defaults, Excel uses each saved profile.


# ADR-192 - Analytical table pinning adapts without changing saved settings

Date: 2026-10-12. Status: ACCEPTED.
Context: a 160 px row-level column plus a pinned 200 px dimension can cover the entire
348 px table viewport, hiding measures even when the user scrolls horizontally.
Decision: observe the table scroll region, not the window. Reserve one complete 200 px data
column outside the pinned area, reducing effective pinned data columns as needed. Below
360 px, the row-level column also scrolls. Widening restores the configured pin count;
the persisted specification is never rewritten. Show a localized temporary-unpin notice.
Headers remain vertically sticky. Native scrolling, exact values and totals remain unchanged.
Rendering and pin offsets share pixel constants for row-level/data/selection columns; mixing
rem widths with pixel offsets caused divergence under text enlargement. Text itself scales and
wraps normally. The browser regression verifies 200% root text size separately from browser zoom.
Alternatives: smaller fonts violate readability; forcing a larger page width hides controls;
always disabling pinning discards a useful desktop feature.
Consequences: display pinning depends on available card width, while saved intent remains stable.
Boundary tests plus real browser resize/hit-testing verify values are not covered and widening
restores pinning. This does not certify full screen-reader or human usability acceptance.

# ADR-191 - Inspector condition scratch recovery is node-scoped and explicitly applied

Date: 2026-10-12. Status: ACCEPTED.
Context: identity isolation prevents wrong-node condition insertion but resets unapplied scratch
when the inspector unmounts. Graph autosave cannot persist scratch that is not yet an expression.
Decision: inspector helpers use the existing bounded document-draft/sessionStorage layer under
node-ID/version keys. A versioned validated payload contains current controls and last-applied
baseline, with bounded strings; malformed payloads report failure without automatic overwrite.
Recovery never calls graph onChange. Current schema gates explicit insertion; missing fields
remain unappliable. Insertion transfers the expression to ordinary graph autosave and retires
scratch recovery. Explicit discard removes only the scratch and fails closed on storage errors.
Alternatives: putting scratch in graph configuration changes execution contracts; global unscoped
state risks wrong-node edits; disk-only drafts revive stale copies after quota failures.
Consequences: normal tab storage survives node remount/reload, volatile fallback only the current
document. Visible notices distinguish scratch from saved formulas. Failed physical cleanup can
still leave stale disk data after full document reload; same-document tombstones prevent revival.
Modal calculation helpers keep their existing dismissal/submit guards rather than sharing inspector
keys. No API, migration, server-durable drafts or implicit formula application is introduced.

# ADR-190 - Condition authoring preserves numeric tokens and exposes exact node semantics

Date: 2026-10-12. Status: ACCEPTED.
Context: ConditionBuilder converted every numeric entry through JavaScript Number, changing
9007199254740993 to 9007199254740992 before saving. Its legacy formula executor intentionally
uses Float64, while calculated_column@2 already provides exact typed conditional execution.
Decision: emit validated bounded decimal/scientific tokens without numeric reserialization;
strip redundant leading integer zeros for Python syntax. Reject hex, expressions and nonfinite
tokens. Add the helper to the existing v2 configuration with string/integer/decimal predicates,
numeric-only results and existing precision/scale. Exclude Float64 inputs in exact mode.
Legacy helper retains Float64 execution and explicitly explains that limitation in RU/EN/TT.
Alternatives: changing v1 evaluation would break compatibility; preserving text alone would not
make v1 exact; a browser condition evaluator would duplicate backend calculation semantics.
Consequences: only authoring changes; saved graphs, numeric engines, APIs and migrations unchanged.
Backend remains responsible for overflow, formula validity and final half-even rounding.

# ADR-189 - Dashboard recovery retains the newest local document and revision

Date: 2026-10-12. Status: ACCEPTED.
Context: production reproduction showed stale disk names after quota failure and lost local names
after storage getter denial on dashboard Back navigation. Direct cleanup also interrupted successful
server deletion; layout history could assign the latest server revision to an older recovered draft.
Decision: reuse bounded document-drafts read/write/retirement, including the oversized storage-only
option from ADR-188. Display the volatile-copy notice. Server-confirmed save/copy/navigation results
and pristine reverts retire local recovery; explicit discard remains fail-closed. Server deletion
retires recovery and completes navigation even if physical cleanup fails. Layout restoration changes
only widget layout, retaining the recovered document revision and other current settings.
Alternatives: silent initial-server fallback loses work; rebasing draft revision hides conflicts;
independent dashboard memory cache duplicates existing recovery semantics.
Consequences: original CAS prevents overwriting competing saves; successful deletion is not undone
by local cleanup errors. Memory does not survive document reload/close and is bounded per draft.
No API, execution, migration or multi-user scope change. Helper-dialog audits remain separate.

# ADR-188 - Bounded same-document graph recovery reuses the document draft store

Date: 2026-10-12. Status: ACCEPTED.
Context: ADR-187 keeps editors usable without browser storage, but failed writes still lose graph
changes on route remount and can expose an older persisted draft. Report/visualization recovery
already has a common current-document store and confirmed-save retirement semantics.
Decision: the browser graph adapter now uses that store, retaining original revision and classic /
field namespace. Recovery and writes expose a persistent volatile-copy notice. Confirmed server
saves retire stale copies even when storage cleanup fails; explicit discard still fails closed.
Memory retention remains capped at 1000000 characters per draft. An opt-in oversized storage-only
path preserves existing large graph disk writes; it never caches huge strings and masks older
copies if a newer oversized write fails. Existing report callers retain the previous size rejection.
Alternatives: independent graph cache would duplicate stale-copy/retirement logic; unbounded memory
would add avoidable retention; removing disk support for large graphs would regress compatibility.
Consequences: same-document Back/Forward is covered for normal-size v1/v2 drafts under quota and
getter denial. Reload/close, oversized volatile drafts, other documents and server-rejected stale
revisions are not silently recovered or overwritten. Dashboard/helper recovery remains separate.

# ADR-187 - Denied browser storage must not prevent graph editing

Date: 2026-10-12. Status: ACCEPTED.
Context: classic and typed workflow editors evaluated window.sessionStorage while constructing
their autosave writers. A browser SecurityError on that property bypassed the writer's existing
get/set/remove error handling and rendered the route error boundary. Production reproduction
covered both v1 classic and v2 field routes.
Decision: inject a narrow lazy getItem/setItem/removeItem adapter; access the property only inside
the writer's guarded operations. Keep existing recovery warnings, serialized server autosave,
CAS revisions and distinct draft namespaces. A guarded writer.discard removes storage before
discarding pending state; failure preserves edits and blocks reload with a localized error.
Successful discard cancels queued debounce and prevents disposal from recreating the draft.
Alternatives: substituting silent memory storage would falsely imply reload recovery; requiring
sessionStorage for the whole editor would unnecessarily block normal server-backed editing.
Consequences: denied local recovery is explicit, not durable fallback storage. Existing in-flight
server requests cannot be cancelled by local discard. Broader unavailable-storage navigation
recovery and dashboard/helper forms remain separate work; no server/API/schema changes.

# ADR-186 - Proven-representable decimal strings use native normalization

Date: 2026-10-12. Status: ACCEPTED.
Context: fresh-process R6 measurements found strict normalization of 100000 rows × 100 decimal
string columns took about 38.5 seconds. Python converted each value and rebuilt Decimal precision
contexts. Direct native casts alone are unsafe: they truncate excess fractional digits.
Decision: for explicitly mapped decimal String columns, validate every non-null value against a
bounded ASCII decimal grammar derived from precision/scale and the selected separator. Only values
provably representable without rounding use a strict native Decimal cast. Extra fractional zeros
are allowed; nonzero excess digits are not. Non-nullable missing values or any other syntax/value
return the whole column to the unchanged scalar converter and existing row-numbered diagnostics.
Native parser failures also fall back. Nulls, schema IDs/metadata, keys and full-data checks remain.
Alternatives: unchecked native casts silently change money; caching repeated values overfits one
benchmark and adds memory; a new parser would duplicate accepted Decimal syntax and error rules.
Consequences: common clean columns are much faster, but a mixed/invalid column still has scalar
cost. No accepted syntax, import limit, stored snapshot, API or automatic type inference changes.
Parity tests cover precision/scale extremes, distinct seeded values, both separators, unusual syntax,
null/error policies, full-column failures beyond the preview, key checks and exact serialized output.
This is an engine optimization, not a claim about end-to-end import or every dataset distribution.

# ADR-185 - Layout undo preserves independent dashboard edits

Date: 2026-10-12. Status: ACCEPTED.
Context: the R6 production-browser audit reproduced a P2 regression: applying a layout template,
editing a widget title and choosing Undo layout change erased the title instead of undoing the
template. The history captured entire dashboards for every keystroke despite its layout label.
Decision: record layout history only for widget geometry, membership, ordering or visualization
reference changes. Undo/redo restores these properties while retaining current titles, visibility,
navigation settings, dashboard name/configuration and the last acknowledged revision. A removed
widget can still be restored with its captured metadata. Metadata-only edits do not clear redo;
a new layout change does. Keep the existing 100-step in-memory bound and tab-local dashboard draft.
No chart calculations/configuration enter this history and no server write occurs until Save dashboard.
Alternatives: relabeling the generic snapshot undo would leave the prior template-preservation
behavior broken; a second undo control would make the two histories compete. No new dependency/DDL.
Consequences: pure regressions cover metadata preservation, redo, removal and independent-copy
references; browser acceptance retains template geometry, navigation, title and save/reload assertions.

The same audit found empty navigation destinations hid explicitly configured parameter inputs
because an empty widget list was treated like a publication-only report. Show the existing selection
form for empty dashboards. Publication-only context display and explicit workflow bindings keep their
prior behavior. This restores parameter correction/URL history without adding calculation semantics.
Compatibility browser tests now seed v1/v2 graphs through supported APIs instead of expecting new
v3 graphs to expose legacy chart nodes. Modern report-first authoring remains independently tested.

The lost-response compatibility test also reproduced a stale clean-draft problem: changing a name
and reverting it left an obsolete saved snapshot in sessionStorage. A subsequent committed copy
with a lost HTTP response was then hidden by that snapshot after explicit reload. Both normal edits
and history now remove the local draft when it equals the acknowledged saved state. Actual dirty
drafts and their revision-conflict behavior are preserved; storage failures remain visible.

# ADR-184 - Usable catalog maintenance without changing report calculations

Date: 2026-10-12. Status: ACCEPTED.
Context: ADR-183 delivered catalog APIs but users still needed an integrated maintenance screen.
Decision: add /projects/{projectId}/templates under Reports, linked from dashboards (including
empty state) and both wizard template pickers. Search row meaning/name on the server, filter family
and active/archive state, paginate 20 entries and expose required field types/units without technical
IDs. Rename uses explicit save/cancel; archive requires confirmation and restore is reversible.
Pending edits retain their exact UUID/body in validated tab-local storage. Retry remains available
without list metadata; definitive conflicts require explicit refresh, never automatic overwrite.
Corrupt recovery blocks mutations until explicitly discarded; denied storage produces a warning
and preserves in-memory retry. Recovery initializes client-side to avoid sessionStorage hydration
differences. Unsubmitted name edits guard ordinary workspace links and page unload; browser-history
recovery of unsubmitted names is not promised. Existing shared navigation guard is reused.
Russian/English/Tatar copy and responsive theme tokens follow the existing workspace. Error/success
feedback and name editing receive focus; controls use native buttons, selects and forms.
Alternatives: automatic rename on blur makes accidental edits and conflicts harder to understand;
deleting archived templates breaks recovery; replaying a new request identity risks duplicate effects.
Consequences: this completes the scoped catalog screen, not the broader R0–R6 acceptance or human
gate. Saved calculation definitions, source data and graph execution remain untouched.

# ADR-183 - Revision-guarded metadata for the project template catalog

Date: 2026-10-12. Status: ACCEPTED; API foundation delivered, catalog screen follows in ADR-184.
Context: both reusable template families exist, but immutable capture records do not offer
project-wide discovery or reversible maintenance. Changing definitions would undermine receipts
and the independence of already-created reports.
Decision: GET template-catalog searches names/row meaning with Unicode casefold, family/state
filters and bounded stable pagination. PATCH changes only a separate catalog name and archived
status, under the existing project lock and expected document revision. Calculation definitions
and capture fingerprints remain unchanged. Exact request receipts retain their original result,
including after later edits; changed requests or targets cannot reuse a request identity.
No-op edits do not advance revisions. Receipts are not semantic project state; actual catalog
changes participate in the existing template revision fingerprint. Archived entries remain
inside the shared 200-template cap and can be restored, not deleted.
Both typed family lists expose current names/revisions and omit archived entries. Capture retries
return original captured names/revision 1. Prepare rejects archived templates and optionally guards
the selected revision; existing clients remain compatible. The current wizard sends the revision
and supports explicit list refresh/reset after conflicts. Already-loaded settings and reports
remain independent of subsequent catalog actions.
Frozen releases retain original typed definition arrays plus parallel versioned catalog metadata.
Restoration preserves labels/archive flags with fresh IDs and revision 1. Old releases without
metadata restore active entries with their original names. No physical schema or dependency change.
Alternatives: overwriting captured names changes receipt content; deleting entries loses recovery;
embedding names in graphs introduces unwanted dependencies; unbounded search over datasets is
unnecessary for at most 200 template metadata entries.
Consequences: dedicated catalog UI, localized controls, pending-edit recovery and browser acceptance
remain a separate unfinished subtask. This foundation alone does not complete R5 or human R6 gates.

# ADR-182 - Reusable grouped/formula report templates with structural field rebinding

Date: 2026-10-12. Status: ACCEPTED.
Context: analytical templates existed, but ordinary grouped reports, row/after-total formulas,
calendar comparisons and combo/radar bindings had to be rebuilt for each new input table.
Decision: add ReportTemplate@1 and typed report-templates capture/list/prepare endpoints. Keep
the statistical template API unchanged; both immutable project-local families use ReportDocument
and share the existing 200-template project limit. Shared validation checks explicit one-to-one
input-role mapping, source revisions, declared row meaning and matching types/known units/currency.
Capture uses the guarded saved report projection, not unsaved UI state or arbitrary graph cloning.
Manual/shared/unsupported calculations retain their existing graph-only boundary.
Formula scopes are inferred by the existing exact formula and aggregation executors. Engine-name
aliases become bracketed stable references; numeric tokens, string literals, language constants and
function names are preserved. Only structural field roles are rebound, never arbitrary strings.
Formula and measure UUIDs are allocated deterministically within the new request namespace; dependent
expressions, selected values, comparison fields, combo series and radar axes follow these identities.
Legacy aggregate outputs acquire stable IDs only in the explicitly created new report. The original
graph is not upgraded or modified. Preparation stores nothing and returns ordinary ReportSettings;
normal full-data preview and atomic graph application remain authoritative. No template interpreter.
The standard wizard reuses the mapping/capture controls with separate typed family endpoints and
recovery scopes. Capture retry remains reachable when the original report metadata is unavailable.
Loaded settings use existing draft recovery and require fresh preview. Binding/scaling semantics are
copied, not source data, manual preparation, widget layout or arbitrary appearance settings.
Include the new family in project revision fingerprints and frozen metadata. Restore fresh document
IDs without rewriting template literals; old releases default to an empty catalog for this family.
Alternatives: one untyped template payload weakens existing contracts; copying a full graph hides
source ownership; blind string substitution corrupts constants and formulas. No new dependencies,
physical database schema, browser calculations or automatic conversion of existing projects.
Catalog management and comprehensive human/accessibility acceptance remain separate R5/R6 work.

# ADR-181 - Guided waterfall with explicit ordering and graph-owned reconciliation

Date: 2026-10-12. Status: ACCEPTED.
Context: waterfall preparation/rendering existed, but the report-first journey required manual
graph setup. Input order changes running balances and must be an explicit business choice.
Decision: add waterfall_steps to the existing analytical request, preview, apply and suffix editor.
Require a nullable order field in guided settings: null explicitly retains input order; otherwise
an integer/decimal/date/datetime field sorts ascending in the common waterfall executor. Null or
duplicate keys fail rather than choosing an arbitrary tie order. The node's additive optional
field defaults to input order and is omitted when absent; existing graphs are not migrated.
The wizard starts with no order choice. Existing row-type markers, initial/subtotal/final rules,
exact expected-total reconciliation and 2000-step limit remain authoritative. Filtering is upstream,
so removing a contribution can legitimately fail an expected-total check. Empty input stays empty.
Preview delegates to the existing typed WaterfallSpec renderer over one complete graph result;
there is no browser accumulation or saved wizard recipe. Compatible saved and restored suffixes
reopen, including legacy nodes without order metadata; shared/manual/advanced guards remain.
Draft recovery and atomic revision/idempotency rules reuse the analytical route. Templates map
label, value, row-type and optional order roles; frozen releases retain full prepared results.
Alternatives: implicit source order hides an analytical choice; a separate wizard-owned Sort node
would widen suffix ownership and risk rewriting manual preparation. Keeping the ordering contract
in the already order-sensitive executor is additive and shared by graph and wizard authors.
Consequences: no new dependency, DDL, automatic project conversion or second calculation engine.
Float order keys are intentionally unsupported; authors can use explicit integer sequence keys.

# ADR-180 - Guided radar profiles retain explicit scales and the common report graph

Date: 2026-10-10. Status: ACCEPTED.
Context: radar rendering and exact normalization existed, but creating aggregated profile reports
still required manual graph preparation. The report-first journey needs safe creation and edits.
Decision: ReportSettings accepts optional RadarSpec only with radar_chart. Require one profile
dimension and 3-8 distinct numeric output axes. The wizard uses ordinary stable group_by@3 and
row/after-total formulas; radar consumes their complete result via the existing renderer.
Bounds and shared/min-max normalization are explicit, never inferred from visible profiles.
Mixed declared units require min-max; unknown units do not imply semantic equivalence. Missing
axes remain missing, out-of-range values fail, and more than 20 profiles requires upstream filtering.
Chart/profile table/scales share one preview result; preview does not save objects. The standard
wizard checks calculated fields, restores incomplete bounded drafts and preserves exact pending
requests. Existing request fingerprints omit absent radar metadata to retain legacy receipts.
Recognized saved/restored suffixes reopen; computation edits preserve axes/bounds/appearance.
Changing scale or bindings requires explicit rebind, with existing CAS/shared-step/atomic guards.
During round-trip regression, preview applied typed specs but the apply whitelist omitted spec
and the required combo orientation. Persist both when rebinding and clear the old spec when changing
to a basic presentation. This corrects both radar and ADR-179 combo edits, not just their previews.
Alternatives: automatic bounds can change the meaning of comparisons after refresh; local browser
aggregation or stored wizard recipes would introduce a second calculation model. No new engine,
dependency, DDL or automatic migration is needed. Waterfall guided authoring remains separate.

# ADR-179 - Guided plan-fact combo uses ordinary report graphs and existing typed rendering

Date: 2026-10-10. Status: ACCEPTED.
Context: combo rendering was available, but creating grouped plan-fact reports still required
manual graph preparation. The primary report journey needs the same exact calculations and guards.
Decision: extend ReportSettings with combo_chart and an explicit ComboSpec. Require one grouping
dimension matching the category, distinct bar/line measures and explicit secondary-axis opt-in.
The existing group_by@3 and row/after-total formula nodes remain the only calculation model.
Preview and apply reuse the existing combo renderer over the complete calculated result; the
50-row table preview does not truncate chart calculations. Existing 2000-category, unit/currency,
numeric and binding checks remain authoritative. Preview persists no report objects.
The wizard checks output fields before binding series, provides a real chart plus table preview,
and preserves typed series in drafts and exact pending-request recovery. Source changes clear
old bindings. Compatible saved graph suffixes reopen in the report wizard, including restored
releases. Aggregation edits preserve stable field IDs and presentation; changing series requires
explicit rebinding. Existing revision/shared-step/idempotency/transaction rules are unchanged.
Optional new payload fields are omitted when absent, preserving legacy request receipt identities.
Alternatives: storing wizard recipes or calculating in the browser would create a second engine;
implicitly assigning mixed-unit series to another axis would hide a material analytical choice.
No dependency, schema migration or automatic conversion of existing reports is required.
Period comparisons remain Table/Bar/Line; combo plan-fact uses explicitly selected measures.
Radar/waterfall guided authoring and broader accessibility/human acceptance remain separate work.
Acceptance also reproduced a shared formula-editor focus race: deferred field insertion stole
focus from the precision control, appending its input to the expression. Focus now moves immediately;
the deferred caret update respects newer focus, selections and edits. Deterministic component tests
cover the race without weakening the existing formula browser assertions.

# ADR-178 - Exact decimal parameters across workflow and dashboard boundaries

Date: 2026-10-10. Status: ACCEPTED.
Context: exact formulas could not consume user-entered monetary parameters; numeric form values
used Number(), and parameter definitions/scalars/choices lacked an exact decimal contract.
Decision: extend ParameterDefinition with decimal and mandatory precision/scale. Accept only
bounded plain decimal strings or null; reject float JSON, exponent syntax, overflow and excess
nonzero fractional digits. Canonicalize validated values to fixed-scale strings without rounding.
Absent precision/scale are excluded from legacy serialization; old parameter contracts stay intact.
Definitions/defaults remain saved JSON; view selections remain per-execution values. No migration.
scalar_parameter produces Decimal ScalarValue with metadata. Its cache identity includes exact
value and precision/scale; otherwise unchanged parameters retain their old identity. Formula,
preview, filter, publication and release use the ordinary graph. Decimal options/labels serialize
as strings; off-page selected values are validated against the field schema before exact matching.
Decimal parameter bindings may widen only when both integer capacity and fractional scale fit;
no decimal-to-float binding. Filter parameters must fit the field, and typed navigation fields
must fit their destination. Context filters validate decimal text before physical comparison.
Workflow/dashboard forms offer decimal with named precision/scale controls, exact text input and
EN/RU/TT guidance. URL/navigation checks operate on string digits, not JS Number. An explicit
workflow binding makes selections editable even on an all-publication dashboard; previously that
form was hidden. Existing contextual report navigation without bindings retains its presentation.
Alternatives: float values lose digits; accepting arbitrary numeric JSON cannot restore precision
already lost in the browser. Implicit narrowing hides business errors. A second calculator is not
needed. Semantic units/currency are not inferred for user-entered parameters.
Evidence: independent large-number/null/scale/range/cache/filter tests, exact choices, atomic rejected
bindings, SQLite/PostgreSQL frozen context/restore, production workflow-default edit and dashboard
selection/KPI reload. Full regression and production compilation pass; human acceptance is separate.

# ADR-177 - Exact field expressions share the bounded table formula engine

Date: 2026-10-10. Status: ACCEPTED.
Context: exact field arithmetic supported separate operations but field_formula@1 still used the
legacy compiler. Users need precise combined monetary expressions without rounding every operator.
Decision: introduce opt-in field_formula@2 over the existing a/b/c field/scalar ports. Map bindings
to a temporary typed schema and reuse compile_exact_formula, exact input validation, bounded rational
intermediates and round_exact. This is one numeric expression with a decimal result, not a replacement
for legacy text/boolean formulas. Conditional text/boolean/date inputs are supported by the same
language as calculated_column@2. Unknown names, Float64 arithmetic and unsafe syntax fail preflight.
Each expression rounds half-even once at its configured precision/scale; downstream nodes consume
that rounded value. No implicit units/currency or automatic upgrade. Scalar-only expressions return
a scalar; any connected field retains its row context/population, including constant expressions
and empty tables. Foreign contexts cannot be positionally zipped. Existing complexity/depth and
deferred field checks remain enforced. Only connected operands cross the Polars batch boundary.
The graph editor exposes distinct v2 naming, expression/precision/scale and EN/RU/TT explanations.
No persistence migration, dependency or second calculation model is needed.
Alternatives: reimplementing an AST evaluator would duplicate security/numeric rules; chaining only
arithmetic nodes adds intermediate rounding; upgrading v1 silently changes saved calculations.
Evidence: independent rounding/large-number/conditions/empty/context/error cases; release/restore
on SQLite and PostgreSQL; production editor save/reload/KPI; 100k narrow/wide benchmark.
Parameter audit: ParameterDefinition has no decimal precision/scale; parameter_scalar drops such
metadata, parameter_identity assumes JSON primitive values, and the UI converts numeric input with
Number(). Dashboard bindings, choices, cache identity and frozen contexts share these contracts.
Decimal parameters therefore require an explicit string-valued contract and end-to-end validation,
not adding decimal to a type list or routing money through float. This remains the next task.

# ADR-176 - Opt-in exact decimal field and scalar operations

Date: 2026-10-10. Status: ACCEPTED; supersedes ADR-167's unsupported scalar boundary for v2 only.
Context: field_sum@1 casts to Float64; arithmetic@1 and single-value decimal outputs were rejected.
Exact table operations alone did not cover the field-wire -> scalar -> KPI path.
Decision: add scalar_constant@2, field_arithmetic@2, field_sum@2 and field_scalar@2. Version-1
contracts/calculations stay unchanged. Decimal ScalarValue carries explicit precision/scale and
optional semantic metadata. Constants accept bounded decimal strings or null, never binary floats;
excess scale is rejected rather than silently rounded. Arithmetic accepts only decimal, integer or
null operands, enforces one row context, and uses bounded rational intermediates with half-even
rounding at EACH node's configured precision/scale. Later nodes consume that rounded value; this
differs deliberately from one final rounding inside a calculated_column@2 expression.
Field arithmetic is deferred in a typed Polars batch expression. Only connected operands cross the
Python boundary; unrelated wide-table columns are not converted to rows. Sum uses exact rational
accumulation and a checked precision-38 result at the input scale (integer scale zero); nulls are
ignored and an empty sum is zero. Single value requires exactly one row and preserves null/scale.
Arithmetic does not guess derived units/currency; sum/single-value retain the input metadata.
Float64 operands, overflowing results, wrong physical scales and foreign row contexts fail explicitly.
Scalar previews/publications, Append Field and bound Bar/KPI retain metadata and exact JSON strings.
The graph catalog/editor offers distinct v2 entries, string constants, precision/scale and explicit
rounding guidance in EN/RU/TT. No automatic upgrade, database migration or dependency is introduced.
Alternatives: Float64 conversion loses monetary digits; direct Decimal128 arithmetic can truncate or
overflow intermediates. A separate execution graph or browser calculator would break core boundaries.
Evidence: independent large-number/rounding/null/cardinality/overflow/context tests, full regression,
SQLite/PostgreSQL preview/release/restore, production editor/KPI reload and 100k narrow/wide benchmark.
General field_formula arithmetic and decimal workflow parameters remain separate parity audits;
do not claim every legacy scalar operation now supports decimal.

# ADR-175 - Canonical typed input for basic visualization authoring

Date: 2026-10-10. Status: ACCEPTED; completes ADR-174's basic input adapter.
Context: read-side specs alone did not let the editor author basic types through typed roles.
Decision: independent preview/save/copy accept BasicVisualizationInput in config. A typed field
validator normalizes it to VisualizationConfig before application validation and receipt hashing.
Persist only canonical legacy bindings, never a second mutable spec. Existing graph nodes, report
wizard edits, releases and pending legacy requests keep their contracts; no automatic migration.
Basic requests cannot contain both spec and flat selectors, even if they agree. Type/version,
unique series/table fields and area single-series constraints are validated. Table columns=null
explicitly retains all-fields behavior, not a captured schema list. KPI value=null selects a scalar
publication's single value; datasets still require a field. Wrong explicit scalar IDs are rejected.
An optional primary_series_name retains a supplied first-series label; absent defaults are excluded
from serialization to preserve old request fingerprints. The editor exposes that name and sends
typed specs for basic types; its existing form/draft state remains compatible. Pending requests
are replayed unchanged. Receipt identity uses the normalized settings, as do the existing guards.
Public basic saves validate the rendered data before committing, using the common backend engine.
Nonempty appearance-only edits/copies on the same type/publication inherit bindings; an empty legacy
config retains its prior reset/default semantics. This distinction was caught by rollup regression.
Alternatives: dual stored specs would drift during wizard updates; rewriting all old configs would
change historical projects and retry contracts without user intent. A separate calculation model
would violate the graph boundary. No database migration or dependency is introduced.
Evidence: all eight types round-trip; typed/legacy table releases restore exact 1101-row populations;
wizard average editing preserves typed-authored bindings; scalar, CAS/retry/copy/invalid atomic save
and SQLite/PostgreSQL regressions pass. Production browser tests inspect typed requests, restore
drafts, exercise stale revisions and recover committed creates/copies after lost responses.

# ADR-174 - Read-side typed roles for the eight basic visualizations

Date: 2026-10-10. Status: ACCEPTED; R4 prerequisite, not full write-contract migration.
Context: the typed registry covered 13 advanced families but excluded eight working basic types.
Their saved field selections, wizard edits and old releases must remain compatible.
Decision: register all 21 types and project validated basic results into version-1 semantic specs:
Cartesian X/ordered Y series, part-to-whole category/value, scatter X/Y, KPI value and table columns.
Roles reference stable column IDs, resolved by the renderer against the response schema. Graph-bound
Bar/KPI v2 use their effective output identities. No calculation, aggregation or number conversion
is added. Old spec-less frozen results retain the previous rendering path. Missing typed bindings
show an explicit localized error rather than falling back to an obsolete engine alias.
Registry metadata distinguishes binding_contract=legacy_config from spec and result_data=rows from
datasets; KPI declares dataset/scalar inputs. Basic table paging and release collection continue
using one rows payload, without duplicating up to 100,000 rows in a named dataset. Advanced named
datasets remain unchanged. Saved basic configs and input spec validation are deliberately unchanged.
Alternatives: automatic config rewriting risks old projects and pending-request identity; accepting
two writable binding representations without canonicalization risks inconsistent wizard edits.
Consequences: read/display parity is delivered first. Basic typed input acceptance, one canonical
write adapter and editor/wizard/receipt round-trip remain the next R4 task. No database migration
or dependency is required. Regression covers all eight types, exact transport, hidden context,
ordered columns/series, graph-bound identities, paged release/restore and spec-less old results.

# ADR-173 - Same-document recovery when browser storage fails

Date: 2026-10-10. Status: ACCEPTED; R1/R3 data-loss correction, refines ADR-141/144.
Evidence: after a successful draft write followed by quota failure, route remount restored the
older persisted name rather than the latest settings. The regression failed before this change.
Decision: report and independent-visualization draft storage shares an in-memory document mirror
of serialized settings/request strings (maximum 1,000,000 characters per draft, no datasets).
Failed writes remain visible and throw to existing decision UIs, but the latest volatile version
takes precedence over stale storage on client-side route remount. Read denial can recover only
data this document already knows. All existing validators, project/target scopes, revision guards
and exact pending-request bytes are preserved. Dashboard new-visualization discovery uses the same
reader. There is no history/router interception, new server persistence or browser computation.
Confirmed saves and returns to pristine settings retire memory even if removal from storage fails;
a document-local tombstone prevents stale requests being revived on Back/Forward. Failed explicit
discard still retains recovery and blocks the guarded exit. Keep draft and continue still requires
a successful persistent write. A confirmed save with failed cleanup is labelled as saved, not pending.
Alternatives: patch browser history, silently replay older disk drafts, or imply durable storage from
a JS cache. Rejected because of router compatibility, data loss and false recovery guarantees.
Consequences: warnings explicitly distinguish temporary document memory from reload/tab-close
recovery. Reload destroys the mirror; denied cleanup can leave an older disk draft for later explicit
recovery, still protected by existing idempotency/CAS. No automatic retry or new save is introduced.
This covers report/visualization drafts, not all legacy graph/dashboard/helper forms or cross-tab use.

# ADR-172 - Consistent analytical and alignment authoring feedback

Date: 2026-10-10. Status: ACCEPTED; R1/R3 targeted P2 correction.
Context: regression tests reproduced missing focus after analytical grouping/measure/filter and
alignment key edits, plus historical field-check errors hiding a newer alignment preview failure.
Decision: extend the existing explicit-action focus hook to handle reordering after DOM commit.
Analytical grouping/measures, pre-statistics filters and the shared Join/alignment key controls
reuse it: Add focuses the new first control; Remove focuses the next/previous surviving control
or Add for an empty list; Move focuses the moved item's first control at its new position.
Typing, prop refresh and restored drafts do not request focus. IDs, order semantics, precision,
settings and minimum/maximum list limits remain unchanged. Native key buttons explicitly use
type=button so they cannot accidentally submit a surrounding form.
Alignment create/edit checks use action-scoped feedback as in ADR-169, separately from input-query
errors. A new fields/preview attempt clears the previous action error; failures focus a localized
Report check failed panel. Statistical preview failures use the same panel. Existing request/CAS
guards, draft recovery, server schemas and calculations remain authoritative and unchanged.
Alternatives: global focus on every query error, mutation observer resets or browser schema guesses.
Rejected because they steal focus, interfere with lifecycle, or duplicate server responsibilities.
Consequences: this addresses these dynamic controls and failed checks, not complete tab order,
screen-reader/contrast acceptance or unavailable-storage history navigation.

# ADR-171 - Reproducible executive showcase and exact KPI presentation

Date: 2026-10-10. Status: ACCEPTED; R1/R4/R6 integrated acceptance.
Context: separate chart tests did not demonstrate a coherent multi-widget financial report.
The showcase exposed a real defect: decimal strings bypassed KPI currency/percent formatting,
displaying a margin as 0.300570 instead of 30.06%.
Decision: a local developer CLI creates a clearly synthetic new project through public APIs,
with immutable 136-order CSV fixtures, explicit decimal fields, normal graph calculations and
eight widgets. Plan is a per-order expected revenue, not an independently assumed monthly budget.
A reordered replacement file exercises the normal update path. Independent Decimal/statistics
oracles verify financial totals, monthly series, absent/zero heatmap cells, quartiles/outliers,
histogram population and hierarchical totals before and after replacement.
Every invocation creates a new project; no user project is reused or deleted. A partial failure
prints its new project ID for inspection. The CLI is loopback-only and not a product calculation
engine. Browser tests delete only their own synthetic projects after leaving the dashboard.
KPI decimal/large-integer strings now use bounded scaled-integer presentation rounding and Intl
locale/grouping/affixes, without conversion to Number. Display ties round away from zero, matching
the existing Intl presentation; backend half-even calculation scales and raw table values remain
unchanged. Schema, not numeric-looking text, selects this formatting path.
Alternatives: mock chart results or convert exact strings to Float64. Rejected because they conceal
integration defects or lose financial precision. Consequences: the reproducible showcase covers
reload, both themes and update/layout preservation; it does not certify all R0-R6 requirements,
screen-reader/contrast compliance, 100k-row end-to-end performance or human usability.

# ADR-170 - Expose checked after-total formula chains in the report wizard

Date: 2026-10-10. Status: ACCEPTED; R3 guided-calculation capability and R1 usability.
Context: the graph engine already executes ordered after-total formulas, but the wizard offered
only aggregate fields to every formula. A previous derived result appeared as an unknown field
and could not be chosen by its readable name. Row/alignment formulas already had prefix schemas.
Decision: add optional include_summary=false to create/edit fields endpoints and additive
ReportFormulaFields.summary_outputs. Opted-in checks compile the existing graph and resolve its
schema through the last requested summary formula, returning each formula's aggregate/derived
fields with stable IDs and exact metadata. Grouping dimensions are not added to this field scope.
No calculation, persistence or new graph recipe is introduced. Default calls continue ignoring
summary formulas; invalid references in opted-in checks fail explicitly. Editing retains CAS and
advanced-step guards. Receipt payloads, existing nodes and stored projects remain unchanged.
The wizard has a separate Check after-total fields action. It offers checked previous results
only while the input/aggregation and complete preceding formula prefix match the checked request.
Editing a consumer preserves its producer's schema; upstream edits/deletion invalidate downstream
choices. Full preview and the existing atomic save remain required. Every formula still consumes
the previous formula's rounded result according to its explicit scale; no browser arithmetic.
The shared row/summary/alignment formula editor also reuses ADR-169 add/remove focus handling,
preserving surviving formula identities, expressions and precision. No automatic dependency rewrite.
Alternatives: manufacture result columns in the browser, or change default fields semantics.
Rejected because the former duplicates schema inference and the latter breaks incomplete-formula
authoring. Consequences: guided profit -> margin -> target-gap authoring and safe round-trip are
available; this does not complete the executive demo or wider accessibility/human acceptance.

# ADR-169 - Preserve authoring context after dynamic edits and failed actions

Date: 2026-10-10. Status: ACCEPTED; R1/R3/R6 P2 usability correction.
Context: adding/removing basic-report measures and filters did not establish a useful keyboard
focus target. Import/report forms selected the first truthy mutation error, allowing an older
failure to mask a later failure or remain visible after a different successful operation.
Decision: queue focus only for explicit list actions, applying it after the new DOM commits:
new first control on add, next surviving row on remove, previous row at the end, Add when empty.
Restoration, typing and metadata changes never queue list focus. No persisted IDs/settings change.
Use action-scoped feedback cleared at the start of a new attempt, then populated by that attempt's
failure. Opt-in focusable, named error panels distinguish import actions from report checks;
ordinary data/loading panels retain their non-focusing behavior. EN/RU/TT remain supported.
Alternatives: globally focus every error/state panel or reset all mutation observers. Rejected:
the former steals focus in unrelated live views; the latter can interfere with mutation lifecycle.
Consequences: feedback does not alter graph execution, revision guards or pending-save recovery.
Import retries continue using the existing draft request identity; report checks never save a graph.
Comprehensive screen-reader, contrast, analytical/alignment-form and economist audits remain open.

# ADR-168 - Focus the content of import/report wizard steps

Date: 2026-10-10. Status: ACCEPTED; R1/R6 P2 keyboard usability correction.
Evidence: in the production import wizard, keyboard Next followed by Tab focused Back at the
bottom of the new step, skipping the file input. A failing browser assertion and screenshot
reproduced this before changes. Ordinary pointer-based import/edit/refresh acceptance still passed.
Decision: a shared WizardHeading renders a semantic h2 with tabIndex=-1 and focuses on mount or
stage identity change. Import and basic report wizard legends use it; import completion does too.
Report completion already uses the draft boundary's focus handling. Async import URL remounts and
restored report forms focus their visible stage. Editing fields, metadata refetch and translation
changes do not refocus an unchanged stage. Existing visible-focus styling and native controls remain.
If upload has a route-continuation callback, that route alone presents the Tables stage. The old
wizard remains busy until unmounted, preventing duplicate upload and an intermediate stage that
could refocus after the user already pressed Tab. Standalone imports still advance locally.
Alternative: focus the first input automatically. Rejected because it skips the step title/context
and does not cover confirmation steps consistently. No positive tab indices or custom key handling.
Consequences: forward/back transitions establish a predictable reading and tab start, without
changing validation, calculation, draft persistence or apply semantics. This is not a complete
keyboard/screen-reader/contrast audit or evidence of economist usability; those gates stay open.

# ADR-167 - Preserve decimal contracts through field expressions

Date: 2026-10-10. Status: ACCEPTED; P1 metadata/rounding correctness fix.
Evidence: a decimal 1.00000001 projected into Append Field retained its physical value but lost
scale metadata. The subsequent exact Group By defaulted to scale 2 and returned 1.00.
Decision: carry field metadata in CompiledFormula and ValueSchema through projection, typed field
composition, Append Field, field previews, bound role columns and legacy calculated-column
pass-throughs. The shared compiler preserves direct/nullif output metadata; coalesce/if_else use
the maximum branch scale and compatible known units/currencies. Predicate-only fields do not
determine result scale. Decimal comparison/nullif operands align exactly before comparison.
Reuse ADR-166 common decimal rules. Strict casts reject overflow instead of rounding. Validate
referenced physical decimal scales at materialization boundaries. Nondecimal arithmetic and exact
calculated_column@2 semantics remain unchanged; no alternate browser calculation engine.

Alternatives: infer scale from materialized values, or fix only direct Append Field. Rejected:
the former breaks static schema inference/empty inputs, and the latter leaves conditional paths
and previews inconsistent. Metadata is an in-memory execution contract, not a new persistence model.
No graph migration or rewrite of frozen artifacts. Release restoration uses existing stable IDs.
Legacy decimal arithmetic, field sum and scalar output support are not introduced by this fix.
The previously runtime-only unsupported decimal scalar boundary now fails during preflight with
an actionable message, including null/empty inputs. Use the exact table operators for now.
Tests cover direct/conditional field wires, nullif, scales 0-38, null/empty input, conflicting units,
overflow, schema propagation, exact aggregation, preview, persistence and release restoration.

# ADR-166 - Exact decimal composition and matching diagnostics

Date: 2026-10-10. Status: ACCEPTED; P1 correctness fixes in the R2 decimal audit.
Evidence: Union converted 1.00000001 and 1.00000002 to 1.000000 while advertising scale 8;
Join incorrectly matched these different keys. Both used the generic Decimal(38,6) cast.
The separate unmatched/duplicate record service used the same unsafe conversion.
Decision: share decimal schema/cast rules across Union, Join v1/v2 and diagnostic records.
Use Decimal128 precision 38 and the maximum declared source scale, checking physical input scales
and failing on rescale overflow. Known conflicting units/currencies fail before execution; missing
metadata is not proof of compatibility and a shared unit is advertised only when all decimal inputs
declare it. No conversion between currencies, integer/float/decimal types or business meanings is
implicit. Unknown fields may join the common decimal type only when all values are null.
Join diagnostics use the executor's common schema without materializing the join, so relationship
failures still permit diagnostic inspection. Preserve exact transport, but do not leak upstream
Join diagnostics. Non-key Join fields retain their independent metadata. Existing key identity,
row ordering, null matching, cardinality, bounds and nondecimal behavior remain unchanged.

Alternatives: keep truncation behind a legacy version, or reject mixed scales. Rejected: truncation
violates the current schema/Join equality contract, and widening scales is exact when representable.
Consequences: reexecuted affected graphs may correctly gain/lose matches or fail for incompatible
units/overflow instead of returning corrupted values; previously frozen artifacts remain immutable.
Independent normalized sources still require explicit name alignment for the existing Union contract.
Tests cover full preview/result/release restoration with two imports on SQLite and PostgreSQL,
diagnostic lists, scales 0-38, units, nulls, overflow, duplicate guards and large integer transport.
Field-wire decimal/scalar contracts are a separate remaining audit; this does not declare decimal
parity or R0-R6 complete.

# ADR-165 - Reject fractional decimal-to-integer truncation

Date: 2026-10-10. Status: ACCEPTED; P1 correctness fix found during decimal parity review.
Evidence: Convert Types with target integer/on_error=error changed decimal 1.25 to integer 1.
Its fractional-value guard applied only to Float64. Decision: apply the same whole-value comparison
to decimal inputs, without any float conversion. Fractional values now obey the existing error/null
policy; negative fractions, precision tails and errors beyond preview rows are covered. Exact whole
values and large Int64 values remain unchanged; overflow keeps its existing error/null behavior.
No new rounding mode or schema/version migration. Silent truncation violates the existing conversion
policy, so it is fixed in v1, not retained behind an opt-in version. Frozen artifacts are unchanged.

# ADR-164 - Versioned exact Pivot aggregation

Date: 2026-10-10. Status: ACCEPTED; R2 analytical decimal parity.
Context: pivot@1 rejects decimal sums/averages and converts integers to Float64. Cross-tab reports
need exact money and stable dynamic fields without silently changing existing approximate graphs.
Decision: add pivot@2 (Exact Pivot), preserving pivot@1. Numeric sums/extrema accept decimal/integer
or unknown/null values and emit Decimal128(38, source scale), integer scale zero. Averages use an
explicit scale 0-38/default 6 and one final half-even rounding, with exact rational intermediates.
Count accepts any value type, excludes nulls and emits Int64. Null/absent numeric cells remain null;
count produces zero. Null index/category values are ordinary distinct groups. Group/category order
follows first occurrence. Shared pure field-identity/label logic preserves generated IDs and handles
label collisions independently from identities. Data-dependent schema resolution remains mandatory.

Polars projects only the three roles, maps native-equality groups to row/column indices and collects
observations; no wide-row Python materialization or browser aggregation. All selected input is used,
not a preview sample. Native grouping handles NaN/null keys consistently. Numeric physical/schema
mismatch, invalid source scale and output overflow fail. Output retains value units/currency and
lineage; count does not inherit monetary units. Exact transport survives publications/frozen restore.
The existing 128-category and 250k-row/1024-column/2m-output-cell guards remain in effect. A 100k x 100
engine benchmark is separate from import limits. No dependency, API shape or persistence migration.

The editor exposes exact/legacy operations distinctly and average precision only when relevant,
with EN/RU/TT guidance and no automatic Float64 conversion. Replacing an old calculation with a
different output schema requires explicit visualization rebinding; stale fields must still fail.
Alternatives: changing v1 breaks legacy numerical expectations; native fixed-width sum/division
risks intermediate overflow/scale loss. Consequences: saved graphs are not upgraded automatically;
dynamic categories still require explicit handling of disappeared fields downstream.

# ADR-163 - Correct decimal scale loss in Unpivot

Date: 2026-10-10. Status: ACCEPTED; P1 correctness fix discovered during decimal parity audit.
Evidence: unpivot@1 converted Decimal(38,8) value 1.00000001 into Decimal(38,6) value 1.000000,
and omitted scale metadata. It used the generic decimal dtype default, so downstream exact formulas
could not recover lost digits. This is unintended data corruption, not a legacy numeric contract.
Decision: preserve decimal values using the maximum declared input scale, precision 38, exact
transport, lineage and common known unit/currency. Conflicting declared units/currencies fail; mixed
known/unknown metadata is not advertised as known. Missing/invalid or physically mismatched scales
fail explicitly. Strict widening fails on overflow rather than rounding. Existing non-decimal
Unpivot paths, identities, labels, type-compatibility rules and row/cell limits remain unchanged.
No automatic decimal/integer mixing or conversion is introduced. No migration/dependency/API change.
Alternative: adding a new version while leaving silent corruption in v1 would keep exposing users
to data loss. Previously truncated frozen artifacts remain frozen; recalculate the live graph from
its original retained source to obtain corrected values. No historical artifacts are rewritten.

# ADR-162 - Versioned exact share and row-rank authoring

Date: 2026-10-10. Status: ACCEPTED; R2/R3 continuation of ADR-078/118/161.

Context: the analytical shortcut accepted only integer/Float64 fields and the common chain builder
always selected node version 1. Decimal support must use the existing exact executors, not browser
arithmetic, and must preserve denominator/filter scope and saved legacy branches.
Decision: PlannedStep accepts an optional explicit version; omitted versions still mean v1. The
chain builder requires exactly that catalog version and fails before mutation if unavailable.
Decimal selection always uses window@3, followed by calculated_column@2 for shares. Integer fields
retain the legacy default with an explicit exact opt-in; Float64 remains approximate and cannot be
implicitly converted. Exact shares expose output scale 0-38 (default 6), precision 38 and half-even
rounding; denominators retain source scale. Shares stay ratios, not percentages. Overflows remain
ordinary backend errors. Rank uses row_number with explicit value direction and ascending tie-break;
exact rank rejects residual duplicate ordering keys, while the legacy path keeps its old semantics.

Optional parameter selection is always a trailing filter, never pushed before the denominator or
rank. Upstream filters still define the input population. A zero/missing denominator uses the chosen
null/zero fallback, including a missing numerator; otherwise a missing numerator remains missing.
The dialog shows version-aware node names, exact/null/tie semantics and invalid scale guidance in
EN/RU/TT. Apply still stages a whole ordinary branch against the current saved graph snapshot, using
existing autosave/revision/undo behavior. Saved graphs are never automatically upgraded.

Alternatives: converting decimal to Float64 loses money; using browser sums creates a second engine;
silently changing all integer shortcuts alters previous behavior; a new persisted recipe duplicates
the graph. Consequences: no backend/API/persistence change, no new dependency. Existing helper draft
durability limitations remain; this work does not claim full authoring recovery or R0-R6 completion.

# ADR-161 - Explicit exact window calculations

Date: 2026-10-10. Status: ACCEPTED; R2 exact analytical parity.

Context: window@1/@2 reject decimal data and coerce numeric inputs to Float64. Monetary partition
totals, running totals and previous values must retain cents and large integers. Existing projects
must not change results when upgraded.
Decision: add opt-in window@3 (Exact Window), leaving both old executors/configs unchanged. Support
sum, cumulative_sum, cumulative_max, previous and row_number. Numeric input is integer/decimal/null;
Float64 requires explicit upstream mapping. Numeric outputs are Decimal128(38, input scale), integer
inputs use scale zero; row numbers are Int64. No rounding or unit conversion is implicit. Preserve
source metadata and emit ordinary stable window_<node-id> fields with exact transport and lineage.

Partition sums ignore null observations, all-null groups remain null, and source row order stays
unchanged. Other operations sort explicitly, null sort keys last. Every ordered operation, including
row_number, rejects duplicate combined partition/order keys. Cumulative null rows stay null without
resetting state; previous means the immediately preceding row including null, not a prior period.
Null partition keys form ordinary groups. Every emitted numeric result must fit precision 38;
partition totals permit exact cancellation, but an overflowing cumulative output fails immediately.
Bounded fractions avoid ambient Decimal-context rounding and native accumulator overflow. Polars
sorts/groups narrow row indices; only the value column and group indices enter Python, not wide rows.

The v3 output is capped at 250000 rows, 1024 columns and 20000000 cells. The join/legacy-window
2000000-cell guard is inappropriate to a one-column, non-row-expanding operation; legacy/import
limits remain unchanged. The 100k x 100 engine benchmark does not claim imports allow that size.
Alternatives: changing v2 breaks compatibility; native Decimal128 cumulative arithmetic risks
intermediate overflow, and Float64 arithmetic is not an exact monetary substitute. No new dependency,
API shape, browser calculation model or migration is needed. Guided analytics helper adoption is
separate follow-up; exposing the node does not imply all higher-level helpers are decimal-aware.

Regression follow-up to ADR-160: bracketed source IDs beginning 0b/0x/0o are not Python numeric
literals. The restore tokenizer masks bracket contents at equal length before locating string tokens,
then slices/remaps the original expression. Literal text remains unchanged; four explicit prefix
cases and report restore tests protect against random UUID-dependent restoration failure.

# ADR-160 - Typed conditions in exact formulas and literal-safe restoration

Date: 2026-10-10. Status: ACCEPTED; R2 continuation of ADR-118.

Context: conditional monetary calculations need the same precision as arithmetic formulas. Reusing
the legacy Float64 expression path or evaluating both branches could lose cents or divide by zero
in a branch the user deliberately excluded. Restoration must not rewrite quoted business constants.

Decision: extend calculated_column@2's bounded rational evaluator with numeric-result if_else,
is_null, compatible scalar comparisons and boolean and/or/not. String/boolean/date/datetime inputs
are condition-only; integer/decimal comparisons remain exact. Date/datetime comparisons are between
matching fields, with matching timezone metadata for datetimes; no implicit date-text conversion.
Boolean ordering, chained comparisons and all non-allowlisted syntax are rejected. All branches
are statically validated and included in lineage, even when unselected. Runtime if_else evaluates
only the selected branch. Null predicates choose otherwise; null comparisons and boolean operations
use three-valued logic, with short-circuit false AND / true OR. Precision, half-even output rounding,
input/AST/intermediate limits and v1 semantics stay unchanged. The shared editor exposes conditional
fields/help in EN/RU/TT; no browser calculation, new recipe, API or persistence schema is introduced.

Release restore tokenizes expression strings and remaps identities only outside quoted literals.
This protects exact and legacy formulas, including literal text resembling generated node/field IDs.
Alternatives: a new conditional node/version adds unnecessary graph complexity for an additive
syntax capability; eager Polars branches violate the explicit branch contract; blanket string
replacement corrupts business literals. Consequences: conditional v2 formulas require this server
version; previously valid arithmetic/v1 projects retain behavior. Remaining decimal window parity
and broader language functions are separate work, not implied by this extension.

# ADR-159 - Guarded alignment wizard round-trip

Date: 2026-10-10. Status: ACCEPTED; R3 continuation of ADR-127/158.

Context: guided alignment creation and derived exact formulas need a safe edit path. Rebuilding or
copying the two input branches would lose manual preparation, shared lineage and stable identities.
Decision: recognize a terminal align_measures@1 with optional contiguous calculated_column@2 nodes
marked report_formula=alignment. Read configuration from the saved graph, including restored releases;
no receipt recipe or source-publication dependency is required. Keep the two concrete input endpoints
unchanged. Authors can change key pairs, measures, names, null-key policy and ordered exact formulas.
Changing source connections or unrecognized manual formula chains remains explicit graph editing.

Own only the recognized suffix. Reject other consumers/publications/visualizations of owned nodes,
manual presentation containers, context/measure definitions and interactive widgets. Preserve shared
upstream preparation and its parameters/presentation. Multiple widgets of this visualization require
acknowledgement. Keep retained node/edge IDs, UI positions and ordinary formula identities; add/remove
only owned formula nodes and move the existing publication/visual source to the new terminal.

Field identity/order changes require explicit table rebinding. Without rebinding preserve the saved
column order and all appearance. With rebinding replace table columns/grain/two reused-measure guards;
never drop formatting/context/navigation references to removed fields silently. Errors leave both
graph and visualization untouched. Reuse common schema inference and full alignment execution for
create/edit, not another arithmetic implementation. Recheck project token and full data on save.
Successful preview also returns checked input/prefix schemas from the actual result schema. The
editor retains readable labels after draft restoration and prefers newer explicit field checks;
changed prefixes invalidate downstream choices without replacing the author's expressions.
Project/workflow/visual locks, atomic revision updates and target-bound receipt fingerprints protect
conflicting tabs, retries and rollback. Retry after visualization deletion returns 410, never recreates.

An explicit alignment-edit draft scope stores the original revision, settings and exact pending
request. Recovery wraps metadata loading, so commit-then-disconnect can be retried with metadata
offline. Denied/cleared session storage remains a limitation. Ordinary wizard entry exposes the
aligned editor link; unavailable/advanced calculations retain their graph link and explanation.

Alternatives: permissive branch reconstruction or silently retargeting source publications changes
calculation meaning; marker-only ownership ignores downstream users. Rejected. No dependency/DDL.
This completes the guided same-workflow alignment edit slice, not cross-workflow composition or a
general graph editor replacement. Comprehensive usability/human acceptance remains separate.

# ADR-158 - Exact derived measures after explicit alignment

Date: 2026-10-09. Status: ACCEPTED; R3 guided composition after ADR-127.

Context: economists can align actual/plan or other prepared measures but must currently wire
subsequent differences/ratios manually. Another aggregation would change the meaning of prepared
ratios and averages. Existing exact expressions already provide the required arithmetic contract.
Decision: extend AlignmentReportRequest with up to 16 ordered ReportFormula settings. Compile
align_measures@1 -> calculated_column@2 chains; publish the terminal node. Formula IDs are stable,
references may use aligned fields or earlier formulas, and each node has its explicit precision,
scale and half-even rounding boundary. The ordinary schema resolver owns field discovery through
a read-only fields endpoint. It never executes rows. The full engine owns preview/apply statistics.

Preserve complete alignment match counts, all keys, both input measures and presence flags. Missing
rows/values remain null; zero denominator handling is explicit through nullif/safe_divide. No float
conversion, reaggregation, inferred unit conversion or browser calculation. Authors must verify the
business meaning of units; this slice does not claim dimensional analysis of arbitrary expressions.
The table keeps its existing two input-measure/grain guards; formula nodes validate derived inputs.
All formula fields remain visible in the table. Existing graph objects and manual input branches
are untouched. Schema/identity/execution errors abort without writes; existing project CAS,
transactional receipts and release remapping handle the complete chain.

Omit an empty formulas list from receipt fingerprints so old pending requests remain retryable.
Same-tab drafts retain formula settings/identities but never reuse a saved preview. Field choices
require an unchanged server-checked source/config and preceding formula prefix. Editing a prefix
invalidates dependent choices, not the user's expressions. Saved alignment editing remains in the
graph pending the next explicit round-trip slice; no unsupported wizard rewrite is attempted.

Alternatives: a second formula engine or saved recipe would drift from the graph; implicit float
coercion loses exactness; repeated aggregation changes denominators. Rejected. No dependency or
physical schema change. This delivers guided derived formulas, not cross-workflow alignment.

# ADR-157 - Source-independent analytical calculation templates

Date: 2026-10-09. Status: ACCEPTED; first reusable analytical-template slice of R5.

Context: repeating an analysis on a new table should not require copying datasets or manually
recreating nodes. A template cannot infer equal business meaning from similar field names or
encode an arbitrary manual preparation graph safely.
Decision: capture a revision-checked, wizard-compatible saved calculation into an immutable
project-local template. Store versioned typed node settings/filters, neutral input-role keys,
field labels/logical types/known unit/currency, and an author-supplied input row description.
Exclude source references/records, manual upstream steps and visualization appearance.
Literal filter values and labels remain exact, including strings resembling technical IDs.

Use the existing ReportDocument envelope with kind analytical_template; no physical schema change
or dependency. Capture IDs/fingerprints provide exact retries; changed payloads conflict. Up to 200
immutable templates per project are supported. Rename/overwrite/archive and cross-project libraries
are not in this first slice. Deleting the source report does not remove its template. Pending capture
requests have explicit same-tab recovery even if original report metadata is unavailable. Closed or
denied session storage remains a limitation; capture success advises reloading before further edits.

Application requires explicit one-to-one mapping and acknowledgement of input grain/units. Logical
types must match; known unit/currency mismatch or missing metadata requires explicit upstream
normalization. Validate snapshot/shared-input revisions before returning mapped settings. Allocate
new deterministic measure identities from the report request. Preparation writes nothing; the normal
wizard then previews/edits/applies ordinary graph objects atomically. Reports have no runtime template
dependency and no second calculation model. Filters remain visible/editable before full-data preview.

Include templates in project fingerprints and frozen metadata. Restoration creates fresh document
identities, retaining role keys and literal values without graph-ID substitution. Old releases default
to an empty catalog. Existing graph/render contracts continue to own all statistics and appearance.
Alternatives: whole-graph copying duplicates unknown shared inputs; name matching guesses semantics;
a template execution engine violates graph authority. Rejected. All eight analytical-wizard types
are supported; wider report/chart families and catalog management remain separate future slices.

# ADR-156 - Guarded hierarchy calculation round-trip

Date: 2026-10-09. Status: ACCEPTED; extends ADR-148/155.

Context: guided treemap/sunburst creation uses table_rollup, while the existing editor recognizes
one presentation per node type. Treating hierarchy as an analytical table would change its binding
contract; blindly replacing a manual multi-measure rollup would lose calculations.
Decision: recognize treemap/sunburst on a compatible terminal table_rollup with one additive measure
and all totals. Project settings with the visualization type, but retain the actual table_rollup
node, identity, UI, manual preparation and publication. Validate existing hierarchy bindings before
offering edits. Multi-measure, shared, context-bound and unknown settings remain explicit graph steps.
Changing grouping order/identity or measure identity requires rebind_fields. Change only typed
hierarchy dimensions/value bindings; keep appearance, row roles and all external references. Dangling
format/navigation fields fail, never disappear silently. Changing operation on the same measure
retains its logical identity. Presentation type remains fixed during an edit.
Existing full-data preview, one-transaction apply, CAS, shared-widget acknowledgement, receipts and
tab-local recovery remain authoritative. No schema migration/dependency/second calculation model.
Alternatives: exposing all rollup measures as one displayed area risks destructive simplification;
automatically rebinding without confirmation hides semantic changes. Both rejected.
Consequences: ordinary hierarchy authoring round-trips in the wizard. Advanced rollups remain fully
editable in the graph; templates and the broader product/human acceptance gates remain separate.

# ADR-155 - Guided R5 profiles through the existing analytical report lifecycle

Date: 2026-10-09. Status: ACCEPTED.

Context: Pareto, funnel and hierarchical views already have full-data graph preparation and typed
rendering, but their creation required manual graph setup or changing an analytical table view.
Decision: extend the existing discriminated analytical settings and report route, not a second
recipe or calculation engine. Pareto and funnel compile to their ordinary nodes on prepared unique
rows. Hierarchical settings compile to table_rollup@1 with ordered dimensions, one additive sum/count
measure and all totals. The requested hierarchy presentation is not a new calculation node type.
Filters remain upstream; shared prepared inputs extend their existing graph without copying it.
Preview writes nothing; apply reuses project locks, revision checks, one transaction and receipts.
Local drafts retain original revisions and require a fresh preview before an unsent save.

Structurally compatible Pareto/funnel suffixes reuse guarded wizard editing and retain node IDs,
manual preparation, presentation and dashboard layout. Advanced/shared/context-bound calculations
remain explicit graph steps. Hierarchy round-trip editing is intentionally separate: the existing
rollup editor must not accidentally rebind or simplify a manually configured hierarchy/multi-measure
result. No automatic aggregation is added for duplicate Pareto categories or funnel stages.

Alternatives: separate chart-specific report routes would duplicate recovery/transaction semantics;
silent aggregation would guess the intended grain. Both are rejected. No new dependency or DDL.
Consequences: guided creation expands to eight analytical choices, while templates, hierarchy
round-trip editing, other guided chart types and human/accessibility acceptance remain open.

# ADR-154 - Graph-owned funnel transitions in explicit stage order

Date: 2026-10-09. Status: ACCEPTED; R5 funnel.

Context: value-sorted funnels can conceal incorrect stage order or unrelated populations. Automatic
aggregation cannot infer cohort membership. A visual shape alone does not establish conversion of
individual entities. Exact transition statistics belong in an ordinary reusable graph node.

Decision: funnel_steps@1 consumes one prepared row per distinct nonempty stage, a unique integer
order and a nonnegative finite/nonempty value. Ascending explicit order is authoritative, including
ties in values and gaps in order numbers. Growth between stages fails with advice to check the
population or use a bar chart; no value sorting or silent clipping. Upstream nodes own aggregation,
cohort selection and unit consistency. The UI explicitly warns that aggregate ratios do not prove
individual transitions. No event/cohort matching engine is claimed.

The dataset port emits stable node/key-derived identities, original order, value, loss from the
previous stage and retention relative to previous/initial stage, with a summary port for stage
count, initial/final amounts and overall retention. The first loss/previous share are undefined.
A zero denominator is undefined, not 0% or 100%; positive-to-zero transition is genuinely 0%.
Empty input has an empty sequence and null initial/final amounts. Single-stage input is allowed;
its overall retention is 100% only when initial value is positive. Up to 50 complete prepared stages
are accepted; this is an output limit, not a raw-data limit. Fraction intermediates preserve exact
integer/decimal amounts and losses; Decimal128 precision/scale mismatch fails. Percentages use
12-place half-even rounding with exact fraction companions. Float source amounts remain approximate.

FunnelSpec@1 binds only the matching funnel_steps@1 publication roles. Preview/save validate the
whole sequence. Navigation roles must belong to stages; view restrictions apply before preparation,
never to the terminal output where summary/denominators could disagree. All named datasets come
from one execution. Ordinary paging parameters do not turn a complete <=50-stage chart into a
partial sequence; table publication previews still use normal pagination.

Presentation uses normalized exact initial shares for widths, not area. Centred stage bars have
subdued connecting polygons; the final stage is flat, without an invented terminal drop to zero.
Zero has a dashed marker, while positive widths that underflow are not relabelled zero. Exact
amounts/fractions are always available in tooltips/table. A vertically scrollable labelled chart
keeps readable stage names; keyboard scrolling is available. Complete counts and scope are explicit.
No renderer computes transitions, sorts stages or aggregates rows. Both themes and EN/RU/TT remain.

Alternatives: automatic descending native funnel sorting would disguise population/order errors;
arbitrary area-based tapering adds ambiguity. The existing ECharts custom-series path makes exact
width bindings and a flat final stage explicit, without another dependency. Per-stage graph formulas
alone are possible but obscure the shared ordering/denominator contract. This focused node is reusable
as table data independent of the chart. CAS, retry, spec inheritance, copy, full releases and restore
reuse the existing lifecycle; restored projects get new identity namespaces with unchanged values.
No DDL/dependency/legacy migration. Guided funnel generation and reusable templates remain next work.

# ADR-153 - Exact explicit fact/target/range bullet charts

Date: 2026-10-09. Status: ACCEPTED; R5 bullet presentation.

Context: economists need compact comparison against a target and authored qualitative ranges.
Automatic traffic-light meaning, a truncated zero baseline or hidden aggregation could misrepresent
costs and signed changes. Decimal membership must not depend on browser floating-point rounding.

Decision: BulletSpec@1 binds a unique nonempty category, numeric actual and target, an explicit
shared scale including zero, and 1–5 labelled ordered ranges. Both numeric roles must have matching
unit/currency metadata; the author confirms unknown units. Bounds are plain decimal strings.
Ranges are lower-inclusive/upper-exclusive except the final maximum, and cover the entire scale.
The author chooses neutral/negative/warning/positive tones; increasing values are not automatically
good. Actual and target may share a field. Missing values remain absent, distinct from actual zero.

prepare_bullet validates the whole selected Dataset before pagination: unique categories, finite
numbers, unit compatibility and no value outside the explicit scale. Out-of-scale values reject
preview/save instead of clipping. Fraction comparisons protect decimal/integer bounds and range
membership; only bounded geometry becomes floats. Exact source strings and bounds remain available.
UUID5 selection identities use publication namespace and typed category, not row index. A single
execution supplies observations, geometry, missing counts and context/navigation fields. No aggregation
or achievement formula lives in the chart; ordinary graph operations prepare business measures.

The UI provides horizontal actual bars, long target markers, distinct short actual-zero markers,
exact tooltips/table, range legend and explanation. Resize-aware keyboard windows show 1–5 indicators
according to card height, independently of API pages. Both page/window changes retain scale/counts.
Very small differences can be unresolvable on canvas; the table preserves exact values. EN/RU/TT,
both themes, local draft recovery, full-input save validation, CAS/retry/copy and complete frozen
release/restore reuse existing contracts. ECharts custom series is a presentation adapter only.

Alternatives: automatic scale/ranges would conceal business meaning; a new preparation node would
duplicate non-aggregating validation; browser decimal classification would introduce a second source
of semantic truth. No DDL, dependencies or legacy behavior changes are needed. Per-indicator scales
and automatic attainment percentages are not delivered. Funnel/templates and human gates remain open.

Reference: [ECharts custom series](https://github.com/apache/echarts-doc/blob/master/en/option/series/custom.md).

# ADR-152 - Shared graph-owned hierarchy for treemap and sunburst

Date: 2026-10-09. Status: ACCEPTED; R5 hierarchical views.

Context: table_rollup@1 already owns ordered dimensions, stable path identities and full-observation
totals. A second hierarchy aggregation node or chart-local rollup would duplicate semantics. Areas
cannot faithfully represent a parent average or ratio as the sum of its children's contributions.

Decision: HierarchySpec@1 has distinct treemap_chart/sunburst_chart types, the existing analytical
row roles, ordered dimensions and one additive measure. Only sum/count/count_rows are available.
The publication must be table_rollup@1 with dimensions, grand total and every intermediate subtotal.
Population restrictions apply upstream. Existing guided analytical-table creation can prepare this
graph; visualization settings choose either hierarchical view afterward. No new report recipe.

The backend validates the complete tree: <=5000 nodes, one root, unique identities, consecutive
parent depths, complete intermediate levels, nonnegative/finite/nonempty values and reconciled
children. Null category keys remain genuine categories, not total placeholders; depth determines
the path. An empty sum root may retain null with zero source rows. Zero totals have undefined shares
and no drawn area. A zero nonroot node remains in the table. Negative/missing prepared sums require
explicit upstream correction/filtering, never silent omission or conversion to zero.

Integer/decimal parent-child reconciliation is exact using Fraction intermediates; existing rollup
overflow rules apply. Float64 totals remain approximate and reconcile at relative tolerance 1e-12
(zero absolute tolerance). Geometry uses bounded ratios; exact values and exact fractions of the
complete prepared root stay separate from drawing weights. Very tiny weights can be unresolvable on
canvas; no minimum-area inflation is used. This limitation is explicit and exact table access remains.

Complete bounded trees are returned irrespective of the ordinary row-page request, like other
complete statistical charts. There is no partial tree presented as a complete population. The exact
group table locally pages 100 immediate children, with keyboard Open group/Parent group/Entire hierarchy
actions. Exploration changes only the displayed branch; shares retain the complete-root denominator.
ECharts receives nested parent/child bindings and server weights, never business aggregation. Canvas
selection resolves stable identities, not row indices. Automatic canvas drilling/roaming is disabled
so it cannot diverge from the accessible table's group state. Colours are identity-based; labels,
tooltips, named measure/units and the table supplement colour. Both themes and EN/RU/TT remain.

Full-result validation on save, spec inheritance on appearance/copy, CAS and idempotent receipts
reuse the existing lifecycle. Releases retain the complete exact tree and geometry from one result;
restore rebinds stable graph fields with the existing restore mechanism. No dependency or migration.
Alternatives rejected: arbitrary user-supplied trees, averaging areas, hidden duplicate aggregation,
partial-tree paging and a second client-side calculation engine. Consequence: use prepared rollups,
and group/filter explicitly when 5000 presentation nodes are exceeded. Guided one-step hierarchical
report creation, broader accessibility review and human acceptance remain open.

Renderer references: [ECharts treemap](https://github.com/apache/echarts-doc/blob/master/en/option/series/treemap.md)
and [sunburst](https://github.com/apache/echarts-doc/blob/master/en/option/series/sunburst.md).

# ADR-151 - Explicit Pareto preparation and typed cumulative presentation

Date: 2026-10-09. Status: ACCEPTED; R5 Pareto.

Context: Pareto analysis needs auditable contributions and a full-population denominator. Sorting
or accumulating a bounded chart page would produce incorrect shares. Duplicate categories and
negative amounts require an explicit business decision, not a hidden renderer policy.

Decision: pareto@1 accepts a prepared category and numeric contribution, validates the complete
input, requires unique/nonempty categories and finite/nonempty/nonnegative values, then orders by
descending value and ascending native category for ties (text lexical, integer/date/boolean native).
Aggregation and filtering remain explicit upstream nodes. Outputs are dataset (rank, category,
amount, cumulative amount, rounded percentages and exact fraction companions) and summary (input
count, zero count, total). Category UUID5 identities and role fields are stable within the node.
Integer/decimal amounts use Decimal128 with explicit overflow/scale errors. Percentages are rounded
half-even to 12 places; finite ratios are decimal text, otherwise numerator/denominator. Float
inputs use their decimal round-trip text for rational intermediate shares and retain Float64 amount
transport; this does not promise recovery of original monetary precision. Zero totals produce null
shares, including null drawing positions. Empty input has a zero-count population and no ranks.

ParetoSpec@1 binds both prepared ports. Contribution bars use full-input extents; cumulative shares
use a fixed 0–100% right axis. ComboPresentation is reused for bounded geometry, but the spec stays
semantically distinct. No client sort, grouping or cumulative calculation. An integer 1–100 reference
(default 80) is a visual guide only and is absent when shares are undefined. Public pages explicitly
say that only a subset is drawn; full scales and denominators do not change. Exact tables and
stable field selection provide keyboard access independent of canvas. Upstream-only view restrictions
prevent post-statistics filtering from silently changing population meaning.

Compact cards keep the page controls outside the drawable area; bounded header details and a flexible
chart height prevent clipping or legend/navigation overlap. Pareto uses labelled page buttons rather
than an additional drag-only zoom slider. Browser geometry assertions cover desktop and narrow cards.

Full-result save validation, CAS, copy/appearance spec inheritance and idempotent receipts use the
existing lifecycle. Frozen releases serialize complete rows and geometry from one execution; frozen
paging slices both together and retains population/scales. Restore creates the same ordinary graph.
No migration/dependency or public unbounded result endpoint. EN/RU/TT configuration and explanatory
states are included. Guided Pareto report creation remains future work, not a new recipe model.

Alternatives rejected: chart-local accumulation, implicit duplicate aggregation, silently dropping
negative/missing values, freezing only displayed pages, treating all-zero shares as 100%, and a
second geometry contract duplicating combo's typed positions. Consequence: input preparation is
explicit; large detailed populations require paged presentation and measured execution costs.
The 100k-row narrow/wide benchmark checks exact totals and records cold/repeated execution and
Python memory; it is not end-to-end latency or an accessibility/human acceptance certificate.

# ADR-150 - Publish bubble views with complete frozen populations

Date: 2026-10-09. Status: ACCEPTED; R5 bubble integration.

Context: ADR-149 established preparation but deliberately withheld an unrenderable public chart.
The user needs a usable visualization, not just a numeric helper, while large sources require bounded
live pages and full frozen releases. Canvas inspection also revealed identical-looking truncated
labels for close large decimal values and bubbles overlapping labels at extent endpoints.

Decision: register BubbleSpec@1/bubble_chart alongside the existing typed charts. Prepared tables
bind key/X/Y/size and optional label/group through schema-aware controls. Save/create/copy validate
the full selected population before mutation using the existing execution callback, project lock,
CAS and retry receipts. Appearance-only edits/copies preserve omitted specs. Generic graph-bound
legacy nodes do not advertise this independent typed chart. No new calculation node or storage DDL.
Navigation/highlight fields are projected alongside role fields from the same execution/page.

Live results carry an observations dataset plus matching stable point IDs, full counts and scales.
The page is explicit in both chart and table; changing pages does not change population or scales.
Zero-area/missing points are omitted from circles but retained with labelled states in the exact
table. Radius uses the prepared square-root ratio; no minimum-area or outline inflation. Group
colours depend on stable group identity, not page position. Text legend/tooltips/table supplement
colour. Key-based chart selection and keyboard table buttons emit stable field bindings.

The release-only full_data path serializes every observation/point from one graph execution, bypassing
the live page cap. Frozen API paging slices both rows and points together without recalculation.
Full bounds/counts survive pages; restoration creates an editable ordinary graph/project. Existing
release size limits fail explicitly rather than truncating data. Public clients cannot request
full_data through the result endpoint. No repeated graph execution per frozen page.

Axis coordinates remain bounded rationally computed drawing positions. Original tick text is exact;
long close values get exact relative display labels plus an explicitly visible base-value equation.
Other very long tick labels use scientific display notation only. The exact table and tooltip are
unchanged. Canvas label overlap suppression and viewport-dependent pixel clearance keep endpoint
circles off axis labels; resize recomputes presentation geometry, never source data/scales.

The new type participates in existing draft recovery and pending-save retry. EN/RU/TT labels, both
themes, no-data states, non-drawable page explanations and disabled unavailable paging are explicit.
Alternatives: silently treating the first page as the population, freezing only visible points,
raw JS decimal scaling or radius-proportional sizing violate the accepted analytical contract.
Consequences: no dependency/migration. Pareto/hierarchies/bullet/funnel/templates, broader legacy
typed migration and human usability acceptance remain unfinished; this does not complete R0–R6.

# ADR-149 - Full-input bubble scales with bounded exact presentation

Date: 2026-10-09. Status: ACCEPTED; foundation delivery, followed by chart integration in ADR-150.

Context: R5 needs a third numeric dimension without misleading size encodings or browser-side
calculations. A 100000-row source cannot be treated as the first preview page. Large exact values
can collapse when converted to browser numbers before their coordinate differences are computed.

Decision: BubbleSpec@1 binds a unique nonempty categorical key, numeric X/Y/size and optional label
and group using stable field IDs. Numeric roles may intentionally reuse a field. Preparation does
not aggregate, sort, infer units or create business calculations. One ordinary prepared dataset is
the input. Validate all keys, numeric finiteness and nonnegative size before paging, even for rows
with missing coordinates. Null numeric roles remain missing, never zero. Group null and empty text
are distinct. UUID5 point/group identities use publication namespace and typed stable field/value;
renaming engine/display fields and reordering rows preserve identity.

Each axis uses its complete non-null input extent, including incomplete observations; size uses
the full non-null maximum. Rational differences produce bounded coordinates and exact tick text.
Constant axes have one centred tick; wholly missing axes have no invented range. Area, not radius,
is proportional to size. Radius is sqrt(size/full maximum); sqrt precedes conversion to Float64 so
extreme positive sizes do not underflow to zero prematurely. Zero-area and missing rows have
distinct states and remain in the exact table. No minimum-area inflation or negative-size abs().

The output carries full population counts and an explicit input-order page (default 1000, maximum
2000). Scales/counts are page-independent. Project only selected fields before exact transport;
never convert a wide/full source into Python row dictionaries. Future UI must prominently identify
a partial page, offer navigation and the exact table, and must not imply that a page is the complete
distribution. Frozen integration must retain all rows from one consistent execution. Those API,
renderer, save/release/restore and browser changes are the next delivery slice, not claimed here.
The internal contract is deliberately not yet in ChartType/VisualizationSpec or the public registry:
existing clients must not encounter an unrenderable partially implemented chart.

Alternatives: raw Float64 scaling loses exact differences; per-page extents change comparisons;
radius-proportional sizes exaggerate area; silent sampling hides omitted observations; a blanket
2000-input cap unnecessarily prevents full validation/scaling of typical 100000-row datasets.
Consequences: no dependency, migration or public API change. Full-input numeric/identity tests and
a non-persistent narrow/wide benchmark protect this foundation; they are not chart/browser or
human acceptance. API/frontend/release integration remains explicitly unfinished.

# ADR-148 - Edit terminal analytical calculations through the existing graph

Date: 2026-10-09. Status: ACCEPTED; compatible terminal editing delivered and verified.

Recognize histogram/boxplot/heatmap/table_rollup v1 dataset publications structurally, not through
creation receipts. Keep terminal node identity, upstream/manual branches, publication, presentation,
visualization and dashboard placement. A simple private immediate filter is editable; shared,
parameterized or presentation-bound filters remain upstream. Shared terminal outputs, other consumers,
named measures and view/navigation bindings remain explicit advanced graph steps. Multiple widgets
of the same visualization require acknowledgement. Project-state token and project/visualization locks
protect preview/apply; exact target-bound edit receipts replay before current-state checks.

Creation/edit preview share full-data typed renderers. Keep the analysis type; another kind is a new
report, avoiding implicit changes of statistical meaning. Table grouping/measure identity changes
require explicit field rebinding; retain applicable visible ordering, pinning and raw appearance.
Never silently delete conditional rules or formatting/navigation references to removed fields.
Local draft recovery retains original revision and exact pending requests, with no second saved recipe.

Alternatives: recompiling the complete graph loses manual work; in-place shared changes affect other
reports unexpectedly; silently regenerating visualization options destroys deliberate formatting.
No dependency or migration. Remaining R3/R5/human acceptance is not declared complete by this slice.
Browser acceptance found table sticky headers above the widget action menu, intercepting normal
clicks. Isolate the analytical table's stacking context so its internal pinned/header layers cannot
escape into dashboard menus. The regression uses real clicks, without forced actions.

# ADR-147 - One analytical authoring path for distributions, cells and grouped totals

Date: 2026-10-09. Status: ACCEPTED; guided creation slice delivered and verified.

Context: the new guided distribution path already owns safe input/preview/apply/recovery orchestration.
Heatmap and analytical-table preparation/rendering exist but still require manual wiring.

Decision: extend its discriminated analysis union with HeatmapConfig and TableRollupConfig, not a
second wizard/engine. Compile the same ordinary source/filter/preparation/publication branch and
use existing typed role factories/renderers. Heatmap aggregation is explicitly chosen; rollup measures
keep UUID identities, ordered dimensions, optional intermediate/grand totals and observation-based
averages/ratios. Preview returns all bounded heatmap cells or a 100-row table page with global totals.
Generic offset is added; outlier_offset remains compatible. Conflicting offsets fail validation.
The old histogram/box-plot normalized request fingerprint is unchanged, preserving save receipts.

The UI is now called Create analytical report with four tasks; existing statistics URLs/drafts remain
valid. Reuse graph controls and the common recovery boundary, allowing incomplete in-progress drafts
while server contracts enforce submitted settings. Statistics and totals remain graph-owned. After
creation the existing visualization editor handles colour scales, pinning/density and conditional
formatting; those presentation controls are not duplicated into the creation form. Calculation edits
remain an explicit graph route until safe round-trip editing is implemented.

Alternatives: copying orchestration per chart risks divergent receipts/guards; inferring an aggregation
or averaging displayed child rows changes business meaning. Consequences: more analytical tasks are
available without wires; no schema migration/dependency, no automatic migration of existing reports,
and no claim that broader R3/R4/R5 or human acceptance is finished.

# ADR-146 - Guided distribution reports reuse the statistical graph

Date: 2026-10-09. Status: ACCEPTED; histogram/box-plot creation slice delivered and verified.

Context: histogram and box-plot preparation/rendering are tested but require manual graph authoring.
The report-first product needs a direct observation-to-report journey, not another statistical engine.

Decision: a typed statistical-reports preview/apply API accepts the common revision-guarded imported
or published input, a discriminated histogram/boxplot_stats config, and optional upstream filters.
Shared input resolution retains existing project/source/context/block/CAS checks. The compiler emits
ordinary dataset_source (only for imports), optional filter and statistical nodes, then publishes
their dataset output. Prepared results append a branch without copying or rewriting existing nodes.
The existing typed renderer reads both outputs from one execution; no preview writes occur. Outlier
paging never changes the full-population statistics. Apply saves graph/publication/chart/dashboard
and a fingerprinted receipt under one project lock/transaction. Identical retries replay before CAS;
deleted results return 410 rather than being recreated. No schema migration or dependency is needed.
Preview/result offsets are bounded to nonnegative signed-64-bit values before entering Polars;
adversarial oversized offsets produced a native overflow during review and now return validation
errors. This bound also protects the shared visualization result request, without changing valid paging.

The authoring page reuses existing statistical controls, chart/table views and report draft boundary.
Exact bounds remain strings. Unsent drafts require fresh preview; pending requests can replay without
metadata. Filters explicitly select observations before statistics; manual advanced transformations
remain available through prepared inputs and the graph. This slice creates reports; safe wizard
round-trip editing of statistical nodes is still a separate task. Existing renderer appearance and
frozen-release/restore paths remain authoritative, not an extra report recipe.

Alternatives: extending measure-aggregation settings with mutually incompatible statistical fields
obscures observation semantics; browser preparation or temporary persisted preview workflows violate
execution/preview boundaries. Consequences: histogram/box plot become accessible without manual wires;
guided heatmap/rollup, broader registry, advanced editing and human acceptance remain open.

# ADR-145 - Named-measure report recovery and catalog refresh safety

Date: 2026-10-09. Status: ACCEPTED; completion of the named-measure report recovery slice.

Context: named-measure reuse still used a per-mount apply identity and lost settings on reload.
Failed catalog refresh could leave cached definitions available for a new preview/save; explicit
same-token refresh also retained an old preview. These are unsafe authoring states, independently
of the backend's grain and revision validation.

Decision: extend ADR-144's existing boundary/envelope with a measure variant. Scope recovery by
project, workflow, publication and primary measure; validate stored pending targets against this
scope. Keep selected extra measures, presentation and original token, require fresh preview for an
unsent restored draft, and rotate identities only after definitive rejection. Empty user names may
recover the resolved measure name. An uncertain save retries the exact body via existing receipts,
without requiring current catalog/source metadata. No new API, migration, dependency or calculation.

Failed catalog refresh disables new preview/apply even with cached entries. Explicit refresh clears
the old preview and releases the pinned token. Missing/incompatible selections remain visible for
explicit correction; the backend retains all grain/type/duplicate and prepared-value guards. Saved
reports still render prepared values directly, with no reaggregation or copied graph nodes.

Alternatives: a separate measure-draft subsystem duplicates ADR-144; dropping missing selections
silently changes report meaning; reissuing a new apply after a lost response can duplicate reports.
Consequences: create/edit/alignment/named-measure report forms now share a tested recovery lifecycle.
This does not complete all-form/WCAG/human acceptance or provide durable cross-device drafts. The
next product work should expand guided statistical reports, not defer analytics behind more recovery
infrastructure. Existing server receipt semantics and local-storage limits remain unchanged.

# ADR-144 - Report wizard recovery without another calculation model

Date: 2026-10-09. Status: ACCEPTED; R1 authoring recovery slice.

Context: report creation, safe graph-suffix editing and alignment already have transactional server
receipts, but their browser forms generated a new identity on every mount and lost unsaved settings.
Reloading after a lost success response could therefore repeat an already applied creation.

Decision: ReportDraftBoundary owns a validated versioned tab-local envelope scoped by project,
create/edit/alignment mode and edited visualization. Forms persist settings, stable formula/measure
IDs, selected inputs, wizard step and original CAS token, not datasets/previews or a saved recipe.
Recovery is explicit; unsent restored settings require a new server preview. Original edit/prepared
input tokens remain pinned until an explicit source refresh or saved-report reload. Shared-widget
acknowledgement is not restored for an unsent edit.

Before apply, persist the exact request string and lock the authoring form. On reload, the boundary
can retry this request before querying current authoring metadata; a changed/unsupported graph or
unavailable schema must not prevent recovery of an already committed transaction. Reuse existing
backend receipt/CAS semantics, without new APIs, migrations, dependencies or browser calculations.
Recognized rejections restore editable settings with a new request identity and invalidate preview;
network, server and unstructured proxy failures retain the original request. A synchronous guard
prevents overlapping submits. Abandoning uncertain recovery warns that a report may already exist.

Workspace/internal links offer keep draft, discard and continue editing. Native history/reload relies
on tab recovery, not patched router/history. Failed local writes are visible and prevent the Keep
and continue action; explicit recovery bypass is available if storage cannot be read. Clearing,
closing or denying session storage still limits reload recovery. Existing receipt replies prove the
past operation, not that its objects remain present/current after later edits or deletions.

Alternatives: restoring only names/fields loses revisions and request identity; rebuilding from a
receipt would overwrite manual graph changes; a server autosave/second report recipe exceeds scope.
Consequences: create/edit/alignment use one lifecycle boundary, while the ordinary form state and
server calculations remain authoritative. Named-measure authoring and comprehensive all-form/human
acceptance remain separate work. Recovery is not a claim of durable cross-device storage.

# ADR-143 - Recoverable independent visualization saves

Date: 2026-10-09. Status: ACCEPTED; R1 save-recovery reliability slice.

Context: a create/copy transaction can commit while its response is lost. A retry previously created
another visualization; an edited visualization instead produced a misleading revision conflict.
ADR-141 preserved settings but not the identity or exact body of an in-flight operation.

Decision: accept optional request_id for independent visualization saves, including edits. Use the
existing project lock and ReportDocument envelope, with a project/operation-family UUID namespace.
Hash the typed submitted settings and create/update/copy target before inherited guards fill fields.
Persist the receipt and result atomically. Identical retries bypass now-stale revision checks and
return the current settings of the same visualization. Different settings/operation with the same
key conflict; deleted results return 410 without resurrection. Later edits are neither overwritten
nor presented as the old response. Old API clients remain compatible but have no retry guarantee.

The editor records its exact request before dispatch, in memory and in its existing session draft.
An uncertain response locks settings and permits retry even when current metadata cannot be read.
Explicit local restoration preserves that payload. Recognized domain rejections release the lock;
network/5xx/unstructured proxy responses retain it. A synchronous submit guard prevents double clicks.
Discarding uncertain recovery requires a warning that the object may already exist in the library.

Alternatives: names/content-based duplicate detection would conflate intentional copies; a fresh key
on retry cannot distinguish lost acknowledgements; a new ledger table duplicates the existing typed
receipt envelope. No extra dependency or database migration is needed.

Limits: tab closure/clearing/denied storage still prevents automatic reload recovery; in-memory retry
remains available. This is not server autosave. Dashboard layout/attachment is a separate save. Copy
and update endpoints still require their URL target to exist; if a copied source is deleted, inspect
the library for the saved copy instead of issuing another creation. Receipts survive ordinary server
restarts, are project-scoped, and disappear with project deletion; restored release projects do not
inherit another project's pending operations. Comprehensive all-form/human acceptance remains open.

# ADR-142 - Responsive legacy chart labels and same-result tabular access

Date: 2026-10-09. Status: ACCEPTED; R1 readability and accessibility slice.

Context: the report workbench exposed overlap in legacy horizontal numeric scales when widgets
became narrow. Fixed 30% margins, 170px category labels and fixed-decimal ticks did not account for
available space. Legacy charts also lacked the accessible tabular alternative available on new types.

Decision: derive Cartesian margins, suggested tick counts and category-label widths from actual
chart dimensions. ResizeObserver applies only an axis/grid presentation patch to the existing
ECharts instance; no series regeneration or dataset execution on resize. Hide overlapping axis/data
labels rather than observations. Axis ticks use localized significant digits, compact notation for
large magnitudes and scientific notation for tiny nonzero values. Percent ticks retain ratio meaning;
currency ticks retain currency. User formatting of tooltips/data labels remains unchanged. Standard
ECharts automatic nice bounds may adjust with tick density; this is not a fixed-domain promise.
Typed statistical scales/renderers are not altered by the legacy presentation patch.

Each legacy graphical view now offers Chart/Data table buttons. The table renders the same returned
rows (100 per local page), declared category/value/additional-series fields, complete names and raw
numeric strings without Number coercion or chart rounding. It excludes hidden context columns but
row-selection buttons pass all stable field IDs, including hidden navigation keys. Missing and zero
remain distinct. A truncated server result is labelled explicitly; table paging never claims to fetch
unreturned rows or recompute totals. Empty results have an explicit state. No graph/API/persistence
or dependency change; statistical views keep their existing dedicated table contracts.

Alternatives: shortening source values loses precision; widening every widget changes saved layouts;
CSS scaling alone cannot resolve dense canvas ticks. The standard ResizeObserver/resize approach is
supported by the [ECharts size guidance](https://echarts.apache.org/handbook/en/concepts/chart-size/).
Consequences: axis labels can be abbreviated, with a visible explanation and raw table alternative.
This improves readability but is not full WCAG or five-economist acceptance. Chart coordinates retain
the existing renderer's numeric approximation; the table preserves exact returned decimal strings.

# ADR-141 - Tab-local visualization recovery and guarded workspace links

Date: 2026-10-09. Status: ACCEPTED; extends ADR-140 without changing saved report semantics.

Context: global project links could unmount a visualization editor without its close decision,
and only failed updates of existing visualizations had a recovery record. New visualizations and
ordinary unsaved changes could be lost on browser history navigation. Recovery previously ignored
the draft's original revision, risking an implicit rebase onto another tab's saved settings.

Decision: record visualization drafts in sessionStorage on changes, not only on failed requests.
The versioned envelope contains project identity, prepared-result selection, name, type, configuration
and the original visualization revision. Existing visualization keys remain compatible; new/copy
keys distinguish project and dashboard (or standalone library). Never store result rows. Restore is
explicit: an existing record blocks editing/apply until restored or discarded, so merely opening
settings cannot overwrite it. Validate envelope/ownership/types/revision/size before restoration;
accept the previous failed-draft shape only for its existing visualization key. New dashboard drafts
have a Resume entry point. Saved settings, not a local draft, remain the server source of truth.

Restore retains the original visualization CAS revision; current published-data schema is reloaded
and validated by the usual backend preview/save. No graph state is restored or overwritten. Shared
use acknowledgement is requested again. Success/discard removes the recovery record; reverting all
edits removes only a record owned by this editor. Failed local writes are visible and prevent the
Keep draft and continue action. If storage cannot even be read, the user can explicitly continue
without recovery, with a persistent warning to save before leaving.

An outside-link capture hook routes ordinary workspace links through the existing editor decision,
then replays the original link once so Next retains its routing behavior. It excludes downloads,
modified/new-tab clicks and same-document anchors; internal editor links keep their existing guards.
Dashboard layout confirmation is composed with visualization confirmation. Browser back/forward is
NOT patched or bounced: tab-local recovery protects settings after returning. Existing beforeunload
warnings remain. This avoids fabricated history entries and dependence on Next private APIs.

Alternatives: auto-restoring and rebasing can overwrite newer state; failed-save-only recovery misses
normal navigation; monkeypatching pushState/popstate introduces router coupling. Consequences: local
recovery is not a server save, cross-device backup or guarantee after closing a tab/clearing or denying
storage. Browser history cannot be reliably blocked by this hook when storage is unavailable. Other
authoring forms and pending-network/ambiguous-create recovery require their own broader R1/R6 audit.
No dependency, backend API, database migration or change to calculation semantics.

# ADR-140 - Schema-driven report workbench with one shared visualization draft

Date: 2026-10-09. Status: ACCEPTED; R1 report-editor layout slice, not full R1 acceptance.

Context: dashboard authors previously selected data and configured and previewed new charts in
one narrow panel. The existing editor already owns revision checks, shared-use acknowledgement,
copy semantics, abortable previews and failed-save recovery; replacing it would risk regressions.

Decision: retain VisualizationEditor as the single draft owner. Render ReportFields into the left
workbench host through a React portal, keep detailed configuration at right and render previews
in the report area (inside the selected widget, or a separate central preview for an unplaced chart).
Use stable schema field IDs for explicit category/value/table-visibility buttons. Search is local
schema presentation, bounded to 100 matching fields; no source data or calculations are duplicated.
Dedicated statistical/typed roles remain explicit in settings and preparation nodes; scalar values
do not require a fabricated column binding. Decimal scatter fields are available in both selectors,
matching the existing backend numeric contract. Source accessible and visible labels agree.

At desktop widths, side panels reserve center space. Narrow layouts stack without a modal overlay
or focus trap and expose named field/preview/settings anchors; library-only selection retains its
existing overlay behavior. Escape from a workbench panel uses the existing draft decision path.
Tabs, locale/theme changes and resize do not remount the draft. Failed schema refresh disables apply
and hides cached preview success; missing sources are distinguished from pending execution.

Alternatives: independent pane states would create synchronization errors; drag-only bindings would
exclude keyboard users; implicit role selection for advanced charts would hide calculation changes.
Consequences: no API, schema, persisted layout, graph or calculation change. Existing advanced
graph links remain. This slice preserves existing close/switch/beforeunload guards and failed-save
recovery, but DOES NOT solve all project-wide SPA/history navigation or autosave recovery for a new
unsaved visualization. Those are explicitly remaining R1 tasks, as are comprehensive accessibility
and human testing. Do not present the current workbench as complete draft-loss protection.

# ADR-139 - Task-oriented project overview without inferred report readiness

Date: 2026-10-09. Status: ACCEPTED; R1 overview slice, not full workspace acceptance.

Context: the project landing page still presented Data/Workflow/Dashboard as three technical steps.
It did not show actual reports or resumable imports, and failed report-state requests were invisible.
Existing typed metadata APIs already provide the required information; another summary persistence
model or execution endpoint would duplicate state and unnecessarily calculate reports on navigation.

Decision: the overview composes existing project, dashboard, report-state, dataset, import and legacy
source queries, with independent loading/error/retry boundaries. Failed refresh hides that section's
cached state and explicitly says current state is unknown; an in-flight refresh labels the previous
metadata. Opening the overview never executes a graph, runs checks or applies an import/update.
Checks are project-level and use the server fingerprint status, not widget count or save time.
Saved report layouts are explicitly not a data-quality certification. Snapshot row counts are not
claims about live external data; last successful replacement is distinguished from initial import.

Report cards show name and element count, with separate view-only/edit links. Populated layouts come
first, then locale-aware numeric name order and stable identity tie-breaks. Search and six-card pages
change presentation only; query arrays remain immutable. Data/draft summaries are bounded to five
entries with links to their full managers. Restored report links retain parameters and period.
The graph is an advanced route; Create report opens the existing graph-backed wizard directly.
Legacy Excel remains explicitly reachable alongside normalized Excel/CSV tables.

Project rename uses a labelled inline form, explicit submit/cancel, whitespace validation, retained
input on error, and focus return after save or Escape. Native controls, semantic named sections,
translated statuses and responsive light/dark layouts are used without a new component dependency.
Alternatives: inferred green readiness would be misleading; auto-running reports on overview would
mix navigation and expensive validation. Consequences: R1 report-editor reorganization and full
five-journey/accessibility/human acceptance remain open; this slice does not claim WCAG certification.

# ADR-138 - Exact, paged analytical-table presentation over graph-owned totals

Date: 2026-10-09. Status: ACCEPTED; R4 analytical-table presentation.

Context: prepared hierarchical totals need a readable table without exposing technical roles or
recomputing totals in the browser. Monetary thresholds must not lose digits through JavaScript Number.

Decision: AnalyticalTableSpec@1 binds the exact table_rollup@1 row roles, ordered dimensions and
stable measures. It stores visible measure order, 0–4 pinned data columns, normal/compact density,
and up to 20 ordered conditional rules. Rules bind numeric measure IDs, explicit decimal-string
thresholds, inclusive intervals or empty-value checks, all/detail/total scope, semantic tone and
an author-supplied accessible label. First matching rule per cell wins; missing is not zero.
Server Decimal comparisons preserve all transported digits independently of arithmetic context.
Only presentation markers are produced; grouping and every aggregate remain graph-owned.

Normal responses page rows and markers together, default 100, retaining complete total_rows.
Full-data release rendering stores every bounded prepared row and its formatting in one artifact.
Frozen reads page that artifact without consulting live rules/data. Restores use existing recursive
field remapping. No schema migration, dependency or alternate report recipe is required.
Publication eligibility, exact field roles and upstream-only population restrictions are validated
at save/draft/render. CAS, copying and omitted-spec appearance saves keep existing contracts.

The semantic HTML table hides technical fields but retains them for stable navigation. Null group
labels differ from blank subtotal placeholders. Row kind and observation count remain visible;
numbers are right-aligned exact text, never rounded in the browser. A fixed row-level column plus
selected data columns stay sticky. Rules include visible labels/symbols, not colour alone. Table
paging, measure visibility and density never change population totals. Keyboard buttons handle
measure/rule ordering and paging. EN/RU/TT and both themes share the same data contract.

Alternatives: a client pivot/aggregation library would duplicate calculation semantics; arbitrary
CSS/ECharts options would weaken validation; loading all 20000 rows for each view would defeat
bounded previews. Consequences: arbitrary prepared tables need the explicit totals node first;
row-group collapse and wizard-generated rollups remain separate work, not implied by this slice.

# ADR-137 - Hierarchical analytical-table preparation from observation states

Date: 2026-10-09. Status: ACCEPTED; R4 preparation, not finished analytical-table presentation.

Context: summing child averages or ratios yields incorrect management totals. A browser table must
not own a second aggregation engine, and null category values must not be mistaken for total rows.

Decision: table_rollup@1 is an ordinary static-schema TypedNodeExecutor. Configure 0–8 ordered
dimensions and 1–16 stable-ID, explicitly named measures. Operations: sum, average, min, max,
nonempty numeric count, source-row count, and ratio of sums. Input is the observation population,
not a table of already computed averages/percentages. The inspector warns about that distinction;
there is no automatic inference of a measure's business additivity. The ratio sums nonempty
numerators and denominators independently; absent or zero denominator produces null, never zero
or infinity. This is an explicit policy, not pairwise complete-case division or a sum of ratios.

Only selected input fields leave Polars. Leaf states retain exact sums/counts/extrema/denominators,
not raw row groups. Intermediate/grand totals merge these unrounded states. Integer and decimal
results use Decimal128, with original scale for sums/extrema and user-selected 0–18 decimal places
for averages/ratios. Half-even rounding occurs once at each final output cell; it is independent of
global Decimal context. Counts are integer; Float64 remains approximate and non-finite values or
output overflow fail explicitly. Unit/currency metadata is retained for additive measures, removed
for counts. Ratios retain separate declared numerator/denominator units and a quotient label only
when both are known; equal declared units produce a ratio label. Missing metadata never invents a
dimensionless business measure or currency. No new precision behavior is imposed on old nodes.

Rows follow first-observed group order, depth-first, with subtotals after children and grand total
last. Subtotals/grand total can be independently disabled; no dimensions requires the grand total.
An empty population has only an enabled grand total: null numeric aggregates and zero counts.
Explicit kind/depth distinguish detail/subtotal/grand_total, including actual all-null grouping keys.
UUID5 row/parent identities encode typed group paths; measure output UUIDs survive renaming and
reordering. Dimension field identities preserve logical source identities. Restores remap node/
source-field prefixes and regenerate consistent row/parent IDs. Limit 20000 complete output rows,
including totals, plus existing engine row/cell limits; excess detail fails, never truncates.

The output is an ordinary dataset, available to preview/publication/table/frozen release APIs.
Full selected data is aggregated before preview pagination. Upstream context filtering legitimately
recalculates totals. The next analytical-table renderer must require this prepared structure,
reject post-preparation population filters that would imply recalculated totals, hide technical
roles, support pinned columns/conditional formatting and retain exact full-result releases.

Alternatives: averaging rounded leaf averages, summing percentage rows, implicit frontend totals
or separate per-level duplicated graphs risk correctness/drift. Consequence: advanced authors can
already use/publish this node; a finished analytical-table visualization or wizard integration is
not claimed by this preparation slice. No dependency or persistence migration is introduced.

# ADR-136 - Prepared bar/line combinations with explicit axis ownership

Date: 2026-10-09. Status: ACCEPTED; R4 combination charts.

Context: plan/actual and volume/rate comparisons require different presentation types without
hidden regrouping, averaging or implicit secondary axes. Rendering raw Decimal128 or very large
Float64 values directly as canvas coordinates can lose meaningful precision or overflow.

Decision: ComboSpec@1/combo_chart binds one category and 2–8 distinct numeric series, including both
bar and line. Each series has a stable field ID, optional display name, kind and primary/secondary
axis assignment. One axis is the default. Enabling the second axis is explicit and requires series
on both axes. Each axis checks equality of declared unit/currency metadata; unknown metadata does
not infer business meaning. No automatic assignment, normalization of business measures, stacking,
smoothing, implicit aggregation, date bucketing or sorting. Existing graph steps prepare one row
per nonempty text/integer/boolean/date category in business order. Numeric categories are categorical
positions, not a continuous axis. Duplicate categories and more than 2000 rows fail on the entire
selected result, never on a preview sample. Non-finite values fail; null measures remain gaps.

Save orchestration uses the existing full-result callback under the project lock/CAS before mutation,
as for radar. Preview is read-only. Appearance-only saves and copies preserve omitted specs. The
renderer projects only selected/navigation fields and reads one common graph execution. Each axis
includes zero; exact rational intermediates produce bounded signed coordinates with drawing zero
at business zero. This preserves negative bar baselines without hidden offset/accumulation in the
browser. Exact bounds/tick text, observations and UUID5 identities travel in ComboPresentation;
identities derive from publication and typed category, not row position or measure value. Empty/
all-zero scales expose only a zero tick. Original exact amounts remain in tooltips and tables.

ECharts draws bars/unsmoothed gap-preserving lines from these positions. Server ticks are passed
as explicit axisLabel/axisTick customValues: automatic tick placement otherwise drops interior
labels for asymmetric cross-zero ranges. Browser visual review reproduced and fixed that issue.
Series/axis assignments and bounds are inspectable; secondary lines are dashed and a visible
warning explains independent scales. Stable selection is supported in chart/table. Table pages
and slider/button category windows never change values or scales; context filters legitimately
re-execute the graph and recompute scales. Releases retain every bounded row/presentation, including
more than 1000 rows; restore remaps fields and regenerates publication-based identities.

Alternatives: legacy additional_series has neither typed bar/line nor axis ownership; implicit
secondary axes make comparisons misleading; browser grouping creates a second calculation engine.
Consequences: aggregate/align/sort upstream. Existing legacy charts and eight contracts remain
unchanged. No persistence migration/dependency. Analytical-table preparation, wizard-generated combo
reports and R5 types remain separate work; technical checks do not replace the human acceptance gate.

# ADR-135 - Typed waterfall rendering from prepared endpoints

Date: 2026-10-09. Status: ACCEPTED; R4 waterfall presentation.

Context: negative/cross-zero contributions and explicit subtotal/final bars must preserve the graph's
ordered balances. A stacked-bar workaround or browser accumulator risks incorrect endpoints. Large
exact amounts and Float64 extremes cannot be converted blindly into unbounded drawing coordinates.

Decision: WaterfallSpec@1 binds the complete role set of waterfall_steps@1.dataset. The typed registry
describes preparation and the 2000-step bound. Save/preview/render validate exact roles, publication,
navigation and upstream-only view restrictions. Post-preparation filters are rejected: they must not
make a partial sequence appear to explain an unchanged total. Additional measure series are not
accepted. Existing appearance-only requests/copies preserve omitted specs and optimistic revisions.

The adapter consumes one graph execution and returns every step in the named steps dataset, ignoring
preview row caps for this bounded chart. WaterfallScale carries exact minimum/maximum and tick labels,
zero's coordinate, and stable step-ID-to-start/end/sign mappings. Include zero in the full-data extent;
normalize with rational differences, then convert only [0,1] coordinates to Float64. Tick text is
computed from exact fractions. All-zero/empty results have an explicit zero tick, not a fabricated
business range. This is presentation scaling, not reaggregation. Complete datasets/coordinates/specs
are frozen through the existing release mechanism, including steps beyond 1000 rows. Restore remaps
node-based roles and recalculates identities consistently.

ECharts custom rectangles draw the prepared endpoints in vertical or horizontal orientation, with
connector segments showing the preceding balance. Neither order nor totals are recalculated in the
browser. Increase/decrease colours do not imply good/bad performance; opening/subtotal/final bars have
distinct outline/dash/fill styles. Exact zero is a stroke. Non-zero steps below one screen pixel are
dots with an explicit explanation; they must not be mislabeled zero. Table/tooltips retain transported
values, including tiny floats and integers/decimals outside JS safe range. Labels have a text halo,
not opaque rectangles that can cover small bars; dense category bands omit labels, not observations.
Canvas animation is disabled for deterministic immediate analytical output. Visual review found and
corrected the initial opaque-label occlusion; geometry/label tests now protect against it.

The exact table has local 100-row pages and keyboard selection by stable step ID. Slider zoom is
complemented by Show 20 steps / Previous / Next / Show all controls; neither zoom nor table pagination
changes balances or full-data scale. EN/RU/TT guidance explains totals, zero and sub-pixel values.
Both orientations/themes and short/cross-zero plus 47-step keyboard-window scenarios are exercised
in production browser acceptance. No arbitrary ECharts options, dependencies or migrations are saved.

Alternatives: hidden browser cumulative sums duplicate the execution engine; stacked placeholders
are fragile across zero; filtering chart rows after accumulation misrepresents the bridge. Consequence:
users prepare/order steps in the graph and publish that output. Wizard-generated waterfall and the
remaining R4/R5 presentations remain separate roadmap work, not part of this delivery claim.

# ADR-134 - Ordered waterfall preparation with reconciled explicit totals

Date: 2026-10-09. Status: ACCEPTED; R4 waterfall preparation, not graphical delivery.

Context: a waterfall must explain how an opening balance changes through signed contributions.
Repeatedly adding subtotals yields plausible but incorrect balances. The chart must not own a hidden
accumulator or infer that a row is a total from its label, sign or position.

Decision: waterfall_steps@1 is a normal TypedNodeExecutor with one dataset output. Select label and
numeric fields, and optionally a text row-type field. Without that field, all input rows are changes.
With it, explicit configurable text markers map to initial/change/subtotal/total. Matching is exact
and case-sensitive; localized source labels need no preprocessing merely to name the four roles.
Initial balance may appear only first; changes add signed values to the running balance; subtotals
show the current balance from zero without adding it again; final total must be last. A total cannot
be the first row. Null contributions/initial balances fail. Total values may be null (calculate) or
provided (reconcile exactly); inconsistent expected totals fail, never silently overwrite source data.
An explicit append_total option adds one final total with a configurable distinct label. It cannot
coexist with an input final total. Empty input stays empty, including when appending is enabled.

Input order is the business order. Sorting/grouping belongs to upstream graph steps; the node does
not sort labels or aggregate repeated steps. Require unique nonempty text/integer/boolean/date labels
and at most 2000 output steps, including any generated total. Excess detail fails with guidance to
group/filter upstream, never truncates. Labels render as text; their logical source type remains in
metadata. Step UUIDs derive from node ID, source label field/type/value, not row index or contribution
amount. Reordering changes the path but not identities. Generated total has a distinct stable UUID.

The output contains step_id/index, category, canonical kind, value, start, end, balance and generated.
For a change, value is its signed contribution and start/end are the previous/new balance. For an
initial or total, start is zero and end/value are the balance. Every amount preserves currency/unit
lineage. Integer/decimal inputs accumulate through Fraction, then emit Decimal128 with the original
decimal scale (integer scale zero). Exact conversion is checked: no implicit quantization. Any
intermediate overflow fails even when later contributions would cancel it. Global Decimal context
does not influence arithmetic. Float64 inputs remain approximate: accumulate rational equivalents of
their shortest decimal spellings, emit Float64, reject non-finite/overflow and reconcile provided
totals without an implicit tolerance. This is not a claim of exact monetary semantics for Float64.

Preview pagination happens after complete execution. Ordinary table publications, contextual input
filters, full frozen artifacts and restoration use existing infrastructure, including field-ID
remapping. The graph inspector exposes schema-aware selectors, marker mapping and explicit final
total controls in EN/RU/TT, without drag-only actions. No dependency or persistence migration.

Alternatives: automatic detection of total labels is ambiguous across languages; summing every row
double-counts; browser accumulation would diverge from graph/release calculations; silent truncation
would manufacture a false closing balance. Consequence: source row order and unique step labels are
part of the input contract. The next delivery must bind a typed waterfall visualization to these
prepared roles, preserve negative/cross-zero bars, expose exact tables and reject post-preparation
filters that would make a partial chart imply a different running balance. No graphical waterfall
or wizard-generated waterfall is claimed in this preparation-only delivery.

# ADR-133 - Explicitly scaled radar over prepared profile rows

Date: 2026-10-09. Status: ACCEPTED; R4 radar.

Context: comparing profiles needs 3–8 numeric axes with intentional scales, not another aggregation
engine inside chart settings. Existing grouping/alignment/formula nodes already prepare profile rows.
Decision: RadarSpec@1 binds a profile identifier and ordered numeric axes to any prepared table
publication. No dedicated preparation node or automatic pivot/aggregation is introduced. Each profile
must have exactly one row, a nonempty text/integer/boolean/date identifier, and at most 20 profiles may
be displayed. Uniqueness is checked against the full selected result, never a preview page. Excess
detail fails explicitly and must be filtered/aggregated upstream. The registry has no required
preparation node for radar; its preparation-version field is irrelevant when that node is null.

Users must choose shared or min_max scales and supply every bound as bounded plain-decimal text.
Shared axes require equal bounds and matching declared unit/currency metadata. Missing metadata does
not prove semantic compatibility: choosing shared scale is the author's explicit assertion, not
automatic unit inference. Mixed declared units require min_max. Each position is (value-min)/(max-min),
computed with rational differences before conversion to a [0,1] drawing coordinate. Original values
remain exact in transport/table/tooltips; Float64 input remains approximate. Out-of-range/non-finite
values fail, without clipping or conversion to zero. Null axes leave the entire profile out of the
polygon but visible in the exact table and incomplete-profile notice. Normalization is presentation
scaling, not a score or an implicit business calculation.

Save/create/copy validate the complete rendered result before document mutation under the existing
project lock and revision guards. The service accepts an execution-validation callback, supplied by
API orchestration; radar fails closed without it. Preview is nonpersistent. This preserves the domain/
route boundary without introducing a circular service dependency or changing legacy chart saves.
Omitted specs in appearance-only requests preserve saved bindings. Results carry named profiles and
RadarPresentation (stable profile IDs, coordinates and completeness) from one graph execution. UUIDs
derive from publication, profile field/type and transported value; row reordering is harmless. A new
publication after restoration has new profile IDs, while imported logical field IDs remain stable.
Existing releases freeze all bounded profile rows/spec/coordinates and support restoration normally.

The editor has explicit fields/bounds, keyboard axis ordering and EN/RU/TT guidance. ECharts receives
prepared coordinates; exact data never passes through Number for table/tooltip labels. Missing
polygons are not connected across axes. Colour plus solid/dashed/dotted styles distinguish profiles;
table selection uses stable IDs/field bindings instead of chart row indices. The selected units and
bounds are inspectable in an axis-scale table. No ECharts option is persisted and no dependency added.

Alternatives: hidden chart aggregation would duplicate graph logic; automatic ranges make the same
value move when the selection changes; zero-filled missing axes imply observations that do not exist.
Consequences: users prepare unique profile rows and choose meaningful scales themselves. Statistical
wizard generation and remaining R4/R5 charts remain separate tasks, not implied by this delivery.

# ADR-132 - Typed heatmap rendering with exact colour normalization

Date: 2026-10-09. Status: ACCEPTED; R4 heatmap presentation.

Context: the prepared cells already distinguish absent combinations, all-null observations and
numeric zero. Rendering must preserve these distinctions and exact values, including amounts whose
Float64 representations collapse. A preview page must not define the colour scale or frozen matrix.

Decision: HeatmapSpec@1 binds explicit cell/axis/value/presence/count roles to heatmap_stats@1.dataset.
The independent heatmap_chart joins the typed registry; legacy graph display nodes are unchanged.
Save/preview/render check exact role identities and publication eligibility. Context restrictions
must target upstream data, not aggregated cells. Appearance-only clients and copies preserve omitted
saved bindings and scale settings; optimistic revisions still apply. Shared validators now reuse a
single resolved graph/catalog per save/draft instead of resolving them separately for every chart.

The spec includes a typed colour scale: extent (default), zero_centered or fixed. Extent uses all
non-null prepared values; zero_centered uses +/- the greatest absolute value. Fixed bounds require
bounded plain-decimal strings and minimum < maximum. They saturate colour, never filter/change data;
below/above counts are visible. Constant automatic data maps to the midpoint without inventing a
range. Missing-only/empty data has no automatic bounds; fixed bounds remain explicit even if empty.

HeatmapScaleResult transports exact bound strings and a cell-ID-to-position mapping. The backend
normalizes exact differences with Fraction before converting only [0,1] colour coordinates to float.
This is presentation scaling of the prepared result, not hidden aggregation. Decimal min/max/sign
operations avoid context-dependent rounding. Float input remains approximate; shortest decimal
spellings are used for the presentation scale. The statistical node remains unchanged.

ECharts visualMap maps prepared positions to sequential violet or zero-centred orange/blue palettes,
consistent with its [dimension/series visual mapping contract](https://echarts.apache.org/handbook/en/concepts/visual-map/).
Numeric, absent (x marker) and missing-measure (dash marker) cells use separate layers and colour maps.
The implementation was checked against the installed ECharts source: every heatmap layer requires
a visualMap. Tooltips/labels retain transported values; no numeric-value conversion for coordinates.
Axis coordinates and click selection use stable IDs, not repeated labels or row positions. Exact
cell tables provide keyboard selection and local 100-row pages. View zoom does not change data or
scale. The matrix is already bounded at 10000 cells; every cell is retained in named result datasets
and frozen artifacts, including beyond 1000-row release/read limits. Restore remaps field roles and
recomputes consistent identities for the new graph.

EN/RU/TT controls expose scale choice and exact text bounds. Missing-state keys remain visible even
when the optional numeric legend is hidden. Small widgets use compact controls and a responsive
canvas; overflow remains accessible when controls exceed available height. Browser acceptance checks
real canvases, setting reload, both themes, missing states and canvas containment in a default widget.
An initial test assumed one canvas; three layers correctly render three, so it now checks the first
visible layer. Visual review also led to reducing the canvas minimum and compacting axis margins.

Alternatives rejected: JS-number extent normalization, colour-only missing semantics, first-page
scales/frozen matrices, stored ECharts options and silent downstream context filters. No migration or
dependency was added. Statistical wizard creation, radar and other remaining R4/R5 types stay open.

# ADR-131 - Explicit heatmap cell preparation and missing-data semantics

Date: 2026-10-09. Status: ACCEPTED; R4 preparation slice, graphical heatmap still pending.

Context: repeated dimension pairs need an intentional aggregation. A missing pair, a pair whose
measure is entirely null, and a measured zero must not collapse into the same result or colour.

Decision: heatmap_stats@1 is an ordinary typed graph transformation. It requires distinct X/Y
dimensions (text, integer, boolean or date), a separate numeric field and an explicitly selected
sum/average/min/max/count operation. There is no default aggregation. Count means non-null numeric
observations, not source rows. The dataset output includes cell_id, x_id, y_id, typed x/y, value,
present, row_count, valid_count and missing_count. Counts account for every selected source row.

Output contains the Cartesian product of categories actually present on the two axes, sorted by
typed value with null last. Absent pairs have present=false, null value and zero counts. Observed
all-null pairs have present=true, positive row/missing counts and null aggregate (zero for count).
Observed numeric zero remains a value. Null categories remain distinct from empty/literal labels.
Empty input yields no categories or cells; no calendar or external category domain is invented.
UUID5 identities include the node, source field identity, axis, logical type and typed category
value. Reordering source rows does not change identities or output order.

Integer/decimal aggregation uses rational intermediates and Decimal128 output. Sum/min/max preserve
source decimal scale; integers use scale zero regardless of incidental import metadata. Exact
averages use one final half-even rounding, configurable 0–18 decimal places (default 6). Count is
integer and does not inherit currency metadata. Float64 inputs remain approximate, use rational
intermediates to avoid intermediate overflow/cancellation, and return Float64. Non-finite values
and result overflow fail visibly, including non-finite inputs in count mode. No zero-on-error.

Bound categories before matrix allocation: at most 200 per axis and 10000 Cartesian cells. Exceeding
limits asks for upstream filtering/grouping instead of truncating. Existing 250000-row/2000000-cell
input safety limits apply to the three selected fields. The implementation accumulates cells without
retaining every group's raw values. Preview pagination never changes aggregation or domain discovery.

The graph has schema-aware, keyboard-usable controls in EN/RU/TT, persisted through normal graph
revision handling. Output can be published as an ordinary table and frozen/restored with existing
release mechanisms. No new dependency, storage schema or migration. This slice deliberately does
not claim the heatmap renderer/spec, colour-scale semantics or wizard statistical authoring.

Alternatives rejected: default sum; zero-filled missing pairs; sample-derived aggregation; unlimited
dense matrices; browser aggregation; forcing Float64 on monetary input. The next slice adds typed
heatmap presentation, including distinct missing states, exact tables/tooltips and stable selection.

# ADR-130 - Exact equal-width histogram preparation and typed presentation

Date: 2026-10-09. Status: ACCEPTED; R4 histogram slice.

Context: browser/sample-derived intervals can change counts, and Float64 conversion can collapse
distinct money or large integer observations. Histogram preparation must be an ordinary graph step.

Decision: histogram@1 is a typed transformation with dataset (intervals) and summary (population
accounting) outputs from one input. Configure a numeric field, 1–200 equal-width intervals (default
20), and optional explicit decimal minimum/maximum. Both bounds are required together; lower < upper.
Automatic bounds use the full non-null population. Empty automatic input has no intervals; an explicit
range retains zero-count intervals. Constant automatic input has one closed degenerate interval,
without inventing a spread. Nulls never become zero; non-finite observations fail.

Intervals are left-closed/right-open, except the final right boundary is included, consistent with
the convention documented by [NumPy](https://numpy.org/doc/stable/reference/generated/numpy.histogram.html).
Unlike silently ignoring outside values, retain below/above counts alongside input, valid, missing
and included counts. Their identities are checked in tests. Bounds do not limit the validation scope.
No NumPy dependency is introduced.

Integer/decimal bin assignment and edges use rational arithmetic, without Float64 intermediates or
rounding. Boundary fields are explicitly text: finite decimals where possible, exact numerator/
denominator otherwise. They are not disguised as approximate numeric columns. This supports counts
such as three bins over [0, 1] without moving observations across a rounded boundary. Float64 inputs
remain approximate and use their shortest round-trip decimal spellings for deterministic binning.
Explicit configuration allows bounded plain decimals, not expressions or unbounded exponents.
Only the selected numeric column leaves Polars. Existing row/cell limits apply; 100001 input rows
are covered by a correctness test, not claimed as full R6 memory/latency acceptance.

HistogramSpec@1 extends the typed visualization contract with explicit bin and summary roles.
The spec union preserves BoxPlotSpec's existing omitted type/version defaults via disjoint role
models; it does not force old clients to migrate. Independent histogram_chart documents bind to
the histogram node's dataset port. Filters must be upstream of preparation. The renderer consumes
both outputs of one graph execution and retains complete bins/accounting in releases and restoration.
Bin identity derives from node + exact boundaries/inclusion, stable under source row reordering.

ECharts displays prepared counts as contiguous equal-width category bars. Exact interval labels
avoid large-value coordinate collapse; the browser performs no binning or boundary rounding.
Horizontal/vertical views, exact interval tables, population accounting and stable-ID selection
are available. Counts are integers, not currency/percentage values. Field/range edits live in the
graph; the simple report wizard does not yet generate statistical steps. Arbitrary unequal-width
edges, density and weighted histograms are not claimed by this slice.

Alternatives rejected: Float64 binning for exact input; silently rounded displayed boundaries;
frontend statistical transforms; stored ECharts options. No migration or dependency is needed.

# ADR-129 - Versioned box-plot bindings and consistent named visualization datasets

Date: 2026-10-09. Status: ACCEPTED; first typed R4 visualization.

Context: the statistical node has two outputs. Fetching unrelated previews or applying filters only
to its summary can make the displayed distribution and outliers disagree. A renderer needs semantic
roles and stable identities, not saved ECharts options or frontend quartile calculations.

Decision: independent box_plot documents store BoxPlotSpec version 1 with explicit summary/outlier
field identities. Publication schema suggests a spec only for boxplot_stats@1's dataset output.
The typed /visualization-types registry starts with box_plot; the eight legacy chart contracts remain
unchanged and are not claimed as migrated. New typed charts are not registered as legacy display nodes.
Save/preview/render validate node, port, version and exact role bindings. Unknown spec keys/versions
fail. Appearance-only updates/copies preserve omitted stored bindings; normal CAS still applies.
This uses existing JSON document storage, so no relational migration or dependency is needed.

One common graph execution supplies both named datasets. Context restrictions must target upstream
data, not either statistical output. The summary is complete (up to 2000 groups); outliers use bounded
offset/limit pages. Statistics never use the displayed subset. Release creation materializes both
complete datasets in one execution, subject to the existing artifact size limit; frozen reads page
outliers without recomputation. Restore remaps embedded field IDs through the existing identity map.

ECharts is a presentation adapter with vertical/horizontal boxes and separate outlier points. Only
screen coordinates use JavaScript numbers; exact transported strings stay in tooltips and tables.
Summary and outlier tables provide keyboard-selectable group navigation. Chart selection resolves
stable group IDs, never a scatter row index or repeated label. Paging is explicitly labeled and does
not silently claim all outliers are on screen. Empty/missing-only populations have an explicit state.
Statistics/filter ownership remains in the graph; the report wizard does not yet generate this step.

Alternatives rejected: browser statistical transforms; independently executing layers; silently
filtering only the summary; retaining only the first page in releases; automatically migrating old
charts. Consequences: subsequent chart specs can extend this versioned contract, while R4/R5 as a whole
remain unfinished. A browser regression also exposed stale table fields raising RuntimeError through
a generator; field resolution now preserves the intended INVALID_VISUALIZATION response.

# ADR-128 - Full-data box-plot statistics are a typed multi-output graph node

Date: 2026-10-09. Status: ACCEPTED; first R4 statistical preparation slice.

Context: box plots need a complete-population summary and separate outlier observations. Computing
quartiles from a browser preview or independently sampling layers would misrepresent the distribution.
Large exact monetary values must not silently pass through Float64.

Decision: boxplot_stats@1, workflow format >=2, accepts a numeric field and an optional separate
string/integer/boolean/date grouping field. It emits dataset (summary) and outliers from one input
materialization. Null observations are counted separately; null grouping keys form a distinct group.
Ungrouped empty input emits one zero-count summary with null statistics; grouped empty input has no
groups. All-null existing groups retain their missing count and null statistics. NaN/Infinity fail.

Use the linear quantile position (n-1)*p, documented by
[NumPy](https://numpy.org/doc/stable/reference/generated/numpy.quantile.html), implemented with exact
rational intermediates, without adding NumPy. Use observation whiskers at the inclusive 1.5-IQR fences
and separate observations beyond them, following the agreed fenced-boxplot convention described by
[NIST](https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm). Singletons/constants are valid.
Summary includes count, missing_count, min/max, Q1/median/Q3, lower/upper whiskers and outlier_count.

Integer statistics use Decimal128 scale 2; decimal statistics use input scale +2 (input scale <=36).
This exactly represents quarter interpolation. Fail with a rescaling instruction if precision/scale
cannot represent the result; never silently round or cast to float. Float inputs retain approximate
Float64 outputs, but rational intermediates avoid overflow of finite-value interpolation/fences.
Outliers retain their source dtype. Exact transport preserves decimal and large integer values.

Group IDs derive from node identity plus typed group value. Point IDs add exact numeric value and
duplicate occurrence, giving stable multiset identities across input reorder, not source-row IDs.
No business row-key claim is made. Support up to 2000 groups and existing execution-size limits.
Only selected fields cross the dataframe boundary. Named output schemas are statically inferred.

Both graph editors resolve downstream selectors by the connected output port, not the first output;
missing named outputs never fall back to another table. Publishing, preview and frozen-release restore
use ordinary graph contracts. Alternatives: ECharts/browser transforms violate execution ownership;
Float64-only statistics discard exact money; a new multi-output engine duplicates existing facilities.
Consequences: no dependency/migration; this is statistical preparation and graph configuration, not yet
a box-plot renderer or the versioned VisualizationSpec registry. Those are the next R4 delivery.

# ADR-127 - Guided alignment appends one guarded graph branch atomically

Date: 2026-10-09. Status: ACCEPTED; builds on ADR-120/125/126.

Context: economists need to compare two prepared results without manually wiring a graph. Selecting
two arbitrary workflows would require an explicit cross-workflow execution/lifecycle contract; it
must not silently copy source calculations or lose view-context filters.

Decision: a separate alignment builder selects one workflow, two published dataset endpoints,
one numeric field per side, explicit key pairs, names and null policy. Existing input eligibility
rules apply independently to each side, including exposed block ports and rejection of view contexts.
Workflow parameter defaults apply to both inputs. Preview uses the ordinary alignment executor over
full inputs and returns exact first-50 rows plus full match counts without persistence.

Apply locks the project, checks the project state token and reexecutes validation. Append exactly one
align_measures@1 node, two concrete endpoint edges and a publication, preserving all existing graph
objects, parameters and presentation. Save graph CAS, guarded table, dashboard/widget and receipt in
one transaction. Identical request retries return the receipt even after the graph token changes;
changed requests with the same identity fail. Failed commits roll everything back. Concurrent same-ID
requests produce one report; distinct requests using one token yield one success and one conflict.

The table persists full grain and both measure guards; prepared values are never reaggregated.
Appearance/copies and frozen-release restoration use the existing contracts. Further calculations
remain ordinary graph steps; the one-input editing wizard leaves this two-input report graph-only.
UI changes and explicit field reload invalidate preview. Input token mismatch blocks preview; schema
reload preserves local field selections so removed fields are not silently rebound. RU/EN/TT supplied.

Alternatives: hidden browser joins or copying entire workflows violate calculation ownership and
shared lineage. Consequences: no migration/dependency, no cross-workflow connection claim, no mixed-unit
chart implication. Guided derived formulas and alignment round-trip editing remain future R3 work.

# ADR-126 - Explicit full one-to-one alignment of prepared measures

Date: 2026-10-09. Status: ACCEPTED; graph foundation for cross-result composition.

Context: actual/plan results can have keys present on either side. Existing Join supports inner/left
semantics; silently using it would hide right-only keys. Existing joins and saved projects must retain
their behavior, and prepared ratios must not be reaggregated.

Decision: add align_measures@1 with two dataset ports, one numeric field per side and 1–8 explicit
key pairs. Require unique full-data key tuples on both sides; never aggregate duplicates. Reject
null keys by default; explicit match treats corresponding null components as equal and still checks
uniqueness. Keys require identical string/integer/date/boolean logical and physical types. No inferred
conversion, datetime timezone choice, positional alignment or display-name matching is performed.

Full outer alignment preserves left row order followed by right-only rows, exact numeric types,
scale/currency metadata and null measures. Separate non-null boolean presence fields distinguish
absent rows from present rows containing null. Non-finite measures fail. Validate input and exact
union cardinality against existing execution limits before materializing the full value join.
Output identities derive from node identity and left key identity, not display names/order; value
identities derive from node/side. Generic release remapping handles them without new persistence.

Preview exposes typed, full-input matched/left-only/right-only/result counts only on the alignment
node. Graph controls expose explicit keys, names and null policy; one-to-one is fixed. RU/EN/TT text,
schema inference, ordinary revision saves and frozen-release restoration use existing contracts.

Alternatives: extending legacy Join changes a broader contract; browser joins violate backend
ownership; implicit reaggregation corrupts prepared averages/ratios. Consequences: no dependency,
migration or secondary execution engine. This slice requires both branches in one graph. Wizard
selection of separate results, cross-workflow references and guided derived formulas remain open.

# ADR-125 - Side-by-side reusable measures share one publication and grain

Date: 2026-10-09. Status: ACCEPTED; extends ADR-121 direct reuse.

Context: analysts need prepared actual/plan/ratio values in one report. Automatically joining different
results or aggregating ratios would require semantics not expressed in the current catalog.

Decision: keep the primary measure API and add up to seven ordered additional_measure_ids. All selected
definitions must come from the same publication, bind distinct fields and declare identical grain sets.
Preserve primary grain order and explicit selection order. Multiple measures currently require Table;
single-measure Table/Bar/Line/KPI behavior is unchanged. Rendering executes the publication once and
selects fields, without new calculation nodes, joins, alignment or hidden aggregation.

Persist all selected field identities in optional VisualizationConfig.measure_column_ids alongside
the existing grain guard. Check every selected field for numeric type/finiteness and full-data grain
before pagination; null remains null. Appearance saves/copies retain guards even if old clients omit
them; reject hiding a selected measure or changing multi-measure tables into unsupported charts.
Deleting definitions leaves existing reports intact. Standard release remapping restores all IDs.
Omit empty additional_measure_ids from request fingerprints so historical single-measure retries work.

The UI lists compatible definitions, forces Table for multiple selection and invalidates previews
after selection changes. If a selected definition disappears on reload, show it as unavailable and
require explicit deselection; never silently save a reduced selection. RU/EN/TT text is supplied.

Alternatives: cross-publication joins need explicit cardinality/missing-key policy; mixed-unit series
need explicit visualization roles; copying calculations would break shared lineage. Consequences:
no migration/dependency/second execution engine. Cross-result composition and derived formulas remain
open. Tests cover exact ratio versus mean, guards/copies, live drift, old receipts, release restore,
invalid selections and production browser reload/catalog removal.

# ADR-124 - Comparison charts bind current and baseline values explicitly

Date: 2026-10-09. Status: ACCEPTED; extends ADR-122/123 beyond tables.

Context: the generic wizard chart binding picks all post-dimension columns. Comparison output also
contains percentages, differences and a boolean, so blindly removing the table-only restriction
would mix units or fail numeric validation. Renaming must not leave stale baseline labels.

Decision: support Table, Bar and Line; charts accept only the date dimension and show exactly the
configured compared measure plus the terminal comparison node's stable previous-value field. The
comparison selector is authoritative over a former primary-output selection. Centralize the field
ID helper shared by execution schema and chart binding. Reuse the ordinary additional-series contract;
an empty name follows the current schema. All additional outputs remain available in table preview.
The eight-series guard applies to displayed ordinary measures, not hidden comparison intermediates.
Existing 2000-point/full-data validation remains. Missing values stay null; line options explicitly
set connectNulls=false. Ordinary chart ordering remains unchanged; no hidden browser computation.

Wizard edits preserve appearance and identities. If current/baseline bindings no longer match the
requested compared measure, refuse the edit until explicit field rebinding. Switching presentation
uses the same existing rebind guard. Existing table/legacy receipts and persisted config stay valid;
no migration, dependency, new chart type or ECharts option persistence is introduced.

Alternatives: putting all outputs on one axis is misleading; automatic second axes obscure units;
binding by display labels breaks rename/restore. Consequences: multiple partitions remain table-only,
and broader reusable measures/complex visualizations remain future work. Regression includes both
chart types, exact/null values, safe edits, graph identity, frozen release restore and browser reload.

# ADR-123 - Comparison round-trip owns only an exclusive compatible graph suffix

Date: 2026-10-09. Status: ACCEPTED; supersedes ADR-122's comparison editing boundary.

Context: creation already emits explicit calendar/comparison nodes. Reopening every saved comparison
as graph-only prevents the normal report revision workflow, but unrestricted rewriting can corrupt
shared calculations or silently remove calendar semantics for older clients.

Decision: recognize calendar_period@1 directly before group_by@2/@3 and period_comparison@1 after
recognized summary formulas. Date/unit must match; partitions must exactly match other dimensions.
Include both nodes in suffix ownership and existing shared publication/edge/context/visualization
guards. Manually contained calendar/comparison nodes remain graph-only. Preserve identities, positions,
UI metadata, publication identity, appearance and unrelated graph state using the existing patcher.
Preview is transient; apply retains project-token checking and atomic idempotent receipts.

Adding/removing comparison requires explicit rebind_fields. Removal deletes both comparison and
calendar bucketing, returning to original date grouping; the UI explains this. Existing comparison
edits that omit the comparison field fail with a conflict, rather than treating an old client's omission
as deletion. Explicit null is intentional removal. Keep historical receipt canonicalization unchanged.
The UI restores settings from the live graph, retaining selected field IDs before schema lookup.

Alternatives: a separate saved wizard recipe drifts from the graph; silently preserving omitted
settings hides stale client intent; copying shared steps changes lineage. Consequences: no new DDL,
dependencies or calculation engine. Comparison charts and broader measure composition remain pending.
Regression covers round-trip values/identities, preview isolation, atomic retry/stale conflict,
remove/re-add rebinding, legacy omission, manual/shared/incompatible guards and production browser use.

# ADR-122 - Calendar-aligned comparisons are explicit graph operations

Date: 2026-10-09. Status: ACCEPTED; initial table-report creation slice.

Context: the existing Window previous operation means previous available row and uses Float64.
That is not a safe implementation of previous calendar month/year, especially with missing periods
or monetary ratios. Comparisons must execute on prepared measures, including ratios of totals,
without summing or averaging them again or adding browser-side arithmetic.

Decision: add two ordinary unary nodes. calendar_period@1 replaces a selected date field with the
start of its month/quarter/year, preserving field identity. period_comparison@1 consumes one row
per period plus partition keys and appends previous value, difference, percentage change and a
baseline-exists flag. Calendar ordinals select precisely the previous period or same period last
year, never the previous available row. Null partition keys match each other. Null/non-start dates,
duplicate keys and non-finite numeric values/partition keys fail explicitly before preview limits.
Timestamps require an explicit conversion to date first; no implicit timezone or fiscal calendar.

Missing baselines and null measures remain null. Baseline-exists distinguishes a missing row from
a present row with a null value. A zero baseline still has a valid difference but no percentage.
Percentage is (current - previous) / previous * 100, including the sign of a negative denominator.
Partial periods are not extrapolated; the UI explains filter scope and coverage limitations.
Integer/decimal differences and percentages use the existing exact rational/half-even primitives,
with Decimal128 precision 38, original value scale for differences and configurable percentage scale
(0–18). Missing decimal scale metadata and overflow fail; Float64 remains approximate and its
percentage is rounded to the selected places. Preserve current row order and original value columns.
Only selected keys/value leave the Polars frame; bounded hash lookup and exact arithmetic are
linear in the number of prepared rows, not a pairwise scan or full wide-row dictionary conversion.

The new-report wizard compiles row formulas -> filters -> calendar_period -> group_by -> summary
formulas -> period_comparison. The comparison date must be a grouping dimension; all other grouping
dimensions are partitions. Filters affect raw dates and both populations, so filtering out the
baseline produces missing comparison values. The first slice produces a table only, with one
selected measure; graph configuration is available for both nodes. Saved comparison reports remain
graph-only in the calculation wizard; creation APIs do not imply safe round-trip editing. Reject
comparison settings on the existing edit API instead of silently dropping them. Empty comparison
defaults are omitted from old receipt hashes. Existing project CAS, graph persistence, releases and
stable field-ID remapping apply unchanged. No DDL, dependency or legacy executor changes.

Alternatives: row lag mislabels gaps; Float64 coercion loses exact money; hidden chart transforms
break the single-engine contract; expanding the suffix editor now risks deleting manual steps.
Consequences: safe round-trip editing, comparison charts, multi-measure composition, custom/fiscal
calendars and coverage automation are not claimed by this slice. Human acceptance remains open.

# ADR-121 - Named graph-backed measures preserve prepared values and declared grain

Date: 2026-10-09. Status: ACCEPTED.

Context: sharing a preparation branch does not define a reusable business measure. Applying
another sum/average to prepared ratios can silently change their meaning. The graph must remain
the calculation authority, without copied formulas or a second semantic execution engine.
Decision: a typed MeasureDefinition belongs to a dataset publication in the existing result_catalog
JSON. It stores a stable UUID, name, description, numeric field ID and up to eight distinct grain
field IDs. Registration resolves and executes the existing publication and validates uniqueness
over every row. Missing/non-numeric fields, repeated keys and non-finite values fail explicitly.
Empty grain denotes a single total; null keys are equal for uniqueness. No rows means an empty
table, not a fabricated zero; KPI still requires exactly one row.

Direct reuse creates an independent visualization/dashboard/widget and idempotency receipt,
referencing the same publication/workflow. It does not add nodes, publications, aggregations or
materialized tables. Table displays value plus grain; Bar/Line require one category grain; KPI
requires no grain. Exact decimal values use existing lossless transport. Preview writes nothing;
apply checks the project token under the existing project lock and commits all objects together.
Retry receipts are checked before stale-state validation. Parameter defaults and contextual/block
boundaries remain those of ADR-120. Unlike an appended graph branch, this visualization remains
bound to the publication; retargeting it must still satisfy the persisted field/grain contract.

VisualizationConfig carries an optional grain_column_ids guard: absent means legacy behavior,
[] means single total. Existing execution validates it before limiting displayed rows. Definition
field/grain are immutable after registration; create another definition to change them. Names and
descriptions may change. Removing a catalog entry does not remove calculations or existing reports.
Appearance saves/copies preserve the original guard even for older clients omitting it and cannot
retarget the value/publication. Calculation-wizard editing of directly reused reports is graph-only,
even if other consumers are later removed. Old graph saves omitting measures preserve definitions;
explicit empty lists remove them. Frozen releases preserve/remap the existing JSON contracts.

Alternatives: copying formula recipes would drift from the graph; automatic reaggregation would
misrepresent ratios; a separate relational semantic layer is unnecessary for this first local slice.
Consequences: no DDL or new dependencies. Data has a RU/EN/TT measure catalog and direct report
builder. Catalog names are labels, not calculation-column renames. Existing report titles do not
change when a definition is renamed. This delivery supports one measure per directly reused report;
multi-measure composition, contextual controls and period comparison remain explicit follow-ups.

# ADR-120 - Prepared report inputs extend the existing graph with a shared branch

Date: 2026-10-09. Status: ACCEPTED; implemented with API, UI and regression coverage.

Context: the report wizard could only start from normalized file tables. Prepared results already
name outputs of persisted workflows, but there is no cross-workflow execution/dependency contract.
Copying preparation would produce independently drifting calculations; materializing a new hidden
table would also change refresh semantics. Introducing a cross-workflow runtime is unnecessary for
the requested local reuse when an ordinary edge in the existing workflow expresses the dependency.
Decision: allow exactly one input: the unchanged imported-table fields, or a typed published_input
containing workflow ID, publication ID and expected project state token. A typed project catalog
lists named outputs; a selected-input read resolves only its ancestor branch using the normal
schema resolver, returning fields, parameter-default notice and the revision fingerprint.
Apply adds ordinary row/filter/group/summary nodes to that same workflow, a new publication,
independent visualization and dashboard. Keep existing nodes/edges/IDs, name, parameters, containers,
publications and report appearance. New nodes are placed below the existing graph. No source copy,
new executor, new persistence table, DDL or dependency is introduced.
The publication selects a concrete table endpoint at authoring time; afterward the ordinary graph
edge is authoritative. Changing that shared step/source updates all consumers. Retargeting/renaming
the publication alone does not rewire the new branch. This is shared calculation reuse, not a live
cross-workflow publication pointer. The UI explains shared effects and provides the source graph link.
Use current workflow parameter defaults (not another dashboard's parameter overrides). Publications
with view contexts remain graph-only: silently dropping their filters would change data meaning.
Scalar outputs are not input tables. A result inside a block must expose a full-table public output;
the wizard never rewrites manual block boundaries. Normal graph validation remains authoritative.
Preview/schema checks persist nothing. Lock the project before reading the saved workflow, validate
the project-wide token and save with workflow CAS. The shared graph append, new report objects and
receipt commit together. Identical retries return the original receipt; conflicting requests do not
overwrite another branch. Empty published_input defaults are excluded from old receipt hashes.
Frontend queries are keyed by workflow/publication and source revision, not just project revision.
Reloading fields preserves local measures but disables editing while pending and invalidates an old
preview; changing input clears source-specific settings. Errors do not silently select another input.
Alternatives: copied preparation loses shared identity; cached/materialized imports would require
another refresh lifecycle; cross-workflow dependencies would require new cycle, deletion, release
and version propagation contracts. Existing graph edges already provide these boundaries.
Consequences: a shared upstream report may become graph-only under ADR-117/119 safety checks; the
new unshared suffix stays editable. Release restore preserves one shared workflow with remapped IDs.
Dedicated reusable measure definitions, contextual/parameterized input selection, cross-workflow
references, period comparison controls and R4/R5 charts remain separate future slices.

# ADR-119 - Formula measures project an ordinary graph with stable aggregation identities

Date: 2026-10-09. Status: ACCEPTED; implemented and regression-tested.

Context: economists need row calculations and formulas over totals without wiring nodes. Existing
Group By output IDs depend on aggregation position; reordering measures could silently redirect
a formula's denominator. A separately stored wizard recipe would also lose manual graph edits.
Decision: add group_by@3 with required per-measure UUIDs and stable measure_UUID column IDs.
Arithmetic inherits v2 unchanged: decimal sums/min/max and explicitly rounded decimal averages
are exact; integer/Float64 sum/average behavior is not silently promoted. New wizard reports use
v3. Requests without stable IDs still build v2; existing reports never change aggregation version
implicitly. Mixed/duplicate measure identities and conflicting formula node IDs are rejected.
Compile row formulas -> optional literal filter -> aggregation -> after-total formulas using
ordinary calculated_column@2 nodes, existing execution/schema propagation and publication APIs.
Each formula has its own precision/scale and rounding boundary. Mean of row ratios is therefore
different from a ratio of totals, and the UI explicitly explains both scopes. Formula arithmetic
accepts decimal/integer fields, not Float64. A selected formula can supply a KPI with supporting
measures; charts retain their existing series limits and tables retain all selected outputs.
Typed /fields endpoints infer the row/measure schemas without saving or calculating the report.
They reuse the common resolver (a dynamic advanced upstream schema may still require its normal
value-dependent resolution). Full preview/apply always executes the whole selected population.
The browser retains only matching checked schemas; unchanged row prefixes remain usable when
adding formulas. No browser calculation or arbitrary chart option is persisted.
Editing projects the live graph. A UI scope marker identifies wizard-authored exact formulas,
not a second calculation recipe. Exclusively owned row steps and the recognized summary chain
can be edited/removed; manually authored upstream steps remain intact. Shared/contextual outputs,
interactive bindings and summary formulas in manual containers remain graph-only. Keep IDs,
positions, other branches and visualization appearance; retarget the publication when its terminal
formula changes. Project CAS, visualization locking, atomic apply and idempotent receipts remain.
Canonical receipt payloads omit new empty defaults so pre-extension retries keep their old hashes.
Alternatives: positional references risk incorrect results; upgrading old graphs changes persisted
contracts; automatic Float64-to-decimal conversion cannot recover lost precision; a separate formula
engine/recipe violates the graph boundary. No new dependencies, persistence tables or DDL required.
Consequences: formula measures and differences/ratios are available in the wizard. Legacy v2 reports
can add row formulas but require a new report or explicit graph work for after-total formulas.
Dedicated period comparisons, published-input creation, reusable measure definitions, broader graph
editing, complex visualizations and human usability acceptance remain separate unfinished work.

# ADR-118 - Opt-in exact monetary expressions with a single output rounding boundary

Date: 2026-10-08. Status: ACCEPTED; implemented and regression-tested.

Context: calculated_column@1 intentionally uses Float64 for numeric arithmetic. Silent conversion
would alter saved calculations and cannot recover precision already lost in a source. A local
Polars 1.44.2 probe also showed Decimal division/multiplication retaining the operands' scale:
1.00 / 3.00 becomes 0.33 before subsequent operations. Increasing that scale only moves the
implicit rounding boundary and risks Decimal128 intermediate overflow.
Decision: add calculated_column@2 with explicit precision (1–38), scale (0–precision, default 2)
and fixed half_even rounding. Parse numeric literals from their original decimal tokens, never
AST floats. Accept only integer/decimal/unknown-null inputs and a bounded arithmetic allowlist:
+,-,*,/, abs, minimum, maximum, coalesce, nullif and safe_divide. No eval/exec, dynamic functions,
predicates, string conversions or automatic Float64 upgrades. Shared parser preserves stable field
references and the existing 4096-character/256-AST-node/64-depth limits. Rational intermediates
are capped at 512 numerator/denominator bits; overflow is explicit, not a zero/null substitution.
Round exactly once at the node output, with integer half-even arithmetic independent of the host
Decimal context; a subsequent node consumes that already-rounded Decimal128 result. Constants
allow up to 38 significant digits, 38 decimal places and bounded exponents. Output overflow fails.
Ordinary operators/min/max propagate null. coalesce evaluates until the first non-null value;
safe_divide evaluates its fallback only for a null/zero denominator, without evaluating the unused
numerator branch. nullif preserves its first argument unless the two arguments are equal.
Division by zero otherwise fails for the full dataset, including rows beyond preview limits.
Implementation: the common node executor uses bounded Python Fraction arithmetic over only the
referenced columns, then creates a typed Polars Series. Constants are evaluated once per dataset.
Schema propagation, stable calc IDs, graph validation/execution, exact JSON transport, aggregation,
publication, report editing and frozen releases continue using existing contracts. No DDL or new
dependency. This narrow row-wise path is justified by numeric correctness and a reproducible
100k-row benchmark (~1.2–1.3 s locally), not a replacement of the Polars engine.
Alternatives: implicit Float64 casts lose money/large integers; direct Decimal128 expressions round
intermediates; an arbitrary high Decimal context can still double-round division ties. A browser
calculator or a second report recipe would violate the graph ownership boundary.
Consequences: exact settings/help and type-filtered selectors are version-specific; old simplified
calculation editors never open a v2 step. Saved v1 nodes and their batch authoring retain semantics.
Remaining work: formula measures/comparisons in the report wizard, reusable measures, conditional
exact expressions, decimal window/other operation parity, and human usability acceptance.

# ADR-117 - Graph-backed editing of an existing report's recognized suffix

Date: 2026-10-08. Status: ACCEPTED; first round-trip slice implemented.

Context: recreating a report from its creation receipt loses manual graph changes, identifiers,
appearance and dashboard references. One calculation or visualization may serve several consumers.
Decision: derive simple settings from the selected visualization's current published graph. Edit
a terminal group_by@2 and, when exclusively owned and unreferenced, its preceding literal filter@1.
Keep arbitrary upstream steps, other branches, positions, UI metadata, parameters, publications,
containers and dashboards. A referenced/parameterized filter remains an advanced upstream step;
new simple filters are inserted after it. Never silently upgrade a legacy aggregation version.
Use the common backend schema resolver/execution engine for field choices and full-data preview.
Unsupported terminal graphs, shared outputs, view-context or interactive bindings open a read-only
explanation with graph access. Multiple widgets using this same visualization require explicit
acknowledgement. Retain existing field order/series/appearance by default; an explicit rebind flag
regenerates only visualization field bindings. Missing custom formatting/public-port fields block
apply, not automatic metadata removal. Visualization naming does not rename dashboards or workflows.
Preview writes nothing. Apply revalidates the current project fingerprint, then commits graph,
visualization revision and an idempotent receipt together. The fingerprint conservatively includes
all project sources, workflow/visualization/dashboard revisions and check rules. A conflicting tab
keeps its local settings; explicit reload accepts saved state. Receipts are responses, not recipes.
Project locking serializes source/graph edits. Also lock the selected visualization after reading
the workflow, because dashboard attachment uses shared visualization locks, not a project lock.
This avoids stale usage counts and follows workflow deletion's FK lock order.
Alternatives: replaying the create request discards manual edits; a separate wizard DSL duplicates
calculations; in-place editing shared results silently affects other reports; blanket read-only for
any advanced upstream step unnecessarily prevents safe terminal edits. All were rejected.
Consequences: additive typed endpoints, existing persistence envelopes, no DDL. The first editor
supports the recognized suffix, not arbitrary graph restructuring. Formulas, comparisons, reusable
measures, published-input creation, exact decimal expressions and new visualizations remain open.
Unsaved form changes are in-memory with navigation warnings; this is not a persisted report-edit
draft feature. Existing import/update draft persistence remains unchanged.

Follow-up during ADR-118 acceptance: while explicitly reloading the saved report, disable form
controls until the replacement is ready. Remount on every successful explicit reload, even when
the server fingerprint is unchanged; otherwise confirmed discard retains local edits. Both the
slow-response race and unchanged-token discard have regression coverage.

# ADR-116 - Resumable initial imports and crash-safe artifact adoption

Date: 2026-10-08. Status: ACCEPTED; implemented and regression-tested.

Context: an uploaded file survives restart, but browser-only field settings do not. A process
exit between writing raw/Parquet bytes and committing metadata can leave untracked artifacts.
Decision: keep one typed, revisioned initial-import draft per universal source in ReportDocument.
Store resource, reading options, field profile, source revision and stable apply request identity.
Reading an untouched import synthesizes revision zero without a write. Explicit Save, field
inspection and Check persist settings; individual keystrokes do not. Resume never restores a
stale preview: full-data validation runs again before apply. Source and draft CAS are independent;
conflicts preserve the local form, while explicit reload/restart accepts current saved state.
Draft saves do not change active data or the report-check fingerprint. Apply atomically commits
the snapshot, source/workflow revisions and draft completion receipt. Retrying a committed apply
returns its original snapshot; old API clients may omit draft_revision and keep their contract.
Raw initial uploads and profile-apply Parquet now use the same durable intent/adoption boundary
as refresh. Reserve the intent before the project lock, retain the lock through artifact adoption,
and never delete a committed artifact after a response failure. Startup recovery runs through
the existing file_cleanup CLI before the single worker accepts requests, not concurrently with
live writes. Subprocess tests terminate after raw write, Parquet write and metadata commit.
Alternatives: browser-only drafts fail cross-session recovery; autosaving every keystroke persists
temporarily invalid profiles; putting drafts in active source metadata invalidates report checks;
caught-exception-only cleanup cannot cover process death. These alternatives were rejected.
Consequences: additive typed API, no new database DDL; raw files and valid saved profiles survive
restart. Unsaved edits still need Save; a structurally invalid profile cannot be persisted. Import
drafts are authoring state, not part of frozen releases. Source/project deletion removes drafts.
Full graph round-trip, broader decimal operations and whole-product restart acceptance remain open.

# ADR-115 - Universal source refresh through the existing report cycle

Date: 2026-10-08. Status: ACCEPTED; staged replacement implemented.

Context: normalized Excel/CSV datasets need file replacement without losing logical identities,
exact types, prepared reports or rollback history. Legacy sheet bindings cannot describe them.
Decision: extend existing version/update/check/apply APIs with typed DatasetBinding and mapping
results. Match unique original headers, never positions; explicit bindings handle renamed fields
and sheets. Preserve field IDs, logical resource IDs, types and precision from the confirmed profile.
All active tables are normalized and checked, including tables not yet referenced by a workflow.
Errors block the entire source set; extra unmapped columns warn and require acknowledgment.
New raw versions and staged Parquet use durable artifact intents, adopted atomically with metadata.
Reserve the intent before acquiring the project lock; retain the lock through write/adoption so
source/project deletion cannot race a new artifact into an orphan. Cleanup never deletes adoption
that already committed, even when a later response read fails.
Retain staged snapshots by version/profile fingerprint for repeat checks and restart recovery.
Apply atomically switches source pointers and increments workflow/source revisions. Rollback
restores data pointers but increases revisions, avoiding acceptance of stale pre-rollback edits.
Exact retry of an all-universal update returns the applied document without applying it twice;
legacy/mixed update retry keeps the previous 409 contract. Generic append-period mode is rejected.
Alternatives: a separate refresh history duplicates checks/releases; in-place replacement loses
reproducibility; positional matching silently changes meaning after column reorder. Rejected.
Consequences: no additional migration beyond 0011; additive JSON/API contracts; historical and
staged artifacts consume retained storage. Initial-import draft recovery and crash intents for the
initial-import path were subsequently implemented by ADR-116. Full decimal analytical parity and
full process-restart acceptance remain open. The refresh UI shares the existing History workspace.

# ADR-114 - Report-first workspace and universal data evolution

Date: 2026-10-08. Status: ACCEPTED; implementation in progress.

Context: the owner approved a new UX for economists, source-independent ingestion, a report
wizard and statistical visualizations. Excel-specific input interfaces and category/value-only
chart contracts cannot support these goals without extension.
Decision: preserve the modular monolith and calculation DAG; introduce a neutral light-default
workspace, common connector/resource/profile/snapshot contracts, Excel and CSV adapters,
immutable normalized artifacts, guided DAG authoring and versioned semantic chart definitions.
Retain legacy endpoints/node versions and frozen releases. A future 1C adapter is represented
as planned capability only. No credentials, network connector or multi-user system is required.
Alternatives: full rewrite discards verified behavior; spreadsheet-shaped adapters leak source
details; separate wizard calculations diverge from the graph; renderer-side statistics change
with preview limits. All are rejected.
Consequences: staged migrations and regression gates, explicit exact-decimal support for new
numeric contracts, unchanged legacy float behavior, and separate human usability acceptance.
The detailed delivery contract is docs/PRODUCT_EVOLUTION.md. Earlier redesign/CSV deferrals
are superseded only for this approved scope.

# ADR-113 - Versioned Excel and immutable report releases

Date: 2026-09-24. Status: ACCEPTED.

Context: regular reports need safe multi-book refresh and reproducible historical results.
Replacing a file in place or saving only preview rows cannot preserve historical meaning.

Decision: retain logical source IDs; append immutable SourceVersion artifacts. Store typed
report-cycle documents in a revisioned JSON envelope, with separate source-version rows.
Pin source sets for execution; bind physical columns to logical fields by reading profile.
Apply all source pointers under one project transaction after check fingerprint and CAS.
Advance referencing workflow revisions in that transaction to invalidate existing schema/preview
contracts, including full replacement without a node-type change. Node identities stay unchanged.
Use the existing Union primitive for period collections, surfaced as an Excel-period node.
Use full-data generic checks and published scalar controls; no financial-specific service.

Freeze materialized widget results and configuration in bounded StorageProvider artifacts.
Reserve artifact keys and persist cleanup intent before writing. Publish artifact references
atomically; recover only into a new project with copied files and remapped identities.
Keep the current single-worker deployment; durable jobs have explicit restart interruption,
progress and cancellation checkpoints. Multi-worker coordination is deferred, not simulated.

Alternatives: in-place overwrite loses history; preview-only snapshots lose rows; recomputing
historical graphs with current code cannot guarantee frozen releases. A distributed queue and
many document tables add unnecessary infrastructure for the current local single-worker scope.

Consequences: retained source history consumes storage. Release byte limits are explicit;
no silent truncation. Full checks can be slower than preview. Period labels do not synthesize
dates. Human usability validation and real second-report data remain separate acceptance gates.

# ADR-112 - Guided authoring without implicit analytics

Date: 2026-09-24. Status: ACCEPTED. Extends ADR-111.

Context: new charts requested execution before mandatory fields were selected; table selection
was duplicated, and workbook actions were not keyboard accessible.
Decision: add schema-aware completeness guidance before preview/save, a single searchable
ordered column control, semantic keyboard controls and a three-step project entry path.
The server still validates types, aggregation requirements and execution. No default fields
or implicit aggregation are inferred. Existing data and API contracts remain unchanged.
Alternative: auto-select likely fields; rejected because a syntactically valid chart can be
analytically wrong. Consequence: incomplete forms explain the next action without execution;
usability gains are structural until measured with operators. See docs/USABILITY_REVIEW.md.

# ADR-111 - Dashboard workspace and contextual draft rendering

Date: 2026-09-24. Status: ACCEPTED. Extends ADR-106/109.

Context: chart settings were available from dashboards but hidden among permanently visible
widget controls. Modal editing obscured layout; dirty layout unnecessarily prevented independent
visualization creation. Draft preview did not receive the dashboard view context.

Decision: reuse one independent visualization editor in the dashboard right panel and standalone
dialog. Separate data, appearance and local placement; put secondary actions in an overflow menu.
Visualization owns semantic configuration; dashboard owns references, layout and local titles.
Keep explicit separate saves and CAS, rather than suggesting a cross-document atomic save.
Create/copy into the current recoverable layout draft. Failed existing visualization drafts remain
recoverable; switching requires apply/discard/continue. Shared edits disclose multiple placements.

Preview accepts ViewContext and parameter values, through the same renderer as saved charts.
Only presentation fields patch existing results locally. Field/context changes debounce 400 ms,
abort obsolete requests and gate responses by request identity. Layout history contains no chart
configuration. Placement fills free grid space; keyboard controls reject collisions and bounds.

Alternatives: a gear opening the old modal does not solve context switching; automatic shared
saves risk unintended cross-dashboard changes; dashboard copies of chart config split ownership.
Consequences: no database migration; additive preview contract and regenerated OpenAPI types.
Existing node-owned charts retain their compatibility dialog. No new analytics, filters or
navigation features. Human productivity remains a separate measured acceptance activity.

# ADR-110 - Generic operations for simple multi-book dashboards

Date: 2026-09-24. Status: ACCEPTED. Extends ADR-109.

Context: the second report needs explicit classification, ordered loss history, multiple books,
source bounds and comparisons of prepared measures. A special financial API would bypass the
constructor and could not demonstrate its ability to build the report.

Decision: extend the shared typed formula compiler; version ordered Window operations as v2;
add a bounded calendar source; expose source-row exclusions and diagnostic Join record pages;
allow multiple series in independent Bar/Line visualizations. Financial semantics, signs,
rates and reconciliation choices remain in editable project configuration. Strict composite
joins replace implicit fallback matching in the synthetic example. Missing plans remain null.
The example's explicit BU tax base and other differences are recorded in docs/ALMA_SIMPLE_DASHBOARD.md.

Alternatives rejected: Python financial executors, hidden report coefficients, frontend totals,
automatic deduplication and fabricated plans. Consequences: initial preparation still requires
analytical expertise; ordinary chart creation reuses shared publications. Existing presentation
and calculation JSON provides persistence without a new migration. Empty-series defaults remain
absent in old API results. Human speed is measured separately from automated browser execution.

# ADR-109 - Simple dashboards and explicit composite Join

Date: 2026-09-24. Status: ACCEPTED. Extends ADR-107/108.

The owner prioritizes authoring basic configurable dashboards over viewer-only productization,
navigation and interactive drill-down. Scope and remaining tasks: docs/SIMPLE_DASHBOARDS_PLAN.md.
Join v2 declares an ordered list of key pairs and expected relationship (many-to-many by default,
many-to-one or one-to-one). All pairs compare together; any null key component prevents matching.
Repeated key fields are invalid. Uniqueness checks cover complete keys over entire inputs,
including unmatched keys, before result allocation. Existing output limits remain enforced.
Join v1 is retained with its original single-key semantics and shares the common executor.
No concatenated string keys, automatic deduplication or financial-specific joining are introduced.
The wizard creates v2; existing nodes are not automatically upgraded. The form is shared with
the inspector. Both key fields remain in the result and right-field IDs retain their old scheme.
No database migration or workflow-format change is needed; node versions already persist.

# ADR-108 - Guided table authoring and full-input Join feedback

Date: 2026-09-23. Status: ACCEPTED. Extends ADR-107.

Context: creating a calculation was simpler than editing it; the full node catalog competed
with common actions, and a narrow preview made Join mistakes difficult to inspect.
Decision: reuse one create/edit calculation dialog, recognizing only its own safe arithmetic
grammar. Complex expressions stay in formula mode without lossy conversion. Editing preserves
node and field identities. A Next step panel offers Join, calculation, Group By and publication;
the full catalog remains available under disclosure. Preview occupies the bottom workspace,
with optional A/B pins. Captions derive from configuration unless explicitly named by the author.

Join reports full-input matched/unmatched counts, duplicate non-null keys and row expansion,
using its existing key-count computation. Typed optional preview metadata belongs only to the
requested Join node; downstream previews must not misrepresent upstream counts. Preview limits
do not limit this report. Null keys retain existing non-matching semantics.

Alternatives rejected: sampling Join quality from preview rows, a second formula interpreter,
and hidden deduplication. No persistence migration or workflow-format change is required.
Human time savings remain unmeasured; automated completion and reduced wiring are narrower claims.

# ADR-107 - Visible results and table-driven node creation

Date: 2026-09-23. Status: ACCEPTED. Extends ADR-106.

Context: common Join and arithmetic tasks required selecting node types and wiring helper
operations. Published outputs were difficult to locate on the canvas.

Decision: create ordinary Join or Calculated Column nodes through schema-aware table actions.
Keep one calculated-column card per calculation; expose its new field and complete table.
Result cards reference existing publication identities and persist only layout in presentation.
Reuse independent visualization authoring with a preselected publication after a successful save.

Rejected: embedding a second transformation pipeline inside Join configuration, adding a
result executor, or duplicating publication settings in canvas metadata. These would hide
calculation order or introduce multiple sources of truth.

Consequences: new optional presentation positions and generated API types, no DB migration;
older saves preserve omitted positions. Existing branches stay unchanged. Join retains one
explicit key pair and inner/left semantics. Other table actions remain out of this delivery.
Human speed improvements require measurement; fewer wiring actions alone are not a timing result.

# ADR-106 - Published data outputs and independent visualizations

Date: 2026-09-22. Status: ACCEPTED. Supersedes chart-configuration ownership in ADR-104 for
the new primary workflow; retains the typed calculation contracts of ADR-090/105.

Context: chart nodes and scalar extraction helpers made dashboard assembly require unnecessary
graph wiring. The owner approved separate chart documents, a common period and navigation,
while keeping all analytical calculations editable in the constructor.

Decision: workflow format 3 adds a revisioned publication/context catalog. Visualization owns
its configuration and CAS revision and references a publication UUID. Dashboard widgets reference
visualizations without duplicating their chart configuration. Common context predicates compile
into ordinary execution steps at explicit authored boundaries. Row selections never implicitly
move before Window/Group By; highlight-only omits that role's context predicates. No arbitrary
aggregation, first-row picking or domain-specific financial service is introduced.

Alternative rejected: independent copies of configuration in chart nodes and database rows.
Alternative rejected: automatically inferring filter placement from chart categories or formula
text. Both approaches create ambiguous ownership or incorrect analytical denominators.

Consequences: migration 0009 and OpenAPI contracts; separate visualization conflicts/deletion
protection; transient preview without persistence; reusable source cache. New workflows use v3.
The conversion service locks/checks workflow and dashboard revisions, preserves visualization
and widget IDs, remaps field actions and commits together. A dry run rolls the transaction back.
Supported v2 field bindings must already project fields from their chart's table; expressions
must be appended explicitly before conversion. An equality parameter Filter becomes a retained
table boundary with compiled context selection, keeping its ID and downstream row semantics.
These constraints avoid hidden computation during migration. Backup is taken before conversion.

Financial conversion: 225 → 142 nodes, 321 → 187 edges, 28 publications, 53 independent
visualizations, 55 placements, six dashboards. All 164 slices/1551 result pages match the oracle.
Structural reductions are evidence of fewer editable graph elements, not a human speed estimate.
Operator guidance and limitations: docs/PUBLISHED_DASHBOARDS.md.

# ADR-105 - General field expressions and explicit single-value boundaries

Date: 2026-09-22. Status: ACCEPTED. Extends ADR-090/104.

Context: assembling financial dashboards with field nodes exposed missing text/null handling,
safe division with fallback, and extraction of text leaders from an explicitly selected record.
Sum is not a substitute for scalar extraction; silently selecting a first row is ambiguous.

Decision: field_formula exposes optional named inputs a/b/c and an expression compiled through
the existing allowlisted formula compiler. Schema inference and execution share its type rules.
Field operands require one row context; all-scalar expressions return a scalar. Existing expression
size/depth limits apply. Non-finite intermediate field results retain deferred validation even if a
downstream comparison masks their numeric value. Invalid formulas identify config.expression.
field_scalar takes table/value, requires identical row context and exactly one row, preserves
logical type and null, and never implicitly aggregates or chooses a record. Both have ordinary
registry contracts, named ports, forms, translations, undo and revision-safe persistence.

KPI@2 gains an optional table input for explicitly selected navigation context. It must contain
exactly one row; the scalar remains its only displayed measure. No implicit scalar-to-record
matching occurs. This preserves links from leader KPI without hidden lookups. No DB migration
or public response-shape change is needed: registry contracts describe the additional ports.

Alternatives: financial services violate the constructor requirement; retaining calculated-column
selectors would not exercise field authoring; expanding each trim/coalesce/safe_divide into many
primitive nodes further increases complexity. Consequences: named wires help trace inputs, but
expressions still require formula literacy. Capability is not evidence of faster human authoring.

# ADR-104 - Explicit field-bound Bar Chart and scalar KPI

Date: 2026-09-22. Status: ACCEPTED.

Context: visualization v1 consumes a dataset and column selectors. Field workflows need explicit
category/value/scalar wires without changing saved v1 contracts or introducing hidden aggregation.
Decision: register bar_chart@2 (table/category/value inputs) and kpi@2 (scalar value input), available
only in workflow format 2. A shared typed executor validates row context and value types, then
materializes expressions at the visualization boundary. Bar preserves row order/cardinality and
checks the 2000-point limit before materialization. KPI preserves one numeric/text/null scalar.
Deferred field checks keep the offending input/edge. Common Polars execution, cache and legacy
visualization validations remain authoritative. Both expose a named dataset for schema/preview.

Bindings exist only in edges. Strict appearance config rejects legacy category/value selectors.
Generated role columns have IDs derived from visualization node ID and port; collision-safe engine
names and source-column metadata preserve upstream fields. Bar retains upstream columns for explicit
highlight/navigation configuration. The render service derives its role mapping from the same helper,
never stores a second config. Existing v1 charts remain registered and unchanged. No DB migration or
OpenAPI shape change is needed: versions/config/edges already use the persisted generic contract.

UI: versioned forms hide duplicate selectors, offer named connections and explicit visualization
preview. Drop-to-create auto-connects the exact table context. Dashboard settings preserve workflow
format/presentation. Independent copies clone real inbound edges and expose newly crossed block
outputs atomically; generated navigation role IDs are remapped only in the replaced widget.
Navigation can add context fields using common schema resolution for either executor contract.
Opening a calculation from a dashboard selects its node in the opt-in field editor for v2.

Alternatives rejected: upgrading v1 automatically, positional zipping of fields, implicit totals in
the chart, separate financial endpoints, or one materialized table per expression wire.
Consequences: authors explicitly aggregate upstream, table wires remain visible, and the UI/catalog
may show both visualization versions. Full financial/operator acceptance remains F4 work.

# ADR-103 - Exact version identity in editor catalogs

Date: 2026-09-22. Status: ACCEPTED; typed visualization implementation remains pending.

Context: the backend registry keys contracts by type and version, but field connection validation,
selected-node inspector and source menu labels used only type. Adding a second visualization
version would select incorrect ports depending on catalog order. Classic next-step choices also
discarded version identity. This is reproduced with incompatible versions in regression tests.
Decision: resolve saved nodes strictly by (type, version); missing versions never fall back to another
contract. Creation choices retain both identities and show a version suffix only when the catalog
contains multiple versions of that type. Workbook insertion keeps its currently supported v1 reader.
Reasoning: preserves old nodes and makes creation explicit without automatically upgrading graphs.
Alternative rejected: choosing the newest definition for existing nodes, which changes their contract.
Consequences: this is a frontend compatibility prerequisite, not delivery of field-bound charts.
No registry, API, execution, migration or saved data change. Browser testing injects additional
catalog entries only; it does not persist or execute invented node versions.

# ADR-102 - Atomic block membership and public-port settings

Date: 2026-09-22. Status: ACCEPTED; visualization bindings remain F3 work.

Context: blocks could be packed/unpacked but their membership and public interface were fixed.
Decision: a modal stages membership, label and public-port edits, committing once through shared
history/CAS. Removing a member does not delete its node or wires. New boundary endpoints are
exported in that same operation, existing surviving endpoint IDs are retained, and workbook/other
block members are excluded. Empty membership requires explicit unpacking rather than silent deletion.
Required boundary ports cannot be hidden, including at the pure edit helper boundary. Optional
ports may be hidden; existing inputs/outputs/fields can be explicitly exposed through named choices.
Public labels are now rendered on the card; underlying named endpoints remain in tooltips.
Reasoning: calculation graph remains authoritative; no edge rewriting, duplicate inner graph,
database migration or alternate save route. Cancel and Escape leave the saved revision untouched.
Consequences: labels are independent of field names; two labels may match but identities do not.
Blocks still expand on the shared canvas; nested blocks and template libraries remain deferred.

# ADR-101 - Composite cards project the existing graph

Date: 2026-09-22. Status: ACCEPTED; F3 remains in progress.

Context: migration 0008 already persists one-level blocks and validates boundary ports; the field
editor previously rendered all members individually and provided no packing controls.
Decision: a named node checklist creates a presentation block, exporting each crossing endpoint
once. Collapsed cards project saved public ports onto actual node/port/column endpoints; internal
wires are hidden only visually. Opening reveals members on the shared canvas with a return action.
Renaming, collapse, movement, unpacking and explicit extra-output publication reuse graph history
and revision-safe save. Unpacking/deleting a block card retains its calculation nodes and edges.
Deleting members repairs presentation references; explicit new crossing wires export their endpoint
in the same draft. Existing public port IDs remain stable. Workbook members and nested blocks are
excluded from packing. Search offers named selection without technical IDs.
Reasoning: reuse the authoritative graph and persisted references; do not introduce another
execution engine or duplicate inner graph. No schema/API/migration changes.
Consequences: this initial delivery expands in the shared canvas rather than an isolated subcanvas.
Membership/public-port management and direct visualization bindings remain separate F3 tasks.

# ADR-100 - Preview-scoped runtime diagnostics

Date: 2026-09-22. Status: ACCEPTED.

Context: preview errors were readable but did not mark inspector controls. A late failure must
not mark controls after graph, parameter or output changes, including undo without a save.
Decision: NodeOutputPanel reports structured API issues for its current request only. Its content
is remounted for workflow/node/output/revision/dirty/parameter changes. Retry and success clear
reported errors. The field inspector additionally gates runtime issues by draft object identity,
revision and parameters, and merges them with current schema issues only for matching node IDs.
A/B panels retain their own local diagnostics and do not overwrite the selected inspector.
Direct field-output materialization failures carry outputs.<port>, not a guessed operand path.
Known typed-value/schema repair messages and output labels have RU/EN/TT presentation.
Alternatives: a global unversioned error store or parsing displayed prose would allow stale or
misattributed highlights. No persistence, API shape or calculation-policy changes are needed.
Consequence: selecting another inspector node starts a fresh preview session; errors of an
upstream node remain described in the failing preview, never attached to the wrong controls.

# ADR-099 - Runtime issues and schema-driven inspector highlighting

Date: 2026-09-22. Status: ACCEPTED; final diagnostic audit remains open.

Context: execution exceptions discarded the structured path supplied by typed operations;
comparison compiler errors pointed only to config. Inspector controls did not indicate invalidity.
Decision: typed executors wrap safe domain failures with operation-specific repair locations;
comparison compiler failures identify operand b. The common execution boundary retains structured
issues and matching inbound edge IDs, without exposing unexpected exception text. Null-filter
policy errors identify config.null_policy. Delayed field arithmetic failures identify the consumer
input where materialization failed, not an invented origin inside a composed expression.
Schema issues mark matching inspector controls using aria-invalid, a border and a localized title.
Only current schema issues are used, so edits/parameter changes clear stale highlights.
Alternatives: parsing message strings or guessing upstream origins was rejected. No API/DB change.
Consequences: direct named-output errors and runtime-to-inspector highlighting still require an
audit; runtime messages are already visible in preview. Existing calculation policies are retained.

# ADR-098 - Preserve typed schema diagnostic locations

Date: 2026-09-22. Status: ACCEPTED; remaining F1 runtime/compiler diagnostics stay open.

Context: typed schema inference flattened semantic errors into field=config, losing which
operand or table-field connection needed repair. Existing GraphIssue already supports paths
and edge IDs; the frontend already displays structured issues in the output inspector.

Decision: ValueConnectionError optionally carries a field path. Node inference attributes
operand/type and context errors to input ports, scalar/name errors to config paths. The resolver
preserves those paths and identifies the inbound wire by its target port. Existing codes and
API shapes remain unchanged. Localized error presentation labels input paths and translates
repair messages without translating user parameter names or field IDs.

Reasoning: diagnostics belong at the layer that knows the invalid operand, rather than parsing
English prose in generic graph traversal. No persistence migration or generated type change.
Consequences: preflight errors retain locations through execution rejection. Runtime table-boundary
and comparison/compiler errors still need a separate pass; this slice does not mark F1 complete.

# ADR-097 - Bounded field rendering and large-graph navigation

Date: 2026-09-22. Status: ACCEPTED; financial-copy/operator acceptance remains open.

Context: a generated 1024-column Excel source and 167 Select Columns branches rendered
3695 handles and 15303 canvas elements; field mode also requested the unused classic schema.
The old first-20 search cutoff could not scroll through all matching fields.

Decision: virtualize only unconnected fields (24px rows, 240px viewport, at most 16 mounted).
Connected, selected-path and declared output handles stay pinned outside the scroll area.
Graphs over 40 nodes open compact; selection reveals fields, with an explicit manual override.
Reuse NodeFinder for navigation to a node or its workbook. Suppress classic GET schema in v2
field mode, retaining its parameter-aware POST query. View changes do not save graph revisions.

Alternatives: hiding connected handles would destabilize visible wires; full graph virtualization
would complicate workbook endpoints without evidence it is needed. No dependency was added.
Consequences: heavily connected nodes intentionally retain all connected ports. The synthetic
benchmark protects bounded DOM and navigation, but does not measure operator productivity or
replace financial-project acceptance. Backend execution and persistence are unchanged.

# ADR-096 - Registry-driven operation creation from an output

Date: 2026-09-22. Status: ACCEPTED; remaining F2 performance acceptance stays open.
Context: dropping a field onto blank canvas should offer usable operations without requiring a
separate node-add and manual wire step. This must remain ordinary editable graph configuration.
Decision: use the current saved schema and node catalog to enumerate compatible operation/input
pairs through the existing connection validator. Resolve book proxy handles before opening the
menu. Construct the chosen node and wire in one draft/history update; revalidate on selection.
For append_field, field_filter and field_sum value inputs, connect the precise table identified
by row_context when it is available. Never infer another table by matching names or row counts.
Show that rule in the menu and leave other required settings to the inspector. Respect output
capacity and declared composite public boundaries. Missing current schema disables suggestions.
Use a modal searchable chooser and an output-selection toolbar action as the keyboard alternative.
Menu cancellation and Escape during dragging create no nodes, edges or revisions. No server-side
special operations or computation shortcuts are introduced; no new API or persistence contract.
Alternatives: a separate hard-coded operation list duplicates the registry; creating a node before
selection leaves orphan drafts; wiring a convenient table can silently mix incompatible rows.

# ADR-095 - Connection hints and conservative field-path tracing

Date: 2026-09-22. Status: ACCEPTED; F2 operation menus and large-graph acceptance remain open.
Context: users need visible compatible inputs and a legible field path, including workbook
proxy ports. Stale schemas must not imply verified types, and table transformations do not yet
publish complete field-to-field lineage.
Decision: normalize workbook handles before common connection validation. While dragging from
an output, label inputs compatible/blocked/pending with a symbol and localized reason. Known
numeric, boolean and comparison constraints complement kind/context/cycle checks; the backend
remains authoritative. Missing current output schema produces a pending hint, never a green one.
Clicking an output label traces explicit wires by node/port/column ID. Continue through field
and scalar expressions, stop at a produced table. Highlight those wires and dim the others;
do not infer Join/aggregation/rename lineage. Explain this boundary in the editor. Selection,
drag and path state are local, keyboard-clearable and do not create workflow revisions.
Alternatives: tracing entire table branches could imply dependencies on unrelated fields;
using stale schemas as current would give false compatibility feedback. Full lineage inference
is not needed for this slice and is not claimed. No API, DB or execution changes.

# ADR-094 - Workbook cards project existing sheet endpoints

Date: 2026-09-22. Status: ACCEPTED; remaining F2 interaction/performance work stays open.
Context: sheets need a single visible workbook card without changing execution identities or
introducing a second graph. Migration 0008 already stores book membership and detached sheet IDs.
Decision: grouping is an explicit inspector action over Excel nodes using one source, excluding
composite-block members. React Flow renders a presentation-only workbook node. Its handles encode
the actual sheet node and output handle; incoming user connections are decoded before common
validation/saving. Saved edges always retain the real node/port/column IDs. Connected sheet ports
remain mounted when collapsed or filtered. Only the selected sheet expands unconnected fields.
Persist grouping, collapse, movement, detach/return and ungroup through ordinary revision-safe
draft/history. Dropping a sheet onto blank canvas detaches the same node; a button is available
as an alternative. Reconcile workbook membership atomically when a source changes or is deleted;
remove an empty book. Ungrouping removes presentation only, never source nodes or dashboard links.
Alternatives: copying nodes would break stable references; materializing workbook calculations
would duplicate execution; hiding all collapsed connections would obscure active dependencies.
Consequences: workbook containers can restore through existing APIs/migration. Expansion search
is page-local; collapse and detach are persistent. Composite rendering, full virtualization and
168-node usability acceptance remain separate tasks. No backend execution or database change.

# ADR-093 - Separate opt-in field UI with shared save and execution contracts

Date: 2026-09-21. Status: ACCEPTED; F2 is IN PROGRESS.
Context: the approved field interaction needs real UI authoring, while the established editor
contains extensive v1 authoring flows and must not implicitly convert existing projects.
Decision: introduce a separate mode backed by the same APIs, revision-aware autosave and bounded
history. New field workflow creates an empty v2 graph explicitly. Restore existing v2 in that
mode; isolate local drafts by editor namespace and refuse wrong-format drafts instead of upgrading
them silently. Preserve container metadata
even while this first UI renders individual members. Keep existing v1 mode and format protection.
Project column IDs into actual edge fields; handle encoding is only an interaction detail. Add
eight typed operation forms, bounded searchable field cards, drag/list connections and local A/B
preview pins. Schema query keys include parameters and revision; add parameterized POST schema.
Keep valid independent schemas in incomplete typed drafts so field selection works incrementally.
Alternatives: extending the already large classic editor risks its existing authoring flows;
separate saving/execution infrastructure would duplicate concurrency/security rules; converting
all projects would violate scope. Sampling schemas would make Pivot-dependent choices unreliable.
Consequences: the first field-calculation journey is authorable without IDs/JSON. Workbook cards,
container UI, operation-drop menus, full compatible-port highlighting, virtualization, selected
field path and final chart/dashboard acceptance remain open. A/B compares separate previews;
pin/view state is not persisted as workflow semantics. No measured operator-speed claim.

# ADR-092 - Container references saved with the workflow revision

Date: 2026-09-21. Status: ACCEPTED; container UI remains pending.
Context: book cards and composite blocks must restore without duplicating calculations, losing
dashboard node IDs or letting an older client discard their structure.
Decision: migration 0008 adds Workflow.presentation (JSON/JSONB, default {}). Typed contracts
reference real nodes/endpoints. Books bind an Excel source, used sheet nodes and detached-sheet
IDs; blocks expose input/output endpoints with optional output field projection. Validate unique
membership, single-level structure, declared ports and every crossing edge without materializing
data. Save metadata and graph in one normal CAS transaction. Omitted/null metadata preserves the
locked stored value; explicit {} unwraps it. Changed graph references must still validate.
V1 responses stay unchanged and v1 cannot submit non-null presentation. Downgrade locks and
refuses to erase containers. Existing per-node UI groups and project data are not converted.
Alternatives: UI-only storage cannot survive server/browser restoration; copying subgraphs loses
identity; new tables add unnecessary cross-table synchronization for one atomic presentation value.
Consequences: API can persist books/blocks, collapse/rename/detach/unwrap without changing graph
execution. New UI must derive boundary ports when packing, persist container edits with graph
edits and handle one undo action. Field availability is checked by schema resolution, so an
incomplete draft can retain a projected field that has become unavailable. UI acceptance is pending.

# ADR-091 - Discover dynamic fields from validated execution prefixes

Date: 2026-09-21. Status: ACCEPTED.
Context: Pivot output columns depend on values, so static-only typed preflight prevented using
the existing general operation between field calculations. Inferring columns from a preview
sample would omit categories and make wires unreliable.
Decision: validate named inputs/configuration in DAG order and execute only a DATA_DEPENDENT
node's ancestor branch to obtain the full bounded result schema. Use the common runner and
cache, with a private entry that suppresses recursive typed preflight only after the resolver
has checked the prefix. Public execution never exposes this option. Keep structural, source
access, executor and resource checks. Attribute failures to the actual failing node; validate
downstream projected IDs against the discovered schema. Used parameter values remain in cache
identities. Missing dynamic fields fail explicitly; they are not inferred by position or name.
Alternatives: a separate discovery executor duplicates calculations; sampling is incomplete;
recursive public execution repeats schema resolution indefinitely; rejecting Pivot blocks scope.
Consequences: Pivot works before/after field operations, including consecutive dynamic stages.
Static branches still infer without loading data. Discovery can execute a prefix and can fail
on its runtime errors. UNKNOWN_UNTIL_EXECUTION without a discovery contract remains unsupported.
This replaces ADR-090's temporary DATA_DEPENDENT restriction, with no API or persistence change.

# ADR-090 - Typed executors share the existing workflow engine

Date: 2026-09-21. Status: ACCEPTED; F1 remains IN PROGRESS.
Context: persisted field references need real execution and schema checking without per-wire
tables or a parallel analytical engine. Legacy transformations and current projects must survive.
Decision: TypedNodeExecutor returns named ValueSchema/ExecutionValue maps; adapt legacy Dataset
executors inside the common runner. Preflight typed branches for port kinds, logical types and
row contexts before loading data. Register constants, parameters, arithmetic, comparisons, logic,
append, mask filter and sum for format v2 only. Use the existing safe expression compiler.
Field previews materialize only the requested expression; scalar previews use a one-column
Dataset envelope. Output names/kinds are returned only for v2, preserving v1 wire snapshots.
Cache table boundaries using output/column identities and used parameter values; do not store
expression/scalar/multiple-output results in a Dataset-only cache. Recheck source access first.
Alternatives: a separate engine duplicates caching/validation; storing fields as frames loses
row context and multiplies materialization; auto-exposing nodes in v1 would lack usable forms.
Consequences: static mixed graphs work through save/schema/preview APIs. Data-dependent legacy
schemas in typed branches remain explicitly unsupported until adapted. The new editor, forms,
translations and container persistence remain unfinished; there is no automatic project upgrade.
This supersedes ADR-089's temporary FIELD_ROUTING_UNAVAILABLE guard, not its persistence policy.

# ADR-089 - Persist field projections without interpreting them as table connections

Date: 2026-09-21. Status: ACCEPTED; typed execution remains IN PROGRESS.
Context: future field wires must survive revision-aware saves and retain column identity without
encoding it in display names or port strings. New persistence must not change existing projects.
Decision: nullable WorkflowEdge.source_column_id, carried by typed API/ORM/domain contracts;
require format v2 for non-null references. Migration 0007 adds only this column. Omit null from
wire serialization so unchanged v1 snapshots remain exact. Existing edge ownership, uniqueness
and revision checks remain in force. PostgreSQL downgrade locks the table and rejects non-null
references to prevent silent semantic loss, including a concurrent save racing the check.
Validation treats a projection as FIELD and checks its source kind and graph format. Until typed
routing is integrated, schema/preview explicitly reject projected edges before executing nodes.
Alternatives: ignoring the reference would silently compute the wrong input; storing IDs in UI
metadata would make execution depend on presentation; eager conversion would alter user projects.
Consequences: field drafts can be persisted but not executed or authored in the current UI.
No automatic conversion. Presentation metadata and typed schema/executor routing are still pending.

# ADR-088 - Typed expressions, legacy output adapter and explicit format acknowledgement

Date: 2026-09-21. Status: ACCEPTED; field-editor integration IN PROGRESS.
Context: the approved editor needs real field wires without materializing one table per wire,
and must prevent clients unaware of v2 from discarding its semantics. Existing executors return
one Dataset and visualization sinks have no graph output ports.
Decision: introduce typed values with explicit row context and compose Polars expressions through
the existing safe formula compiler. Predicate syntax is opt-in; v1 syntax is unchanged. Preserve
arithmetic failure checks through downstream predicates. Apply explicit null policies at division
and boolean filtering. Use existing parameter validation for scalar defaults/types, including
typed nulls. Bound expression expansion before execution. Adapt legacy results to named table
outputs without copying frames; preserve sink Dataset previews and the existing cache budget.
WorkflowSave acknowledges format_version, defaulting to 1 for old clients. Read the persisted
format after the project lock, reject downgrade with 409, and commit explicit upgrade only with
normal revision CAS. Reject unknown v2 fields rather than silently ignoring unfinished contracts.
Alternatives: positional alignment across branches is incorrect; table-per-wire execution wastes
memory; an independent expression evaluator would duplicate typing/security rules; automatic
version propagation from GET in an old editor would falsely claim support for unseen fields.
Consequences: current UI remains a v1 editor and cannot save v2. Full typed routing, source-column
edge persistence, presentation metadata/migrations, typed preview and the new UI are unfinished.
No automatic project conversion or claim of completed new editor. See docs/FIELD_EDITOR_PLAN.md.

# ADR-087 - Retained UX acceptance copy and non-overlapping group summaries

Date: 2026-09-18. Status: ACCEPTED.
Context: U5 requires presentation changes on an independent copy of the six-screen project.
The real 168-node graph exposed P2 overlap of collapsed group cards, and the default minimum
zoom prevented fitting the graph into the canvas. Small synthetic group tests did not expose it.
Decision: retain an API-created acceptance copy after database/source-file backups. Test tooling
remaps known UUIDs and UUID-derived field references, including JSON keys and formulas; this is
not a supported general import/export API. Declare dashboard parameters before navigation.
A journal retains created IDs on failure, requiring explicit reviewed resume instead of duplicates.
Configure service selectors with the existing label-field option; numeric IDs retain their meaning.
Group nodes by downstream dashboard usage, with shared preparation in a separate group. Apply
layout and group edits through the existing UI; preserve exact computation semantics and navigation.
Compare every widget result over all 164 reference slices against the original verified project,
normalizing copy identities and workflow revision only. This is equivalence to the retained
reference project, not a new independent comparison of every metric against opop_bi source code.

Fully collapsed graphs receive a separate dependency layout with group card dimensions; visual
cycles introduced by grouping fall back to a grid. Partially collapsed graphs retain real node
positions and shift only proxies past occupied cards. Every boundary port and edge is retained.
Lower the permitted canvas zoom for Fit view. Projection never writes graph coordinates or changes
execution. Alternatives: modifying execution groups or dropping ports would violate core contracts.
Consequences: overview can be zoomed out substantially on large graphs; drill into groups for detail.
Automated acceptance is separate from the still-required human operator study (U0/U5).

# ADR-086 - Dashboard viewing and reversible layout templates

Date: 2026-09-18. Status: ACCEPTED.
Context: dashboard authoring controls obscure the analytical view, and placing each widget
manually adds repetitive work. Existing widget positions and semantic settings must survive.
Decision: mode=view is a URL presentation option, retained through selections, navigation,
reload and history. Editing remains the default. The same editor instance preserves drafts;
viewing unsaved content displays an explicit warning. View mode disables grid dragging/resizing
and hides authoring controls, while retaining filters, data, titles and transitions.
Two generic templates place KPI, charts and tables in that order. Overview uses 3/6/12-column
widths; report uses 4/12/12. Placement is deterministic and non-overlapping. A modal previews
placement; applying changes only draft positions/sizes. Standard revision-checked Save persists.
Undo restores positions/sizes, preserving later semantic edits, only while the current layout
matches the template result; membership/manual-position changes invalidate that undo.
Alternatives: separate viewer state risks draft divergence; immediate template persistence
would bypass existing save/recovery behavior. No API, database or dependency change is needed.
Consequences: this is presentation, not access control. Template undo lasts for the mounted
dashboard editor, not across reloads; ordinary session draft recovery remains available.
Human usability/speed improvements still require U0/U5 operator measurement.

# ADR-085 - Atomic navigation context fields and widget action

Date: 2026-09-18. Status: ACCEPTED; completes guided-navigation U4 work.
Context: useful row identities may exist in the visualization input but not its output. A widget
transition must not be saved separately from the fields required to execute it.
Decision: the navigation dialog offers typed input fields from matching workflow/schema/result
revisions. Selected mappings identify missing output fields. A review lists additions and all
known widget uses, with explicit acknowledgement. Existing visible fields cannot be added as
context fields (which would hide them in tables). Only missing input fields are appended to the
ordinary visualization node's context_column_ids; other settings and graph identities remain.
The additive dashboard navigation endpoint locks the project, source/target dashboards and graph,
checks all three expected revisions, validates the selected branch schema and field types,
stages graph/index changes and saves one widget action in one transaction. A late rejection rolls
back both revisions/configurations. Shared uses require acknowledgement, even for direct API calls.
UI requires a clean dashboard before the cross-resource operation. Existing-field mappings retain
the prior local-draft Apply behavior. For added fields, Save fields and transition persists both;
success installs the returned dashboard and clears its recovery snapshot. Errors retain the review;
retrying a committed operation after a lost response conflicts, and explicit reload reveals it.
Alternatives: separate workflow/dashboard writes risk broken actions; cloning calculations would
duplicate semantics. Input-field selection adds no hidden transformations or financial code.
Consequences: typed additive OpenAPI contract, no DB migration/new persistent schema. ADR-084's
manual-only context-field limitation is superseded. Preview of newly added values is available
after the atomic save, not by materializing an unsaved graph. Shared widgets receive context data
without layout/action changes. View mode/grid templates remain unfinished U4 work.

# ADR-084 - Staged widget navigation with typed suggestions and sample preview

Date: 2026-09-17. Status: ACCEPTED; first guided-navigation U4 delivery.
Context: the global widget selector forces operators to leave a widget to configure its action;
raw mappings do not expose required destination inputs or demonstrate the values being passed.
Decision: each widget opens a staged navigation dialog using the existing NavigationAction
contract. Destination inputs show types/required markers; only compatible fields/parameters
are offered. Explicit suggestions fill only uniquely matching names/types and preserve current
mappings. Missing, removed or incompatible references are visible and block application.
A sample uses the first returned row plus current dashboard values through the same
navigationValues function as actual navigation. It is an example, not validation of every row.
Apply changes only the widget action in the current recoverable dashboard draft. Cancel/Escape
confirm discarding a changed modal; unrelated title/layout edits remain intact. Dashboard save
continues to own CAS/persistence. This feature does not modify workflows or visualization config.
Alternatives: immediate saves could conflict with unrelated dashboard drafts; automatic fuzzy
matching could silently pass the wrong identity. Existing global forms remain available.
Consequences: no API/migration change. Only existing visualization result/context fields can be
mapped here. Proposing and atomically adding missing context fields across graph/dashboard
revisions remains an explicit unfinished U4 task; the dialog explains the current manual route.

# ADR-083 - Typed parameter values with separate display labels

Date: 2026-09-17. Status: ACCEPTED; fourth U4 delivery.
Context: operators need readable choices while filters/navigation retain stable IDs. Different
records may have identical names, and the selected record may be outside a limited search page.
Decision: ParameterOptions adds optional label_column_id in the existing typed JSON configuration.
The generic node-values service returns bounded value/label pairs and the explicitly requested
selected pair, while keeping the legacy values array. IDs retain their original scalar types.
Distinct identical pairs collapse; identical labels with different IDs remain separate. Null IDs
are omitted; a null/empty label displays the ID. Multiple labels (including null versus non-null)
for one ID reject the lookup before search/limit rather than choosing an arbitrary name.
Search matches literal case-insensitive text in either field, with stable value ordering.
UI labels include the ID for unambiguous duplicate names, including across limited pages.
The selected label is resolved independently of search/limit; missing values remain visible with
a warning rather than silently clearing a URL selection. Query identity includes options,
parameters, search and selected value, so late responses cannot replace current choices.
Alternatives: storing labels as filter values loses identity; choosing the first conflicting name
hides a data-preparation problem; fetching entire datasets defeats the bounded preview contract.
Consequences: OpenAPI is additive, no DB column/schema migration needed. Missing label_column_id
defaults to null for existing JSON without rewriting user projects. No analytical calculations
are introduced into dashboard presentation. Guided navigation/view mode remain U4 follow-up.

# ADR-082 - Widget links to exact workflow calculations

Date: 2026-09-17. Status: ACCEPTED; third U4 delivery.
Context: multiple workflows and collapsed node groups make finding a widget calculation slow.
Decision: widget links carry workflow and visualization-node IDs in URL query parameters.
The workflow page validates the requested workflow against the current project list before
fetching it. Missing targets show an explicit message without falling back to another graph.
The editor expands the selected node's group, opens its configuration, focuses the node and
highlights ancestors through the existing dependency view. Selection is view state and does
not write a workflow revision. Reload restores the URL target; browser Back restores dashboard
URL state and its existing session draft. Dirty dashboard navigation requires acknowledgement.
Alternatives: a workflow-only link does not locate the calculation; storing navigation state in
the graph creates unnecessary revisions. URL parameters reuse the existing browser history.
Consequences: no API or persistence changes. This opens the calculation definition; dashboard
parameter values are not copied into editor execution parameters. Existing editor parameter
controls remain explicit. ID/label selectors and guided dashboard navigation remain pending.

# ADR-081 - Atomic dashboard visualization creation and independent copies

Date: 2026-09-17. Status: ACCEPTED; second U4 delivery.
Context: separate node/widget saves can leave orphan nodes or overwrite concurrent dashboard
edits. Independent copies must change only one placement while preserving existing uses.
Decision: POST /api/v1/dashboards/{id}/visualizations takes both expected revisions, a dataset
node in a project workflow, chart type/config, and stable client node/edge/widget IDs. It locks
project then dashboard, reads the workflow, validates project ownership/input port/config and
stages an ordinary node/edge via save_graph(commit=False). DashboardService.save(commit=False)
adds a placement or changes one existing placement's visualization_id, preserving its layout,
title and action. A single outer commit covers graph, visualization index, placement and both
revisions; every exception rolls back. Existing save entrypoints retain commit=True behavior.
The caller supplies stable IDs per modal session. Replays with old revisions return 409, never
another node/widget. If a successful response is lost, explicit reload reveals the committed
operation; this is conflict-based recovery, not an idempotent success-response API.
CreateVisualizationDialog uses the existing chart form and saved schema. It selects a named
workflow result/type for creation; copy keeps the same input/type and edits a new config. Dirty
dashboards must be saved first, avoiding silent inclusion/discard of layout drafts. Atomic
success installs the returned dashboard revision and clears any clean recovery snapshot.
Failure retains the form; explicit reload discards it and loads authoritative saved state.
Alternatives: compensating deletion after two requests races widget references; independently
stored widget semantics violate the node-owned contract. A DB idempotency ledger is unnecessary
for the current synchronous single-user MVP's explicit recovery flow.
Consequences: additive OpenAPI contract, no persistent schema change/migration. Copies share
upstream calculations but own separate visualization settings. Exact-branch links, named ID
selectors, guided navigation and view mode remain U4 follow-up.


# ADR-080 - Edit saved visualization nodes from dashboard widgets

Date: 2026-09-17. Status: ACCEPTED; first U4 delivery.
Context: operators must adjust fields/formatting without switching to the canvas, while node
configuration remains the only source of truth and dashboard layout drafts remain recoverable.
Decision: each widget opens VisualizationSettingsDialog, reusing VisualizationConfiguration.
The dialog loads its workflow, input schema and saved dashboard usages. Workflow/schema revisions
must match. A single normal saveWorkflow changes only that node config with expected_revision;
other nodes, edges and parameters are retained. Dashboard/widget revisions are not written.
All saved uses are shown; multiple uses require an explicit shared-edit acknowledgement.
The list is a loading-time snapshot, not a cross-dashboard concurrency lock. Unsaved placements
are not included. Users are always told that every use of this visualization is updated.
Conflicts/network failures keep the form. Reload explicitly discards changes with confirmation;
Cancel/Escape and browser unload protect staged edits. Drafts in this modal are in memory, not
persisted across a confirmed reload. Successful writes invalidate visualization/workflow caches;
cache refresh errors cannot retry an already completed write. Existing dashboard drafts persist.
Alternative: storing widget-specific semantic copies would violate the node-owned contract.
Creating/copying a node and attaching a widget is a separate multi-resource operation and remains
next in U4, requiring atomic or explicitly recoverable workflow/dashboard saves. This delivery
does not implement independent copies, new-widget creation or exact-branch navigation.
Consequences: no API/database changes; normal revision conflicts protect concurrent workflow
editing. Shared settings apply everywhere; widget title/layout overrides remain dashboard-owned.


# ADR-079 - Inspect calculation scope without guessing formula semantics

Date: 2026-09-17. Status: ACCEPTED; second U3 delivery.
Context: the helper creates explicit nodes, but authors must inspect actual saved graphs,
including manually edited formulas and multi-input branches, to understand filtering scope.
Decision: CalculationScopePanel is available on an exact-current saved schema. Authors choose
an upstream Window or Group By node explicitly. calculation-scope walks actual edges and
classifies Filter nodes as upstream of that calculation, downstream on paths to the selected
node, or on other input branches. It displays actual field and parameter labels/identities and
opens the corresponding configuration. It does not parse formulas or guess a denominator.
Two transient highlights show calculation inputs or paths to the selected node; existing group
projection handles collapsed members. Highlights and navigation do not save revisions, and
highlight snapshots expire on graph/selection changes. Normal dependency selection clears them.
Open calculation node supports explicit reuse through existing Add next step/input controls.
No persisted semantic measure, recipe, new API, database migration or execution rule is added.
Alternative: automatically detecting denominator meaning from arbitrary arithmetic would be
incomplete and misleading. This inspector deliberately describes structural execution scope.
Consequences: arbitrary formula division is inspected by choosing its known calculation node;
Window/Group By scope is supported, and value lineage remains a separate feature. Engineering
acceptance covers scope classification, no-save highlights and full comparison branch reuse.
Human ability to explain scope and time savings still require the U0 operator study.


# ADR-078 - Share and rank authoring through ordinary nodes

Date: 2026-09-17. Status: ACCEPTED; first U3 delivery.
Context: operators must choose denominator scope and stable row ordering without manually
writing helper references, and parameter selection must not shrink totals unintentionally.
Decision: AnalyticsDialog stages a selected input, numeric value, partition fields, output
names, zero/missing denominator policy, or rank direction and tie-break field. analytics-plan
creates Window(sum) -> Calculated Column(safe_divide), or Window(row_number). An optional
compatible parameter Filter is always last. The denominator remains a named output column;
ratios are not multiplied by 100. Null fallback uses existing nullif(0, 0), zero fallback uses 0.
A missing numerator retains existing formula null semantics. Window sums ignore null values;
an all-null group has a null denominator. Negative values use ordinary arithmetic.
All rows explicitly means the selected input, not the entire workbook. Upstream Filter nodes
and their literal/parameter references are listed conservatively, including both Join inputs.
This is an explanation of existing graph dependencies, not an automatic business-scope guess.
Ranks are row positions, with primary direction and ascending tie-break; nulls sort last.
Authors must select a row identifier for deterministic ties; residual ties retain input order.
Apply uses snapshot comparison, appendUnaryChain, ordinary autosave/revisions and atomic undo.
No recipes or special backend calculations are persisted. Subsequent edits use ordinary node
forms. Comparison branches can reuse the pre-selection output by explicit graph connections.
Alternative: a special measure endpoint or invisible global filter override would break the
constructor requirement. A persisted second recipe would diverge from manual node edits.
Consequences: no API/DB changes. Denominator path highlighting and richer parameter inspection
for existing saved graphs remain U3 follow-up; operator timing remains unmeasured.


# ADR-077 - Saved-graph field provenance in formula authoring

Date: 2026-09-17. Status: ACCEPTED.
Context: source column IDs repeat across workbooks; renamed/derived fields need readable
origin labels without inventing a second expression evaluator or persisting duplicate metadata.
Decision: frontend field-provenance traces (node ID, column ID) against the exact-current
saved schema. Pass-through IDs recurse on their input, Join resolves left/right separately,
and Union aligns engine names on both inputs. New derived fields follow backend source_columns.
Excel boundaries supply uploaded filename, worksheet, original column letter and header levels.
Duplicate filenames retain source IDs. A memo and cycle/depth guards bound traversal; missing
lineage is explicit. These are value origins, not exhaustive filter/grouping dependencies.
The formula editor exposes origins in searchable options, token titles and an open details
section. Existing canonical formulas and server execution remain unchanged. Unsaved graph
origins are hidden; staged batch formulas continue to use their prior field controls and do not
claim server-validated provenance until applied and opened as ordinary nodes.
Alternative: a global field-ID map is incorrect for Join/Union. Adding persistent provenance
copies is unnecessary because saved schemas and graph ports already identify value origins.
Consequences: no API/migration change; new multi-input node types need explicit presentation
rules. Tests cover repeated IDs, duplicate filenames, rename, derived fields, Union and cycles.


# ADR-076 - Grouped Unpivot authoring and independent article labels

Date: 2026-09-17. Status: ACCEPTED; fifth U2 delivery.
Context: operators need to classify source columns into groups and label repeated articles
without merging distinct original fields or creating special financial transformations.
Decision: Unpivot v1 adds optional labels keyed by selected source field ID. Missing labels
retain source display names; supplied labels normalize whitespace and contain 1-255 characters.
Duplicate labels are allowed, but keys outside selected value fields are rejected. This changes
only field_name values; field_id, values, row count and source provenance remain unchanged.
The ordinary Unpivot form can edit/clear labels and removes stale labels when deselecting a
value field or making it an identifier. Existing configs default to an empty map.

Grouped authoring stages 1-10 uniquely named, nonempty groups. Each source value field belongs
to at most one group; common identifier fields are separate. The table previews standard
Unpivot -> Calculated Column branches and the Union nodes joining them in group order.
Group names are string constants in ordinary formulas. Unpivot already projects the requested
columns, so redundant Select/Rename steps are unnecessary. Labels do not require upstream
renaming, allowing identical article names within one group while retaining distinct IDs.

Wizard value fields must share one known logical type; explicit upstream Convert Types is
required otherwise. This conservative constraint avoids hidden Union type coercion. Existing
standalone Unpivot retains its previous numeric compatibility behavior. Identifier engine names
must not collide with field_id, field_name, value or the configurable group output name.
Whole graph construction is staged with normal port/cycle checks and snapshot-checked Apply;
autosave/history see one change. Existing consumers are not rewired. Generated nodes are the
only persisted truth and remain manually editable; no stored recipe overwrites graph edits.
Unapplied modal choices are transient with cancel/unload warnings. Resource checks remain in
ordinary executors. No schema migration, dependency or financial-specific runtime was added.
Alternative rejected: renaming columns before Unpivot cannot represent repeated labels within
a group because engine names must remain unique. A special grouped executor is unnecessary.

# ADR-075 - Preparation table compiles to standard graph operations

Date: 2026-09-16. Status: ACCEPTED; fourth U2 delivery.
Context: selection, rename, conversion and missing-value rules required separate manual setup.
Decision: stage these rules against the saved output schema in a table and preview the ordered
node list. Apply creates a new branch atomically through shared appendUnaryChain port/cycle
checks; calculated-field batching now uses the same helper. Existing consumers stay connected
to the original source until explicitly rewired. No recipe, special executor or financial logic.

Order: Select, explicit Convert Types, optional Filter(is_not_null, AND), optional fill formulas,
final Select, integer type restoration and Rename. Conversion errors stop execution by default;
null-on-error is an explicit field choice, applied before missing-value policies. Policies are
keep, drop-row, numeric zero or empty text for strings. Empty strings are not null. Filled fields
are new calculated identities; selection/rename/type conversion retain existing field IDs.
Final projection preserves source column order and removes helper columns. Temporary names
avoid input/final-name collisions. Output names are normalized and unique. Up to 1024 retained
fields and 20 fill calculations per batch; larger work can use successive ordinary steps.

Existing numeric formula outputs are Float64. Integer null replacement therefore explicitly
converts the integer field to decimal text, applies string coalesce with "0", and converts the
new result back to integer. This avoids introducing Float64 rounding into integer preparation;
regression checks exact backend output 9007199254740993 from text input. No global formula
semantics were changed. Float arithmetic keeps its existing numerical behavior.
After Apply edit generated nodes on the canvas; reopening this creation wizard uses the chosen
current output, never overwrites a prior branch from stale metadata. Staged modal rules are
transient until Apply, with cancel/unload warnings. Existing draft recovery handles applied edits.
Alternatives rejected: hidden bulk transforms or a second persisted copy of preparation rules.
No API/schema/dependency change; backend validation/execution remain authoritative.

# ADR-074 - Tabular editing of ordinary calculated-node chains

Date: 2026-09-16. Status: ACCEPTED; third U2 delivery.
Context: creating several dependent fields required repeating node creation, connection and
configuration. A separate formula table persisted beside the graph would become inconsistent.
Decision: a modal table stages up to 20 rows. Each new row receives its actual future node UUID;
stable output references use the existing calc_<UUID hex> contract. Previous row outputs are
selectable with unknown types until the backend checks the saved chain. The frontend checks
nonempty/unique normalized names and backward reference availability, never evaluates formulas
or duplicates backend type inference. Applying creates a new ordinary branch after the selected
node through the shared port/cycle checks. Existing consumers are not automatically rewired.
All nodes/edges enter graph state in one update cycle and one normal revision-checked save;
graph undo treats the action as one change. Incomplete semantic expressions remain normal
drafts and receive authoritative backend schema/preview errors after applying.

Existing chain editing is reconstructed from real consecutive Calculated Column v1 nodes,
starting at the selection, stopping at branching, non-calculated nodes or 20 rows. It edits
configuration only, preserving IDs, positions, metadata and all connections. Change structure
on the canvas; no stale recipe/hidden JSON is used to regenerate manually edited graphs.
Unapplied modal changes are transient. Cancel/Escape confirms discarding edits; browser unload
warns. Apply rejects a changed graph snapshot. After Apply, ordinary autosave/draft recovery
and conflict handling apply. No API, migration, dependency or special executor is introduced.
Alternative rejected: a multi-column runtime node would duplicate existing execution contracts;
implicit downstream rewiring/deletion could alter unrelated dashboard calculations.

# ADR-073 - Named formula presentation over canonical expressions

Date: 2026-09-15. Status: ACCEPTED; second U2 delivery.
Context: stable column references survive renaming but make formulas difficult to read, and
field insertion previously always appended at the end.
Decision: FormulaEditor renders bracket references as clickable field-name/type tokens while
retaining the canonical expression textarea for operators, functions and free text. Clicking
a token selects exactly its canonical span; field selection replaces that span or inserts at
the remembered cursor. Schema updates refresh labels without rewriting stored expressions.
Quoted strings remain opaque under the same reference-recognition pattern used by the backend.
This is presentation, not a second expression evaluator/type checker. Raw identifier formulas
remain supported and are not silently converted into stable references.
Field lookup searches display/engine names and IDs; duplicate labels include engine names and
full IDs. Missing references and unavailable schema are distinguished. Function signatures
are hints; backend compilation remains authoritative. No API/schema/dependency change.
Alternatives rejected: replacing saved IDs with names breaks rename stability; contenteditable
with embedded editable nodes adds selection/clipboard complexity to this first delivery.
Consequence: both readable tokens and canonical text remain visible. Unified rich text editing,
more detailed provenance labels and inline expression diagnostics are not claimed here.

# ADR-072 - Field-specific configuration feedback

Date: 2026-09-15. Status: ACCEPTED; first U2 delivery.
Context: empty Filter conditions exposed a Pydantic model dump, while English error rendering
returned only the top-level message and lost nested issues.
Decision: graph validation emits one INVALID_NODE_CONFIGURATION issue per invalid setting,
with node identity and a precise config path (including zero-based nested list indices).
Messages are a controlled actionable vocabulary for missing values, empty lists, excessive
length and invalid numbers, with a safe general fallback. Inputs, validation-library URLs,
model names and internal context are excluded. Frontend renders nested issues in all locales,
using translated common setting labels and one-based row positions. API paths remain exact;
unknown field segments remain visible. Execution IDs/codes and node identity remain available.
Existing GraphIssue/API shapes are sufficient; no migration or new execution behavior.
Alternative rejected: parsing Pydantic's formatted exception text in the browser is brittle
and can expose input values. Domain/executor validation messages remain a separate existing
path. Parameter and general HTTP request validation are not redefined in this change.

# ADR-071 - Presentation groups and independent editor view preferences

Date: 2026-09-15. Status: ACCEPTED.
Context: large graphs need named sections without replacing explicit executable nodes.
Decision: flat membership uses existing node.ui.group metadata. Names identify groups within
one workflow; renaming updates all members atomically through normal autosave/history.
Dissolving removes membership only. Empty groups disappear; nesting and group dragging are
not included. Expanded cards show membership; the group member list opens real node settings.
Collapsed groups are a canvas projection with synthetic, non-editable proxy nodes. Boundary
handles retain original node/port identities, including duplicate display names. Original edge
IDs and graph data remain authoritative. Proxies never enter persistence, history or execution.
Collapsing arbitrary groups does not imply that each group is a single executable DAG step.
Expand a group to edit its internal nodes or connect ports.
Collapse state and bounded panel widths are per-workflow sessionStorage view preferences,
separate from recoverable graph drafts. Reload preserves them in the same tab; they do not
create revisions or undo steps. Finder/member navigation expands a hidden member automatically.
Alternative rejected: backend subgraph executors or persisted proxy nodes would complicate
execution and risk changing calculations for a presentation-only requirement. No migration,
API change or dependency is needed. Human usability gains remain unmeasured.

# ADR-070 - Local graph history, dependency layout and dashboard-safe deletion

Date: 2026-09-15. Status: ACCEPTED.
Context: operators need to undo compound graph edits and recover a manual layout. A graph-only
undo must not cascade-delete widgets owned by separately saved dashboards.
Decision: local history stores serialized graph drafts, excluding revisions and view/execution
state. One focused text edit or drag is coalesced; new edits discard redo. Undo/redo feed the
existing serialized autosave writer, using its latest acknowledged revision and conflict handling.
History is bounded to 50 prior/future snapshots and an estimated 16 MiB UTF-16 payload including
the current snapshot; if the current snapshot alone exceeds the budget, older history is dropped.
History resets on editor remount; saved graph and recoverable draft remain persistent.
Native text-field undo retains priority over graph keyboard shortcuts.

Layout is a user-invoked left-to-right topological layering with stable ID ordering inside each
layer and measured card spacing. It changes positions only and is one undoable action. Cycles
or dangling endpoints reject layout without changing positions. No new layout dependency.
It does not promise globally minimized edge crossings; collapsed groups remain subsequent work.

Graph saves reject removing/retyping an attached visualization with VISUALIZATION_IN_USE (409)
and node attribution. Remove its widget references explicitly first. The check locks removed
visualization rows exclusively before graph writes; dashboard attachment already takes shared
locks on those rows. This prevents a concurrent attach/delete race. A blocked undo retains its
draft and can be reversed with redo. Whole-project/workflow deletion remains its separate explicit
operation. No schema migration is needed. This refines the prior cascade behavior in ADR-057.
Alternative rejected: snapshotting dashboard state in graph undo could overwrite independent
dashboard edits; silently recreating a chart node would not restore deleted widget layouts.
# ADR-069 - Readable graph authoring without changing calculation identity

Date: 2026-09-15. Status: ACCEPTED; first U1 delivery.
Context: repeated node types, unnamed input choices and disconnect-before-reconnect made
the 168-node project difficult to edit manually.
Decision: use optional node.ui.label as a presentation name, falling back to semantic title,
output name, sheet name and localized type. Cards, finder and input choices share this naming.
The label uses existing revision-protected UI JSON; no new DB structure or execution field.
Dependency highlighting traverses actual edges and dims unrelated nodes without removing them
or persisting view state. Changing selection never changes graph semantics.
Add-next-step creates one compatible single-input node and edge in one editor update; Join/Union
remain explicit multi-input operations. Input replacement validates the resulting graph with
the old input edge removed, retaining port limits and cycle checks, and saves one final graph.
Alternatives rejected: replacing field names with node labels, deleting unrelated nodes from
the displayed graph state, or saving a disconnected intermediate graph. Backend validation and
optimistic revisions remain authoritative. Grouping/layout/history and formula UX are subsequent
deliveries; human timing results are not inferred from automated tests.

# ADR-068 - Direct access to nodes in large editable graphs

Date: 2026-09-15. Status: ACCEPTED.
Context: while finishing the 165-node reference workflow, keyboard focus did not consistently
bring distant existing nodes into the visible canvas. Requiring manual panning obstructed
ordinary editing of the authored project.
Decision: provide a local searchable node picker by configured name/title, type or ID. Choosing
an entry opens its existing configuration and fits the canvas to that node. Duplicate labels
remain distinct by ID. Selection and viewport are UI state, excluded from graph persistence;
pending configuration edits survive moving to another node. No new execution/API dependency.
Alternative: changing whole-graph minimum zoom makes labels unreadable and does not address
finding a specific node. Regression uses two nodes 50000 units apart, repeated names, identity
search, an unsaved edit and unchanged positions/revision for selection-only interaction.

# ADR-067 - Explicit title templates and presentation-only selection

Date: 2026-09-15. Status: ACCEPTED.
Context: detail screens must identify their selected slice and highlight a service without
filtering out the comparison population or changing denominators.
Decision: visualization nodes optionally enable title_template and reference declared workflow
parameters with {name}. Existing literal titles retain their meaning because templates default
to disabled. Substitution accepts only declared identifiers; it does not execute expressions.
Highlight configuration pairs a stable field ID with a compatible workflow parameter. Result
metadata carries that field and value; table and chart rendering preserve row order and values.
Hidden table context retains the identifier when it is not a displayed column. Zero and false
remain valid identities, and duplicate display labels do not select unrelated records.
Alternatives rejected: implicit title interpolation, filtering the comparison chart, matching
display labels or storing selection as a graph edit. No database migration is needed because
these optional defaults live in existing node configuration JSON.
Validation: backend parameter/type/result regression, frontend duplicate-label/zero-ID test,
UI authoring and URL restoration acceptance, full application/database restart. All checks pass.

# ADR-066 - Dashboard view state and explicit drill-through

Date: 2026-09-15. Status: ACCEPTED.
Context: reference slices must reuse ordinary workflow branches, retain their global
denominators and restore selected views through browser history.
Decision: migration 0006 stores DashboardConfiguration (typed parameters, workflow bindings,
parent links) in the dashboard's revision-protected JSON. Widget config may hold a navigation
action, whose target parameter values come from an explicit result field ID, current dashboard
parameter or typed constant. Validate project ownership and declared parameter compatibility
on save; reject invalid saves atomically. Omitted configuration preserves legacy state.
URL query fields `dashboard` and JSON `parameters` own the current selection. Applying selections
or navigating never saves workflow/dashboard revisions. Missing, malformed or incompatible
values produce explicit feedback and suspend widget rendering; one widget execution error
otherwise remains isolated. Browser back/forward restores view state.

Visualization context_column_ids explicitly retain stable navigation IDs without aggregation;
tables hide these context fields from display. ECharts dataIndex maps to the original result
row, preserving repeated labels. Tables and KPI also support keyboard activation. No arbitrary
URL destinations or executable interpolation is accepted. An optional choices source references
an ordinary workflow node and field; the generic node-values endpoint returns distinct values
with a bounded page, literal search and an explicit truncation flag. It uses ordinary execution
and the same ownership/cache checks. This is selector support, never an analytical calculation.

Alternatives rejected: implicit global filtering, selecting by display label, chart-side
aggregation, storing browsing state as graph edits and silent truncation of choices.
Consequences: source fields removed after configuration yield recoverable runtime errors;
authors select choice nodes upstream of filters when all options must remain available.
Client URL integer values must be safe JavaScript integers. Existing Float64 limits remain.
Implemented by ADR-067 and the completed six-screen acceptance (docs/OPOP_CONSTRUCTOR_ACCEPTANCE.md).


# ADR-065 - Workflow parameters are execution inputs

Date: 2026-09-15. Status: ACCEPTED; workflow and dashboard slices implemented (ADR-066).
Context: detail screens need explicit filters while keeping global denominators independent.
Decision: persist up to 64 named, typed declarations/defaults on workflow (migration 0005).
The existing graph revision protects declaration changes; omitting parameters in legacy save
requests preserves them, while an explicit empty list removes them. Runtime values are request
context, never a graph save. A Filter condition selects a literal or one declared parameter.
Missing values fail only when the dependent filter executes; schemas remain available.
Supplied unknown/invalid types fail explicitly. Null overrides a default; omission uses it.
Only referenced values enter Filter cache identity; downstream inherits that identity and
independent/source branches reuse their cache. Preview/component query identity includes the
view values to discard late results. POST visualization result accepts the same typed context;
existing GET remains valid with defaults. No formula interpolation or hidden global filtering.
Alternatives rejected: mutating graph literals on navigation, including every view value in
all cache keys, and silently skipping filters when required selections are missing.
Consequences: dates use ISO strings, integers fit signed Int64, float values are finite;
saved defaults are explicit, while temporary editor preview values reset on reload. Dashboard
URL restoration and cross-workflow bindings are implemented under ADR-066.


# ADR-064 - Prepared values and presentation formats

Date: 2026-09-15. Status: ACCEPTED.
Context: reference screens require horizontal rankings, text titles as KPI values and
tables mixing counts, amounts and ratios. Decision: add orientation and column-ID-keyed
number formats to the existing workflow visualization config; allow one string row for KPI.
Ratios remain fractions and Intl formats them as percentages. Horizontal bars retain upstream
ordering. Alternatives rejected: multiplying ratios in rendering, implicit chart aggregation
or a second semantic config on widgets. Existing JSON config and default values preserve
old projects without a migration. No runtime dependency is added.
Evidence: the overview is authored through UI with ordinary nodes; independent original-code
oracle checks every displayed indicator and row. Private workbook/oracle remain outside Git.


# ADR-063 - Dashboard parity through general constructor capabilities

Date: 2026-09-14. Status: ACCEPTED; implementation and six-screen acceptance complete on 2026-09-15.
Context: the user requires replacement of six opop_bi analytical screens as proof
of the constructor, explicitly rejecting a dedicated financial backend.
Decision: all financial expressions, column mappings, totals and drill paths live
in editable project configuration. Extend common import, node and presentation
contracts; retain existing persistence, execution and visualization boundaries.
Alternative rejected: custom calculation service/template screen bypassing the graph.
Consequences: complete parity depends on parameters/navigation as well as preparation;
the original MVP remains released; the new scope is now verified in docs/OPOP_CONSTRUCTOR_ACCEPTANCE.md.

Preparation decisions: explicit header start/count with actual merged ranges; preserve
column identity and expose an optional source-row column. Ignore formatting-only tails,
reject real oversized content and missing saved formula results rather than lose data.
Source cache v3 includes layout; validate ownership/artifact availability before cache hits.
Strict Convert Types is default; loss-to-null is an explicit author choice. String
dates accept ISO YYYY-MM-DD and datetimes YYYY-MM-DDTHH:MM:SS. Fractional floats do not
silently truncate to integers. Generic nullif is added alongside the planned functions
because blank-but-non-null class labels require an explicit empty-string policy.
Unpivot keeps field IDs separate from names. Window row numbering follows explicit
sort keys, stable input order for ties; reference graphs must include source-row tie keys.
No runtime dependency or database migration is required for these preparation changes.

## ADR-062 — Persistent light/dark presentation themes

Date: 2026-09-14. Status: Accepted.
Context: the product owner requested a light theme in addition to the existing dark interface.
Decision: shared CSS color tokens, an explicit theme selector and a server-read preference cookie.
Dark remains the default. Native controls follow color-scheme; React Flow and ECharts receive
the corresponding theme. Keep theme-independent graph/dashboard state and cache keys.
Reasoning: light surfaces need readable foreground/action/error colors, including canvas renderers.
Alternatives: CSS inversion distorts charts; separate page styles duplicate presentation logic;
system-following mode was not requested. No new runtime dependency is needed.
Consequences: new UI should use semantic palette tokens. The two themes require browser/visual
checks, including switching with unsaved drafts. Cookies persist choice without data migrations.

## ADR-061 — Russian, English and Tatar presentation layer

Date: 2026-09-11. Status: Accepted. Supersedes PRODUCT_SPEC section 78's English-only recommendation.
Context: the product owner explicitly requested Russian as the primary language plus English and Tatar.
Decision: use a shared source-key catalog, a React locale provider and a server-read preference cookie.
Translate navigation, controls, node metadata and error presentation; preserve all user content and
machine identifiers. Use Intl formatting for numeric/date presentation, with UTC for dates.
Reasoning: changing locale must preserve active editors, unsaved drafts and the meaning of saved data.
Alternatives: URL-prefixed routing adds navigation/remount risk with no requirement for translated
URLs; a full i18n framework adds a dependency unnecessary for this catalog; DOM text replacement
cannot safely distinguish user data, translated labels and accessible controls.
Consequences: dictionaries require complete Russian/Tatar entries and placeholder parity checks.
API errors remain stable transport contracts and are localized at the UI boundary. Unknown codes
receive a translated fallback with diagnostics; new domain messages should extend the catalog.

## 1. Purpose

This file records significant architectural and product decisions for Node BI.

Use it for decisions that materially affect:

* system architecture;
* persistent data model;
* workflow semantics;
* execution behavior;
* security boundaries;
* major technology choices;
* long-term compatibility.

Do not use this file for trivial implementation details.

Each decision should contain:

* ID;
* Status;
* Context;
* Decision;
* Reasoning;
* Alternatives;
* Consequences.

Possible statuses:

* `ACCEPTED`
* `PROPOSED`
* `SUPERSEDED`
* `REJECTED`

---

# ADR-001 — Use a Modular Monolith

Status:

`ACCEPTED`

## Context

The MVP contains several logical subsystems:

* projects;
* data sources;
* workflows;
* execution;
* visualizations;
* dashboards.

Splitting these into separate network services would increase operational complexity without providing meaningful MVP value.

## Decision

Implement the backend as a modular monolith.

Logical modules should remain separated internally, but they run within one backend application.

## Reasoning

Benefits:

* simpler local development;
* easier deployment;
* simpler database transactions;
* lower operational overhead;
* easier debugging;
* faster iteration;
* architectural boundaries can still be preserved.

## Alternatives

### Microservices

Rejected for MVP.

Reasons:

* unnecessary network boundaries;
* distributed transactions;
* additional deployment complexity;
* slower development.

### Single unstructured application module

Rejected.

Reason:

Would make future growth and subsystem testing difficult.

## Consequences

The codebase must preserve clear internal module boundaries even though it deploys as one backend service.

---

# ADR-002 — Backend Owns Data Execution

Status:

`ACCEPTED`

## Context

The frontend contains a node editor and data previews.

It would be technically possible to execute some transformations directly in JavaScript.

## Decision

All authoritative dataset transformations execute on the backend.

The frontend edits workflow configuration and renders results.

## Reasoning

This provides:

* one execution model;
* deterministic behavior;
* better handling of larger datasets;
* easier testing;
* stronger security boundaries;
* simpler future support for SQL and other data sources.

## Alternatives

### Frontend execution

Rejected as the authoritative model.

Lightweight presentation-only transformation remains allowed.

### Hybrid arbitrary execution

Rejected because it would create inconsistent semantics between frontend and backend.

## Consequences

React components must never become the primary implementation of Filter, Join, GroupBy, Formula, or similar transformations.

---

# ADR-003 — PostgreSQL for Persistent Product State

Status:

`ACCEPTED`

## Context

The application requires persistence for:

* projects;
* source metadata;
* workflows;
* nodes;
* edges;
* visualizations;
* dashboards.

## Decision

Use PostgreSQL as the primary persistent relational database.

## Reasoning

PostgreSQL provides:

* strong relational integrity;
* transactions;
* JSONB for flexible node config;
* mature tooling;
* reliable migrations;
* future scalability.

## Alternatives

### SQLite

Considered for a prototype, rejected as the primary MVP architecture because PostgreSQL better matches the intended future deployment model.

### Document database

Rejected because much of the application state is relational.

## Consequences

Development environment must include PostgreSQL.

All persistent schema changes must use Alembic migrations.

---

# ADR-004 — Uploaded Files Live Outside PostgreSQL

Status:

`ACCEPTED`

## Context

Excel workbooks are potentially large binary files.

## Decision

Store uploaded files in file/object storage.

Store only metadata and storage references in PostgreSQL.

## Reasoning

This avoids:

* database bloat;
* inefficient binary handling;
* coupling storage to relational persistence.

## Alternatives

### PostgreSQL bytea

Rejected for normal workbook storage.

## Consequences

A `StorageProvider` abstraction is mandatory.

---

# ADR-005 — Local StorageProvider for MVP

Status:

`ACCEPTED`

## Context

The MVP needs persistent workbook storage but does not require cloud infrastructure.

## Decision

Use a local filesystem implementation of `StorageProvider`.

## Reasoning

Benefits:

* simplest local deployment;
* easy Docker volume persistence;
* no cloud credentials;
* fast development.

## Alternatives

### S3

Deferred.

### MinIO

Deferred unless object-storage compatibility becomes necessary during development.

## Consequences

Application logic must access files through `StorageProvider`, not raw filesystem paths.

---

# ADR-006 — Polars as Primary DataFrame Engine

Status:

`ACCEPTED`

## Context

Node BI needs dataframe-style operations for Excel-scale analytics.

Required operations include:

* selection;
* filtering;
* sorting;
* calculated columns;
* grouping;
* joins;
* unions;
* pivots.

## Decision

Use Polars as the primary dataframe execution engine.

## Reasoning

Polars provides:

* strong performance;
* vectorized execution;
* expressive transformations;
* suitable typed dataframe semantics;
* good fit for backend analytical pipelines.

## Alternatives

### Pandas

Considered but not selected as the primary engine.

Reason:

Polars provides a stronger performance baseline and clearer expression-oriented execution model.

### DuckDB only

Not selected as the sole engine because dataframe-native node execution is useful.

## Consequences

Domain types must remain independent of Polars-specific types.

---

# ADR-007 — DuckDB Is Optional and Complementary

Status:

`ACCEPTED`

## Context

DuckDB can simplify some analytical workloads.

## Decision

DuckDB may be used where it materially improves or simplifies execution, but Polars remains the default engine.

## Reasoning

Avoid premature complexity from switching between engines.

## Alternatives

### Mandatory DuckDB execution layer

Rejected for MVP.

## Consequences

Individual nodes should not arbitrarily mix Polars and DuckDB.

Any significant DuckDB usage should have a concrete reason.

---

# ADR-008 — Workflow Is Persisted as Explicit DAG

Status:

`ACCEPTED`

## Context

The core user interaction is a node graph.

## Decision

Persist workflows as:

* node instances;
* directed edges;
* explicit ports;
* node versions.

## Reasoning

This preserves:

* graph structure;
* visual positions;
* multiple-input support;
* future extensibility;
* deterministic execution planning.

## Alternatives

### Persist generated code or SQL only

Rejected.

The visual graph itself is first-class product state.

## Consequences

Backend must validate the graph as a DAG.

---

# ADR-009 — Backend Graph Validation Is Authoritative

Status:

`ACCEPTED`

## Context

React Flow can perform local connection validation.

However, frontend checks can be bypassed.

## Decision

Frontend may provide immediate validation feedback, but backend graph validation is authoritative.

## Reasoning

This protects:

* execution correctness;
* persisted graph integrity;
* API clients other than the main UI.

## Alternatives

Frontend-only validation rejected.

## Consequences

Backend must independently validate every workflow before execution.

---

# ADR-010 — Node Types Use Registry + Executor Contracts

Status:

`ACCEPTED`

## Context

The MVP already requires many node types and future versions may add many more.

## Decision

Implement node behavior through:

* `NodeDefinition`;
* `NodeRegistry`;
* `NodeExecutor`.

Avoid central node-type switch statements.

## Reasoning

Benefits:

* extensibility;
* isolated tests;
* version-aware lookup;
* clear contracts;
* reduced coupling.

## Alternatives

### Large conditional execution service

Rejected.

## Consequences

Every executable node must register a definition and executor.

---

# ADR-011 — Node Versions Are Persisted

Status:

`ACCEPTED`

## Context

Node semantics may evolve after users have saved workflows.

## Decision

Every persisted node contains a node version.

Node registry lookup uses:

`node_type + node_version`

## Reasoning

Without versioning, future behavior changes could silently reinterpret old workflows.

## Alternatives

Versionless nodes rejected.

## Consequences

Full migration support is not required in MVP, but version identity must exist from the beginning.

---

# ADR-012 — Dataset Is Source-Independent

Status:

`ACCEPTED`

## Context

Excel is only the first data source.

## Decision

Downstream transformation nodes operate on a generic `Dataset` abstraction rather than Excel-specific objects.

## Reasoning

This allows future sources such as:

* CSV;
* PostgreSQL;
* APIs;

without rewriting transformations.

## Alternatives

Passing worksheet-specific objects through the graph rejected.

## Consequences

Excel parsing ends at the source adapter boundary.

---

# ADR-013 — Explicit Logical Schema Layer

Status:

`ACCEPTED`

## Context

Raw Polars or Excel types are not suitable as the product-level type system.

## Decision

Use engine-independent logical types:

* STRING;
* INTEGER;
* FLOAT;
* BOOLEAN;
* DATE;
* DATETIME;
* UNKNOWN.

## Reasoning

This supports:

* UI controls;
* validation;
* future execution engines;
* predictable API contracts.

## Alternatives

Expose Polars dtypes directly.

Rejected.

## Consequences

Mapping between physical and logical types is required.

---

# ADR-014 — Schema Propagation Is First-Class

Status:

`ACCEPTED`

## Context

Node configuration depends heavily on upstream fields.

## Decision

Each compatible node implements output schema inference.

Schema propagation runs through the graph independently of full execution where possible.

## Reasoning

Benefits:

* early errors;
* field selectors;
* type-aware configuration;
* better UX;
* less wasted execution.

## Alternatives

Infer schemas only after running data.

Rejected as the general model.

## Consequences

Some nodes may declare data-dependent schema.

---

# ADR-015 — Support Data-Dependent Schema

Status:

`ACCEPTED`

## Context

Some operations such as Pivot may generate output columns from actual values.

## Decision

Node definitions may declare one of:

* `STATIC`
* `DATA_DEPENDENT`
* `UNKNOWN_UNTIL_EXECUTION`

schema modes.

## Reasoning

Pretending every node has statically inferable output would create incorrect contracts.

## Alternatives

Require static inference for every node.

Rejected.

## Consequences

Frontend must gracefully handle temporarily unavailable downstream schema.

---

# ADR-016 — Visualization Config Is Semantic

Status:

`ACCEPTED`

## Context

ECharts configuration is renderer-specific and can be verbose.

## Decision

Persist semantic visualization configuration rather than generated ECharts internals.

Example:

* chart type;
* x field;
* y field;
* title;
* formatting.

Frontend converts this semantic configuration into ECharts options.

## Reasoning

This preserves:

* renderer independence;
* easier persistence;
* easier migrations;
* cleaner product model.

## Alternatives

Persist ECharts option JSON as the product model.

Rejected.

## Consequences

An ECharts adapter layer is required in frontend.

---

# ADR-017 — Visualization Is Not a General Transformation Layer

Status:

`ACCEPTED`

## Context

BI tools often allow charts to hide aggregation and transformation logic.

## Decision

Reusable analytical transformations belong in transformation nodes.

Visualization nodes should remain primarily concerned with encoding and rendering prepared data.

## Reasoning

This keeps workflows transparent.

## Alternatives

Allow arbitrary transformation pipelines inside each chart.

Rejected for MVP.

## Consequences

Some simple visualization-specific aggregation may be allowed only when explicitly documented.

---

# ADR-018 — Single-User MVP

Status:

`ACCEPTED`

## Context

Authentication and multi-user permissions would significantly expand scope.

## Decision

The MVP operates without mandatory user authentication and may assume a single user.

## Reasoning

This keeps focus on validating the core BI workflow.

## Alternatives

Build authentication first.

Rejected for MVP.

## Consequences

Architecture should preserve future ownership boundaries but no current authorization system is required.

---

# ADR-019 — Modular Frontend by Product Feature

Status:

`ACCEPTED`

## Context

A large UI organized only by generic component type can become difficult to navigate.

## Decision

Organize major frontend code by product feature:

* projects;
* data-sources;
* workflow;
* visualizations;
* dashboards.

Shared primitives remain separate.

## Reasoning

This aligns code structure with product boundaries.

## Alternatives

Flat global component hierarchy.

Rejected.

---

# ADR-020 — TanStack Query for Server State

Status:

`ACCEPTED`

## Context

The frontend needs caching and synchronization of backend state.

## Decision

Use TanStack Query for remote/server state.

## Reasoning

It provides:

* loading state;
* caching;
* invalidation;
* retry;
* async lifecycle management.

## Alternatives

Store all API data manually in Zustand.

Rejected.

## Consequences

Do not duplicate full server resources into global client state without reason.

---

# ADR-021 — Zustand for Interactive Editor State

Status:

`ACCEPTED`

## Context

React Flow and dashboard editing require transient client-side state.

## Decision

Use Zustand where appropriate for editor-local interaction state.

Examples:

* selected node;
* open panel;
* temporary graph edits;
* viewport state.

## Alternatives

Use Zustand as the primary persistence model.

Rejected.

## Consequences

Persisted workflow state remains server-backed.

---

# ADR-022 — React Flow for Workflow Editor

Status:

`ACCEPTED`

## Context

The product requires a node-based visual graph editor.

## Decision

Use React Flow as the workflow editor foundation.

## Reasoning

It provides mature support for:

* nodes;
* edges;
* ports;
* zoom;
* pan;
* drag;
* custom node rendering.

## Alternatives

Custom graph editor from scratch.

Rejected for MVP.

## Consequences

Backend graph contracts must remain independent of React Flow internals.

---

# ADR-023 — ECharts for Visualization Rendering

Status:

`ACCEPTED`

## Context

The MVP requires several chart types.

## Decision

Use Apache ECharts for chart rendering.

## Reasoning

It supports:

* bar;
* line;
* area;
* pie;
* scatter;
* responsive rendering;
* rich future customization.

## Alternatives

Chart.js, Recharts, Vega.

Not selected for initial implementation.

## Consequences

Use an adapter from semantic visualization config to ECharts configuration.

---

# ADR-024 — Debounced Workflow Autosave

Status:

`ACCEPTED`

## Context

Users should not lose graph edits but explicit save-only workflows create friction.

## Decision

Use debounced autosave for workflow graph changes.

Expose save state to the user.

Possible states:

* Saved
* Saving
* Unsaved
* Save failed

## Reasoning

This provides a smoother editing experience while retaining persistence clarity.

## Alternatives

Explicit Save only.

Not selected as default.

## Consequences

Autosave failure must be visible.

---

# ADR-025 — Original Uploaded Files Are Immutable

Status:

`ACCEPTED`

## Context

Cache and reproducibility depend on source identity.

## Decision

An uploaded source artifact is immutable.

Replacing a workbook creates a new source or explicit future source version.

## Reasoning

This avoids hidden mutation of workflow inputs.

## Alternatives

Overwrite files in place while keeping same source identity.

Rejected.

## Consequences

Cache keys can safely depend on source identity.

---

# ADR-026 — Cache Is Disposable

Status:

`ACCEPTED`

## Context

Execution caching improves responsiveness.

## Decision

Cached analytical results are never authoritative persistent product state.

## Reasoning

A cache may be deleted without losing projects or workflow definitions.

## Alternatives

Persist essential workflow output only in cache.

Rejected.

## Consequences

All results must be reproducible from source + configuration.

---

# ADR-027 — Synchronous Execution for Initial MVP

Status:

`ACCEPTED`

## Context

Introducing queues and workers would increase infrastructure complexity.

## Decision

Initial workflow preview and execution may run synchronously through the backend API.

## Reasoning

Appropriate for workbook-scale MVP workloads.

## Alternatives

Celery/RQ/worker queue from day one.

Deferred.

## Consequences

ExecutionService must remain isolated enough to move behind a job queue later.

---

# ADR-028 — REST API Under `/api/v1`

Status:

`ACCEPTED`

## Context

Frontend and backend require stable application contracts.

## Decision

Expose REST-style endpoints under:

`/api/v1`

## Reasoning

Simple, explicit, suitable for MVP.

## Alternatives

GraphQL.

Rejected for MVP.

## Consequences

Breaking API behavior should require deliberate versioning or coordinated migration.

---

# ADR-029 — JSONB for Flexible Configuration, Relational Columns for Relationships

Status:

`ACCEPTED`

## Context

Node configurations vary substantially by node type.

## Decision

Use JSONB for flexible configuration such as:

* node config;
* visualization config;
* source metadata.

Use relational fields for stable identity and relationships.

## Reasoning

This provides flexibility without sacrificing relational integrity.

## Alternatives

Store entire project as one JSON document.

Rejected.

## Consequences

Pydantic/domain validation must enforce JSONB structure.

---

# ADR-030 — Whole-Workflow Save Is Acceptable for MVP

Status:

`ACCEPTED`

## Context

Graph editing may generate frequent changes to nodes and edges.

## Decision

A complete workflow graph may be persisted using a whole-workflow PUT/update operation.

The backend should apply it atomically.

## Reasoning

This is simpler than exposing a large number of fine-grained mutation endpoints.

## Alternatives

One API call per node/edge mutation.

Deferred.

## Consequences

Workflow save must use transaction boundaries and prevent partial graph state.

---

# ADR-031 — Source Deletion Is Blocked When Referenced

Status:

`ACCEPTED`

## Context

Deleting an Excel source could silently break workflows.

## Decision

Prevent deletion of a source while active workflow nodes reference it.

## Reasoning

Safer and more understandable than cascading workflow deletion.

## Alternatives

Cascade delete all dependent nodes.

Rejected for MVP.

## Consequences

API must provide a dependency error.

---

# ADR-032 — Formula Execution Must Use Safe Parsed Expressions

Status:

`ACCEPTED`

## Context

Calculated Column accepts user-defined expressions.

## Decision

Expressions must be parsed into an allowlisted representation and compiled into safe dataframe operations.

Never use:

* `eval`;
* `exec`;
* arbitrary Python callables;
* arbitrary JavaScript execution.

## Reasoning

Formula input is an untrusted execution boundary.

## Alternatives

Python expression evaluation.

Rejected for security reasons.

## Consequences

A formula parser or safe expression library must be selected before Calculated Column implementation.

---

# ADR-033 — Table and Preview Results Are Bounded

Status:

`ACCEPTED`

## Context

Large datasets should not be transmitted wholesale to the browser.

## Decision

Preview and table APIs enforce server-side row limits.

## Reasoning

Protects:

* browser responsiveness;
* backend memory;
* network usage.

## Alternatives

Frontend-only limiting.

Rejected.

## Consequences

APIs must clearly indicate preview semantics.

---

# ADR-034 — Chart Point Counts Are Bounded

Status:

`ACCEPTED`

## Context

Sending extremely large chart datasets to the browser can make the UI unusable.

## Decision

Visualization data responses must have configurable point limits.

The system must not silently perform arbitrary aggregation solely to satisfy the limit.

## Reasoning

Correctness and transparency are more important than silently changing analytical meaning.

## Consequences

The product may return:

* warning;
* validation message;
* request for upstream aggregation.

---

# ADR-035 — Original Source Data Is Never Mutated

Status:

`ACCEPTED`

## Context

Transformations must be reproducible.

## Decision

All transformation nodes produce new logical dataset results.

Uploaded workbook source artifacts remain unchanged.

## Consequences

Workflow execution is conceptually immutable.

---

# ADR-036 — Dashboard Stores Logical Grid Layout

Status:

`ACCEPTED`

## Context

Pixel-position persistence is brittle across viewport sizes.

## Decision

Dashboard widgets persist logical grid values:

* x;
* y;
* width;
* height.

## Reasoning

This integrates naturally with grid layout libraries and supports future responsiveness.

## Alternatives

Absolute CSS pixel coordinates.

Rejected.

---

# ADR-037 — One Failed Dashboard Widget Must Not Break the Dashboard

Status:

`ACCEPTED`

## Context

Different visualizations may depend on different workflow branches.

## Decision

Dashboard widgets have independent loading and error states.

## Reasoning

Partial failure should not make unrelated analytical results unavailable.

## Consequences

Dashboard execution and rendering must isolate widget failures.

---

# ADR-038 — Structured API Errors

Status:

`ACCEPTED`

## Context

The frontend needs actionable error handling.

## Decision

Backend errors should follow a structured contract containing at least:

* code;
* message;
* optional details.

Node-related errors should include node identity when available.

## Reasoning

Parsing arbitrary text errors is fragile.

## Consequences

Domain errors must map consistently into API responses.

---

# ADR-039 — Deterministic Acceptance Fixtures

Status:

`ACCEPTED`

## Context

End-to-end BI correctness is difficult to test without known data.

## Decision

Maintain deterministic Excel fixtures inside the repository.

At minimum:

`sales.xlsx`

with known expected analytical outputs.

## Reasoning

This allows repeatable:

* executor tests;
* API tests;
* E2E tests;
* release acceptance.

## Consequences

Fixture data should be small enough for source control and rich enough for edge cases.

---

# ADR-040 — MVP Is a Desktop-First Web Application

Status:

`ACCEPTED`

## Context

Node editing is inherently spatial and difficult on small screens.

## Decision

Optimize the MVP for desktop-sized browsers.

## Reasoning

This keeps interaction quality high without creating a separate mobile UX.

## Alternatives

Full mobile workflow editing.

Deferred.

---

# Pending Decisions

The following decisions must be resolved before the associated implementation becomes deeply coupled.

---

# ADR-041 — Column Identity Strategy

Status:

`ACCEPTED`

Required before:

M5 completion.

## Context

Excel may contain:

* duplicate headers;
* blank headers;
* renamed columns.

Relying only on display names is unsafe.

## Decision

Represent each field with:

* stable `column_id`;
* user-facing `display_name`;
* engine-safe `engine_name`.

Node configs should reference stable column identity where practical.

Source column IDs are positional (`col_1`, `col_2`, ...) and scoped by the dataset schema. They are deterministic for an immutable source worksheet. Rename operations preserve `column_id` while changing display and engine names. Duplicate display labels receive deterministic `__N` engine-name suffixes and blank labels become `Column N`.

Join preserves lineage identity internally and assigns deterministic collision-safe output identities. Pivot-generated columns derive identity from their normalized pivot value and producing node identity.

## Consequences

Column IDs are not globally meaningful without their dataset/schema context. Replacing or structurally editing an uploaded workbook creates a new immutable source and may invalidate dependent configuration.

---

# ADR-042 - Formula Parser Implementation

Date: 2026-09-10. Status: ACCEPTED.

Context: Calculated Column needs arithmetic with predictable types and no host-code execution.
Decision: parse with Python ast in expression mode, then visit an explicit allowlist and
construct Polars expressions directly. No eval, exec, Python bytecode compilation,
functions, attributes, subscripts, imports or runtime name lookup are permitted.
Supported syntax: numeric constants, fields, +, -, *, /, unary signs and parentheses.
Bare identifiers refer to engine names; [column_id] references survive field renaming.
Limit input to 4096 characters, 256 syntax nodes and 64 levels of visitor depth.
Schema inference and execution share the same compiler. Numeric arithmetic uses Float64;
nulls propagate, non-finite results fail explicitly with node attribution.

Alternatives: a custom tokenizer/parser duplicates tested parsing infrastructure;
third-party expression engines add unnecessary execution capabilities and dependencies.
Consequences: floating point precision applies, including integer inputs above 2^53.
This is not a decimal accounting engine. Additional functions require explicit contracts
and security tests. Validation and adversarial cases are in test_arithmetic_nodes.py.

---

# ADR-043 - Visualization persistence

Date: 2026-09-10. Status: ACCEPTED.
Context: a visualization is both a terminal workflow node and a reusable dashboard reference.
Decision: workflow node configuration is the sole source of semantic chart settings.
Visualization rows form a project-scoped index synchronized in the graph-save transaction;
the row ID equals its node ID. Its config stays empty; type/name are derived index metadata.
Deleting a visualization node deletes its index and dashboard widgets; deleting an upstream
node leaves the visualization editable with an explicit missing-input error.
A visualization result is prepared Dataset plus a typed rendering specification returned
by the presentation service. Terminal visualization nodes expose no downstream ports.
KPI accepts exactly one prepared row. Bar charts accept at most 2000 rows and reject larger
results explicitly. Aggregation belongs upstream; the chart never silently truncates totals.
Alternatives: independent chart settings on both rows and nodes drift; dashboard-only charts
break the documented node-based journey. Consequence: chart edits use workflow revisions.

# ADR-044 - Dashboard grid and persistence

Date: 2026-09-10. Status: ACCEPTED.
Decision: react-grid-layout 2.2.4 with its typed v2 API handles drag/resize on a 12-column grid.
Persist widget visualization references and integer x/y/width/height. Each widget loads its
own visualization result so a broken chart does not block the rest of the dashboard.
Dashboard saves require an expected revision, just as workflow saves do. Layout editing
keeps a local draft and explicit save/retry rather than silently overwriting concurrent work.
Alternatives: custom pointer/resize geometry adds unnecessary browser behavior to maintain;
CSS grid alone cannot provide drag/resize. No chart configuration is copied into widgets.
Reference: https://github.com/react-grid-layout/react-grid-layout (v2 API checked 2026-09-10).

---

# ADR-045 — Initial Execution Cache Implementation

Status:

`SUPERSEDED BY ADR-052`

Required before:

M9 completion.

## Decision

Use a thread-safe, in-process LRU cache bounded to 32 dataset results initially.

Cache identity should incorporate:

* node type/version;
* node config;
* upstream result identity;
* source identity.

Keys are content-addressed SHA-256 values. A downstream key includes its upstream keys, so changing a source, node version, or configuration makes the affected node and all descendants miss the cache without maintaining a separate invalidation graph.

## Reasoning

Preview execution is synchronous and process-local for the MVP. A small bounded cache avoids repeated workbook loading while remaining simple, disposable, and independent from persistent product correctness. Content-addressed descendant invalidation is deterministic and avoids stale results caused by mutable invalidation bookkeeping.

## Alternatives

Temporary filesystem caching was rejected initially because Dataset serialization and cleanup add complexity before measured memory pressure exists.

Redis is deferred until multiple backend processes or distributed workers create a demonstrated need.

## Consequences

Cache entries do not survive restart and do not need to. Capacity is counted by result count rather than bytes; memory behavior must be measured during QA, and the capacity or implementation must be revised if workbook-sized datasets make this unsafe.

---

# ADR-046 — Excel Worksheet Loading Strategy

Status:

`ACCEPTED`

Required before:

M4/M5 completion.

## Context

openpyxl is suitable for workbook metadata but may not be ideal as the only path for dataframe loading.

## Decision

Use openpyxl in `read_only`, `data_only` mode with VBA preservation disabled for workbook inspection and bounded preview. The first worksheet row is the header. Empty and duplicate labels are normalized according to ADR-041.

Preview type inference examines the bounded returned rows. Nullability therefore means “nullable in the inspected sample,” not a full-workbook guarantee. Numeric mixtures become float; incompatible mixed types fall back to string. Dates and datetimes are serialized as ISO 8601 values.

Full execution loading converts worksheet values through the source-independent Dataset layer into Polars. It must preserve the same header identities and may perform broader type validation than preview inference.

Macros are never retained or executed. `.xlsm` is accepted only as an inert data container.

## Consequences

Inspection remains bounded in memory where openpyxl supports streaming. Downstream code does not receive openpyxl worksheet objects.

---

# ADR-047 — API Type Synchronization

Status:

`ACCEPTED; implementation specified by ADR-053`

Required before:

large frontend API surface.

## Context

Pydantic backend models and TypeScript frontend models can drift.

## Proposed Direction

Generate or synchronize TypeScript API types from FastAPI OpenAPI schema.

## Alternatives

Manually duplicated types.

Acceptable only temporarily during bootstrap.

## Required Decision

Choose exact tooling based on frontend build setup.

---

# ADR-048 — Optimistic Concurrency for Workflow Saves

Status:

`ACCEPTED; implementation specified by ADR-050`

Required before:

autosave hardening.

## Context

Even single-user applications can experience overlapping autosave requests.

## Proposed Direction

Add a workflow revision integer.

Client sends expected revision when saving.

Backend rejects stale writes.

## Alternative

Rely solely on request ordering.

## Required Decision

Evaluate implementation complexity before M14.

---

# ADR-049 — Persist Incomplete Workflow Drafts

Status:

`ACCEPTED`

## Context

The editor exposes explicit unconfigured and invalid node states. Requiring every node configuration to pass its complete execution schema before saving makes it impossible to persist a node while the user is still connecting and configuring it.

## Decision

Workflow persistence validates node type/version identity, graph references, and persistence integrity, but permits incomplete configuration for registered node types. Full configuration, port, schema, and DAG validation remains authoritative before schema-dependent use and every execution.

## Reasoning

Incomplete graphs are legitimate editable project state, not executable graphs. Preserving them prevents autosave races and data loss while maintaining the backend execution safety boundary.

## Alternatives

Rejecting incomplete graphs on save was rejected because it conflicts with the documented unconfigured node state and makes normal multi-step editing unreliable. Storing drafts only in the browser was rejected because expected project state must survive reload and restart.

## Consequences

Successfully persisted does not mean executable. Schema and preview APIs must return structured validation issues, and the UI must visibly distinguish saved drafts from valid executable workflows. Unknown node types remain rejected at persistence time.

---

# Decision Update Rules

When creating a new ADR:

1. choose the next sequential ID;
2. describe the real problem;
3. record current status;
4. explain selected decision;
5. include meaningful alternatives;
6. document consequences.

When a decision changes:

Do not silently edit history.

Instead:

* mark original ADR `SUPERSEDED`;
* reference the replacement ADR.

Example:

```text id="6fkjbi"
ADR-007

Status:
SUPERSEDED BY ADR-052
```

---

# Current Decision Summary

Accepted architectural foundations:

* modular monolith;
* backend-authoritative execution;
* PostgreSQL persistence;
* external workbook storage;
* local StorageProvider for MVP;
* Polars primary dataframe engine;
* explicit workflow DAG;
* node registry/executor architecture;
* source-independent Dataset abstraction;
* logical schema layer;
* schema propagation;
* semantic visualization configuration;
* React Flow editor;
* ECharts renderer;
* single-user MVP;
* bounded previews;
* safe formula parsing;
* synchronous initial execution;
* REST `/api/v1`;
* debounced autosave;
* deterministic test fixtures.

Major pending decisions:

No architectural decisions remain pending for the required MVP. M11 is specified in ADR-056;
complete visualization/recovery/reference contracts are in ADR-057 through ADR-060.

Review disposition and remaining limitations for ADR-001 through ADR-049 are recorded in
`docs/ARCHITECTURE_REVIEW.md`.

# ADR-050 — Workflow ownership and optimistic revision checks

Date: 2026-09-09. Status: ACCEPTED.

Context: merge-by-global-ID could move another workflow's node. `version` mixed
format identity with an edit counter. Serialized browser requests alone cannot
protect against two tabs/processes.

Decision: reject foreign node/edge IDs before mutation; insert new rows rather than
merging unknown IDs. Keep `version=1` as the format, add `revision`, and require
`expected_revision` for saves. An atomic conditional update returns 409 on conflict.
Migration 0002 preserves the previous counter as revision and resets format to 1.
Schema and preview responses identify the revision they represent.

Alternatives: request ordering alone does not protect other writers; resetting all
existing projects is unnecessary. Consequence: save API clients must send revisions.

# ADR-051 — Explicit Excel conversion and collision-safe column names

Date: 2026-09-09. Status: ACCEPTED.

Context: generated suffixes collided with literal Excel headers; Polars inferred
only an initial row prefix and failed on later mixed values.

Decision: reserve input labels before assigning suffixes, keep positional column
IDs, infer each complete input column, normalize mixed values to strings and build
typed Series. Nulls remain null; temporal strings use ISO representation. Source
preview inference remains explicitly sample-based; execution schema examines the
whole permitted worksheet. Column identity/lineage principles in ADR-041 remain.

Alternatives: increasing a sampling prefix still misses later values; silently
dropping incompatible values corrupts analytical input. Consequence: first source
materialization scans the complete worksheet subject to explicit resource limits.

# ADR-052 — Project-scoped source access and bounded reusable cache

Date: 2026-09-09. Status: ACCEPTED. Supersedes ADR-045.

Decision: ExecutionContext uses SourceAccess rather than SQLAlchemy Session or ORM
entities. ProjectSourceAccess adapts persistence/storage and reuses immutable sheet
materialization for schema and execution. Before a cached result can be returned,
validate source project ownership and artifact availability. Cache identity includes
project scope and immutable source storage identity; downstream keys include upstream
identities and node IDs (derived output field identity). LRU is bounded by 32 entries and 256 MiB of estimated dataframe storage.
Oversized results execute without being retained. Python object overhead remains an
additional cost to measure in QA.

Alternatives: Redis, distributed execution and full persistent result storage add
unneeded infrastructure. Consequences: cache remains disposable; warm results cannot
hide a deleted/missing source. First schema resolution may materialize a bounded sheet.

# ADR-053 — Recoverable editor drafts and generated API contracts

Date: 2026-09-09. Status: ACCEPTED.

Decision: a per-workflow serialized writer coalesces edits and uses acknowledged
server revisions. Pending drafts live in tab-scoped sessionStorage, survive page
navigation/reload, and never implicitly overwrite a newer server revision. Leaving
with unsaved edits warns the user. Explicit retry preserves the draft; discard/reload
is a user action. Successful saves clear drafts. Closing the tab ends session draft
storage; durable product state is the server-acknowledged graph.

Generate TypeScript API contracts from FastAPI OpenAPI using openapi-typescript;
`npm run api:check` detects drift. Specialized node forms use a component registry.
Shared ApiError retains structured node/field/error identifiers.

Alternatives: handwritten duplicated schemas drift; a universal JSON form reduces
the usability of analytical controls. Consequence: Node configuration remains typed
on the backend, with explicit UI adapters for each implemented node.

# ADR-054 — Repeatable artifact cleanup

Date: 2026-09-09. Status: ACCEPTED.

Decision: source/project deletion atomically enqueues storage keys with database
deletion. Cleanup removes files idempotently and only then removes queue rows.
Failed uploads roll back their source metadata and compensate their stored artifact.
Startup and `python -m app.services.file_cleanup` retry queued deletions.

Alternatives: deleting files before committing risks broken references on rollback;
ignoring storage failures permanently leaks files. Consequence: cleanup is eventually
consistent and may require retry after a storage outage. A process/database failure
before a compensation record is created still requires operational reconciliation.

# ADR-055 - M10 arithmetic and aggregation semantics

Date: 2026-09-10. Status: ACCEPTED.
Context: analytical results need stable field identity and explicit empty/null behavior.
Decision: Sort is stable, multi-key and nulls-last in both directions. Limit requires a
strictly positive integer. Calculated fields use calc_<node UUID>; Group By preserves
dimension IDs and assigns agg_<node UUID>_<index> to aggregation outputs. Reordering
aggregations changes those IDs and requires downstream revalidation.
Group By with no dimensions returns one global aggregate row. Count without a field
counts rows; count(field) counts non-null values; distinct count excludes nulls.
Sum/average use Float64; sum of no non-null values is null. Min/max preserve field type.
Grouped empty input has no groups; global empty input has counts zero and other values null.
Duplicate output names and nonnumeric sum/average are rejected. Backend performs all
aggregation before preview limits; no analytical rows are silently dropped.
Alternatives: preview-side aggregation gives wrong totals; arbitrary automatic coercion
of text to numbers hides source problems. Consequence: configuration forms expose compatible
operations and downstream references must be repaired after aggregation reorder.

# ADR-056 - Join, Union and value-dependent Pivot schemas

Date: 2026-09-10. Status: ACCEPTED.
Join supports inner/left with one key pair. Key types must match (unknown/null may adopt
the other type); numeric conversions must be explicit upstream to avoid rounded join keys.
Null keys do not match. Both key columns remain. Conflicting right names receive a
collision-safe __right suffix; right IDs are namespaced by the join node and input side.
A key-frequency preflight rejects output beyond 250000 rows, 1024 columns or 2000000 cells
before allocating a many-to-many result. Left order is preserved, then right match order.
Union matches names with compatible identical logical types, not source-local column IDs;
it preserves left field order/IDs and records both origins. It applies the same output cap.

Pivot supports one index, one pivot field and count/sum/average/min/max. It builds bounded
conditional Polars aggregations (maximum 128 categories); null and literal '(empty)' remain
distinct. Output IDs hash typed pivot values and node identity. Fields follow first occurrence;
count excludes nulls, missing aggregates stay null except count zero. Sum/average use Float64.
Schema resolution executes only a value-dependent node's ancestor branch through the common
executor/cache, then propagates its actual schema to downstream controls. Static transforms
continue to infer without execution. No preview sample is used to infer Pivot columns.
Alternatives: inferring Pivot from a sample loses fields; unconstrained many-to-many joins can
exhaust memory; silently casting numeric keys risks false matches above float precision limits.

# ADR-057 - Complete visualization and dashboard contracts

Date: 2026-09-11. Status: ACCEPTED.
Context: all mandatory charts must share execution, persistence and error semantics.
Decision: the domain catalog includes Table, KPI, Bar, Line, Area, Pie, Donut and Scatter.
Workflow node config remains the sole semantic owner. Tables request bounded backend pages;
charts receive complete prepared series up to 2000 points, otherwise an explicit error.
No browser aggregation or silent sampling is permitted. Scatter requires numeric axes;
Pie/Donut require non-negative values with a positive total. Nonfinite numeric axes fail clearly.
Date axes, number formatting, legend and labels are presentation settings.
Dashboard CRUD supports multiple dashboards. Widgets store optional title override and
title visibility alongside visualization references and grid coordinates, never copied semantics.
Alternative: a second chart editor on dashboards would create conflicting configuration copies.
Consequences: aggregation belongs upstream; widget errors remain isolated; table paging does not
change aggregate totals. Optional multiple series is deferred within the documented optional scope.

# ADR-058 - Safe Excel XML parsing and restart readiness

Date: 2026-09-11. Status: ACCEPTED.
Context: QA found defusedxml absent and reproduced backend startup failure during simultaneous
backend/PostgreSQL restart because Compose restart does not wait for dependency health.
Decision: pin defusedxml 0.7.1; translate invalid/forbidden XML errors from both initial and lazy
worksheet parsing. Apply the 1024-column limit to previews as well as materialization.
Before migrations, probe database availability for up to 60 seconds, with five-second connection
timeouts. Retry only availability probes; migration failures remain fatal and visible.
Alternatives: merely ordering the acceptance test hides the restart race; retrying migrations
indiscriminately can conceal real migration defects. Consequence: recovery is automatic when the
database becomes available within the startup budget; persistent outages still fail explicitly.
The parser protection follows the [openpyxl security guidance](https://openpyxl.readthedocs.io/en/stable/).

# ADR-059 - Source reference integrity and completion of application boundaries

Date: 2026-09-11. Status: ACCEPTED; refines ADR-031/049 and completes ADR-053 boundaries.
Context: source references live in node JSON and cannot be protected by ordinary foreign keys.
Saving a new reference concurrently with source deletion must have one consistent outcome.
Decision: graph saves, source deletion and project deletion acquire the project row lock first.
A configured source ID must exist in the same project; empty/unconfigured source nodes and
other incomplete configs remain saveable drafts. Existing sources with missing files may still
be saved, but schema/preview report the unavailable artifact. Invalid source IDs return 422 with
node attribution; no graph changes commit. Source deletion after a successful reference save
returns SOURCE_IN_USE. PostgreSQL competing-operation regression verifies both valid outcomes.
Alternatives: accepting deleted IDs creates dangling new references; generic JSON foreign-key
infrastructure adds disproportionate complexity. Consequence: writes within a project serialize;
the prior draft test now uses an existing source with an unavailable artifact instead of a fake ID.

Project/workflow create/read/update/delete orchestration and Excel preview belong to services.
HTTP handlers adapt typed input/output. NodeOutputPanel owns revision-aware preview rendering;
late results and errors from earlier revisions are hidden and covered by component tests.

# ADR-060 - Bounded cold source loading and local deployment defaults

Date: 2026-09-11. Status: ACCEPTED.
Context: multiple dashboard widgets can request the same uncached workbook simultaneously.
Decision: cache source materialization uses double-checked locking. One cold source load runs
at a time, while warm cache reads and Polars transformations remain independent. Failures release
the lock and can be retried. This avoids duplicate workbook parsing and reduces peak memory;
threaded regression verifies one load for concurrent requests. Existing cache byte/entry budgets
still apply. Alternative: per-key future infrastructure is unnecessary for the synchronous MVP.

Compose publishes ports only on 127.0.0.1, consistent with the unauthenticated single-user MVP.
Remote production hosting requires a separate deployment design; it is outside this release.
Unexpected API errors include the diagnostic UUID in both the response and plain log message.

Final error-path validation: unexpected errors are handled outside the normal CORS middleware.
The 500 response therefore explicitly preserves the same configured origin allowlist, allowing
the browser to read the sanitized diagnostic response. ApiError includes the diagnostic UUID
in its user-visible message. API regression verifies CORS and log correlation; frontend regression
verifies the displayed identifier.
