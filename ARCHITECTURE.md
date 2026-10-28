# ARCHITECTURE.md

ADR-219 adds domain CellFormatPatch and separate typed format operations to the existing browser
draft/save contract. Sparse overrides render on bounded pages; SpreadsheetSession tracks a joint
value/format history and dirty state. Source formatting uses append-only OOXML font/fill/xf records
and targeted cell s references; original definitions/number formats/assets remain unchanged.
Physical source protections are revalidated at preparation. Simple table row IDs map formatting
after row deletion/addition. CSV rejects styling. Existing recalculation/staging/check/apply and
receipts remain authoritative, with no migration or SDK serialization of source files.
Plain XLSX styling-only changes bypass openpyxl serialization; value/row rewrites restore original
numeric XML using stable row identities, with exact serialization of explicit integer/decimal
edits. This avoids whole-book numeric coercion while retaining existing type conversion rules.

ADR-218 separates source-picker readiness from canvas initialization. Spreadsheet toolbar actions
commit native input before consuming the sparse session; values paste captures its target before
clipboard I/O. Deleted-row groups retain stable backend row IDs for explicit restore_rows in the
existing revisioned draft API; this local recovery stack clears at preparation/apply/discard. No extra
persistence model/calculator. Sales showcase Pareto consumes a published aggregation through
the normal graph; existing dedicated graphs can be rebound with revisioned workflow saves while
retaining publication/visualization/dashboard IDs. Historical exports remain for existing history.

ADR-217 replaces the separate React formula input with the native Univer formula bar/inline editor.
SourcePresentation binds raw STRING/FORCE_STRING cells plus actual f metadata; only a render
interceptor converts explicit number_values for native numfmt, and BEFORE_CELL_EDIT restores raw
data. Source date-system/theme/indexed-colour/border metadata is additive and display-only.
Native entry capture retains exact text before coercion. Selection operations update the app's
accessible live value; the native bar directly follows SDK state. Qualified addresses route across
sheets, and cached-but-unpainted rows render after activation. Calculation engine/result apply stay
disabled; no worker/RPC or alternative calculator. Source/staging/LibreOffice/check/apply persists.

ADR-216 adds explicit formula/override flags to cell writes and per-row advanced-edit capability
and pending-formula metadata. WorkbookEditorService validates operation semantics and persists
typed sparse options in the existing ReportDocument. SpreadsheetSession tracks formula identity
through history/persistence; Univer only displays literal values. Editing a formula focuses our
bar, while native apostrophe intent is preserved before SDK parsing. Server normalizes common
Russian formula syntax outside quoted text, applies the safe allowlist/cached-link boundary,
patches f cells, invalidates calcChain references and recalculates before staging. Original assets,
precision, merged/protection metadata and update CAS/check/apply remain authoritative. Merged
navigation resolves to anchors. Shared groups resolve through Translator and expand only when
edited; array/data-table ranges stay immutable. No database migration.

ADR-215: standalone /spreadsheet/{projectId} dynamically loads Univer OSS1.2.0. SourceAwareLink
adapts legacy source-update entry links to a synchronous new-window gesture; old routes remain
valid. SpreadsheetSession owns sparse string edits, atomic protection checks and bounded history,
independent of the SDK. UniverCanvas adapts cached cells/appearance to the grid and never imports,
exports or calculates the original workbook. Its formula engine is disabled before initialization.
Workspace/appearance and find contracts are typed; sheet blocks remain <=100 rows/2000 cells,
loaded per viewport with exact revision checks. No bulk dataset calculation in the frontend.
The backend reads original OOXML styles/merges/dimensions and serializes only requested rows;
the shared existing source/staging/LibreOffice/check/apply pipeline remains authoritative.
SDK mounts/lifecycles are isolated; Steady readiness gates input, and view preferences/selection
are restored after save. BroadcastChannel refreshes other local report tabs; no collaboration or
new persistence model/migration. Native appearance changes are view-only; source style/structure
authoring is intentionally not exposed. CSV headers are synthetic/protected and IDs stay server-owned.

ADR-214 adds WorkbookEditorService behind the existing editor endpoints: automatic bounded XLSX
fallback, sparse physical-cell patches and the same revisioned draft/staging pipeline. WorkbookCells
reads populated OOXML extents (ignoring formatting tails) and patches worksheet cell XML only;
unrelated archive member contents remain byte-exact. Page exposes formula/read-only coordinates,
workbook/structural capabilities and precision/external-cache notices. Existing table contracts
remain compatible. Server Calc receives a fresh data/formula/name/format copy with original calcPr,
not original assets. Allowlisted external formulas reference generated local saved-cache sheets.
Only verified result caches are merged into the original ZIP; new errors abort preparation.
Receipt records prepared version/external-cache use; SourceUpdateService adds the warning only
for that exact version. Existing token/revision/apply owns activation, no new table/migration.
LibreOffice26.2.6 amd64 runtime is pinned by SHA256 in Docker; local Python supports a trusted
NODEBI_SPREADSHEET_BINARY or installed supported LibreOffice. Macro security very-high, no trusted
locations, no external relationships/assets passed to the engine, per-process semaphore and90s
timeout. Formula authoring, macro execution, structural edits and external refresh remain excluded.
Earlier plain-XLSX-only restrictions below describe ADR-211/212 and are superseded for this path.

ADR-213 hardens client orchestration: the returned check job, checked update ID/token and expected
revision must agree before apply. Network failure after apply is reconciled against an exact
applied receipt (same update ID and expected revision+1). AbortController stops an unmounted
editor's polling/auto-apply intent; backend transaction/CAS ownership remains unchanged.
The PowerShell updater targets one explicit existing Compose stack, holds an exclusive local
operator lock, builds before stopping services, snapshots database/files while API/UI are paused,
records checksums/image identities, and verifies /ready plus UI HTTP. Preflight validates source
volume/root and local PostgreSQL identity. Failure before deployment restarts original containers;
failure after deployment never automatically restores/downgrades a database. Container base images
are digest-pinned, npm/application versions locked, quality tooling uses existing constraints.
GitHub Actions defines read-only code/quality jobs against disposable PostgreSQL, not deployment.

Quick save (ADR-212) composes existing typed prepare/check-job/poll/apply APIs in a focused
frontend helper; no calculations or validation move into the browser. Save changes authorizes
automatic apply only for an error/warning-free completed check. Inline confirmation retains
the checked revision; all source-base/CAS/check-token guards remain server enforced. Failure
or closing the browser before apply leaves a staged version, not silently active input.
browser_inputs derives nonpersistent profiles from plain legacy Excel source-node layouts and
physical column metadata. Legacy edited cells use the same public strict scalar conversion as
normalization to retain native numeric/boolean/date cells; prepared inputs keep literal strings.
The fast entry optionally reuses a same-source/same-base editable browser or empty update draft
under the project lock. Template and browser capabilities are no longer conflated. Formula/complex
fallback uploads immutable SourceVersions and drives existing check/apply without graph changes.

BrowserEditorService (ADR-211) exposes typed paged read/save/prepare/discard APIs under
updates/{id}/editor. Sparse string patches and stable original/appended row identities live in the
existing revisioned update ReportDocument, bound to the selected immutable storage key. Writes
use the project lock, revision CAS, digest-checked save receipt and prepare request receipt.
SourceUpdateService rejects pending editor patches in generic save/check/apply. Preparing renders
CSV with confirmed delimiter/encoding or safely bounded plain XLSX through existing libraries,
stages a SourceVersion via the existing uploader, then CAS-selects it while retaining field bindings.
The project lock is released before uploader artifact reservation and reacquired afterward to
avoid cross-transaction PostgreSQL FK deadlock. A concurrent revision change leaves staged data
inactive and the browser draft unchanged. Selecting the replacement and its receipt commits
together. Original source artifacts are never overwritten; normalization/calculation remain backend.
Pages return <=100 rows and <=2000 cells (20 rows by default). Sparse drafts cap edits/row ops at
10000 each and serialized state at 4 MB; XLSX preflight caps the entire workbook at 200000 cells.
Formula caches are not recalculated: formula/complex workbooks are rejected before mutable load.
BrowserFileEditor owns only interaction and lightweight TSV parsing; no spreadsheet dependency,
new database schema, calculation engine or client-side dataset materialization is introduced.

FileExchangeService (ADR-210) stores source/base fingerprint metadata in existing revisioned update
ReportDocuments. POST projects/{id}/file-updates is source-validated and request-idempotent.
GET updates/{id}/files/{current|template} validates the same base, then streams through StorageProvider;
the frontend receives a download Blob, not a complete dataset for client calculation. Templates use
confirmed input profiles and raw header cells; complex inputs explicitly retain original-file editing.
SourceUpdateService preserves the metadata on save and checks it at prepare/apply; the existing
project lock, state token, normalization/staging and atomic apply remain authoritative. An optional
typed UpdateRead.file_exchange drives source-scoped controls; legacy update documents remain valid.
FileUpdateStart reuses existing source lists and routes into the saved update URL. No extra database
table/migration, connector, calculation model or append semantics are introduced.

Dashboard layout variants (ADR-209) use dashboard_layout_templates (migration 0012), separate
from analytical calculation templates and DashboardConfiguration. Immutable widget snapshots
have a partial unique default index and cascade with their owning dashboard. DashboardService
preserves the pre-edit nonempty baseline within its save transaction; an empty dashboard freezes
its first nonempty save instead. GET layout-templates is read-only and may synthesize the current
saved baseline until it is first frozen. POST layout-templates performs a CAS dashboard save plus
immutable named capture in one transaction, with digest-checked request replay and bounded count.
Release snapshot MODELS includes layouts; restore remaps embedded widget/visualization IDs.
DashboardEditor uses noCompactor with preventCollision=true, never live neighbour pushing.
placement.ts owns deterministic gap packing and single-widget insertion/sizing. Explicit actions
flow through change/persistDraft/layout history; applying a saved variant changes the draft, not
the default snapshot. Shared chart calculations and source/visualization versions are unchanged.

Guided entry (ADR-208) is presentation-only: ProjectJourney and report-entry select links from
existing dataset/dashboard metadata. Import continuation prefers fresh apply, then the source's
active snapshot for the resource, then the completed draft snapshot. No saved report is rewritten.
DashboardEditor validates supplied values with the existing typed resolver, defers only the
required-presence check for incomplete-entry classification, and blocks visualization requests
until all required values are supplied. DashboardValueForm performs full validation on Apply.
Graph execution, source mapping, decimal arithmetic and transaction/revision guards remain backend
responsibilities. Wizard cardinality guidance mirrors, and does not replace, server validation.

Corporate frontend: frontend/vendor/alabuga contains pinned @alabuga/framework 0.6.0
CSS and local WOFF2 fonts from b048bc2546a3e05131f4451a1115f7282b13523b; logo assets are
under public/brand. globals.css imports upstream styles in the components layer, maps
Node BI semantic tokens, and supplies a dark adaptation; corporate.css owns the React
application bridge. CorporateHeader sits inside locale/theme providers. Forms, dialogs,
graph state and rendering remain React-owned; upstream imperative initComponents and
document runtime are not loaded. ECharts receives the same local body font. No additional
dependency, remote font fetch, persisted model or calculation contract is introduced.
See ADR-207 and frontend/vendor/alabuga/NOTICE.txt for provenance/update boundaries.
ReportDraftBoundary renders a consistent loading state through server rendering/hydration;
its browser-only recovery session mounts afterward. Draft reading precedes form autosave,
preserving pending requests and restoring saved settings without hydration divergence.

basicSeriesColors shares the existing eight-colour basic multi-series palette with pie/donut.
Pie slice styles use the same sorted category identity as decals, a panel-coloured 2px stroke,
and explicit emphasis fill to prevent automatic lightening. Context highlighting varies only
opacity, preserving separators rather than replacing them with an accent outline. This is
rendering metadata, not a saved option or transformation; source rows remain unaggregated.

Pareto's existing value axes enable renderer-native label collision handling and retain
endpoint labels. The shared ResizeObserver triggers ECharts layout again when height changes;
no new tick calculation, normalized coordinate change or persisted layout migration is needed.

Shared Chart projects its generated ECharts legend into ChartLegend native buttons through
chart-legend.ts. Entries retain renderer names as identity and use its formatter as display
text; helper-series names are deduplicated. legendToggleSelect and legendselectchanged keep
pointer and keyboard actions synchronized without another filtering model. No options or
visibility state are persisted. Controls are scoped to the current result/locale/theme/window;
the chart ResizeObserver handles the disclosure row's height. See ADR-206.

Chart renderer failures are scoped to result/locale/theme/window inputs, not a permanent
component error string. An explicit retry counter recreates the renderer without a data fetch
or persistent mutation. Catch/unmount dispose resources idempotently; one-shot retry focus
must not be repeated by later background result updates.

Pie category cues reuse the basic eight-pattern palette. pie-categories.ts derives sorted
unique display labels only to assign presentation styles; data order, slice values and source
indexes remain unchanged. Native ECharts legend icons inherit each slice decal. Pattern count
is shared with the viewer's over-eight-category warning; duplicate labels do not aggregate rows.

Pie/donut rendering sets stillShowZeroSum=false and showEmptyCircle=false. Missing measure
values use ECharts' missing marker instead of numeric zero, preserving source row indexes.
This prevents equal-sector synthesis after legend filtering without adding client aggregation
or replacing backend validation. Exact rows and frozen/saved configuration are unchanged.

Basic multi-series non-colour cues are presentation-only, selected by sorted column IDs in
basic-series-cues.ts. Eight cues cover the existing contract. ECharts series IDs combine
field ID and occurrence to preserve repeated-field legacy configurations; order, values,
persisted specifications are unchanged. Light-theme series colours are darkened for 3:1
base-fill contrast against chart surfaces; dark colours and single-series rendering are untouched.

Basic chart tooltips project dataIndex/seriesIndex onto the unchanged result rows and fields
in basic-tooltip.ts, then escape text through the shared bounded HTML renderer. Additional
series use their own field/name rather than the primary measure. No plot coordinates are
parsed back into source values; time axes retain original date text in hover details.

Hierarchy labels use opaque themed text with a 3px neutral text halo in normal/emphasis/blur
states, including treemap parent labels. Do not add opaque label backgrounds: ECharts sizes
treemap label boxes to the whole tile, which would conceal category fills. Drawing weights,
colours, selection identities and hierarchy navigation remain unchanged.

Bullet custom rendering extends its clip into the existing top padding only when numeric
labels are enabled. The plot's horizontal and bottom clipping and all mark coordinates remain
unchanged; actual renderer text/clip geometry is tested at supported short window heights.

Combination-chart non-colour cues are presentation-only: sorted field IDs within bar/line
kinds select decal patterns or marker shapes. The typed contract requires both kinds and at
most eight series, so seven cues per kind suffice. ECharts propagates bar decals to legend
icons; line-axis dash semantics, backend coordinates and saved configuration remain unchanged.

Box-plot median labels use a silent scatter presentation layer because native ECharts boxplot
does not render labels. Coordinates come from backend medians, text retains exact transport,
and null medians have no anchor. The layer shares the summary legend name, adds no interactive
selection/tooltip and uses opaque themed label ink/backing even when boxes are muted.

Heatmap, box-plot, radar, waterfall, bubble, bullet, funnel, hierarchy, histogram and combo/Pareto tooltips share chart-tooltip.ts for escaped plain-text HTML
with preserved line breaks. Shared rendering was extracted after actual box tooltip clipping;
it does not accept user HTML or change the backend's statistical values.
Radar, waterfall, bubble, bullet, funnel, hierarchy, histogram and combo/Pareto use boundedPlainTextTooltip to bound width to the current chart (maximum 420px), wrap long
unbroken names and apply ECharts confinement after measuring the wrapped HTML box.

In the below-80rem dashboard workbench layout, settings' bottom sticky action rows also
become static: the in-flow panel has no local scrolling viewport, so sticky actions otherwise
cover visible fields. Wide fixed panels retain sticky actions and their local scrolling.

Dashboard workbench (ADR-204) is wrapped in an inline-size container. Below 80rem its existing
fields/settings panels become in-flow blocks, section navigation is visible, and main padding
no longer reserves fixed sidebars. The mounted editors, draft ownership and saved widget layout
remain unchanged. Wide layouts keep their existing fixed-panel composition.

PreparationDialog (ADR-203) keeps one controlled table/form tree. A 60rem container query
stacks cells with translated heading text on narrow/enlarged layouts. Existing plan generation,
cancel confirmation and atomic graph apply are unchanged; desktop preserves column layout.

ReportBuilder (ADR-202) uses an inline-size container with a 78rem three-column threshold;
below it the same fields, preview and settings instances stack without changing form state.
Unlike viewport media breakpoints, this container threshold follows enlarged root text.
StatisticalReportForm shares the container threshold with a separate two-column template;
below it settings and preview stack, preserving chart space as well as control visibility.

CanvasNavigation (ADR-201) runs inside the existing React Flow provider, reading the current
viewport and applying a 200-CSS-pixel offset without changing zoom or editor graph state.
choiceLabels disambiguates full choice sets before filtering, reserving original labels to
avoid suffix collisions. Select values and persisted references remain existing stable IDs.

GroupPanel checkbox selection (ADR-200) is controlled by WorkflowEditor selected flags and
inspector identity. Deselecting the inspected node clears both; grouping still calls existing
assignGroup. Search is component-local, capped to 100 rendered matches, and never filters
the selected-ID set used by grouping. No alternate persistence or grouping operation exists.

CanvasPlacement (ADR-199) is presentation-only and receives visible item identities/positions
from each editor. Classic callbacks update node positions; field callbacks reuse changeNodes
for nodes and workbook/block/result presentation metadata. No alternate persistence or execution.

Graph workspace reflow (ADR-198) is CSS-only. Shared workflow-workspace rules use classic
panel-width custom properties or field defaults on desktop, and a vertical layout below 64rem.
Named, focusable library/settings regions preserve the same mounted components and existing
draft/autosave ownership. Field grid row minima keep canvas and preview geometrically separate.

DashboardRecoveryBoundary (ADR-197) loads browser drafts after hydration, before editor mounting.
The focused dashboard-draft parser checks identity/revision and render-safe nested shapes, not
business semantics. Valid recovered state seeds DashboardEditorContent once; query refreshes do
not substitute current server revisions for the recovered revision. Failed recovery requires an
explicit decision and never mounts unsafe widgets or silently discards raw storage.

Dashboard view-date recovery (ADR-196) wraps DashboardPeriod with a validated versioned envelope
keyed by project/dashboard in the shared document store, separate from configuration drafts.
The URL remains authoritative for execution; applied-period changes reconcile pending scratch
without changing view parameters. A one-shot local marker identifies the component's own Apply
so denied reads after its cleanup cannot spuriously reopen recovery. Native unload protection
covers live edits; existing route guards/layout persistence are not replaced.

Release settings recovery (ADR-195) uses a versioned project-scoped envelope in the shared
document-draft store. Storage is read after hydration and requires restore/discard before editing;
route instances are keyed by project. Local settings never carry check tokens, consent, datasets
or automatic submission logic. Release POST acknowledges a job, not a completed frozen release,
so this settings-only layer does not retire drafts on HTTP success or claim idempotent retry.
Optional dateScratch extends the existing envelope compatibly. DashboardPeriod accepts controlled
scratch for the release form while retaining local scratch for existing dashboard usage. Incomplete
scratch is structurally validated, not promoted to DatePeriod; explicit application still calls
parsePeriod. Only the applied period enters API execution contexts. A recovered form generation
focuses the name once, never on ordinary typing/polling.

Update-history selection (ADR-194) is the reports route's update query parameter. ReportCycle
resolves it through the project-scoped query; successful create/rollback responses seed that
query cache before router.replace selects the identity. No new persistence/API/receipt model.
UpdateEditor focuses its heading only on identity entry and its error panel only for actions.

Excel rectangles (ADR-193) are optional ReadOptions.cell_range values passed through the adapter
to WorksheetLayout. The reader bounds headers/data and cache validation while preserving physical
column IDs/positions. Full-workbook structural safety limits still apply. Initial apply hashes
omit absent cell_range for compatibility with historical whole-sheet receipts. Existing JSON
profile/snapshot/release persistence carries the option without a migration.

Analytical table layout (ADR-192) observes its scroll region with ResizeObserver and derives
effective horizontal pinning, reserving one full data column. Narrow cards can temporarily
unpin even the row-level column; vertical header pinning stays. This presentation-only state
never updates VisualizationSpec, calculations or persisted configuration.

Inspector condition scratch (ADR-191) is a validated node-ID/version-scoped browser document
draft, separate from graph execution config. ConditionBuilder persists explicit control edits,
restores without graph writes, validates current field availability and retires scratch only
after explicit insertion into ordinary graph autosave. Shared bounded memory handles storage
failures; discard remains fail-closed. This is tab-local recovery, not server persistence.

ConditionBuilder authoring (ADR-190) preserves bounded numeric literal strings and delegates
all computation to the selected node version. Exact calculated-column configuration enables
decimal/integer/text predicates with numeric branch results; legacy configuration remains
Float64 and explains its approximation. No browser evaluation or implicit version migration.

DashboardEditor recovery (ADR-189) uses the same bounded document draft store and confirmed-save
retirement as graphs/reports. The original recovered revision stays attached through layout undo /
redo via restoreDashboardLayout. Confirmed deletion retires recovery before navigation, without
treating browser cleanup failure as failed server deletion. Explicit discard is still fail-closed.

Graph browser recovery (ADR-188) reuses features/workspace/document-drafts via the lazy adapter:
small graph settings retain the latest same-document copy and original revision; confirmed saves
retire it, explicit discard does not retire on failed removal. A workflow-only opt-in preserves
oversized disk writes without retaining oversized memory. Existing report draft size limits remain.

WorkflowAutosave browser storage (ADR-187) is injected as lazy get/set/remove operations, avoiding
sessionStorage property access during editor render. Existing catches report recovery failures;
normal serialized CAS server saves remain independent. Guarded local discard is fail-closed and
cancels queued drafts only after local removal succeeds. No implicit durable-memory fallback.

Normalization (ADR-186) has a per-column native fast path for explicitly selected decimal String
fields. A full-column representability check precedes strict Polars casting; scale truncation is
never used as validation. Ineligible syntax/values, missing required values or native-parser failures
use the existing scalar conversion path with unchanged diagnostics. No new execution/storage model.

Dashboard layout history (ADR-185) stores bounded widget snapshots only on geometry/attachment
changes. Restoration merges current widget metadata by stable placement ID and keeps current
dashboard configuration and saved revision. Removed widgets retain their captured metadata when
restored. History remains in memory; the resulting dashboard draft uses existing sessionStorage
and explicit CAS save. Pure helpers live in features/dashboard/layout-history.ts.

Template catalog metadata (ADR-183) lives beside immutable ReportDocument.payload.template:
payload.catalog.name and saved/archived status, protected by the document revision and project lock.
TemplateCatalogService owns typed list/edit APIs and exact template_catalog_receipt responses.
Receipt rows do not enter state_token or frozen releases; semantic edits advance template revisions.
Shared caps include archived entries. Family prepare accepts optional expected_template_revision,
rejects archive state and returns normal settings without creating any new execution model.
Release metadata adds FrozenTemplateCatalog@1 parallel to unchanged definition arrays, validated
for matching lengths, with a backwards-compatible absent-metadata fallback. No migration is needed:
the existing document JSON/status/revision columns store these additions.
Catalog UI (ADR-184) is a client-initialized Reports subroute with server-owned filtering/pagination.
Validated sessionStorage retains exact pending PATCH bodies per project; unavailable list metadata
does not block receipt retries. Known definitive errors clear pending state and require explicit
refresh; transport failures retain the same request. No calculations or field mapping live here.

Report templates (ADR-182) use a separate typed ReportTemplate/ReportSettings family and
report-templates endpoints alongside the unchanged analytical API. Shared input validation checks
grain/schema/source revisions. Existing node executors infer original formula scopes; lexical
canonicalization preserves exact numeric/string tokens while stable-ID rebinding projects only
structural roles. New formula/measure IDs are request-namespaced. No computation occurs in templates.
ReportDocument kind report_template joins the shared project limit, state token and frozen metadata;
restore keeps neutral roles/literals and gives documents fresh IDs. There is no physical DDL change.
Family-aware UI controls use isolated pending-capture scopes and ordinary wizard draft/apply paths.

Guided waterfall (ADR-181) extends AnalysisSettings and the existing statistical preview/apply/edit
services. waterfall_steps@1 has additive optional order_column_id: absent/null keeps input order;
integer/decimal/date/datetime keys must be unique and nonnull before full-input ascending sorting.
Guided settings require an explicit nullable choice; legacy suffix recognition supplies null without
writing the graph. Existing WaterfallSpec validation/rendering, exact arithmetic, typed snapshots,
revision/receipt guards and shared/manual suffix protection remain the only execution path.
Analytical template mapping includes row-type and order roles. No schema migration is needed.

Guided radar (ADR-180) extends the same report settings/preview path with optional RadarSpec.
The report presentation service delegates config validation and full-result rendering to existing
radar services. No new graph node or calculation recipe is introduced. Saved suffix recognition
preserves typed axes and explicit scales; apply persists the validated spec/orientation on rebind
and clears stale typed specs when changing to a basic presentation. Absent radar metadata is omitted
from legacy serialization; all existing CAS/receipt/publication/release boundaries remain in force.

Guided combo authoring (ADR-179) adds optional ComboSpec to report settings and optional typed
VisualizationResult to preview responses. report_visualizations delegates combo validation/rendering
to the existing service over the graph ExecutionResult; no new calculator or persisted recipe.
Recognized editable suffixes retain group_by@3 identities, existing CAS/receipts and appearance.
Absent combo/result fields are omitted from legacy serialization. Draft validation admits bounded
incomplete combo bindings, while completed configurations are validated by backend contracts.

## Report-first evolution (2026-10-08, ADR-114)

Add connector/resource/import-profile/snapshot contracts alongside legacy Excel interfaces.
Normalized immutable Parquet tables use StorageProvider; relational metadata and explicit
schema versions use migrations. New source nodes consume snapshots; existing Excel nodes keep
their reading and identity contracts. Preparation and report wizards produce ordinary DAG
operations, not an independent persisted calculation engine. Visualization specs are versioned,
semantic and type-specific; ECharts options remain frontend adapters. Full-data statistics
belong to explicit backend nodes; bounded rendering must not change statistical populations.
Rollout and acceptance are tracked in docs/PRODUCT_EVOLUTION.md and TASKS.md.

Exact field/scalar operations (ADR-176) are explicit v2 node definitions alongside unchanged v1.
ScalarValue can carry Decimal with validated precision/scale; constants enter as bounded strings.
Field arithmetic retains row context and composes deferred Polars batch expressions over connected
operands, with bounded Fraction intermediates and half-even rounding at each node boundary. Sum
uses checked exact accumulation, single-value enforces one row, and both retain source scale.
No implicit Float64 conversion or inferred arithmetic currency/unit. Exact scalar previews and
bound visualization datasets set exact_transport; stable IDs, normal graph execution and release
remapping remain authoritative. field_formula@2 (ADR-177) maps a/b/c schemas into the existing
bounded exact formula compiler and shares physical input validation with calculated_column@2.
It preserves connected field contexts/checks/populations and emits a decimal field or scalar;
rounding occurs once after the entire expression. Legacy text/boolean expressions stay v1.
Decimal workflow/dashboard parameters (ADR-178) use fixed-scale strings in API/persistence/view
state and Decimal only at the scalar/execution boundary, carrying explicit precision/scale.
Validation uses the common checked exact conversion without accepting rounded values. Precision
metadata participates in scalar cache identity and lossless binding validation. Decimal choices
and labels serialize exactly; context/filter boundaries do not convert through Float64. Existing
nondecimal definitions omit the new metadata keys; no database migration or automatic conversion.

The visualization registry now lists all 21 families (ADR-174). Basic results expose read-side
version-1 specs projected after ordinary validation, with stable field IDs and no new calculations.
The frontend resolves these IDs against the returned schema, preserving exact values and selection
context. Spec-less historical results retain legacy rendering. Registry binding_contract distinguishes
spec_or_legacy_config from spec; result_data distinguishes rows from named datasets. The independent
API's typed input validator normalizes basic specs to VisualizationConfig before receipt hashing and
application validation (ADR-175). Mixed binding representations are rejected. Only canonical flat
bindings persist, so graph/report edits and old exact pending requests remain compatible. Table
columns=null means all fields; scalar KPI value=null means its single published value. First-series
labels use optional primary_series_name, excluded when absent to keep old serialized defaults stable.
The editor projects its existing draft form fields into typed requests; retries replay original bytes.
Basic public saves validate through the common renderer before commit; no browser calculations.
Table paging/release collection keeps one rows payload, not a duplicate named copy.

Report and independent-visualization drafts share a same-document serialized-settings mirror
(ADR-173). Failed sessionStorage writes retain the newest in-memory version; failed reads use only
already-known data. Existing draft validators and exact pending-request/CAS contracts still apply.
Confirmed saves/pristine resets use local tombstones if persistent removal fails. The mirror is
not server persistence and does not survive document reload; storage errors remain explicit.

Exact KPI presentation (ADR-171) formats transported decimal/large-integer strings using bounded
BigInt scaling and Intl locale affixes. It never coerces them to Number or changes backend values;
display rounding is separate from calculation rounding. Raw tables preserve exact transport.
The executive demo CLI uses public import/report/visualization/dashboard APIs and ordinary DAGs;
its independent Decimal oracle is acceptance tooling, not a second application calculation engine.

Report formula field inspection optionally resolves the existing graph through the last summary
formula (ADR-170). Create/edit fields endpoints accept include_summary=false by default and return
an additive summary_outputs map of stable formula IDs to resolved aggregate/derived columns.
The common planner/schema resolver remains authoritative; field inspection never executes or saves.
The UI caches only matching input/aggregation and unchanged formula prefixes, never inferred browser
types. Existing CAS, request receipts and graph persistence remain unchanged.

Analytical templates (ADR-157) are immutable typed metadata in ReportDocument, not executable report
instances. Capture projects recognized graph settings into neutral input roles; a read-only prepare
endpoint validates exact field types/known units/currency and source revisions, then returns ordinary
StatisticalSettings with request-namespaced measure identities. The existing wizard/executor owns
preview and apply. Template fingerprints join project state_token and release metadata; restoration
does not remap their literal strings. Existing releases default to an empty template catalog.

Guided R5 creation (ADR-155) extends StatisticalReportRequest's discriminated analysis settings:
Pareto/funnel compile to pareto@1/funnel_steps@1, treemap/sunburst to table_rollup@1 with one additive
measure and complete totals. Existing typed adapters produce the preview and saved visualization.
No saved report recipe, browser calculation or new persistence model is introduced. Prepared inputs,
atomic apply, revision guards, receipts and draft recovery reuse the analytical report route.
Structural suffix recognition includes Pareto/funnel and compatible one-additive-measure hierarchy
rollups (ADR-156). Hierarchy settings use the presentation discriminator while patches retain the
table_rollup node. Existing hierarchy bindings are validated before projection; field changes require
explicit rebind, preserving presentation and rejecting dangling references. Advanced multi-measure
or shared rollups are not simplified by the wizard.

BubbleSpec/prepare_bubble (ADR-149/150) is registered in the typed chart union. It consumes one
prepared Dataset, resolves stable numeric/categorical
roles, validates the entire frame, and computes rational full-input coordinate extents and size
maximum before bounded transport. Radius ratios implement area encoding; zero and missing states
are explicit. Point/group UUID5 identities depend on publication namespace and typed keys, not
row positions. Only selected fields are serialized. The PreparedBubble result reuses the existing
VisualizationDataset exact page contract. No aggregation node or browser calculation engine is
introduced. The bubble adapter validates full results on save and preserves navigation/highlight
columns in the matching page. Internal full_data rendering bypasses the page cap for releases from
one execution; frozen API slicing keeps observations and point identities aligned with full scales.
Display tick text may use exact offsets or scientific notation without altering exact source text.
ECharts consumes positions/radius ratios only; viewport padding changes presentation, not scaling.

Pareto (ADR-151) separates pareto@1 preparation from ParetoSpec@1 presentation. The ordinary typed
executor projects category/value before ranking and emits ranked dataset plus population summary
with stable node-derived field identities. Full-input guards precede bounded previews; Fraction
intermediates and explicit Decimal128 conversion protect sums and shares. Deterministic UUID5
category identities survive reorder/paging. The chart binds these exact ports from one execution,
reuses ComboPresentation for normalized drawing positions and never recomputes cumulative statistics.
The ECharts adapter changes bindings only; its reference line is appearance. Validate/save/copy
use existing project locks, revision guards, full-result validation and retry receipts. Freeze uses
the private full_data path; frozen paging slices rows and geometry together, preserving summary
and scales. No new dependency, migration, browser calculation or parallel report recipe.

HierarchySpec@1 (ADR-152) binds table_rollup@1 roles, ordered dimensions and one additive measure for
treemap/sunburst. HierarchyPresentation contains a complete root, stable flat parent-linked identities,
bounded drawing weights and exact full-root shares. prepare_hierarchy validates the complete <=5000
node result and reconciles totals; it does not replace rollup aggregation. Float reconciliation is
explicitly approximate; integer/decimal reconciliation is exact. The frontend assembles nesting only,
with no reaggregation. Local branch navigation/table paging retains the full prepared population.
Save validation and frozen results reuse the existing full-result contracts; no DDL or dependency.

BulletSpec@1 (ADR-153) defines category/actual/target roles and an explicit zero-inclusive scale with
1–5 ordered labelled ranges. prepare_bullet validates all selected rows/units before paging and
classifies exact numeric values using Fraction, not chart-side comparisons. BulletPresentation
contains normalized positions, zero/missing distinction, exact ticks and stable typed identities;
VisualizationDataset retains original exact numbers. Only selected/navigation fields are transported.
ECharts custom rendering performs pixel geometry only. Adaptive 1–5-indicator windows and API pages
do not alter scale or full counts. Save/retry/copy and complete frozen paging use existing lifecycle
contracts; ordinary graph nodes remain the only business calculation model. No new node/DDL/dependency.

Funnel (ADR-154) separates funnel_steps@1 full-input preparation from FunnelSpec@1 presentation.
Explicit integer order, unique stages and non-increasing finite/nonnegative amounts are validated
before producing stage and summary datasets. Fraction intermediates and bounded Decimal128 outputs
protect exact losses/retention; exact ratio strings accompany rounded percentages. Stage UUID5s
derive from node namespace and typed key, not row position. The typed adapter requires matching
roles/ports and one execution; terminal context restrictions are rejected. It returns all <=50
stages independently of page requests. Frozen results retain the complete sequence. The ECharts
custom adapter maps normalized widths to pixels without calculating transitions; scroll state only
changes viewport. Existing save receipts, release/restore and source identity remapping apply.
No new dependencies, DDL or parallel report model; aggregation/cohorts remain explicit upstream.

ProjectOverview (ADR-139) composes existing typed metadata queries through independently labelled
OverviewSection boundaries. It does not execute graphs, infer check freshness or persist a separate
summary. Report-state fingerprints remain server-owned; failed refresh does not display cached
success. OverviewReports owns local name search/sorted paging without mutating query results;
ProjectHeading owns inline rename and focus handling. Existing dashboard URL helpers preserve
view/edit mode and restored period/parameter selections. No API or persistence schema change.

ReportFields (ADR-140) is a schema-only presentation component rendered through a portal owned by
VisualizationEditor; the workbench never duplicates draft or calculation state. DashboardSidePanel
owns responsive left/right hosts; DashboardEditor owns selected-widget/unplaced central previews.
The existing CAS/copy/acknowledgement and graph paths are retained. Failed metadata refresh invalidates
preview presentation and disables apply even when query cache retains an earlier schema.

Visualization recovery (ADR-141) uses a validated versioned sessionStorage envelope, separate from
server visualization/configuration contracts. Original CAS revision survives explicit restoration;
current prepared-data schema remains authoritative. Outside-link guards replay the native/Next link
after the existing leave decision, without patching history/router internals. Back/forward relies
on recovery rather than cancellable popstate. Local write failures are visible and never presented
as successful persistence. New/copy drafts are scoped to project and dashboard/library.

Visualization save recovery (ADR-143) extends that envelope with the exact pending payload/copy mode.
The optional UUID request_id is backward compatible. Under the existing project lock, a
project-namespaced ReportDocument receipt fingerprints operation/target and typed submitted settings
before inherited semantic guards modify them. Receipt and visualization commit in one transaction;
replay precedes source/workflow CAS and returns the same object's current settings. Deleted results
are not recreated. No DDL or new calculation/persistence system is introduced. Old clients without
request_id retain historical behavior. Receipts are not copied into frozen releases/restored projects.

ReportDraftBoundary (ADR-144) wraps report creation/edit/alignment before metadata loading. Its
validated envelope contains only form state and an optional exact apply-request string. Form
autosave is session-local; server report receipts remain the operation authority. Restored edit and
prepared-input tokens stay pinned until explicit refresh, and previews are never persisted. Pending
forms unmount, so retry does not depend on source/schema availability. The endpoint is derived from
the owned project/mode/target, never from arbitrary persisted URLs. Typed forms still build existing
requests; no graph recipe, execution or schema inference is added to the browser.
The measure variant (ADR-145) scopes its state and pending request to workflow/publication/primary
measure; the boundary derives the measure-reports endpoint. Catalog refresh errors invalidate
authoring readiness, and explicit refresh clears preview/pinned token. The existing measure receipt
and backend grain guards remain authoritative; report creation never copies calculation nodes.

StatisticalReportRequest (ADR-146) shares ReportSourceRequest and ReportInputService.resolve with
the aggregation wizard, preserving source ownership, active-snapshot and prepared-input CAS guards.
Its discriminated analysis config reuses HistogramConfig/BoxPlotStatsConfig and, with ADR-147,
HeatmapConfig/TableRollupConfig. The compiler emits
normal filter/statistical nodes and publishes dataset; the existing typed renderer consumes both
named outputs from one execution, including bounded outlier paging. Preview returns graph + typed
VisualizationResult without persistence. Atomic apply uses a statistical_report_receipt with typed
request fingerprint, project lock and the existing graph/document tables. Replay precedes current
input validation; deleted chart/dashboard results are not recreated. No new execution engine/DDL.
The statistics draft mode uses the same local recovery boundary; raw preview rows are not stored.
The same typed renderer factories bind heatmap roles and stable rollup measures to the compiled
ordinary node. Table preview uses 100-row server pages; heatmap returns its complete bounded matrix.
The generic offset query retains outlier_offset compatibility, rejects conflicting values and uses
signed-64-bit bounds. Existing distribution request normalization/fingerprints remain unchanged.
Shared graph configuration controls accept explicitly incomplete local drafts; strict discriminated
API contracts validate submitted settings. No implicit heatmap aggregation or browser totals.

StatisticalEditingService/StatisticalSuffix (ADR-148) recognize supported v1 terminal publications
from the graph itself, including restored projects. The projection patches only the terminal config
and a private simple immediate filter, preserving existing identities/order and other branches.
Shared/parameterized/presentation-bound preparation stays upstream. Contexts, named measures, shared
outputs and widget actions on the terminal branch are protected advanced cases. Preview creation/edit
use the same typed execution/render helper. State-token CAS plus project/visualization locks and a
target-bound statistical_edit_receipt protect writes/retries. Graph/chart/revision/receipt commit
together, without dashboard writes or new persistence tables. Table field rebinding changes only
explicit semantic bindings; raw nested appearance remains intact. Dangling rules/format fields fail.
The statistics-edit draft mode scopes recovery to the visualization and retains the original token.
Its boundary wraps metadata loading, allowing pending replay even when read metadata is unavailable.

Legacy chart sizing (ADR-142) uses a data-free axis/grid patch from actual container dimensions.
ResizeObserver resizes the existing ECharts instance and updates only presentation, leaving series
and server results unchanged. LegacyChartView exposes raw returned values through bounded local table
pages and stable field-ID selection. Exact strings are never cast to Number in this alternative.
New typed statistical adapters and their explicit scale contracts remain separate and unchanged.

boxplot_stats@1 (ADR-128) is a TypedNodeExecutor with dataset/outliers table outputs derived in one
execution from one input. Static schemas expose stable node-based field IDs. Quantiles and Tukey
fences use rational intermediates; integer/decimal statistics serialize exactly, with explicit
Decimal128 overflow errors, while Float64 inputs remain approximate. Nulls are counted, not zero-filled.
Stable group/outlier multiset identities do not depend on source row order. Downstream frontend field
selectors resolve the actual connected named output; only legacy schemas without outputs use columns.
The box_plot renderer (ADR-129) consumes both named results from one common graph execution.
BoxPlotSpec@1 records explicit field roles; a typed registry describes preparation requirements.
Legacy chart config/node execution is unchanged. Publication schema suggests eligible bindings;
save/draft/render reject incompatible types, fields, ports and output-level context restrictions.
VisualizationResult adds optional spec and named datasets; old payloads omit the new empty fields.
Summary stays complete while outliers are paged. Internal full-data rendering preserves both layers
in release artifacts; frozen reads page the stored outliers. Restored node IDs remap all role IDs.
ECharts gets presentation-only numeric coordinates; exact values remain in tables and tooltips.

histogram@1 (ADR-130) emits dataset intervals and summary accounting from one source table. Rational
assignment avoids exact-number coordinate collapse. Boundaries are explicit exact text, not Float64
schema fields; counts/index are integers. HistogramSpec@1 adds a second disjoint typed role model;
the union preserves the earlier box-plot defaults without automatic document migration. The
histogram_chart adapter validates publication eligibility and upstream context ownership and reads
both named outputs from one execution. ECharts renders equal-width category bars with exact labels,
never computes bins. All intervals and accounting are retained in the existing release artifact.

heatmap_stats@1 (ADR-131) adds a static-schema dataset output with typed X/Y categories, stable
axis/cell IDs, explicit aggregate, presence and row/valid/missing counts. Bound the full Cartesian
domain before materialization (200 categories/axis, 10000 cells). Aggregate the full input, never
the preview page. Rational intermediates preserve integer/decimal values; average is the only
exact-operation rounding boundary. Empty categories are retained; absent pairs have null values.
Ordinary publication/table/release APIs support this output. HeatmapSpec@1/heatmap_chart (ADR-132)
bind semantic roles and extent/zero_centered/fixed colour configuration. The renderer reads all
prepared cells from one graph execution and uses rational differences for [0,1] presentation positions;
HeatmapScaleResult preserves exact bounds and stable cell identities. ECharts only maps positions to
colours. Missing layers have separate markers/colours; exact tables use local pagination. Releases
retain every cell and scale; restore remaps field roles. Upstream context ownership is validated.

RadarSpec@1/radar_chart (ADR-133) consumes any prepared dataset publication, not a special statistical
node. Full-table validation checks one row per nonempty profile, numeric axes, declared units, bounds
and the 20-profile limit. API save orchestration supplies a render-validation callback to the document
service before persistent mutation, under the existing project lock/CAS; absence of the callback
fails closed for radar. Shared scales check units/bounds; explicit per-axis min-max uses rational
differences for presentation coordinates. RadarPresentation carries stable profile IDs, optional
coordinates and completeness alongside the named profiles dataset. Missing axes are never filled;
original values, not drawing coordinates, drive exact tables/tooltips. Frozen artifacts contain the
complete bounded result. No alternate calculation engine, persistence schema or migration is needed.

waterfall_steps@1 (ADR-134) prepares ordered contributions, opening balances and explicit subtotal/
final markers through the common typed executor. Input schema determines static output IDs/types;
exact integer/decimal accumulation uses Fraction and checked Decimal128 conversion at the input scale.
Float64 input remains approximate. The dataset carries start/end/value/balance, row kind and stable
step identities. Expected totals reconcile against the running balance without double-counting.
Null contributions, invalid marker order, duplicate labels, overflow and more than 2000 output steps
fail explicitly. Rendering/statistical limits never truncate a sequence. WaterfallSpec@1/waterfall_chart
(ADR-135) validates exact roles and pre-preparation context ownership, and consumes the dataset from
one execution. WaterfallScale transports exact full-data ticks/bounds and rationally normalized
endpoints keyed by step ID. ECharts custom rectangles draw those endpoints, not cumulative sums;
original values drive tables/tooltips. Keyboard viewport controls, slider zoom and local table paging
do not alter the full result/scale. Release artifacts retain every step and typed presentation data.

ComboSpec@1/combo_chart (ADR-136) consumes an ordinary prepared publication. Full-data validation
checks unique category rows, numeric fields, axis assignments, units and the 2000-row limit before
save, using the same lock/CAS callback boundary as radar. Presentation uses exact rational zero-
inclusive extents and bounded signed coordinates, retaining zero as the bar baseline. Typed exact
ticks and stable publication/category identities accompany the projected observations dataset.
ECharts uses explicit ticks, never recalculates measures/scales or connects missing line values.
Complete presentations survive release artifacts; existing recursive field-ID remapping handles
restoration. Context filtering changes the selected population; viewport/table pagination does not.

table_rollup@1 (ADR-137) prepares analytical-table rows via the common TypedNodeExecutor. Static
schema binds ordered dimensions and UUID-backed measures to explicit row/parent/kind/depth/count
roles. Leaf groups retain rational observation states; ancestors merge unrounded sums/counts/
extrema/denominators, never displayed aggregate cells. Project only selected fields before Python
iteration; bound output to 20000 rows and existing engine limits. Typed null dimension keys remain
distinct from total placeholders through kind/depth/identity. Plain table publications and full
frozen artifacts consume this dataset. AnalyticalTableSpec@1 (ADR-138) binds exact preparation roles,
visible measures, pinned columns, density and bounded ordered threshold rules. The adapter compares
decimal strings on the server and returns typed row/column-keyed presentation markers alongside
the same bounded table page. Full-data releases retain all rows/markers; frozen reads page them
together. The HTML renderer displays exact cells and semantic labels, never aggregates or evaluates
numeric rules. Existing restoration remaps stable bindings; legacy table contracts are unchanged.

Exact expressions are opt-in calculated_column@2 (ADR-118), with typed Decimal128 output metadata
and a single explicit half-even rounding boundary. A bounded allowlisted rational evaluator handles
decimal/integer inputs inside the common backend node executor; only referenced columns leave the
Polars frame, and no user code is evaluated. Shared syntax/reference parsing preserves v1 semantics.
Output is a normal Dataset with exact transport, usable by group_by@2/@3, publications and releases.
Frontend only edits the versioned config; v1 helpers do not rewrite v2 nodes. No persistence migration.
ADR-160 extends this same allowlisted evaluator with typed predicates and lazy numeric if_else.
Scalar string/boolean/date/datetime fields can participate in predicates, not monetary arithmetic.
Null comparisons use three-valued logic; null if_else predicates select the otherwise branch.
Both branches are validated/included in lineage; only the selected branch executes per row.
Release restoration remaps expression identities outside string tokens, preserving business literals.
window@3 (ADR-161) uses a separate exact executor with the existing ordered config shape. Polars
sorts and groups row indices; bounded full-population rational state produces Decimal128 values at
the source scale, preserving input fields and provenance. No hidden Float64 conversion or per-row
rounding. Ordered keys must be unique inside partitions, including row_number; explicit output
limits bound sorting/materialization. Legacy windows retain their existing execution and limits.
Exact pivot@2 (ADR-164) shares dynamic field identity construction with v1, not its Float64 execution.
Native role projection/grouping maps observations to bounded output cells; rational aggregation emits
explicit Decimal128 metadata/transport. Count remains Int64. The common data-dependent schema resolver
and cache execute the node to discover categories and propagate fields to downstream nodes.
Convert Types applies its existing whole-value integer guard to decimal as well as float (ADR-165).
Join/Union and Join record diagnostics share decimal schema/cast rules (ADR-166): precision 38,
maximum explicit source scale, physical-scale validation and strict overflow rejection. Known
unit/currency conflicts fail; unknown annotations do not assert compatibility. Non-key Join fields
are untouched. Diagnostics reuse Join schema inference without materializing the combined result;
exact transport survives composition, while upstream diagnostic summaries do not propagate.
CompiledFormula/ValueSchema retain decimal metadata through field projection and materialization
(ADR-167). Decimal branch selection and comparison reuse common-scale validation, with explicit
strict casts before conditional selection. Input physical scales are checked against declared
metadata. Append/preview/legacy pass-through column schemas agree with execution; no schema is
inferred from preview samples. Decimal scalars remain outside the legacy scalar contract and are
rejected in preflight, not implicitly converted to float.

Universal file refresh reuses SourceVersion, UpdateItem, report jobs and SourceSnapshot overrides
(ADR-115). DatasetBinding maps stable logical resources/fields to incoming resources/columns.
Checks normalize every active table into retained, immutable staged snapshots; only apply changes
active pointers. Staging commits independently from the cancellable check job and is reusable by
version/profile fingerprint. New refresh artifacts have durable cleanup intents before writing.
Apply/rollback increments source and referencing workflow revisions; rollback never rewinds CAS.

Initial imports use typed ReportDocument(kind=import_draft) authoring state separate from active
source metadata and report-check fingerprints (ADR-116). Draft revision and source revision both
guard apply; the draft request ID is stable across retries. Snapshot/pointers/revisions and the
completed draft receipt commit together. Session reads synthesize unsaved revision-zero settings
without persistence; resumed previews are recomputed. Source deletion also deletes its draft.
Initial raw uploads and profile-apply Parquet use the same reserve-before-lock artifact intents.
The startup file_cleanup CLI recovers unadopted writes before serving requests; committed adoption
removes the intent atomically, protecting a snapshot whose HTTP response was lost. No new DDL.

Existing-report wizard editing is a projection of the current published graph (ADR-117), not
the creation receipt. A pure suffix recognizer/patcher owns group_by@2/@3, an exclusive literal
filter@1 and recognized exact row/summary formula chains (ADR-119); preserved upstream steps use
the normal schema/execution services. Unrelated
nodes, catalog, presentation and dashboard documents remain unchanged. Unsupported/shared/context
graphs have a read-only projection. Preview and apply validate the project state token; apply
uses save_graph(commit=False), visualization revision and a report_edit_receipt in one transaction.
Lock project -> workflow read -> selected visualization before checking widget usage, respecting
the existing shared visualization lock used by dashboard attachment. No schema migration required.

New wizard reports use group_by@3 with stable per-measure UUID identities, independent of order
and labels. Legacy versions remain unchanged. Row and after-total formulas compile into ordinary
calculated_column@2 nodes with explicit per-node rounding. The UI scope marker supports suffix
recognition only; the graph remains the calculation authority. /fields endpoints resolve typed
schemas; preview/apply executes full data. Manually contained/shared summary steps are graph-only.
Publication targets follow the last summary node; stable output IDs survive renaming/reordering.
New empty request defaults are omitted from receipt fingerprints for backward-compatible retries.

Prepared-input report creation (ADR-120) selects a saved dataset publication and appends an ordinary
branch to its existing workflow. Typed input catalog/detail APIs expose names, compatible schemas
and the project state token. Apply preserves the graph prefix and all metadata; the new publication,
visualization, dashboard, graph CAS and receipt share one transaction. No cross-workflow executor or
materialized source is introduced. The created edge references the selected physical table endpoint,
not a runtime publication alias; later publication retargeting does not change that edge. Shared
upstream edits use existing graph safety, source invalidation and release-remapping contracts.
View-context publications are excluded rather than losing their filters. Use workflow parameter
defaults and require full-table block output ports. Input reload invalidates preview without
discarding local measure settings; schema caches include publication identity as well as revision.

Named measures (ADR-121) are typed metadata in PublishedOutput.measures, referencing existing
numeric fields and explicit grain. Registration executes the complete publication, not a sample.
Direct reuse creates only visualization/dashboard/widget/receipt, leaving the graph unchanged.
VisualizationConfig.grain_column_ids distinguishes legacy absence from an empty single-total grain;
the shared visualization executor validates numeric schema and full-data uniqueness before rendering
limits. Guarded appearance saves/copies preserve field/publication identity and grain. Old graph
clients omitting measure metadata do not erase it. Catalog mutations use existing graph revision CAS;
report creation uses the project token/lock and atomic idempotent receipts. No DDL is needed.

ADR-125 extends direct reuse with up to seven additional measure IDs from the same publication.
Definitions must bind distinct fields and identical grain sets (primary grain order is preserved).
One render of the common publication supplies every value; no join, new graph node or reaggregation.
Multi-measure tables persist measure_column_ids alongside grain_column_ids in VisualizationConfig.
The common executor validates every selected numeric field, full-data finiteness and grain before
pagination. A shared structural guard also rejects incompatible presentation/hidden selected measures
on appearance saves. Older saves/copies restore original guards; catalog deletion does not erase them.
Absent measure_column_ids preserves existing single-measure/legacy behavior. Empty additional IDs
are omitted from receipt fingerprints. Release ID remapping covers the field list; no new DDL.

align_measures@1 (ADR-126) consumes left/right prepared datasets within one graph. Explicit key
pairs require identical supported logical/physical types, full-data uniqueness and an explicit
null-key policy. Full outer alignment preserves numeric dtypes, metadata and nulls; presence flags
distinguish absent rows. Key-only matching checks output cardinality before the wide join. Stable
output IDs use node/side or node/left-key identity, compatible with ordinary release remapping.
PreviewRead.alignment_diagnostics reports complete matched/unmatched counts only for that node,
not inherited downstream metadata. Graph controls use resolved columns from the corresponding port.
Existing Join and historical wizard receipts remain unchanged.

ADR-127 adds typed alignment-reports preview/apply APIs. AlignmentReportService resolves two eligible
publications in one workflow through ReportInputService, appends one ordinary node/two edges, and
executes the common engine. Preview returns exact first-50 rows and full diagnostics without writes.
Project lock/token plus workflow CAS protect atomic graph/publication/table/dashboard/receipt apply.
The new receipt kind has its own fingerprint/UUID namespace; identical retries are served before
checking the now-changed token. The table stores grain and both numeric-field guards. UI schema tokens
must agree; explicit reload retains selections but invalidates preview. No separate calculation recipe
or cross-workflow executor is introduced. The existing suffix editor leaves aligned reports graph-only.
ADR-158 extends creation with ordered calculated_column@2 nodes after alignment. A shared graph
composer powers schema-only field inference, full execution preview and atomic apply. Formula
identities and backward references are ordinary graph contracts; terminal publication/table selects
the resulting chain while retaining both reused-measure guards and full alignment diagnostics.
Empty formula lists are omitted from receipt hashes for historical retry compatibility. Drafts retain
formula IDs/settings, not schemas or previews; the UI uses only unchanged server-checked prefixes.
ADR-159 recognizes/patches a guarded alignment suffix in place. The two concrete input edges are
preserved; only alignment configuration and owned marked exact formulas change. Shared/context/
container references block wizard ownership. A separate typed edit API shares creation's schema
and execution helpers, retaining project CAS, visual lock, atomic graph/visual update and exact
target-bound receipts. Publication identity is stable when its terminal formula changes. Table
rebinding is explicit and rejects dangling appearance/navigation fields. No second saved recipe.

Calendar comparisons (ADR-122) use calendar_period@1 before aggregation and period_comparison@1
after summary formulas. Both are ordinary schema-aware unary nodes. Calendar ordinals plus explicit
partitions provide exact previous-period/year lookup; missing dates are never replaced by row lag.
The comparison executor validates full-data uniqueness and uses existing exact rounding primitives
for decimal/integer arithmetic. ADR-123 extends
suffix ownership to matching calendar/comparison pairs, including their exclusive edges and stable
identities. Shared, manually contained and incompatible steps remain graph-only. Adding/removing
the pair requires explicit field rebinding; omitted comparison settings on an existing comparison
are rejected as a stale client, while explicit null requests removal. Filters precede bucketing and affect both
periods. All state lives in node config; new empty comparison settings are excluded from old receipt
fingerprints. Freeze/restore uses the standard ID remapper, without a new persistence schema.

Comparison charts (ADR-124) reuse ordinary Bar/Line configurations. The binding compiler receives
the terminal comparison node ID and selects its stable previous-value field plus the configured
current measure. No derived field is discovered by its label or column position. No percentage,
difference, boolean or unrelated measure is automatically added to the axis. Only the date dimension
is permitted. Empty additional-series names follow schema labels after renaming. During wizard edits,
bindings must match current comparison roles or explicit rebind_fields is required. Existing manual
appearance remains intact; missing values remain null and lines explicitly do not connect nulls.
The ordinary renderer retains prepared ordering; no browser aggregation or hidden calendar filling.

## Reliable report cycle (ADR-113, 2026-09-24)

DataSource retains its logical ID and active storage pointer. SourceVersion owns immutable
file metadata; migration 0010 backfills existing artifacts. ReportDocument is a revisioned,
kind-validated persistence envelope for update drafts, rules, jobs, releases and artifact intents.
SourceUpdateService prepares explicit per-sheet/layout field bindings and applies a complete
source set under the project lock and revision CAS. Execution pins all source pointers in one
query. Historical files remain available; source cache keys include bindings and version sets.
Applied source updates also advance every referencing workflow revision atomically, invalidating
existing preview/schema clients and conflicting with stale authoring tabs without changing node IDs.
Excel-period execution reuses Union, without hidden financial expressions or deduplication.

Quality rules inspect complete generic outputs. Checks carry a fingerprint of source sets,
workflow/visualization/dashboard revisions and rule revisions. Errors block apply/publication;
warnings require recorded acknowledgment. Published scalar metrics provide previous baselines.
Report lineage uses actual dependency branches. Frontend contains no calculation engine.

Persisted jobs use the single application worker and cooperative cancellation. Restart marks
unfinished jobs interrupted. Release artifacts contain complete widget data, frozen contexts,
checks, rules and project configuration. Reserved storage keys have durable cleanup intents
before writing; final publication removes the intent in the release transaction. Startup cleanup
runs before accepting work. Restoration remaps identities and copies files into a new project.
See docs/REPORT_CYCLE.md for boundaries and operation; no multi-worker scheduler is implied.

## Authoring guidance (ADR-112, 2026-09-24)

The shared visualization editor gates requests with schema-based form completeness hints.
These are presentation checks, not a parallel calculation/type validation engine. Backend
validation remains authoritative. TableColumns owns only search/selection ordering; stable
column IDs remain in the existing visualization config. No storage/API changes are required.

## Dashboard workspace (ADR-111, 2026-09-24)

VisualizationEditor supplies the standalone dialog and dashboard side panel. Dashboard owns
panel selection and an isolated selected-widget preview; global query results are not modified
by draft appearance. Data/context keys gate responses and cancellation; pure appearance changes
reuse materialized results. IndependentVisualizationPreview extends the save input with context
and parameters, forwarded to render_visualization without persistence. Saved APIs are unchanged.
WidgetPlacement and placement helpers enforce bounded, nonoverlapping keyboard edits and
first-free placement. The grid does not silently compact manual positions. A bounded in-memory
layout history and existing session draft retain local edits independently from visualization CAS.
Shared copy replaces only the selected draft widget reference. No new schema migration is needed.

## Generic P&L preparation and series (ADR-110, 2026-09-24)

Calculated Column and field expressions share the same typed allowlist, including conditions,
text/date conversions and null handling. No Python/JavaScript evaluation is used. Window v2
adds cumulative sum/max and previous numeric value; ordering must uniquely identify rows within
each partition. The Calendar source creates a bounded inclusive daily range with stable field ID.
Excel layout carries skip-after-header and excluded-tail counts through execution, preview and
immutable-source cache identity. Formula-cache checks apply to selected headers and data.

Join diagnostic previews execute the two upstream branches through the ordinary engine and
cache, then select unmatched or duplicate-key input rows without materializing the Join itself.
This remains available when declared cardinality prevents Join execution. Preview pagination
is bounded and client results/errors are keyed to diagnostic kind, offset, revision and parameters.

Independent Bar/Line configuration permits up to eight distinct numeric series on one published
table. No new aggregations or formulas are introduced into visualizations. Missing values remain
gaps. Existing empty-series serialization is preserved. All settings use existing JSON persistence
and revision checks; no relational schema migration or workflow format increment is needed.
The synthetic P&L recipe is an authoring acceptance fixture, not a production report executor.

## Composite Join (ADR-109, 2026-09-24)

Join v2 accepts keys[{left_key,right_key}], how and relationship. Its typed registry config
forbids unknown fields and validates unique key selections. Join v1 adapts to one pair with
many-to-many semantics. The shared Polars executor counts composite tuples, checks declared
cardinality and estimates result size before materialization. Full-input diagnostics reuse
these counts. Creation and inspection use one schema-aware field-pair form. Existing revision,
undo, source cache and published-output contracts remain unchanged.

## Guided authoring and Join diagnostics (ADR-108, 2026-09-23)

NextStepPanel and shared create/edit dialogs write ordinary graph operations through existing
history/autosave. Group By uses its existing configuration form and executor. Simple calculation
parsing only populates UI controls; the backend safe expression compiler remains authoritative.
Unknown expressions stay intact in advanced mode. Publication naming uses a localized dialog.
Captions and wide bottom/A-B previews are presentation concerns and never trigger eager execution.
JoinDiagnostics is optional typed PreviewRead metadata calculated over complete Join inputs,
independent of preview limits. Cached results retain it; only the matching target node exposes
it. Existing output data, Join semantics, persistence and format v3 are unchanged.

## Result cards and table-driven authoring (ADR-107, 2026-09-23)

WorkflowPresentation.results stores publication_id and position only, within existing JSON
and workflow CAS. Omitted result positions survive older client saves; an explicit empty list
clears positions. References must be unique and belong to the effective publication catalog.
No schema migration or format upgrade beyond v3 is needed. Canvas publication edges never
enter the computation DAG; collapsed blocks expose actual published endpoints.
Join and calculated-column dialogs create existing executor nodes and all their incoming
edges in one history operation. Formulas use the existing safe compiler; no UI execution or
implicit rewriting of downstream branches occurs. Visualization creation flushes pending
workflow changes and opens only after successful acknowledgement.

## Published results and independent visualization documents (ADR-106, 2026-09-22)

For new workflows the primary format is v3. Workflow.result_catalog stores stable named
table/scalar endpoint references and reusable context profiles in the same CAS operation as
nodes, edges and presentation. Format acknowledgement prevents a v1/v2 client discarding it.
Visualization owns type/configuration/publication_id and an independent revision; chart nodes
are no longer required. Graph saves synchronize the historical chart index only for legacy
rows, and maintain endpoint references for independent documents. Configurations are not copied
into widgets. Explicit visualization copy creates a new revisioned document.

View context compiles into internal generic context_filter steps at the author's selected table
outputs. Execution remains in the common Polars runner. Source and upstream cache entries are
shared; parameterized predicates invalidate dependent branches through ordinary graph keys.
The compiler does not guess denominators, reorder calculations or add financial logic. The
internal predicate is excluded from the public node catalog and cannot be persisted as a node.
Date/datetime restrictions use inclusive calendar dates and exclusive next-day midnight for
datetimes in the configured data timezone; null dates are excluded only for an active period.

Dashboard period and selection values live in the URL, not calculation revisions. Placement
inherits data roles; navigation replaces compatible inherited values with selected fields.
Highlight-only skips the selected role's context predicates. Schema/preview errors remain local
to their visualization; a missing period binding is explicit. Full authoring guidance and
conversion constraints are in docs/PUBLISHED_DASHBOARDS.md. Migration 0009 adds the catalog,
publication reference and visualization revision. Older architecture entries below describe
the retained historical implementation; ADR-106 supersedes their chart-config ownership rule.

Field expression/scalar boundaries (ADR-105): field_formula compiles expressions over a/b/c through
the shared safe compiler, with identical-context field operands or explicit scalars. field_scalar
materializes exactly one selected field value from exactly one row and preserves type/null.
KPI@2 may receive a separate one-row table solely for explicit navigation context. No new financial
service or alternate execution path exists. Field expression checks propagate non-finite failures.

## Opt-in field editor foundation (ADR-093)

Bound visualizations (ADR-104): bar_chart@2 consumes table/category/value with identical row context;
kpi@2 consumes a numeric/text/null scalar. Both use TypedNodeExecutor and produce a named dataset.
Polars field expressions materialize only at the consumer, preserving deferred error checks.
Bar limits are explicit errors, not truncation/aggregation. Strict appearance config excludes
category/value selectors. Stable generated role IDs and the effective config helper connect existing
visualization rendering to the new contract. Upstream columns remain available for navigation and
highlighting. V1 nodes/configuration and visualization identities remain compatible.
Dashboard settings/copy/navigation preserve workflow format and presentation; copying duplicates
bindings rather than depending on the original chart. Public block outputs and widget role mappings
are adjusted in that same transaction. The field editor renders visualization previews on request.

Catalog version identity (ADR-103): saved nodes resolve exact type/version definitions for cards,
inspector, connection validation and output labels. Creation menus carry both identifiers; when
multiple versions coexist their labels include the version. Missing definitions do not fall back
to newer/older contracts. Workbook insertion currently targets excel_source v1 explicitly.

Typed schema diagnostics (ADR-098): ValueConnectionError may carry a port or config path.
The schema resolver preserves it in GraphIssue and finds the offending inbound edge by port.
Preflight execution rejection retains these issues; existing inspector error rendering labels
input paths and localizes repair instructions. Generic compiler/runtime errors remain separate
follow-up work. ADR-099 preserves typed executor runtime issues at the execution boundary and
attributes comparison compiler errors to operand b. Deferred field checks identify the consumer
input at materialization, without guessing the originating arithmetic node. Current schema issues
mark inspector controls with aria-invalid, localized title and border. Runtime issues remain in
preview. ADR-100 reports current structured preview errors to the selected inspector, gated by
draft identity/revision/parameters; retry and session changes clear old errors. A/B retain local
errors. Preview content remounts on workflow/node/output/revision/dirty/parameter changes, so
late requests cannot repopulate a new session. Direct named-field errors identify outputs.<port>.
No API shape or database change.

WorkbookBrowser is a source navigator beside the canvas, not an alternative execution graph.
It lists uploaded metadata without extra dataset execution, mounts at most 50 matching sheets
per expanded book and opens actual excel_source nodes. Selection validates source/sheet/node
identities against current project state. Reopening an instance preserves its config, position,
edges and ID; adding a sheet uses the ordinary draft/history/save operation. Drag payloads carry
only identities and screen coordinates are converted by React Flow. Browser expansion/search
are local view state.

Canvas workbook cards (ADR-094) project actual member endpoints through presentation handles.
renderBookWire maps a sheet endpoint to its visible book; resolveBookConnection reverses that
mapping before shared connection validation and persistence. Computational edges never contain
container IDs. Group/ungroup, collapse, movement, detach/return share graph CAS and history.
Connected fields stay mounted in compact cards; selected sheets expose searchable field lists.
Source deletion or changing source_id reconciles membership in the same draft, removing empty
books. Block members are excluded from workbook grouping. Dragging a sheet onto blank canvas
detaches its existing node, with no data copy. Container membership uses migration 0008 unchanged.

The workflow page creates a new explicit v2 workflow from the New field workflow action; existing
v1 workflows are not upgraded. mode=fields opens FieldWorkflowEditor with the v2 catalog. Classic
editor remains the default and retains its old-client format guard. Both editors reuse the same
WorkflowAutosave and GraphHistory implementations. Field drafts use a separate fields-v2 storage
namespace so switching modes cannot overwrite unsaved typed wires; wrong-format drafts are refused.
Presentation metadata is included in the v2 draft and history. Workbook cards render their sheets;
composite blocks (ADR-101) project their real boundary endpoints onto collapsed cards. Internal
wires remain saved but are visually hidden. Opening reveals unchanged members on the shared canvas.
reconcileBlocks preserves public IDs, removes deleted members/references and exports explicit new
crossing connections. Packing/unpacking and extra output publication are one graph/history action.
Nested/workbook membership is excluded; source and visualization identities are never rewritten.
BlockSettings (ADR-102) stages metadata locally. editBlock validates nonempty/exclusive membership,
preserves existing endpoint IDs and restores required boundary ports before reconciliation.
Apply is one history/CAS change; cancel leaves revisions unchanged. Optional public ports can be
hidden and named real inputs/outputs/fields exposed. Card labels use the saved public alias;
tooltips retain endpoint names. Member removal never deletes the calculation node or its edges.

Canvas handles encode port+column only for display; field-wires serializes explicit source_port
and source_column_id. Connections can be dragged or selected by node/field label. Input replacement
is one draft/history action. Local checks cover port kinds, cycles, capacity and known row context;
backend validation remains authoritative. Cards retain connected/focused ports outside a scroll
window of at most 16 unconnected fields (24px rows, 240px viewport). Search resets the scroll.
Graphs over 40 nodes default to compact cards; selection reveals fields unless explicitly hidden.
NodeFinder navigates to real nodes or their workbook container. Field mode uses its parameter-aware
POST schema query without the unused classic GET query (ADR-097).
Drag hints reuse normalized connection validation and require
a current output schema before showing compatibility. Known arithmetic/boolean/comparison types
are checked locally; backend remains authoritative. fieldPath follows exact projected endpoints
and expression wires, stops at table-producing transformations and never invents column lineage.
Path selection and drag state are local (no save/revision); unrelated wires are dimmed. Full
financial-project/operator acceptance remains open.

Output drops on blank canvas open a registry-driven operation/input chooser (ADR-096). It uses
only current schema and the common validator; selection is revalidated before committing one
node-plus-edges history action. Typed value/table operations may additionally connect the exact
table named by row_context. Capacity and composite public-port boundaries remain enforced.
Cancellation and output-selection/menu state do not save. No hidden data transforms are added.

Named-output preview is shared with the classic panel. A/B pins are local view state and request
separate previews; they do not infer row equivalence or trigger whole-graph thumbnail execution.
Revision, parameters and output identity hide obsolete results. POST workflow/schema accepts
preview parameters without changing revision; existing GET schema retains defaults. Incomplete
typed drafts retain schemas of valid independent nodes, while downstream unavailable schemas
receive explicit issues. Fatal structural graph errors still block inference.

## Workflow container persistence (ADR-092)

Workflow.presentation is a JSON/JSONB column added by migration 0008, with empty default {}.
Typed WorkbookContainer and CompositeBlock contracts contain labels, positions, collapsed state
and real member node IDs. Books reference one Excel source and optionally detached member IDs;
sheet reading options remain in each source node. Public ports reference actual member node/port
endpoints, optionally an output column ID. There is no copied internal graph or new execution node.

Every crossing edge must have a public boundary endpoint; additional outputs may be pinned.
Container/node IDs cannot collide, membership cannot overlap, nesting is not representable and
book nodes cannot also belong to a block. Validation is structural and performs no source reads;
availability of projected fields remains the schema/execution layer's responsibility.
The normal save operation validates metadata against the submitted graph and persists both under
the existing revision CAS. Missing/null presentation preserves its locked database value; {} is
an explicit unwrap. Retained references are validated against changed graph members/ports too.
Format v1 omits presentation in reads; non-null presentation requires v2. Legacy per-node UI
groups remain untouched and are not automatically converted. Downgrade locks workflows and
refuses to drop nonempty container metadata. New editor/pack-unpack UI remains separate work.

## Data-dependent schemas in typed branches (ADR-091)

Typed schema resolution proceeds in DAG order. For a legacy DATA_DEPENDENT executor it first
validates the resolved inputs and configuration, then materializes only the node's ancestor
branch through the common runner. An internal execution entry skips repeated typed schema
preflight for this already checked prefix, avoiding recursion; structural validation, source
access checks, ordinary executor validation and resource limits remain active. Public execution
always runs preflight. The resulting Dataset schema receives the dynamic node's own RowContext;
downstream projections are checked against its actual stable column IDs before they execute.

Table results reuse the bounded cache with existing parameter/output identities. Changing a
parameter can remove a Pivot column; its wire is reported invalid rather than reusing an old
schema. Materialization errors retain the actual failing ancestor node. Schema discovery may
execute data-dependent prefixes, but static-only branches remain schema-only. Executors marked
UNKNOWN_UNTIL_EXECUTION still require a discovery contract before they can enter typed branches.

## Typed graph execution and named previews (ADR-090)

TypedNodeExecutor declares infer_outputs/execute_outputs maps. The common runner adapts legacy
Dataset executors and routes table/field/scalar values by port; fields retain their RowContext.
V2 branches with typed operations or projections receive schema preflight before materialization.
Accepted port kinds describe alternatives; resolved schemas determine the actual kind and type.
Expressions remain lazy until append/filter/sum or an explicitly requested field preview.
The eight initial operations are exposed by catalog format_version=2; the default catalog and
current editor remain v1. Preview requests accept output_port; v2 responses include output_port
and value_kind while retaining the bounded Dataset envelope, saved revision and parameters.

Cache dependencies include source output and projected column ID. Scalar parameter identities
include only the used resolved value/type. Table results use the existing bounded cache; composed
expressions, scalars and multiple-output typed results are not stored in that Dataset-only cache.
Source availability/ownership is validated before cache access. ADR-091 adds data-dependent
legacy schemas, including Pivot, to typed branches. ADR-092 adds workbook/composite persistence;
editor forms/translations remain open.

## Persisted field projections (ADR-089)

WorkflowEdge.source_column_id identifies a projected column of a dataset output. The optional
reference is preserved through API, ORM and domain conversion; absence still means a table edge.
Migration 20260921_0007 adds the nullable String(200) column without rewriting existing graphs.
V1 serialization omits an absent reference, preserving existing snapshots. New field connections
require format_version=2 on save; ordinary revision/ownership checks still apply. Downgrade locks
workflow_edges on PostgreSQL and refuses to remove the column while any projection exists.

Graph validation derives FIELD for a projected dataset output and rejects projections in v1 or
from non-table outputs. ADR-090 replaces the temporary routing guard with actual schema and
context validation. A saved draft never executes a field wire as a table wire. Presentation
metadata is defined in ADR-092.

## Typed value foundation and format acknowledgement (ADR-088)

The approved field editor is staged in docs/FIELD_EDITOR_PLAN.md. Domain values distinguish
tables, fields (Polars expression plus row context) and scalars. Row context is the workflow,
node and output endpoint; a table transformation establishes a new context. Cross-context
arithmetic is rejected; no positional alignment is inferred. Field projection uses column IDs.
Schema-only projection enables preflight without source materialization. Arithmetic and predicates
share the allowlisted formula compiler; predicate syntax is opt-in and v1 formulas are unchanged.
Typed null scalars retain their declared type. Runtime arithmetic checks travel with expressions.

The existing runner now routes legacy results by declared output name via a zero-copy adapter;
terminal visualization previews remain Dataset responses. Typed graph routing is defined in ADR-090.
PUT WorkflowSave.format_version defaults to 1. The service checks stored format after acquiring
the project lock; downgrade returns WORKFLOW_FORMAT_UNSUPPORTED (409). Explicit upgrades commit
with the graph's normal revision CAS. Current clients explicitly acknowledge only v1. Unknown
fields in v2 drafts are rejected, not discarded. The existing Workflow.version column stores
format; no new persistent columns or migration are needed for this guard. Field projection
persistence is added by ADR-089; presentation persistence still needs its own migration.

## Large collapsed group projection (ADR-087)

Complete group summaries use dependency layout with actual boundary-port card heights; contracted
visual cycles fall back to a grid. Partial summaries move proxies clear of expanded cards.
Real node positions, all edges/ports and persistence remain unchanged. Canvas minimum zoom is
0.05 so Fit view can encompass large graphs. Acceptance copy tools belong only to e2e, not runtime.

## Dashboard view and layout templates (ADR-086)

The dashboard page owns URL mode=view and propagates it through parameter/drill navigation.
DashboardEditor stays mounted across mode changes, retaining its draft and filter input state.
View mode hides authoring and disables grid interaction; unsaved data is explicitly identified.
layout-templates is a pure placement function over widget metadata. LayoutTemplates owns staged
preview and guarded position-only undo. Applying flows through existing draft change and CAS
save paths; visualization semantics, widget identities/actions and backend execution are unchanged.

## Atomic navigation context authoring (ADR-085)

dashboard_navigation composes existing graph and dashboard services with commit=False under a
project lock, checks source/target dashboard and workflow revisions and commits once. The existing
ExecutionPlanner limits schema validation to the visualization branch. Only missing input fields
may be appended to context_column_ids; existing visible columns cannot be turned into hidden ones.
The UI reviews additions/shared uses and uses this endpoint only from a clean dashboard. Existing
field-only mappings still use local dashboard drafts. No DB schema change or alternate executor.

## Guided widget navigation (ADR-084)

WidgetNavigationDialog stages an ordinary NavigationAction. The pure navigation-plan helper
offers unique type-compatible name matches and reports structural mapping issues. Sample preview
and actual clicks share navigationValues, using field IDs rather than display text. Apply merges
the action into the dashboard's existing local draft; ordinary dashboard CAS persists it. No
workflow mutation is performed for existing-field mappings. Missing fields use ADR-085 above.

## Parameter ID/label selectors (ADR-083)

ParameterOptions optionally references a label field alongside the typed value field. NodeValues
returns bounded distinct pairs, legacy scalar values, label schema and the selected pair outside
the search page. Validation rejects ambiguous ID-to-label mappings before search/limit. Polars
handles uniqueness/filtering; only bounded rows become Python objects. URL/workflow bindings
carry IDs alone. Missing optional labels retain the old behavior without a DB migration.

## Exact calculation navigation (ADR-082)

Dashboard widget links use workflow/node URL parameters. WorkflowPage verifies project
membership before resolving a requested graph; WorkflowEditor selects the requested node,
expands its group and highlights ancestors without changing graph persistence. Missing targets
are visible errors. Browser history and session drafts retain the existing dashboard state.

## Atomic visualization authoring (ADR-081)

dashboard_authoring composes graph/index and dashboard persistence in one transaction, with
project -> dashboard -> workflow locking and both revision checks. save_graph and DashboardService
save accept internal commit=False for this composition; their existing public paths still commit.
The additive dashboard visualizations endpoint creates a normal node/edge and adds/rebinds one
widget. CreateVisualizationDialog preserves stable IDs until success/explicit reload and reuses
the common visualization form. No copy of semantic config is stored in dashboard widgets.


## Dashboard visualization editing (ADR-080)

VisualizationSettingsDialog reuses the schema-aware workflow visualization form. It loads a
matching workflow/schema revision and changes one node config through saveWorkflow CAS. Saved
usages come from project dashboards; layout/title drafts remain in DashboardEditor untouched.
Errors preserve the modal draft; explicit reload discards it. No dashboard semantic copy or
multi-resource write is introduced. Successful saves invalidate all affected result caches.


## Saved calculation scope (ADR-079)

CalculationScopePanel uses calculation-scope to inspect saved Window/Group By ancestors and
Filter application points. Reachability is cycle guarded; after-calculation paths are the
intersection of calculation descendants and selected-node ancestors, keeping other Join inputs
separate. WorkflowEditor uses transient node/edge/selection snapshots for highlights and the
existing group projection/viewport functions. No view action is serialized into workflow state.


## Analytical authoring (ADR-078)

AnalyticsDialog stages share/rank configuration over an exact saved input schema. analytics-plan
produces PlannedStep records with stable UUID references; appendUnaryChain checks the proposed
branch before one graph update. Share uses Window + Calculated Column, rank uses Window, and
optional parameter selection uses a trailing Filter. The existing backend registry remains the
only execution model. Upstream filter explanations traverse actual input edges with cycle guards.
ADR-162 adds optional PlannedStep.version with a v1 default and exact catalog lookup before mutation.
Decimal or explicitly opted-in integer share/rank plans use window@3 and calculated_column@2; the
dialog only prepares typed configuration. Explicit output scale and trailing parameter filters retain
the same precision and calculation-scope contracts as manually authored graphs. Float64/legacy paths
remain v1. No recipe persistence, endpoint or second execution engine is introduced.


## Formula source presentation (ADR-077)

field-provenance resolves value origins by node and field identity from saved graph schemas.
Join ports and Union name alignment are explicit. It never parses expressions or executes data.
WorkflowEditor supplies origins only for its exact-current schema; FormulaEditor adds searchable
source labels and readable details. Missing metadata is disclosed, not inferred from global IDs.


## Grouped Unpivot authoring (ADR-076)

UnpivotConfig.labels is an optional source-ID-to-label map, validated as a subset of selected
value fields. Execution applies it only to field_name; stable field_id/provenance are unchanged.
GroupedUnpivotDialog stages identifiers, membership and labels. grouped-unpivot creates ordinary
unary branches through appendUnaryChain, then adds explicit Union left/right connections using
shared graph checks. WorkflowEditor applies the complete graph atomically through history and
revision-aware autosave. No recipe is persisted; node forms edit the generated graph directly.

## Preparation compiler (ADR-075)

preparation-plan maps a saved schema and transient rows to PlannedStep records with actual node
IDs. PreparationDialog previews these steps and submits the same plan to WorkflowEditor.
appendUnaryChain builds a complete proposed graph before state changes; both preparation and
calculated-field tables use it. Normal serialization, autosave, conflicts and history apply.
The plan contains only registered standard node types. Null-filling creates new calculated IDs;
final Select/Rename removes helpers and names the result. Integer fills use string coalesce and
explicit integer conversion to preserve precision without changing the formula engine.

## Calculated-field table (ADR-074)

calculated-chain constructs ordinary nodes/edges and reconstructs actual unbranched chains.
CalculatedFieldsDialog stages rows and uses FormulaEditor with the source schema plus stable
IDs of prior rows. Their types are explicitly unknown until backend inference. WorkflowEditor
applies a snapshot-checked batch through its existing history/autosave path. No separate recipe
is persisted. Editing existing chains changes config only; canvas edits remain authoritative.

## Named formula presentation (ADR-073)

FormulaEditor owns cursor/search interaction; formula-presentation recognizes canonical bracket
references while leaving quoted text intact. It resolves labels/types from input schemas,
never evaluates expressions. Token selection maps to canonical offsets; inserting a field
updates the existing expression config through ordinary autosave/history. Schema renames only
change presentation. No extra persisted display expression or formula source of truth exists.

## Configuration feedback (ADR-072)

WorkflowGraphValidator converts Pydantic structured errors to individual GraphIssue entries
without input dumps, library URLs or internal contexts. Each issue retains its node and config
path; schema and execution validation share this result. The frontend localizes controlled
messages and common configuration path labels, displaying list positions from one. Nested
issues and diagnostics survive English rendering too. No public shape or persistence change.

## Presentation groups and editor panels (ADR-071)

Group membership persists in node.ui.group. graph-groups derives hidden members, synthetic
proxy cards and boundary edges solely for rendering; serialization always uses original nodes
and edges. Proxy change events cannot mutate graph state. Each boundary handle retains the
original node/port identity. Group creation/rename/dissolution follows normal graph history.
GroupPanel provides member navigation; selecting a hidden member expands its group.
EditorPanels stores bounded widths and collapsed names separately in sessionStorage by workflow.
These view preferences do not change revisions, semantic configuration or execution caches.

## Graph history and layout (ADR-070)

GraphHistory observes serialized drafts, coalesces focused text edits/dragging and supplies
undo/redo drafts to the existing editor state and autosave writer. Revisions are never restored
from history. Selection, preview values and dependency highlighting do not enter history.
Graph layout computes topological layers and measured spacing; only positions are persisted.
protect_used_visualizations locks removed visualization rows before graph mutation and rejects
attached widgets with a typed 409 error, sharing the row-lock protocol of dashboard saves.

## Readable graph interaction (ADR-069)

The shared graph-interaction module resolves presentation labels and validates connection edits.
Optional node.ui.label changes only presentation; semantic output-field names stay in config.
Cards, finder and input selectors use the same label fallback. Dependency view is derived from
edges and applied only to React Flow rendering, outside serialized nodes/edges. Next-step
creation batches node/edge edits; input replacement validates the final edge set, preserving
port cardinality and DAG checks. Backend validation and revision-checked saves remain unchanged.

## Large-graph node access (ADR-068)

NodeFinder filters the current editor nodes locally by configured label/type/ID. Selection
opens the shared configuration panel and fits the React Flow viewport to the selected node.
Selection/viewport stay outside serialized graph state; pending edits remain in the autosave
draft. Reference authoring recipes are test tooling, with no application runtime dependency.

## Dashboard view state and navigation (ADR-066)

DashboardConfiguration is a typed JSON value persisted with dashboard revision (migration 0006).
It declares parameters, explicit workflow bindings, optional node/field choice sources and parent
links. WidgetConfig owns navigation actions; workflow visualization config still owns data fields
and presentation. context_column_ids adds stable row identities to visualization results and is
hidden in rendered tables. Clicked row fields are addressed by column ID, not labels or row text.

Dashboard page URL owns selected dashboard and typed values. Local layout/configuration drafts
remain separate. Applying filters does not write persistence; values map to the appropriate
workflow's parameter context. Result/query identity includes values so late slices cannot replace
the current one. The generic node-values application service executes an ordinary node, extracts
distinct values with optional labels (ADR-083), applies literal search and reports truncation.
Schema/type and project checks remain in existing domain/application layers; there are no
reference-specific runtime rules.


## Typed workflow parameters (ADR-065)

Workflow JSON declarations are revision-protected; runtime values are separate typed inputs
on preview and POST visualization requests. ExecutionContext carries definitions/resolved
values without persistence dependencies. Filter validates declaration/column compatibility
during schema inference and requires its value during execution. Only dependent Filter cache
keys include referenced values; downstream keys inherit the change. Unrelated values never
invalidate Excel materialization. UI exposes declaration/default and temporary preview inputs;
parameter changes remount result panels, leaving the graph/autosave state intact.
Migration 0005 adds an empty-default JSON column. Legacy saves omitting declarations preserve
them. Dashboard parameter bindings/navigation are specified in ADR-066 above.


## Presentation extensions (ADR-064)

ADR-067 adds opt-in `{parameter}` title templates and a stable-field/parameter highlight pair.
Schema inference validates declared references and compatible identity types. Rendering adds
resolved title/highlight metadata after ordinary node execution; it never filters or reorders
the comparison population. Table hidden context can carry the highlighted identifier. Legacy
literal titles remain literal. Selection uses the same URL/request context as dashboard filters.

Workflow-owned VisualizationConfig includes vertical/horizontal Bar orientation and
column-ID-keyed numeric formats. The typed rendering result carries these settings.
KPI accepts a single numeric or string value; all other chart numeric checks remain.
The frontend formats ratios, counts and amounts without modifying prepared values.
Dashboard widgets continue to store references and layout only. Existing JSON config
accepts the new optional fields with compatible defaults; no migration is needed.


## Constructor preparation extensions (ADR-063)

WorksheetLayout is a frozen value passed from Excel Source through SourceAccess to
the workbook reader. Header start/count and row-number selection participate in
immutable source cache identity. A defused OOXML scan determines actual content bounds,
merged ranges and missing formula caches before bounded openpyxl materialization.
The worksheet part-path access is isolated in the reader (pinned openpyxl).
Excel preview and execution share layout preparation. Logical column IDs remain
positional; original header levels and source row identity are explicit metadata.

Convert Types, Unpivot and Window implement the ordinary NodeExecutor contract.
They have no storage/session dependencies. Convert Types preserves column identity;
Unpivot emits stable field IDs separately from display labels and preserves
decimal values at the maximum declared source scale with explicit precision/scale metadata
and exact transport (ADR-163). Conflicting units/currencies, missing scales and overflow fail; the
generic Decimal(38,6) dtype default is not used for reshaping decimal values. Window keeps input
fields and adds a partition sum or an ordered row number. Each is configured through
the editor registry. Formulas compile an allowlisted typed AST into Polars; strings,
trim/lower, coalesce/nullif and safe_divide share inference and execution logic.

## 1. Purpose

This document defines the technical architecture of the Node BI MVP.

It describes:

* system boundaries;
* frontend architecture;
* backend architecture;
* persistence model;
* workflow representation;
* node contracts;
* execution model;
* schema propagation;
* dataset handling;
* visualization architecture;
* dashboard architecture;
* caching;
* storage;
* API conventions;
* error handling;
* security boundaries;
* testing boundaries;
* deployment model.

This document is the primary technical source of truth for the project.

Product behavior is defined in `PRODUCT_SPEC.md`.

Agent behavior is defined in `AGENTS.md`.

---

# 2. Architecture Goals

The architecture must optimize for:

1. correctness of data transformations;
2. clear separation between UI and execution;
3. persistence of user work;
4. extensible node system;
5. deterministic workflow execution;
6. understandable errors;
7. testability;
8. maintainability;
9. future support for additional data sources;
10. reasonable performance for workbook-scale data.

The MVP must not optimize for:

* distributed execution;
* multi-region deployment;
* enterprise-scale concurrency;
* streaming data;
* massive data warehouses;
* complex multi-tenant isolation.

---

# 3. Core Architectural Principle

The frontend describes analytical intent.

The backend executes analytical intent.

The frontend must not be the authoritative execution engine for data transformations.

Logical flow:

```text
User
  ↓
Frontend
  ↓
Workflow Definition
  ↓
Backend API
  ↓
Workflow Validation
  ↓
Schema Resolution
  ↓
Execution Planning
  ↓
Node Executors
  ↓
Dataset Engine
  ↓
Execution Result
  ↓
Frontend Visualization
```

---

# 4. High-Level System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│  Next.js / React                                            │
│                                                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Project UI  │  │ Workflow UI   │  │ Dashboard Editor │  │
│  └─────────────┘  └───────────────┘  └──────────────────┘  │
│          │                 │                  │              │
│          └─────────────────┴──────────────────┘              │
│                            │                                │
│                       API Client                            │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTP / JSON
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│                                                             │
│ FastAPI                                                     │
│                                                             │
│ ┌─────────────────────── Application Layer ───────────────┐ │
│ │ Project Service                                          │ │
│ │ Source Service                                           │ │
│ │ Workflow Service                                         │ │
│ │ Execution Service                                        │ │
│ │ Dashboard Service                                        │ │
│ └──────────────────────────────────────────────────────────┘ │
│                             │                               │
│ ┌──────────────────────── Domain Layer ───────────────────┐ │
│ │ Dataset / Schema                                         │ │
│ │ Workflow / Node / Edge                                   │ │
│ │ Node Registry                                            │ │
│ │ Graph Validator                                          │ │
│ │ Execution Planner                                        │ │
│ │ Node Executors                                           │ │
│ │ Formula Engine                                           │ │
│ └──────────────────────────────────────────────────────────┘ │
│                             │                               │
│ ┌──────────────────── Infrastructure Layer ───────────────┐ │
│ │ PostgreSQL                                               │ │
│ │ File Storage                                             │ │
│ │ Polars                                                   │ │
│ │ DuckDB                                                   │ │
│ │ Excel Reader                                             │ │
│ │ Cache                                                    │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

# 5. Technology Stack

## 5.1 Frontend

Primary stack:

* Next.js
* React
* TypeScript
* React Flow
* TanStack Query
* Zustand
* ECharts
* Tailwind CSS
* shadcn/ui

Responsibilities:

* user interaction;
* graph editing;
* configuration forms;
* API communication;
* previews;
* chart rendering;
* dashboard layout.

---

# 5.2 Backend

Primary stack:

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* Alembic
* Polars
* DuckDB where appropriate
* openpyxl for workbook metadata and workbook-specific operations

Responsibilities:

* persistence;
* workbook ingestion;
* workflow validation;
* schema inference;
* transformation execution;
* preview generation;
* execution state;
* safe formula evaluation.

---

# 5.3 Database

Primary relational database:

PostgreSQL.

PostgreSQL stores product state, not bulk workbook contents.

Examples of persistent state:

* projects;
* source metadata;
* workbook metadata;
* workflow definitions;
* nodes;
* edges;
* visualization configuration;
* dashboards;
* dashboard layouts.

Large datasets should not be serialized into PostgreSQL as the normal execution mechanism.

---

# 5.4 File Storage

MVP implementation:

Local filesystem.

Access must occur through:

`StorageProvider`

Future implementations may include:

* S3;
* MinIO;
* Azure Blob Storage.

Business logic must not directly depend on absolute local filesystem paths.

---

# 6. Repository Structure

Recommended structure:

```text
/
├── AGENTS.md
├── PRODUCT_SPEC.md
├── ARCHITECTURE.md
├── TASKS.md
├── STATUS.md
├── DECISIONS.md
├── README.md
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── stores/
│   ├── types/
│   └── tests/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── application/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── main.py
│   │
│   ├── migrations/
│   └── tests/
│
├── tests/
│   └── e2e/
│
├── fixtures/
│   └── excel/
│
├── docker/
└── docker-compose.yml
```

Exact directory names may change when justified, but the separation between:

* API;
* application;
* domain;
* infrastructure;

should remain clear.

---

# 7. Backend Layering

The backend should use four conceptual layers.

## 7.1 API Layer

Responsible for:

* HTTP routing;
* request parsing;
* authentication hooks in the future;
* response serialization;
* mapping application errors to HTTP responses.

The API layer must not contain dataframe transformation logic.

---

## 7.2 Application Layer

Responsible for use cases.

Examples:

* create project;
* upload source;
* create workflow;
* preview node;
* execute workflow;
* save dashboard.

Application services orchestrate domain and infrastructure components.

---

## 7.3 Domain Layer

Contains core BI concepts.

Examples:

* DatasetSchema;
* ColumnSchema;
* Workflow;
* NodeInstance;
* WorkflowEdge;
* NodeDefinition;
* NodeExecutor;
* ExecutionPlan;
* ExecutionResult.

The domain layer should be largely independent from FastAPI and SQLAlchemy.

---

## 7.4 Infrastructure Layer

Contains implementations that interact with external systems.

Examples:

* PostgreSQL repositories;
* local storage provider;
* Excel reader;
* Polars execution;
* DuckDB integration;
* cache implementation.

---

# 8. Core Domain Model

The primary domain relationships are:

```text
Project
 │
 ├── DataSource*
 │
 ├── Workflow*
 │    ├── Node*
 │    └── Edge*
 │
 ├── Visualization*
 │
 └── Dashboard*
      └── DashboardWidget*
```

---

# 9. Project

Conceptual model:

```text
Project

id
name
created_at
updated_at
```

A Project is the ownership boundary for MVP analytical state.

Every persistent source, workflow, visualization, and dashboard belongs to a project.

---

# 10. Data Source Model

A source represents an uploaded external data artifact.

Conceptual fields:

```text
DataSource

id
project_id
type
name
storage_key
original_filename
file_size
status
metadata
created_at
updated_at
```

MVP source type:

`excel`

Possible future source types:

* csv;
* postgres;
* mysql;
* api;
* google_sheets.

---

# 11. Excel Workbook Metadata

Workbook-specific metadata should be stored separately or inside structured source metadata.

Conceptually:

```text
WorkbookMetadata

source_id
sheet_names
workbook_properties
inspection_status
```

Worksheet metadata may include:

```text
WorksheetMetadata

sheet_name
estimated_rows
estimated_columns
columns
```

Do not persist full worksheet row data as metadata.

---

# 12. Dataset

`Dataset` is the runtime abstraction passed between data-processing nodes.

A Dataset is not an uploaded Excel file.

Conceptually:

```python
Dataset:
    schema: DatasetSchema
    frame: execution-engine-specific data representation
    metadata: DatasetMetadata
```

For MVP, the physical representation will normally be backed by Polars.

The interface should prevent downstream nodes from caring whether data originally came from:

* Excel;
* CSV;
* SQL;
* API.

---

# 13. Dataset Schema

Conceptually:

```text
DatasetSchema
└── columns: ColumnSchema[]
```

`ColumnSchema`:

```text
id
name
display_name
logical_type
nullable
metadata
```

The column `id` should remain stable within an execution lineage where practical.

This helps distinguish user-facing labels from internal identity.

---

# 14. Logical Data Types

The domain layer should define engine-independent logical types:

```text
STRING
INTEGER
FLOAT
BOOLEAN
DATE
DATETIME
UNKNOWN
```

`NULL` may be represented through nullability rather than as a permanent column type, depending on implementation.

Engine-specific Polars types must be translated into logical types at domain boundaries.

---

# 15. Workflow

A workflow is a persisted directed graph.

Conceptual model:

```text
Workflow

id
project_id
name
version
created_at
updated_at
```

The workflow contains:

* node instances;
* directed edges;
* graph-level metadata.

---

# 16. Node Instance

A persisted node instance represents one configured node placed on the canvas.

Conceptual structure:

```json
{
  "id": "node_123",
  "type": "filter",
  "version": 1,
  "position": {
    "x": 420,
    "y": 180
  },
  "config": {},
  "ui": {}
}
```

Important distinction:

`NodeInstance`

is persisted user configuration.

`NodeDefinition`

describes the capabilities of a node type.

---

# 17. Workflow Edge

Conceptual structure:

```json
{
  "id": "edge_123",
  "source_node_id": "node_a",
  "source_port": "dataset",
  "target_node_id": "node_b",
  "target_port": "input"
}
```

Edges must reference explicit ports.

This allows future node types with:

* multiple inputs;
* multiple outputs;
* non-dataset outputs.

---

# 18. Workflow JSON Contract

The API representation should resemble:

```json
{
  "id": "workflow_1",
  "name": "Sales Analysis",
  "version": 1,
  "nodes": [
    {
      "id": "source_1",
      "type": "excel_source",
      "version": 1,
      "position": {
        "x": 100,
        "y": 150
      },
      "config": {
        "source_id": "source_abc",
        "sheet_name": "Sales"
      }
    },
    {
      "id": "filter_1",
      "type": "filter",
      "version": 1,
      "position": {
        "x": 400,
        "y": 150
      },
      "config": {
        "conditions": [
          {
            "column": "country",
            "operator": "equals",
            "value": "Korea"
          }
        ],
        "mode": "and"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source_node_id": "source_1",
      "source_port": "dataset",
      "target_node_id": "filter_1",
      "target_port": "input"
    }
  ]
}
```

The exact JSON may evolve, but node identity, node version, explicit ports, configuration, and position must remain representable.

---

# 19. Node Definition

A `NodeDefinition` describes a node type.

Conceptually:

```python
class NodeDefinition:
    type: str
    version: int
    category: NodeCategory

    input_ports: list[PortDefinition]
    output_ports: list[PortDefinition]

    config_schema: type[BaseModel]

    executor_type: type[NodeExecutor] | None
```

Additional UI metadata may include:

```text
display_name
description
icon
configuration hints
```

Backend definitions remain authoritative for execution semantics.

---

# 20. Node Registry

All supported node types must be registered in a central `NodeRegistry`.

Conceptually:

```python
registry.register(ExcelSourceDefinition)
registry.register(FilterDefinition)
registry.register(GroupByDefinition)
```

The registry must support lookup by:

```text
node type
+
node version
```

Generic graph execution code must not use large `if node.type == ...` chains.

---

# 21. Node Executor Contract

Transformation and source nodes execute through a common contract.

Conceptually:

```python
class NodeExecutor(Protocol):

    def validate(
        self,
        node,
        input_schemas,
        context
    ) -> ValidationResult:
        ...

    def infer_schema(
        self,
        node,
        input_schemas,
        context
    ) -> DatasetSchema:
        ...

    def execute(
        self,
        node,
        inputs,
        context
    ) -> NodeExecutionResult:
        ...
```

The concrete signature may be async where infrastructure requires it.

The architectural behavior should remain equivalent.

---

# 22. Execution Context

Execution should receive an explicit context rather than depending on global state.

Conceptually:

```text
ExecutionContext

project_id
workflow_id
execution_id
storage_provider
source_repository
cache
logger
settings
```

Additional services may be added explicitly.

Avoid hidden mutable global execution state.

---

# 23. Node Inputs and Outputs

Data-processing nodes should pass typed runtime values.

Initial runtime output types:

```text
Dataset
ScalarValue
VisualizationSpec
```

Most MVP transformation nodes use:

```text
Dataset → Dataset
```

Join and Union:

```text
Dataset + Dataset → Dataset
```

Visualization:

```text
Dataset → VisualizationSpec
```

---

# 24. Visualization Architecture

Visualization nodes should not execute ECharts on the backend.

The backend should produce a normalized visualization specification or processed dataset result.

The frontend converts this specification into ECharts configuration.

Conceptual flow:

```text
Dataset
  ↓
Visualization Node Configuration
  ↓
VisualizationSpec
  ↓
Frontend Renderer
  ↓
ECharts
```

This keeps browser-specific rendering outside the backend.

---

# 25. Visualization Spec

Conceptual example:

```json
{
  "type": "bar",
  "title": "Revenue by Category",
  "encoding": {
    "x": {
      "field": "category",
      "type": "category"
    },
    "y": {
      "field": "sum_revenue",
      "type": "number"
    }
  },
  "options": {
    "legend": true
  }
}
```

Chart-specific frontend code translates this into ECharts configuration.

Do not persist generated ECharts internals as the primary product representation.

Persist semantic visualization configuration.

---

# 26. Transformation / Visualization Boundary

Reusable analytical transformations belong in transformation nodes.

Example:

Correct:

```text
GroupBy
  ↓
BarChart
```

Avoid hiding arbitrary reusable transformations inside:

```text
BarChart
```

Visualization nodes may perform small visualization-specific operations where required, but must not evolve into a second general-purpose data engine.

---

# 27. Workflow Validation Pipeline

Before execution, the backend should perform validation.

Recommended order:

```text
Structural Validation
        ↓
Node Type Validation
        ↓
Port Validation
        ↓
Cycle Detection
        ↓
Dependency Validation
        ↓
Configuration Validation
        ↓
Schema Propagation
        ↓
Execution Planning
```

Execution should not start when fatal validation errors are already known.

---

# 28. Structural Validation

Structural validation checks:

* duplicate node IDs;
* duplicate edge IDs;
* references to nonexistent nodes;
* invalid edge structure;
* malformed node definitions.

---

# 29. Port Validation

Port validation checks:

* source port exists;
* target port exists;
* output type is compatible with input type;
* maximum number of connections is respected;
* required inputs exist.

---

# 30. Cycle Detection

Workflows must remain DAGs for MVP execution.

Any edge that introduces a cycle must be rejected.

Both frontend and backend may detect cycles.

Backend validation is authoritative.

---

# 31. Schema Propagation Engine

Schema propagation runs through the graph in topological order.

Conceptually:

```text
Source schema
      ↓
Node infer_schema()
      ↓
Output schema
      ↓
Next node infer_schema()
```

The result should be available without full workflow execution where possible.

---

# 32. Schema Resolution Result

The backend may expose schema status for each node.

Conceptually:

```json
{
  "node_id": "group_1",
  "valid": true,
  "schema": {
    "columns": [
      {
        "name": "category",
        "type": "string"
      },
      {
        "name": "sum_revenue",
        "type": "float"
      }
    ]
  },
  "errors": []
}
```

This supports configuration UI.

---

# 33. Invalid Downstream Configuration

When upstream schema changes, downstream configuration must be revalidated.

Example:

```text
SelectColumns removes "revenue"
        ↓
BarChart still references "revenue"
```

Expected state:

BarChart becomes invalid.

The previously successful execution result must not be represented as current valid output.

---

# 34. Execution Planning

A preview or visualization request should not automatically execute the entire graph.

Given target node:

```text
Target Node
    ↓
Find ancestors
    ↓
Create required subgraph
    ↓
Topological order
    ↓
Execute only dependencies
```

Unrelated workflow branches should not run.

---

# 35. Workflow Execution

Conceptual execution loop:

```python
for node in execution_plan:
    inputs = collect_inputs(node)

    result = cache.get(node_cache_key)

    if result is None:
        result = executor.execute(
            node=node,
            inputs=inputs,
            context=context
        )

        cache.store(node_cache_key, result)

    execution_state[node.id] = result
```

Exact implementation may differ.

---

# 36. Execution Identity

Each explicit execution or preview operation should have an execution identifier.

Conceptually:

```text
Execution

id
workflow_id
target_node_id
status
started_at
completed_at
```

Persistence of full historical execution records is optional for MVP.

At minimum, execution IDs should be useful for:

* logs;
* errors;
* tracing.

---

# 37. Execution Status

Possible execution statuses:

```text
PENDING
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

Cancellation support is optional in the first implementation.

---

# 38. Result Caching

Caching should be introduced primarily to avoid repeated expensive upstream execution.

Cache keys should depend on relevant inputs.

Conceptually:

```text
node type
node version
node config
upstream result identity
source identity/version
```

A config change must invalidate the affected node and its descendants.

---

# 39. Cache Scope

Initial cache may be:

* process memory;
* temporary filesystem;
* another simple local implementation.

Do not introduce distributed cache infrastructure for MVP unless required.

Cached results are disposable.

Persistent project correctness must never depend on cache survival.

---

# 40. Source Identity

Uploaded source files should be treated as immutable source artifacts.

If the user uploads a replacement workbook, it should receive a new source identity or explicit new source version.

Cache correctness must not depend only on filename.

---

# 41. DataFrame Engine

Polars is the primary dataframe transformation engine.

Use Polars for:

* filtering;
* selection;
* renaming;
* sorting;
* formulas;
* grouping;
* aggregation;
* joins;
* unions;
* pivots where suitable.

DuckDB may be used when it materially simplifies:

* larger analytical operations;
* SQL-like execution;
* intermediate query operations.

Do not mix engines arbitrarily within individual nodes.

---

# 42. Excel Ingestion

Excel ingestion should conceptually separate:

```text
Workbook Inspection
```

from:

```text
Dataset Loading
```

Workbook inspection discovers:

* sheets;
* headers;
* dimensions;
* basic metadata.

Dataset loading converts a selected worksheet into the internal Dataset representation.

---

# 43. Excel Reader Interface

Conceptual interface:

```python
class WorkbookReader(Protocol):

    def inspect(self, storage_key) -> WorkbookInfo:
        ...

    def load_sheet(
        self,
        storage_key,
        sheet_name,
        options
    ) -> Dataset:
        ...
```

Excel-specific logic should remain behind this boundary.

---

# 44. Excel Parsing Behavior

The ingestion layer must handle:

* missing cells;
* duplicate headers;
* blank headers;
* mixed data;
* dates;
* booleans;
* numeric values;
* strings.

A mapping between original labels and internal column identity may be maintained when normalization is required.

---

# 45. Source Node

The Excel Source node config should reference persistent source identity.

Example:

```json
{
  "source_id": "src_123",
  "sheet_name": "Sales"
}
```

It must not rely on a raw filesystem path controlled by the frontend.

---

# 46. Select Columns Executor

Input:

```text
Dataset
```

Configuration:

```text
selected column identifiers
```

Output:

```text
Dataset
```

Schema inference does not require full data execution.

---

# 47. Rename Columns Executor

Configuration maps source column identity to new display/name value.

Validation checks:

* source column exists;
* resulting names are valid;
* collisions are handled.

---

# 48. Filter Executor

Filter configuration should use a structured expression representation.

Example:

```json
{
  "mode": "and",
  "conditions": [
    {
      "column": "country",
      "operator": "equals",
      "value": "Korea"
    }
  ]
}
```

Do not transmit arbitrary Python expressions for filtering.

---

# 49. Calculated Column Executor

Calculated columns require a controlled expression AST or parser.

Example user expression:

```text
quantity * price
```

Conceptually converted to:

```text
Multiply(
    Column("quantity"),
    Column("price")
)
```

or another safe internal representation.

Never execute the expression through:

* Python `eval`;
* JavaScript eval;
* shell;
* arbitrary dynamic imports.

---

# 50. Formula Engine

The formula system should use an allowlist of supported syntax.

Initial operators:

```text
+
-
*
/
()
```

Later safe functions may include:

```text
abs
round
lower
upper
coalesce
date extraction
```

Only implemented, validated operations may execute.

---

# 51. Group By / Aggregate Executor

Configuration should explicitly separate:

```text
dimensions
```

and:

```text
aggregations
```

Example:

```json
{
  "group_by": [
    "category"
  ],
  "aggregations": [
    {
      "column": "revenue",
      "function": "sum",
      "output_name": "sum_revenue"
    }
  ]
}
```

---

# 52. Join Executor

Join has two dataset inputs:

```text
left
right
```

Configuration:

```json
{
  "join_type": "left",
  "keys": [
    {
      "left": "customer_id",
      "right": "customer_id"
    }
  ]
}
```

Supported MVP types:

* inner;
* left.

Output conflict strategy must be deterministic.

---

# 53. Union Executor

The Union executor accepts two or more compatible datasets.

MVP may initially support exactly two inputs.

Validation checks:

* column compatibility;
* logical type compatibility.

Schema coercion must be explicit rather than accidental.

---

# 54. Pivot Executor

Pivot configuration conceptually includes:

```text
index
columns
values
aggregation
```

Output schema may depend on data values.

Because pivot output columns may be data-dependent, schema inference may require limited data inspection.

This should be represented explicitly rather than pretending pivot is always statically inferable.

---

# 55. Static vs Dynamic Schema Inference

Nodes should declare their schema inference behavior.

Possible modes:

```text
STATIC
DATA_DEPENDENT
UNKNOWN_UNTIL_EXECUTION
```

Examples:

Select Columns:

`STATIC`

Rename:

`STATIC`

Filter:

`STATIC`

Calculated Column:

usually `STATIC`

Pivot:

often `DATA_DEPENDENT`

The UI must be able to handle temporarily unavailable downstream schema.

---

# 56. Preview Architecture

Preview is a bounded execution result.

Request:

```text
workflow
target node
row limit
```

Response:

```text
schema
rows
row_count where available
execution metadata
```

The backend must impose a server-side maximum preview size.

The browser cannot request unlimited rows.

---

# 57. Preview Response Example

```json
{
  "node_id": "filter_1",
  "status": "succeeded",
  "schema": {
    "columns": [
      {
        "name": "country",
        "type": "string"
      },
      {
        "name": "revenue",
        "type": "float"
      }
    ]
  },
  "rows": [
    {
      "country": "Korea",
      "revenue": 2500.0
    }
  ],
  "preview": {
    "limit": 100,
    "returned_rows": 100,
    "total_rows": 12450
  },
  "execution": {
    "duration_ms": 84
  }
}
```

`total_rows` may be omitted when expensive to calculate.

---

# 58. Persistence Strategy

Persist configuration, not transient dataframe state.

Persistent:

* projects;
* source metadata;
* workflow definitions;
* node configuration;
* graph positions;
* visualizations;
* dashboards;
* widget layout.

Transient/disposable:

* Polars DataFrames;
* preview frames;
* execution cache;
* generated ECharts options.

---

# 59. Database Schema

Initial relational schema should contain approximately the following tables.

---

# 60. projects

```text
projects

id UUID PK
name VARCHAR
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 61. data_sources

```text
data_sources

id UUID PK
project_id UUID FK → projects
type VARCHAR
name VARCHAR
original_filename VARCHAR
storage_key VARCHAR
file_size BIGINT
status VARCHAR
metadata JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 62. workflows

```text
workflows

id UUID PK
project_id UUID FK → projects
name VARCHAR
version INTEGER
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 63. workflow_nodes

```text
workflow_nodes

id UUID PK
workflow_id UUID FK → workflows
node_type VARCHAR
node_version INTEGER
position_x DOUBLE
position_y DOUBLE
config JSONB
ui_state JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

The node instance UUID is also the graph node ID.

---

# 64. workflow_edges

```text
workflow_edges

id UUID PK
workflow_id UUID FK → workflows
source_node_id UUID FK → workflow_nodes
source_port VARCHAR
target_node_id UUID FK → workflow_nodes
target_port VARCHAR
created_at TIMESTAMP
```

Database constraints should prevent obviously invalid cross-workflow edges.

---

# 65. visualizations

```text
visualizations

id UUID PK
project_id UUID FK → projects
workflow_id UUID FK → workflows
source_node_id UUID
type VARCHAR
name VARCHAR
config JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

A visualization may reference the dataset-producing node it consumes.

If visualization nodes themselves are persisted directly in the workflow, this table may instead represent dashboard-reusable visualization entities.

The project should choose one model and record it in `DECISIONS.md`.

Recommended MVP model:

Visualization nodes live in the workflow and reusable dashboard visualization configuration is persisted as a visualization entity referencing a workflow node.

---

# 66. dashboards

```text
dashboards

id UUID PK
project_id UUID FK → projects
name VARCHAR
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 67. dashboard_widgets

```text
dashboard_widgets

id UUID PK
dashboard_id UUID FK → dashboards
visualization_id UUID FK → visualizations
title VARCHAR NULL
position_x INTEGER
position_y INTEGER
width INTEGER
height INTEGER
config JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 68. Referential Integrity

Deletion behavior must be deliberate.

Example:

Deleting project:

```text
Project
 ↓ cascade
Sources
Workflows
Nodes
Edges
Visualizations
Dashboards
Widgets
```

Deleting a node used by a visualization should either:

* invalidate the visualization;
* or delete dependent visualization records;

according to an explicitly documented rule.

Silent dangling references are not acceptable.

---

# 69. JSONB Usage

JSONB is appropriate for flexible node and visualization configuration.

Do not use JSONB for everything.

Stable relational relationships belong in relational columns.

Good JSONB candidates:

* node config;
* visualization config;
* source metadata;
* widget-specific options.

---

# 70. Database Repository Layer

Application services should access persistence through repositories.

Examples:

```text
ProjectRepository
SourceRepository
WorkflowRepository
VisualizationRepository
DashboardRepository
```

This prevents SQLAlchemy persistence details from spreading across domain logic.

---

# 71. API Style

The MVP uses REST-style JSON APIs.

Suggested base:

```text
/api/v1
```

Use UUID identifiers.

Endpoints should be resource-oriented where practical.

---

# 72. Project API

Suggested endpoints:

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{project_id}
PATCH  /api/v1/projects/{project_id}
DELETE /api/v1/projects/{project_id}
```

---

# 73. Source API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/sources
POST   /api/v1/projects/{project_id}/sources/excel
GET    /api/v1/sources/{source_id}
DELETE /api/v1/sources/{source_id}

GET    /api/v1/sources/{source_id}/sheets
GET    /api/v1/sources/{source_id}/sheets/{sheet_name}/schema
GET    /api/v1/sources/{source_id}/sheets/{sheet_name}/preview
```

---

# 74. Workflow API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/workflows
POST   /api/v1/projects/{project_id}/workflows

GET    /api/v1/workflows/{workflow_id}
PUT    /api/v1/workflows/{workflow_id}
DELETE /api/v1/workflows/{workflow_id}
```

A whole-workflow PUT is acceptable for MVP graph persistence.

Fine-grained node mutation APIs may be introduced later if needed.

---

# 75. Workflow Validation API

Suggested endpoint:

```text
POST /api/v1/workflows/{workflow_id}/validate
```

Response should include:

* graph errors;
* node errors;
* resolved node schemas where available.

---

# 76. Preview API

Suggested endpoint:

```text
POST /api/v1/workflows/{workflow_id}/nodes/{node_id}/preview
```

Request:

```json
{
  "limit": 100
}
```

The server enforces a configured maximum.

---

# 77. Visualization API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/visualizations
POST   /api/v1/projects/{project_id}/visualizations

GET    /api/v1/visualizations/{visualization_id}
PATCH  /api/v1/visualizations/{visualization_id}
DELETE /api/v1/visualizations/{visualization_id}

POST   /api/v1/visualizations/{visualization_id}/data
```

Exact endpoint naming may evolve.

---

# 78. Dashboard API

Suggested endpoints:

```text
GET    /api/v1/projects/{project_id}/dashboards
POST   /api/v1/projects/{project_id}/dashboards

GET    /api/v1/dashboards/{dashboard_id}
PATCH  /api/v1/dashboards/{dashboard_id}
DELETE /api/v1/dashboards/{dashboard_id}

PUT    /api/v1/dashboards/{dashboard_id}/layout
```

---

# 79. API Error Contract

Errors should use a stable structured format.

Example:

```json
{
  "error": {
    "code": "INVALID_NODE_CONFIGURATION",
    "message": "Column 'revenue' does not exist in the upstream dataset.",
    "details": {
      "node_id": "node_123",
      "field": "config.column"
    }
  }
}
```

The frontend should not depend on parsing arbitrary error strings.

---

# 80. Error Categories

Useful domain error categories:

```text
PROJECT_NOT_FOUND
SOURCE_NOT_FOUND
INVALID_UPLOAD
WORKBOOK_READ_ERROR
SHEET_NOT_FOUND

WORKFLOW_INVALID
NODE_NOT_FOUND
UNKNOWN_NODE_TYPE
INVALID_EDGE
CYCLE_DETECTED
MISSING_NODE_INPUT

INVALID_NODE_CONFIGURATION
COLUMN_NOT_FOUND
TYPE_MISMATCH
FORMULA_INVALID
JOIN_INVALID

EXECUTION_FAILED
PREVIEW_FAILED
```

---

# 81. HTTP Mapping

Typical mappings:

```text
400 — malformed request / invalid user input
404 — missing project/source/workflow
409 — conflicting persistent state
422 — valid JSON but invalid domain configuration
500 — unexpected server failure
```

Exact mapping should remain consistent across the API.

---

# 82. Frontend Architecture

Frontend should be organized primarily by product feature.

Suggested structure:

```text
features/
├── projects/
├── data-sources/
├── workflow/
├── visualizations/
└── dashboards/
```

Shared components and primitives belong outside feature-specific modules.

---

# 83. Frontend Server State

TanStack Query should manage remote server state.

Examples:

* projects;
* source metadata;
* workflow loading;
* previews;
* dashboards.

Avoid duplicating full server state into Zustand without a clear reason.

---

# 84. Frontend Local State

Zustand may manage highly interactive editor state.

Examples:

* current node selection;
* panel visibility;
* temporary graph edits;
* viewport preferences;
* unsaved drag state.

Persisted graph state remains authoritative on the server once saved.

---

# 85. Workflow Editor State

React Flow represents the visual graph.

The frontend graph model should map cleanly to the backend Workflow contract.

Avoid maintaining two fundamentally different graph representations.

A translation adapter may exist, but semantics must remain consistent.

---

# 86. Workflow Autosave

Recommended MVP strategy:

* user actions update local graph state immediately;
* changes are persisted using debounced autosave;
* UI exposes saving status.

Possible states:

```text
Saved
Saving…
Save failed
Unsaved changes
```

An explicit Save action may also be provided.

---

# 87. Save Concurrency

Single-user MVP does not require sophisticated collaborative conflict resolution.

However, updates should avoid obvious accidental overwrite.

Workflow saves require expected_revision and atomically increment revision (ADR-050).
Stale writes return 409 and retain the browser draft. Dashboard saves use an independent revision.

---

# 88. Node Configuration UI

Node configuration should be schema-driven where practical.

Example:

Filter Node receives upstream schema.

Frontend displays:

```text
Column:
[Country ▼]

Operator:
[Equals ▼]

Value:
[Korea]
```

Do not force users to manually type field names when schema information exists.

---

# 89. Node Type Catalog

Frontend may fetch node definitions from backend or maintain a shared typed catalog.

For MVP, duplicated display metadata is acceptable only if semantic execution configuration remains aligned.

Preferred long-term direction:

backend exposes node metadata needed by the editor.

---

# 90. Dashboard Frontend

Dashboard editor should use a grid-based layout library.

The dashboard stores logical grid positions, not raw browser pixel coordinates.

Conceptually:

```text
x
y
w
h
```

This makes persistence and future responsive layouts easier.

---

# 91. Dashboard Rendering

Dashboard widgets retrieve their visualization specification and data.

Conceptual flow:

```text
Dashboard
  ↓
Widget
  ↓
Visualization
  ↓
Workflow target
  ↓
Execution
  ↓
Visualization data
  ↓
ECharts/Table/KPI
```

Dashboard rendering should reuse the same execution system as workflow previews.

---

# 92. Duplicate Execution Prevention

When multiple dashboard widgets depend on the same upstream workflow state, caching should prevent unnecessary repeated source and transformation execution.

Optimization may occur progressively.

Correctness is more important than perfect cache efficiency.

---

# 93. StorageProvider Contract

Conceptual interface:

```python
class StorageProvider(Protocol):

    def save(
        self,
        stream,
        object_name
    ) -> StorageObject:
        ...

    def open(
        self,
        storage_key
    ):
        ...

    def exists(
        self,
        storage_key
    ) -> bool:
        ...

    def delete(
        self,
        storage_key
    ) -> None:
        ...
```

The API must never trust a frontend-provided local path.

---

# 94. Storage Keys

Storage keys must be generated by the backend.

Example:

```text
projects/{project_uuid}/sources/{source_uuid}/workbook.xlsx
```

Do not use original filename as the security boundary.

Original filename is metadata.

---

# 95. File Upload Security

Backend must validate:

* supported extension;
* expected workbook structure where possible;
* maximum configured upload size;
* safe storage key.

Do not execute workbook macros.

`.xlsm` may be parsed for data, but macros are treated as inert content.

---

# 96. Formula Security Boundary

The Formula Engine must be isolated from Python runtime execution.

Forbidden approaches:

```python
eval(user_expression)
exec(user_expression)
```

Forbidden capabilities:

* imports;
* filesystem access;
* process execution;
* network access;
* reflection;
* arbitrary callable invocation.

---

# 97. Resource Limits

The backend should define configurable limits.

Examples:

```text
MAX_UPLOAD_BYTES
MAX_PREVIEW_ROWS
MAX_WORKFLOW_NODES
MAX_FORMULA_LENGTH
MAX_JOIN_KEYS
```

Initial values should be conservative and documented.

These limits protect both UX and server stability.

---

# 98. Background Jobs

A dedicated task queue is not required for the first MVP.

Initial workflow execution may occur synchronously through API requests if execution remains within reasonable interactive limits.

Architecture should keep `ExecutionService` sufficiently separated so background execution can be introduced later.

Possible future:

```text
API
 ↓
Job Queue
 ↓
Worker
 ↓
Execution Engine
```

Do not implement queue infrastructure prematurely.

---

# 99. Execution Timeouts

Execution should have a configurable timeout or other protective mechanism where practical.

A pathological workbook or transformation must not permanently occupy server resources.

Implementation details may depend on process model.

---

# 100. Logging

Use structured application logging.

Useful fields:

```text
request_id
project_id
workflow_id
execution_id
node_id
node_type
duration_ms
error_code
```

Avoid logging complete workbook rows by default.

---

# 101. Request Correlation

Each request should have or receive a request identifier.

Execution errors should be traceable between:

* API response;
* backend logs;
* execution logs.

---

# 102. Observability Scope

MVP observability should include:

* structured logs;
* execution duration;
* error attribution;
* basic health endpoints.

Full metrics infrastructure is optional.

---

# 103. Health Endpoints

Suggested:

```text
GET /health
GET /ready
```

`health`:

process is running.

`ready`:

critical dependencies such as PostgreSQL are reachable.

---

# 104. Configuration

Application configuration should come from environment variables or configuration files appropriate for the deployment environment.

Examples:

```text
DATABASE_URL
STORAGE_ROOT
MAX_UPLOAD_BYTES
MAX_PREVIEW_ROWS
LOG_LEVEL
```

Secrets must not be committed to source control.

---

# 105. Local Development Deployment

Docker Compose should provide:

```text
frontend
backend
postgres
```

Source storage may use a mounted volume.

Developer should be able to start the complete local stack using documented commands.

---

# 106. Production Build

Both frontend and backend must support production-oriented execution.

Frontend:

production build must succeed.

Backend:

must run without development-only hot reload.

Production deployment architecture beyond a single-server environment is outside MVP scope.

---

# 107. Database Migrations

All schema changes must use Alembic.

Fresh environment flow:

```text
create database
    ↓
run migrations
    ↓
start backend
```

The repository should not depend on manually created tables.

---

# 108. Testing Architecture

Testing should follow system boundaries.

---

# 109. Domain Unit Tests

Unit-test:

* graph validation;
* cycle detection;
* schema inference;
* formula parsing;
* node configuration validation;
* join compatibility;
* logical type handling.

These should require minimal infrastructure.

---

# 110. Executor Tests

Each executor should have correctness tests.

Examples:

```text
FilterExecutor
SelectColumnsExecutor
CalculatedColumnExecutor
GroupByExecutor
JoinExecutor
UnionExecutor
PivotExecutor
```

Use small deterministic datasets.

---

# 111. Excel Integration Tests

Fixture workbooks should cover:

* normal workbook;
* multiple sheets;
* null values;
* mixed types;
* date columns;
* duplicate headers;
* empty worksheet;
* malformed workbook.

---

# 112. Repository Integration Tests

Use a real test PostgreSQL database where important.

Verify:

* create project;
* save graph;
* reload graph;
* delete project;
* dashboard persistence.

---

# 113. API Integration Tests

Test critical endpoint flows.

Example:

```text
Create Project
    ↓
Upload Excel
    ↓
Create Workflow
    ↓
Save Nodes
    ↓
Preview Node
```

---

# 114. Frontend Tests

Focus on behavior rather than implementation details.

Test:

* project creation;
* node configuration;
* validation messages;
* schema-aware controls;
* dashboard interactions;
* saving status.

---

# 115. End-to-End Tests

At least one E2E test must implement the canonical MVP journey.

It should cover:

```text
create project
upload workbook
create workflow
configure transformation
preview result
create visualization
create dashboard
reload
verify persistence
```

---

# 116. Acceptance Fixture

The repository should contain a deterministic Excel fixture representing sales data.

Suggested:

```text
order_id
order_date
country
category
product
quantity
price
```

Calculated:

```text
revenue = quantity * price
```

This fixture must contain enough variation for filter, grouping, join, and visualization tests.

---

# 117. Join Fixture

A second worksheet or workbook may contain:

```text
product
supplier
cost
```

This supports deterministic Join tests.

---

# 118. API / Domain Separation

Pydantic request/response models are API contracts.

SQLAlchemy models are persistence contracts.

Domain models represent BI concepts.

These should not automatically be treated as the same object.

Mapping code is acceptable when it preserves architectural separation.

---

# 119. Transaction Boundaries

Application services should define database transaction boundaries.

Examples:

Saving a workflow graph should not leave:

* nodes saved;
* edges partially saved;

if the operation fails halfway.

Where practical, graph persistence should occur atomically.

---

# 120. Workflow Persistence Strategy

Recommended MVP approach:

When saving workflow:

1. validate identifiers;
2. begin database transaction;
3. update workflow metadata;
4. upsert current nodes;
5. delete removed nodes;
6. upsert edges;
7. delete removed edges;
8. commit.

Alternative implementation is acceptable if it guarantees coherent graph state.

---

# 121. Node Deletion

Deleting a node must remove associated edges.

Dependent persisted visualization references must either:

* be deleted;
* or become explicitly invalid.

The decision must be consistent.

---

# 122. Source Deletion

If a source is referenced by an active workflow, deletion should not silently break persisted state.

Recommended MVP behavior:

prevent deletion and return a dependency error until references are removed.

This is safer than silent cascade deletion of analytical workflows.

---

# 123. Dashboard Deletion

Deleting a dashboard should delete its widget layout records.

It should not delete referenced workflow nodes or source data.

Deleting a visualization should remove or invalidate dashboard widgets referencing it.

---

# 124. Versioning Strategy

Revision update (ADR-050): `workflow.version` is the persisted format version and
remains 1 for the current format. `workflow.revision` is a separate edit counter.
Every save supplies `expected_revision`; an atomic conditional update rejects stale
writes with HTTP 409 before graph mutation. Migration 0002 moves historical save
counters into revision. Schema/preview responses include the graph revision.

Three independent concepts may have versions:

```text
API version
Workflow format version
Node definition version
```

API:

```text
/api/v1
```

Workflow:

```text
workflow.version
```

Node:

```text
node.version
```

Do not assume these numbers are interchangeable.

---

# 125. Node Migration

Full historical node migration infrastructure is not required for MVP.

However, node executor lookup must include node version.

Future migration may follow:

```text
filter v1
   ↓ migrate
filter v2
```

Persisting version now prevents a major compatibility problem later.

---

# 126. Frontend Type Contracts

API models are generated from FastAPI OpenAPI into `frontend/lib/api-schema.d.ts`.
Feature modules import aliases from generated components. `npm run api:generate`
updates the types; `npm run api:check` fails on drift. Node-specific analytical forms
remain explicit components selected through a registry (ADR-053).

Where practical, generate or synchronize TypeScript API types from backend OpenAPI definitions.

Avoid manually maintaining incompatible duplicate request/response models.

Exact tooling can be chosen during implementation.

---

# 127. User-Facing Data Formatting

Formatting is presentation logic.

Raw analytical values should remain typed.

Example:

Stored/executed value:

```text
1204302.45
```

Displayed KPI:

```text
$1.20M
```

Formatting must not permanently convert analytical numbers into text upstream.

---

# 128. Date Handling

Internal date and datetime values must remain typed.

Serialized API representation should use a predictable ISO-compatible representation.

Timezone complexity should not be introduced for date-only fields.

Datetime behavior should be explicitly documented when encountered.

---

# 129. Null Semantics

Null handling should follow dataframe semantics consistently.

User-facing filter operations should explicitly support:

```text
is null
is not null
```

Avoid silently converting null values into empty strings globally.

---

# 130. Column Identity

Column names alone may be insufficient because Excel may contain duplicate labels.

Recommended model:

```text
column_id
display_name
engine_name
```

Example:

```text
column_id: col_3
display_name: Revenue
engine_name: Revenue__2
```

User sees:

```text
Revenue
```

but internal transformations remain unambiguous.

The exact identity strategy should be finalized in `DECISIONS.md`.

---

# 131. Schema Serialization

Schemas returned to frontend should contain stable field identifiers.

Example:

```json
{
  "columns": [
    {
      "id": "col_country",
      "name": "country",
      "display_name": "Country",
      "type": "string",
      "nullable": true
    }
  ]
}
```

Node configs should preferably reference stable column IDs when feasible.

---

# 132. Validation vs Execution Errors

Distinguish:

`Validation Error`

from:

`Execution Error`

Validation:

the configuration is known to be invalid.

Execution:

configuration appeared valid but data-dependent execution failed.

The frontend should present these differently where useful.

---

# 133. Node Result Model

Conceptually:

```text
NodeExecutionResult

node_id
output_type
value
schema
metadata
warnings
```

Warnings should not automatically make execution fail.

Example warning:

```text
Some values could not be parsed as dates.
```

---

# 134. Warning Policy

Warnings are appropriate when:

* output remains usable;
* user should know about data quality;
* behavior is deterministic.

Do not downgrade correctness failures into warnings merely to keep execution green.

---

# 135. Visualization Data Volume

Chart payloads should be bounded.

A chart must not accidentally send hundreds of thousands of points to the browser.

Potential strategies:

* require aggregation;
* impose point limits;
* return validation/warning;
* apply chart-specific sampling later.

MVP should use explicit safe limits rather than hidden destructive aggregation.

---

# 136. Table Data Volume

Table visualization should use:

* bounded pages;
* preview semantics;
* server-side limits.

Do not serialize the entire transformed dataset for initial display.

---

# 137. Dashboard Execution

Dashboard loading may trigger execution of visualization dependencies.

Execution should be deduplicated where practical.

The UI must display per-widget loading and failure states rather than blocking the entire dashboard for one failing visualization.

---

# 138. Partial Failure

One failed visualization must not prevent unrelated dashboard widgets from rendering.

Likewise, one invalid workflow branch should not necessarily prevent previewing a valid unrelated branch.

---

# 139. Frontend Error Boundary

Major frontend areas should use error boundaries or equivalent controlled error handling where appropriate.

Unexpected rendering failure in one visualization should not ideally destroy the entire application shell.

---

# 140. Security Architecture

MVP security assumptions:

* single-user deployment;
* trusted application operator;
* untrusted uploaded file contents;
* untrusted node configuration payloads.

Even without authentication, backend inputs must be validated.

---

# 141. Path Traversal Protection

Never construct storage paths directly from:

* user filenames;
* source names;
* sheet names.

Use generated identifiers.

---

# 142. Workbook Macros

Macro code must never be executed.

For `.xlsm` files, treat macros as opaque workbook content.

Only data extraction is relevant.

---

# 143. Formula Injection

Generated exported spreadsheets are outside MVP scope.

If spreadsheet export is later implemented, formula injection must be considered separately.

---

# 144. Arbitrary SQL

The MVP has no user-entered SQL execution.

Future SQL connectors must introduce separate security architecture.

---

# 145. Deployment Boundary

Initial supported deployment:

```text
single application environment
```

containing:

```text
browser
frontend
backend
PostgreSQL
local persistent file volume
```

This is sufficient for MVP acceptance.

---

# 146. Scalability Path

Future scale may introduce:

```text
Object Storage
Redis
Job Queue
Workers
Multiple API Instances
External Database
```

Current interfaces should make this possible without implementing these systems now.

Especially preserve:

* StorageProvider;
* ExecutionService boundary;
* Repository interfaces;
* stateless HTTP APIs where practical.

---

# 147. Architectural Non-Goals

Do not implement for MVP:

* Kubernetes;
* microservices;
* Kafka;
* distributed tracing infrastructure;
* distributed execution;
* event sourcing;
* CQRS;
* plugin runtime;
* multi-region failover;
* data warehouse;
* semantic layer engine.

The MVP should remain a modular monolith.

---

# 148. Modular Monolith Decision

The backend should be implemented as a modular monolith.

Benefits:

* simpler deployment;
* easier transactions;
* easier debugging;
* faster MVP development;
* domain boundaries can still remain explicit.

Do not split Project, Workflow, Execution, or Dashboard into network services during MVP.

---

# 149. Architecture Enforcement

During implementation, the agent should reject patterns that violate core boundaries.

Examples:

Bad:

```text
React FilterNode directly transforms 100,000 workbook rows.
```

Good:

```text
React FilterNode edits config.
Backend FilterExecutor transforms data.
```

Bad:

```text
API route contains 300 lines of Polars transformation logic.
```

Good:

```text
API route → ExecutionService → FilterExecutor
```

Bad:

```text
Dashboard stores ECharts-generated pixel configuration only.
```

Good:

```text
Dashboard references semantic visualization configuration.
```

---

# 150. Required Initial Architectural Decisions

Before or during the first implementation milestones, record decisions for:

1. column identity strategy;
2. node registry implementation;
3. formula parser / expression engine;
4. workflow persistence update strategy;
5. visualization persistence model;
6. dashboard layout library;
7. cache implementation;
8. Excel dataframe loading strategy;
9. frontend/backend API type synchronization.

These belong in `DECISIONS.md`.

---

# 151. Architecture Definition of Done

The architecture is considered successfully implemented when:

* frontend and backend responsibilities remain separated;
* workflows persist as explicit graph structures;
* graph validation is backend-authoritative;
* nodes execute through a registry/executor abstraction;
* Dataset and DatasetSchema are source-independent;
* schema propagation works;
* Excel is implemented as a source adapter;
* previews use bounded backend execution;
* formula evaluation is sandboxed through an allowlisted engine;
* persistence survives restart;
* dashboards reference persistent visualization definitions;
* migrations recreate database state;
* file storage uses `StorageProvider`;
* critical execution behavior is covered by tests;
* canonical MVP flow works end-to-end.

---

# 152. Architecture Change Policy

The Astra revision is recorded in ADR-050–ADR-054 and `docs/ARCHITECTURE_REVIEW.md`.
ExecutionContext receives a source-access protocol, not ORM sessions. Source schema
resolution and execution reuse bounded immutable materialization. Cache hits still
validate source ownership and artifact availability; the LRU has both count and byte
budgets. File deletion uses a transactional cleanup queue retried at startup or via
`python -m app.services.file_cleanup`. See the ADRs for failure/recovery boundaries.

This document may evolve during implementation.

A meaningful architectural change should:

1. solve a concrete problem;
2. be recorded in `DECISIONS.md`;
3. update this document if the architectural contract changes;
4. update affected tasks;
5. avoid silent divergence between documentation and implementation.

Implementation convenience alone is not sufficient reason to bypass a documented architecture boundary.

---

# 153. Final Architecture Summary

Node BI MVP is a modular-monolith web application.

The key architectural chain is:

```text
Excel File
   ↓
StorageProvider
   ↓
Excel Source Adapter
   ↓
Dataset
   ↓
Workflow DAG
   ↓
Node Executors
   ↓
Polars
   ↓
Dataset Results
   ↓
Visualization Specification
   ↓
Frontend Renderer
   ↓
Dashboard
```

Persistent state:

```text
PostgreSQL
```

Bulk uploaded source data:

```text
File Storage
```

Transient analytical state:

```text
Execution Memory / Cache
```

Frontend:

```text
interaction + visualization
```

Backend:

```text
data semantics + execution + persistence
```

The architecture should remain simple enough for a fast MVP while preserving the core boundaries required to evolve into a larger BI platform.

## M10 implementation contracts (ADR-042 and ADR-055)

The formula compiler parses an allowlisted arithmetic AST directly into Polars expressions.
Schema inference and execution share it. Arithmetic and numeric sum/average use Float64;
nulls propagate and non-finite results fail explicitly. Stable field references use [column_id].
Group By supports dimensions or a global aggregate, with explicit count/null semantics.
Node cache keys include node identity because calculated and aggregate output IDs derive from it.
Workflow reads take a shared database row lock while collecting revision, nodes and edges.
Save responses are constructed before committing the accepted revision, preventing a subsequent
writer from changing what the first request acknowledges. Read locks currently live until the
request transaction ends; long execution can delay saves and remains a performance QA item.

## Early presentation slice (ADR-043 and ADR-044)

Bar Chart and KPI are terminal workflow nodes with schema-aware configuration. A synchronized
Visualization index shares the node ID and contains no independent semantic config. The
presentation service executes prepared data and returns a typed rendering specification.
Dashboard widgets refer to that index. Removing a chart node removes its index and widgets;
removing only an upstream node preserves an editable chart with an explicit input error.
Dashboard saves use a separate optimistic revision and validate widget/visualization ownership.
The frontend uses react-grid-layout 2.2.4 and isolates each widget request/error. Drag/resize
changes are local until explicit save; a tab-local draft survives reload and failed requests.

## Completed visualization adapters and startup recovery (ADR-057/058)

The domain visualization catalog owns eight chart types, shared semantic configuration and
validation. Backend results retain workflow revision; table-only offset/limit pagination is explicit.
Other chart series remain complete under the 2000-point ceiling. Visualization index rows carry
no independent configuration. Widgets may override presentation title/visibility without duplicating
semantic fields. Each widget has an independent query/error boundary.

Excel uses defusedxml for forbidden XML entities; initial and lazy worksheet parsing map failures
to domain errors. Startup probes database availability before invoking Alembic, with bounded retries
and connection timeout. Migration failures are not retried or hidden.

## Source references and final application boundaries (ADR-059/060)

Project/workflow CRUD orchestration and Excel preview live in application services. HTTP handlers
retain transport adaptation. The editor delegates autosave, node configuration and output preview
to separate modules. Output data and errors are tied to the acknowledged graph revision.
Graph saves and source/project deletion lock the project row before changing references.
A supplied source ID must exist in that project; an unconfigured node remains a saveable draft.

One cold source materialization runs at a time in each execution cache; warm reads and transforms
remain independent. This avoids simultaneous duplicate workbook parsing and limits peak memory.
The default Compose stack publishes only loopback ports, matching the single-user release boundary.

## Color themes (ADR-062)

The server layout reads the allowlisted `nodebi-theme` cookie (light/dark; dark default) and renders
`data-theme` before hydration. ThemeProvider changes only this attribute and presentation context;
it never remounts the editor or writes semantic state. CSS semantic tokens in globals.css own
surface, text, border, action and feedback colors. React Flow uses matching colorMode and concrete
palette values for edges/handles/grid/minimap. ECharts recreates its disposable renderer with the
selected library theme and series palette; data/configuration and query identity are unchanged.

## Interface localization (ADR-061)

The root server layout reads the allowlisted `nodebi-language` cookie (ru/en/tt; ru default)
and initializes a React locale provider. Language changes update presentation in place and persist
a one-year, path-wide SameSite=Lax cookie. No graph or dashboard is remounted or rewritten.
`frontend/lib/translations.ts` holds English source keys with Russian and Tatar translations;
`locale.ts` owns interpolation, node labels and Intl presentation formatting. No i18n dependency
is required for three unprefixed interface languages. The browser URL and API contracts are unchanged.
Errors are translated at rendering time: application codes provide stable fallbacks, known domain
messages preserve specific guidance, and field/node/diagnostic identifiers remain intact. Raw
unknown server prose is replaced with a localized message; diagnostics remain in backend logs.
User content and semantic configuration never pass through the message translator. Locale is not
part of execution/cache identity. Numeric dates are formatted in UTC to avoid calendar-day drift.
