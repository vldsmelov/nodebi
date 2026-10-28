# PRODUCT_SPEC.md

XLSX formatting (ADR-219): users can change bold/italic, font size, text/fill colours, alignment
and wrap for selected data cells/ranges, undo them alongside value edits, save and reopen the
actual source with those styles intact. Ordinary formulas retain their expressions/results while
their appearance changes. Protected worksheet cells require explicit calculation override;
structural areas remain guarded. CSV does not expose styling. Number formats, source row/column
dimensions and merge/structure authoring remain separate work; no full Excel compatibility claim.

Showcase editing (ADR-218): all three business demos expose actual editable source files. A
multi-file project opens an interactive file picker; spreadsheet tools appear after a file opens.
Users can switch files in the same window, edit/save/reopen and see connected reports refresh.
Simple tables support restoring deleted rows before apply in the same editing window. Search
distinguishes an unsubmitted query from an empty result. Sales Pareto shares the prepared sales
calculation so it stays consistent with the other sales charts after source edits.

The spreadsheet workspace is the owner's highest development priority (ADR-217). Native formula
editing must show coloured source references, allow mouse range insertion, and keep the formula
bar synchronized with real selection. One SDK editor owns both the bar and inline editing. Empty
cells remain empty, actual zero remains zero, and strings must never render as synthetic NaN.
Source number/date formats, colours and borders are displayed while exact raw values remain
available for editing and backend execution. Preserve existing staged save/check/apply semantics.

Calculation editing (ADR-216, supersedes the blanket exclusion below): physical worksheet mode
offers Edit calculations to change ordinary formulas and protected values. Merged selections edit
the top-left cell and retain their merge. Existing formulas open in the editable formula bar;
new formulas start with =, apostrophe escapes literal equals. Common Russian formulas are accepted.
Results update only after backend recalculation and the existing check/apply. Bad formulas retain
the editable draft and never activate source/report changes. Worksheet protection metadata stays
intact. Shared formulas are resolved and editable; array/data-table groups, macros and source
structural design remain protected.

Spreadsheet workspace (ADR-215): source editing opens a separate window with a familiar spreadsheet
grid, sheet tabs, value/formula/address bar, range clipboard, inline editing, search, undo/redo,
zoom/freeze and save shortcuts. The editor replaces the modal journey. Source appearance is
retained for reading; view sizing/zoom do not rewrite source styles. CSV/plain tables retain row
operations and show protected headers. Large sheets load on demand. Exact input strings and
server-side calculation remain authoritative. Saving keeps the window open and restores its
selection, then updates the parent report. Native SDK messages use RU fallback in TT mode.

Interactive workbook correction (ADR-214, supersedes earlier formula/complex-book exclusions):
the data_example source opens actual worksheet cells in the browser. Users select a sheet, edit
input values or paste a range, inspect protected formula results/formula bar and Save changes.
Complex books retain their row/column structure and original assets. A backend calculation copy
refreshes formula caches with original Excel precision before existing checks/apply. External
linked inputs use explicit saved-cache values, never silently refreshed external files, and require
warning acknowledgement. Unsupported formulas fail safely with the draft retained. CSV/plain
tables retain row operations. Macro/signed workbooks and structural/formula authoring stay out.

Reliability and maintenance audit (ADR-213): quick save may apply only the exact revision created
by its own completed check job, never a newer draft from another tab. A lost apply response is
reconciled by reading that same update/revision before showing failure; no automatic resubmission.
Leaving the editor stops further check polling and does not start a later apply. Project deletion
failures remain visible with a recovery action. User-facing project terminology is consistent.
Local updates build before downtime, snapshot PostgreSQL plus stored originals/Parquet together,
preserve volumes, and verify readiness. A changed storage volume or external database is refused;
database downgrades/restores remain explicit operator actions. No cloud/multi-user scope is added.

Quick input correction (ADR-212, supersedes the manual ADR-211 button sequence): a direct source
link opens its editor immediately; otherwise select a source card. Save changes is explicit
authorization to stage, check and apply that correction when checks pass without warnings.
Errors stay in the editor without activation; warnings require inline acknowledgement and
confirmation. Draft controls and advanced update configuration remain optional. Safe existing
source-bound browser/empty drafts are reused instead of creating a draft on every entry.
Browser editing is independent of blank-template availability. Plain legacy XLSX uses existing
reading layouts and backend-declared cell types, without converting/migrating the project.
The earlier complex/formula download fallback is superseded by ADR-214 above for supported XLSX.
Original download/replacement remains an optional alternative for unsupported file types.

Browser input editing (ADR-211): source-bound file updates offer a paged table editor for prepared
CSV and plain XLSX inputs. Users edit values, paste Excel TSV ranges, add/delete data rows, undo
local cell edits, restore the last deleted row, and save/resume a server-side draft. Headers and
column structure are protected. Values remain text; no browser numeric conversions or formula
evaluation. Prepare update file stages an immutable replacement, not active data; existing checks
and explicit apply remain mandatory. Saved browser edits block conflicting upload/check/apply
until prepared or discarded. Revision and source-base guards protect against stale overwrites.
This is not a full Excel editor: formulas, macros, complex structures and oversized XLSX files
fall back to download/edit/upload. Editing a replacement with changed reading options/resource
mapping is also unsupported. Existing original files remain unchanged and advanced updates retain
their behavior. Automated editor regression remains deferred, not a completed R6 acceptance gate.

File round-trip updates (ADR-210): Update data from a file is available while viewing a dashboard
and from Data/history. Select a source and start a saved update draft, download the byte-exact
current input or supported blank template, edit/fill and upload a replacement. Existing source
mapping, checks and explicit apply retain identity and old report data until confirmation.
This path replaces the whole source, never implicitly appends a month or patches changed rows.
Downloads/save/check/apply reject a source base changed after the draft started. Simple prepared
CSV/Excel tables support compatible header-only templates; complex/legacy/XLSM inputs use their
current original file to preserve structure. CSV precision/encoding cautions are explicit. Empty
replacement of nonempty data requires acknowledgement of a data-removal warning. Data templates
do not capture calculations or dashboard layouts; no exact row-change diff is claimed.

Dashboard arrangement (ADR-209): preserve the first saved nonempty widget composition as an
immutable default layout. Existing dashboards start from their current saved arrangement.
Users can save additional named layouts without overwriting the default. Normal Save dashboard
updates the active arrangement only. Applying a layout replaces the draft widget set and can
be undone before saving. Layouts keep placements/sizes/local titles, not separate calculations
or copies of shared visualizations. A deleted visualization makes its saved layout unavailable.
Drag/resize blocks occupied space without pushing neighbouring cards. Explicit Collapse empty
space closes vertical gaps without changing widths; Auto size and arrange uses recommended
dimensions by visualization type. Both use normal draft/undo. The widget menu exposes Position
and size, numeric controls, recommended sizing and an explicit insertion at the beginning.

Guided report journey (ADR-208): the project overview explains connecting data, answering a
business question and reviewing updates. Import completion opens the report wizard with the
current dataset selected. Users can choose totals/trends, distribution/structure or dataset
comparison without manually connecting graph nodes. Basic KPI/chart grouping incompatibilities
are explained before calculation, with explicit choices to change grouping or use a table.
Report entry links open viewing mode; editing stays explicit. Without a requested dashboard,
prefer a populated report that does not need a drill-through selection. Detail reports without
required filters show an incomplete selection state and usable controls, not a calculation error.
Loading/failed reads must not be presented as an empty project inviting duplicate creation.

The interface uses the owner-selected Alabuga Framework corporate design: original
Alabuga Sans and Heading fonts, Alabuga logo, deep-blue shell, blue/cyan accents,
framework controls/cards and neutral tables. Both themes and RU/EN/TT remain available.
Dark mode adapts the light-only upstream tokens. The corporate frontend applies equally
to existing projects, including OPIOP, without rewriting their saved reports or calculations.
The integration is visual; backend execution and graph authoring retain their contracts.

Pie/donut normal sector fills use the theme's contrast-tested eight-colour palette and
2px separators. Colours and patterns follow sorted category labels, including on row reorder;
hover retains the fill colour. Highlighted sectors retain these boundaries; other sectors
remain intentionally dimmed. Exact values, grouping and saved specifications are unchanged.

Pareto axis labels avoid collisions in short cards and restore intermediate labels when
height permits. This is presentation-only: full-population bounds, server tick values,
statistics, exact tables and saved widget dimensions remain unchanged.

Interactive chart legends also expose native keyboard-operated visibility buttons, with
pressed state synchronized with the canvas legend. Escape/Close returns focus to their
disclosure. Visibility affects only drawing, not the exact table, calculations or saved report;
it is transient and resets when the renderer is recreated. Non-interactive explanatory keys
do not expose misleading visibility controls. Labels support EN/RU/TT.

Chart-rendering errors can be retried locally without reloading the report or discarding its
data table. Receiving changed render inputs allows a new attempt; failed renderer resources
are released. A successful explicit retry returns keyboard focus to the chart once.

Pie/donut categories have matching slice/legend patterns in addition to colour. Eight visual
patterns follow sorted category labels, preserving their assignment when rows are reordered;
repeated labels share a pattern but remain separate source rows. With more than eight labels,
patterns repeat and the viewer explicitly recommends the exact table or a bar chart. This is
not automatic aggregation, category removal or a promise of unlimited visual distinguishability.

Pie/donut legend filtering must not invent equal shares when the remaining visible values
are zero or missing. Such observations draw no sectors; missing values remain distinct from
zero in the exact data table. The viewer explains how to restore a hidden category or inspect
the table. Backend rejection of negative values and non-positive source totals remains unchanged.

Multi-series basic bar/line charts supplement colour with bar patterns or line marker shapes
for up to eight distinct measures. Cues follow stable field IDs when series are reordered;
single-series charts keep their existing appearance. Rendering repeated-field payloads has
collision-free identities; current backend authoring still requires unique series fields.
The light-theme multi-series palette uses darker hues so opaque series fills contrast at
least 3:1 with panel/surface backgrounds; dark-theme colours remain unchanged. This does not
claim 3:1 for antialiased edge pixels or intentionally dimmed, unselected observations.

Basic chart hover details wrap long names and show the original row's category/X and matching
measure. Additional series retain their own names/values; exact decimal strings and missing
values are not replaced by rounded drawing coordinates. Existing number-format settings for
numeric values remain in effect; original dates retain their source text in hover details.

Basic bar, line, area, scatter, pie and donut labels stay opaque with themed text/backing
when unrelated marks are dimmed by highlighting. Existing label formatting, positions,
collision handling, axes, values and selection behavior remain unchanged.

Histogram hover details wrap long exact interval boundaries without rounding either endpoint
or losing the inclusive/exclusive bracket. Observation counts remain visible; the exact
interval table is the keyboard alternative. Tooltip source text is escaped, not trusted HTML.

Histogram count labels retain opaque themed text on a small neutral backing when other
interval bars are dimmed. Counts, exact interval boundaries, population accounting and
server-side binning remain unchanged; both horizontal and vertical presentation are supported.

Optional treemap/sunburst labels stay opaque and use a contrasting text outline in both
themes, including hover dimming of other branches. Category fills remain visible; hiding
labels still removes their text. Very dense labels remain subject to available drawing space.

Treemap/sunburst tooltips wrap long measure names and preserve the complete hierarchy path,
exact amount and share of the complete total outside canvas clipping. Source text remains
escaped; this does not change drawing weights or the keyboard group/table alternative.

Bubble and bullet hover details use bounded plain-text tooltips outside short widget canvases.
Long source field names wrap; exact bubble coordinates and bullet actual/target/band text
remain available. This changes neither server scales nor mark geometry or selection identity.

Funnel hover details escape the stage scroller's clipping and wrap long stage names. Exact
values, previous/initial retention and loss stay available without changing stage geometry;
source-derived text is escaped, and the data table remains the keyboard-accessible alternative.

New radar reports created by the report wizard start with a 12-row dashboard widget, giving
axes, profiles and legend more vertical room. Existing layouts and subsequent calculation
edits retain the author's saved sizes; changing an existing chart's type does not resize it.

Radar profiles use marker shapes as well as colours and line styles, with corresponding
legend icons. Cue assignment uses the complete sorted profile identities, preserving slots
when profiles become incomplete; row order alone does not change a profile's cues.
When numeric radar labels are enabled, their exact text stays opaque on a small neutral
background even when profile lines and markers are dimmed by highlighting.

Heatmap cell labels select contrasting black/white text from interpolated fill luminance,
not a fixed scale-position threshold. Highlighting may dim unrelated cell fills, but exact
labels and missing-data markers remain opaque on a matching small background for readability.
Hover preserves the encoded cell fill and uses a border cue rather than changing its luminance.
This is presentation only: scale bounds, exact values and selection identities are unchanged.
Heatmap tooltips render outside widget clipping, with source text escaped rather than treated
as HTML. The cell table remains the keyboard-accessible alternative for exact values.
Box-plot summary/outlier tooltips use the same escaped plain-text rendering outside widget
clipping; all quartiles, counts and missing-value rows must remain available.

Source refresh version selection and resource-binding controls wait for a successfully loaded
version catalog. Pending/error feedback offers read-only retry without changing the selected
update or its mappings. Retrying metadata retrieval is not uploading or applying a new file.

Report history distinguishes initial loading, confirmed empty lists and failed reads, with
retry for history/task/state failures. Update creation, checking and update actions wait for
successfully loaded task/state/update metadata; freezing also requires release history.
Polling existing successful metadata does not disable the entire form on every refresh.

Alignment report creation and editing distinguish pending, successful-empty and outdated
previews. Recalculation hides the old result until success; a failed calculation does not
present old values as current. Empty previews preserve schema/diagnostics and may be saved;
changed settings require a new successful preview.

Statistical preview errors are not labelled as unfinished configuration. Once a successful
preview is invalidated by edited settings, an explicit outdated-preview message requests a
new calculation. During paging, retained statistics are identified as previous data.

A report wizard preview with zero result rows explicitly states that calculation completed
without rows and suggests checking source data and filters. This is not an error or unfinished
configuration: the schema remains visible and the report may be saved. Editing its settings
invalidates the preview and its empty-result notice until a new calculation succeeds.

When a visualization retains previous data during refresh or pagination, a visible localized
status identifies it as the previous result. Row/chart navigation actions are suspended until
the new result arrives. Failed refresh shows the error and retry action instead of stale data.
Server-backed pagination controls are disabled while their paging callback is unavailable,
including pending requests and read-only result snapshots; no enabled-looking no-op buttons.

Both graph editors offer directional viewport buttons alongside zoom/fit (ADR-201); panning
does not move nodes or save the graph. Repeated names in selection lists have readable ordinal
suffixes, stable while filtering. These are display labels, not renamed nodes or saved identities.

Classic node groups can be formed using a searchable checkbox list as well as canvas selection
(ADR-200). Search preserves selected nodes outside the visible matches, with explicit guidance;
Clear selection removes all selections. Selecting members alone does not modify the saved graph.

Graph layout can be changed without dragging (ADR-199): choose a visible movable item and
use direction buttons. The same graph undo/save rules apply; calculations and connections
are unchanged. Field-editor books, blocks and prepared-result cards are supported as well.

Calculation editors retain their desktop panel layout and reflow into library, graph, settings
and preview on narrow screens (ADR-198). Resizing does not recreate the editor or modify the
graph. Authoring controls must remain reachable without horizontal page scrolling; the drawing
itself remains a two-dimensional canvas. Enlarged text must not overlap graph and preview.

Dashboard recovery failures are explicit (ADR-197). Corrupt, incompatible or unreadable local
settings cannot silently replace the author's work with saved settings. Retry, confirmed discard
and explicit continuation are available; the latter leaves the raw draft untouched until a new
edit replaces it. Valid drafts retain their original revision and existing conflict protection.

Release-form settings have explicit same-tab recovery (ADR-195): name, period label, comment,
selected dashboards, applied date period and parameter selections. Recovery never submits a
release, restores warning consent or restores check tokens. Missing dashboards require explicit
reselection. Browser storage failures are visible; bounded same-document fallback is not durable
across reload. Settings remain after submission because the API starts a background task; authors
check task/release history before repeating and explicitly discard when finished.
Unapplied release date inputs are recovered separately from the applied period, including an
incomplete range. Editing dates never changes calculations until Apply period or All time.
Pending date edits visibly block release creation; restore/discard returns keyboard focus to the
release name. Dashboard date inputs have separate project/dashboard-scoped recovery (ADR-196):
returning after navigation or reload offers explicit restore/discard. If the applied URL period
changed, show a warning; recovery never updates the URL or recalculates using the scratch dates.
Only Apply/All time changes filters. Browser storage limitations remain explicit.

History retains the selected saved update in its URL (ADR-194). Reload reopens that update;
unavailable links show a clear message instead of silently selecting a different update.
Preparing rollback opens the new draft for review/checks; it never applies it automatically.
Unsaved edits still require confirmation before switching updates. Action errors receive focus;
background refresh errors do not interrupt typing.

Universal import: the Tables step offers additional reading settings for Excel header-row count
and Excel/CSV rows skipped after headers or excluded at the end. These excluded rows do not
enter the normalized dataset; the original stays immutable. Settings use the existing saved
import draft. An optional Excel range such as B2:F100 starts with the header and bounds imported
columns/rows (ADR-193). Clearing it restores the header-row setting. Out-of-populated-sheet bounds
and cut merged headers require correction. Existing workbook safety limits still apply.
Replacement-file mapping exposes the same range, header-count and row-exclusion settings per
prepared dataset. Editing reading settings clears that dataset's column mapping and hides stale
mapping suggestions until checked again. Other datasets in the workbook keep their settings.
In Field details, authors may mark up to 32 fields as a composite row key. Key identity follows
stable field IDs through display-name edits and saved drafts. The existing server rejects missing
key values and duplicate combinations on initial import and every refresh; it never deduplicates.
Import validation provides one review action per affected field and a separate row-key action.
These return to Fields and focus the relevant control (opening key details), without changing
values, validation policy or key membership. Truncated diagnostic samples are explicitly labelled.
The preview table has a named keyboard scroll region, caption and scoped column headers.

Analytical table pinning adapts to card width (ADR-192). If pinned columns would hide values,
some columns temporarily scroll instead, with a visible notice. Widening restores the saved
pinning preference; resizing never changes the report's persistent settings or calculations.

Dashboard layout undo/redo (ADR-185) changes placement and attached widgets, not independently
edited titles, visibility, navigation, dashboard name or selections. Metadata edits do not consume
layout undo steps. Empty dashboards with configured parameters retain editable selection controls,
including in viewing mode; changing a URL selection is not a dashboard configuration save.

Template catalog API foundation (ADR-183): discover both families by name/row meaning, family and
active/archive state. Revision-guarded renaming and reversible archiving change metadata only,
never captured formulas or existing reports. Archived entries cannot be loaded into a wizard and
still count toward the 200-template cap. Names/archive state survive frozen release restoration.
The wizard detects stale selected templates and offers list refresh. The dedicated catalog screen
(ADR-184) is available from Reports and template pickers, with explicit rename/cancel, confirmed
archive, restore, search/filter/paging and recoverable pending edits. A conflict requires explicit
refresh. RU/EN/TT, light/dark and narrow layouts are supported; full human acceptance remains open.

Reusable report templates (ADR-182) copy compatible saved measures, row/after-total formulas,
filters, calendar comparisons and presentation bindings, including combo/radar scales. Users map
source fields explicitly and confirm the meaning of one row; the ordinary wizard previews and
creates an independent report. Source records, manual preparation and dashboard layout are not copied.
Templates survive release restoration; capture retries and loaded drafts support same-tab recovery.

Guided waterfall reports (ADR-181) select labels, values, optional row-type markers and an explicit
step order. Keep source order or sort ascending by a unique nonempty integer/decimal/date/datetime
field. Initial balances, contributions, subtotals and final totals retain exact reconciliation.
Preview provides the chart and exact step table before saving. Compatible reports reopen in the
analytical wizard; drafts, reusable analytical templates and frozen releases use the same graph.
Legacy graphs without an order field keep input order and are not automatically rewritten.

Guided radar reports (ADR-180) select a profile dimension and aggregated/formula measures in the
standard wizard, then explicitly set 3-8 axes and shared or per-axis normalization bounds. Preview
includes a chart, exact profile table and inspectable scales. Missing values stay empty; profiles
outside bounds must be corrected. More than 20 profiles requires filtering, never silent sampling.
Saved reports can reopen for calculation edits; changes to axes/scales require explicit rebinding.

Guided plan-fact reports (ADR-179) select one dimension and explicit bar/line measures in the
standard report wizard. Preview shows the chart and exact result table before saving. A second
axis is an explicit analytical choice; series on one axis must have compatible units/currency.
Ordinary graph aggregation and after-total formulas support sums, averages and ratios of totals.
Compatible saved reports reopen with series/appearance preserved; changing bindings requires
explicit opt-in. Draft/retry recovery and release restoration retain the same graph/spec contract.

## Approved product evolution R0–R6 (2026-10-08)

Radar hover details retain all configured axes outside short widget canvases. Long profile
names wrap within the chart-width bound; source text is plain text, not executable HTML.
Waterfall hover uses the same bounded text rendering for the category, contribution, bar
endpoints and running balance, without changing their exact values.
Combination/Pareto hover also wraps long names, retaining the assigned axis and exact value
outside short chart canvases. Source-provided names are never interpreted as HTML.
Optional numeric labels on combination, Pareto and waterfall charts stay opaque when other
categories are highlighted. Marks remain muted; exact source values and scales are unchanged.
Bubble observation labels also retain opaque themed text independently of translucent
bubble marks; area encoding, missing observations and zero-size handling are unchanged.
Bullet's optional actual-value labels can use the existing top chart padding so the first
indicator's label is not cropped in short windows; scales and indicator positions are unchanged.
Multiple same-kind combination series also use marker shapes for lines and fill patterns for
bars, reflected in the legend. Cues follow stable field IDs on reorder; colours remain available.
Combination and Pareto numeric labels suppress collisions when space is limited and are
laid out again on resize. Exact values remain available in hover details and data tables.

The owner approved implementation of the report-first evolution recorded in
docs/PRODUCT_EVOLUTION.md. Primary users are economists/business analysts, working locally
as one author with typical datasets up to 100,000 rows. This explicitly supersedes previous
deferrals of UI redesign, CSV ingestion, category controls and new chart types. Direct 1C
connectivity remains a future integration contract, not a working connector claim.
Preserve the existing stack, projects, calculation semantics, releases, RU/EN/TT and both themes.
The report wizard creates ordinary editable graph operations; the backend remains the sole
calculation authority. Technical acceptance and five-economist acceptance are separate gates.

All 21 visualization families are discoverable in the typed registry. The eight basic types now
return stable-ID semantic roles for display while preserving existing settings, calculations and
historical releases (ADR-174). Basic independent authoring now sends typed specs, normalized to one
compatible saved configuration (ADR-175). Mixed new/old bindings are rejected; table all-fields and
scalar KPI retain explicit semantics. First-series names are editable. No saved project is auto-migrated.

Field-wire users can choose exact v2 constants, arithmetic, sums and single values (ADR-176), feeding
ordinary reports/KPI without losing monetary precision. Decimal constants use text input; scale is
explicit, and arithmetic rounds half-even at each node. Sum ignores nulls and returns zero for an
empty population; Single value never chooses the first of multiple rows. Float64 requires explicit
conversion. Exact Field expression v2 (ADR-177) combines a/b/c in one numeric expression with one
final half-even rounding, including conditions over text, boolean and date fields. Scalar-only
inputs produce a scalar; connected fields preserve their row population, including empty tables.
Existing v1 calculations keep their behavior. Decimal workflow/dashboard parameters (ADR-178)
use exact text values with explicit precision/scale. Defaults, selections, formulas, filters,
choices and frozen releases preserve digits; incompatible precision/scale and numeric JSON are
rejected rather than rounded. Explicit workflow bindings expose dashboard selection controls.

Analytical templates (ADR-157) capture a saved compatible calculation and its filters, not source
records, manual upstream preparation or appearance. The author describes one input row. Templates
are immutable and project-local (up to 200), survive restart/release restoration, and remain available
after deleting the original report. Explicit mapping requires matching logical types and known
unit/currency plus row-grain confirmation; names never imply semantic equivalence. Applying settings
does not create a report: full preview and normal atomic graph creation remain required. Reports are
independent of their templates. Nine analytical-wizard types and standard grouped/formula reports
are supported (ADR-181/182). Both families share the 200-template project limit. Catalog metadata
APIs and the management screen are delivered (ADR-183/184). Cross-project libraries and other
report families remain future work.

Project Overview (ADR-139) prioritizes saved reports, normalized tables, resumable imports and
project check/update state. Report search and paging separate view-only opening from editing;
populated reports appear before empty layouts. A saved layout is not proof of current correctness.
Independent section failures show unknown state with Retry, never a false empty/success state.
Restored report selections and existing Excel connections remain accessible. Detailed calculations
are an advanced route, not a prerequisite for the ordinary report wizard.

The report workbench (ADR-140) separates searchable schema fields, the report preview and detailed
settings while retaining one visualization draft. Field buttons use stable identities; statistical
roles and calculations remain explicit. Keyboard anchors support stacked narrow layouts. Failed
schema refresh must not show a cached preview as current or permit apply. Visualization settings have
explicit tab-local recovery and guarded workspace links (ADR-141). Recovery retains the original
revision and is not a server save; browser history returns to a recoverable draft when storage is
available. Closing the tab, denied storage and broader authoring/accessibility audits remain limits.
Import and basic report wizard transitions focus the new step heading, including asynchronous
import continuation and completion (ADR-168). Ordinary edits do not move focus. The next Tab starts
within the new step; headings do not add permanent tab stops. Full accessibility acceptance remains
separate from this targeted keyboard correction.
Basic report measure/filter addition focuses the new control; removal focuses the next surviving
row, previous row at the end, or Add when empty (ADR-169). Failed import actions and report checks
focus a named, localized message while preserving settings. Starting a new attempt clears previous
action feedback; retries retain existing revision/request guards. Ordinary edits do not refocus.
Row, after-total and alignment formula controls follow the same add/remove focus policy. The basic
report wizard can choose a checked earlier after-total formula by name (ADR-170), for example
profit -> margin -> target gap. Check after-total fields validates the chain without executing or
saving it. Upstream changes invalidate dependent field choices; a consumer edit does not invalidate
its unchanged producer. Each step retains its configured decimal scale and rounding; totals-based
ratios remain distinct from averages of row ratios. Full server preview is required before save.
Standard report tables use 14 px text and schema-driven right alignment/tabular numerals for
integer, float and decimal fields. Text codes stay left-aligned even when their values look numeric.
Formatting settings, exact transport, row selection and server pagination are unchanged.

KPI number/currency/percent settings also apply to exact decimal and large-integer strings
(ADR-171), without binary floating-point conversion. Numeric-looking text codes are not reformatted.
Display rounding does not modify stored calculations or the exact values in tabular views.
Analytical grouping/measures/filters and Join/alignment key controls preserve keyboard context
after Add/Remove; grouping/measure Move buttons focus the moved field in its new position
(ADR-172). Failed analytical previews and alignment field/preview checks focus named localized
feedback. New check attempts replace earlier action errors without clearing the author's settings.
A reproducible synthetic executive showcase combines three financial KPIs, monthly plan/fact,
heatmap, box plot, histogram and hierarchical totals, with a checked replacement source. This is
technical demonstration evidence, not a substitute for the five-economist acceptance gate.

Legacy graphical views now offer a same-result data table (ADR-142), preserving returned numeric
strings, complete names and missing values without chart formatting. Responsive Cartesian axes may
abbreviate labels or reduce displayed ticks; they must not filter or reaggregate observations. The
table exposes the returned result only, with explicit notice if the server result is truncated.

Independent visualization creation, copying and editing support safe retries (ADR-143). A pending
save locks its settings until the outcome is confirmed; tab-local recovery preserves the original
request, including revision checks. Retrying never creates another object for that request. A
definitive rejection unlocks correction. Discarding an uncertain operation warns that it may already
be saved in the library. Saving/attaching dashboard widgets remains a separate action.

Report creation, safe wizard editing and alignment also retain tab-local drafts and exact pending
requests (ADR-144). Restoration preserves original revision guards, formulas, measures and wizard
steps, but requires a fresh preview for unsent settings. An already submitted operation can be
retried before current schema metadata is available. Navigation offers keep/discard/continue; local
storage errors are explicit. Named-measure reports use the same recovery lifecycle (ADR-145), with
selected compatible measures retained and failed catalog refresh blocking apply. Comprehensive
human and all-form accessibility acceptance remain open.
If browser storage fails, the latest report/visualization settings and pending request remain in
the current document's memory (ADR-173), allowing explicit recovery after client-side Back/Forward
instead of silently restoring older settings. Warnings make clear that reload/tab closure can lose
this temporary copy. Keep-and-leave still requires successful storage. Confirmed saves cannot be
revived as pending within this document after failed local cleanup. No cross-tab/server autosave.

Guided distribution authoring (ADR-146) creates a histogram or box plot from an imported table or
prepared result without manual node connections. Users choose the numeric observation field,
optional box-plot grouping or histogram bounds/count, and filters applied before statistics.
The preview includes the actual chart and exact tables from a full-input server execution; paging
outliers does not alter quartiles. Apply creates ordinary editable graph nodes, a publication and
a dashboard in one transaction with safe retries. Draft recovery retains original source revisions.
Prepared inputs share their existing branch; no implicit reaggregation/copy of prior calculations.
The same Create analytical report route also creates heatmaps and analytical tables (ADR-147).
Heatmaps require two dimensions, a numeric field and explicitly selected aggregation. Tables support
ordered grouping levels, stable named measures, optional subtotals/grand totals and ratio-of-sums.
Totals use full observations, not averages of visible child rows. Paged preview does not change them.
Appearance (colour scales, pinned columns, density, conditional formatting) is edited after saving
through the existing visualization editor. Compatible terminal calculations can also be edited in
the wizard (ADR-148), retaining node/publication identity, upstream manual work, appearance and layout.
Shared or advanced terminal bindings remain graph steps with an explicit explanation. Multiple widgets
of one visualization require confirmation. Table grouping/measure changes require field rebinding;
dangling formatting rules must be corrected explicitly, never silently discarded. Revision conflicts,
draft restoration and exact pending retry apply to edits as well as creation. Changing analysis type
means creating a separate report. Arbitrary graph restructuring remains outside the simple editor.

The initial R4 statistical step, Box-plot statistics, prepares full-data linear quartiles, inclusive
1.5-IQR observation whiskers, sample/missing counts and separate outliers per optional group. It is
available in the graph and its results can be published as tables. Missing values never become zero;
integer/decimal statistics remain exact within the explicit Decimal128 precision limits (ADR-128).
Its summary can now drive an independent graphical box plot, with vertical/horizontal layouts and
exact summary/outlier tables. Bounded outlier display is explicit and never changes statistics.
Optional chart labels show exact medians in either orientation; empty groups have no median label.
Frozen releases retain all observations. View filters apply before statistical preparation. Typed
specifications/registry include box plot, histogram, heatmap, radar, waterfall, combinations and
analytical tables, bubble charts, Pareto, treemap, sunburst, bullet charts and funnels;
Guided authoring for all types, reusable templates and the legacy typed-registry migration remain unfinished.

R5 bubble charts (ADR-149/150) bind X/Y/size, a unique row key and optional label/group on prepared
tables. Area is proportional to a nonnegative size measure. Full-input scales and validation are
independent of the explicitly labelled displayed page; missing and zero-size observations remain
distinct in the exact table. Close large values may show relative axis labels with a visible base
equation; exact values remain in the table/tooltips. Saved settings, tab-local draft recovery,
complete frozen releases and restored editable projects use the existing lifecycle. Group colours
are stable across pages; table buttons provide selection without relying on canvas interactions.

R5 Pareto (ADR-151) uses an ordinary Pareto contributions graph node on one prepared row per
category. Values must be finite, nonnegative and nonempty; duplicates require explicit upstream
aggregation. Descending contributions use ascending native category order for ties. Full-population
totals, ranks and cumulative shares are independent of preview pages. Integer/decimal amounts retain
exact Decimal128 arithmetic with explicit overflow; percentages use 12-place half-even rounding and
exact fraction companions. Float inputs retain approximate amount transport. A zero total leaves
shares undefined, never 0% or 100%. The typed chart combines contribution bars with a fixed 0–100%
cumulative line and an explicitly adjustable reference (80% default), not automatic classification.
Exact tables, stable selection, labelled live pages, full frozen results and restoration share the
existing lifecycle. Population restrictions belong before the Pareto node. The analytical report
wizard creates Pareto from prepared unique categories and safely edits compatible suffixes (ADR-155).

R5 hierarchical views (ADR-152) reuse analytical-table totals: ordered grouping levels, every subtotal
and grand total, and one sum/count measure. Treemap uses nested rectangles; sunburst uses concentric
levels. Averages/ratios, negative/missing prepared values and incomplete trees fail explicitly.
All <=5000 nodes are validated and retained, including zero contributions and missing categories.
Exact tables, stable selection, keyboard group exploration, labelled units, save/retry and complete
release/restore are supported. Exploring a branch does not change shares of the complete root.
Very small areas may be invisible, and zero totals have no area; exact values remain accessible.
The analytical report wizard directly creates treemap/sunburst with ordered levels and one explicit
sum/count measure (ADR-155). Compatible single-measure hierarchies round-trip through the wizard
(ADR-156), preserving manual preparation and appearance. Grouping or measure-identity changes require
explicit field rebinding; stale formatting is never silently removed. Advanced/shared/multi-measure
calculations remain graph steps. Broad human/accessibility acceptance remains future work.

R5 bullet charts (ADR-153) compare prepared actual and target on a shared explicit zero-inclusive
scale with 1–5 labelled ranges. One nonempty category per row, compatible numeric units and finite
values are required. Out-of-scale values cause a clear error, never clipping. The author assigns
range colours; higher does not implicitly mean better. Exact membership is lower-inclusive except
the final maximum is also included. Missing values differ from zero. Actual bars and target markers
have exact table/tooltip alternatives; keyboard windows adapt to card height. Full validation/counts
and scale do not depend on the visible page. Saved settings, complete releases and restore retain
the same semantics. Aggregation, alignment and achievement calculations remain in the graph.

R5 funnel (ADR-154) uses an ordinary Funnel stages node on one prepared row per stage and a unique
integer order. Values must be finite, nonnegative, nonempty and non-increasing in that order; sorting
by value is never substituted. The author prepares the same population/unit upstream. Ratios of
aggregate stages do not prove individual conversions. The node emits exact losses and previous/
initial-stage retention, rounded percentages with exact fractions and a population summary.
Zero denominators are undefined. Up to 50 complete prepared stages are shown; empty/zero/single-stage
inputs have explicit semantics. The chart encodes value by width, has no invented final drop,
and supplies a keyboard-scrollable complete sequence and exact table. Frozen releases and restored
projects retain all stages. Configure view restrictions before preparation. Guided creation and
compatible suffix editing are available through the analytical report wizard (ADR-155), retaining
explicit stage/order/value roles. Reusable templates remain a separate future task.

Histogram statistics uses 20 equal-width intervals by default, editable from 1 to 200 with optional
explicit bounds. Every non-null observation is counted, including separate below/above-range counts.
The last interval includes its upper bound; other right bounds are excluded. Automatic constant data
uses one interval, empty input has an explicit state. Exact boundary text (including rational fractions
when needed) prevents silent rounding of decimal/integer membership. Graphical histogram and exact
interval table share the same full-data result and frozen-release behavior (ADR-130).

Heatmap cells (ADR-131) prepares two-dimensional data in the graph. Users explicitly choose sum,
average, minimum, maximum or count of non-empty numeric values. Every cell retains row/missing counts
and presence, distinguishing absent combinations, empty measures and true zero. Integer/decimal
aggregations are exact, with explicitly rounded averages. Limits: 200 categories per axis and 10000
cells; excessive detail fails with a request to group/filter upstream, never silently truncates.
The result drives a graphical heatmap with exact table/tooltips and separate absent/missing markers
(ADR-132). Choose a data-extent, zero-centred or fixed colour scale. Fixed bounds only saturate colours,
with visible outside counts; all values stay intact. Cell/axis selection uses stable identities.
Filters apply before cell preparation. The complete bounded matrix and scale survive frozen releases
and restoration; table paging/zoom does not recalculate statistics or colour bounds.

Radar (ADR-133) compares prepared unique profile rows on 3–8 numeric axes, with up to 20 profiles.
The author explicitly chooses common units/bounds or per-axis min-max normalization; declared mixed
units require the latter. Unknown units are not inferred. Every bound is explicit; out-of-range
values are rejected, not clipped. Missing axes keep the profile in the exact table but omit its
polygon with a notice. Existing graph operations perform all aggregation/alignment. Profile and axis
tables, stable selection, keyboard axis ordering, frozen releases and restoration are supported.

Waterfall steps (ADR-134) prepares an ordered balance bridge in the graph. Ordinary signed changes,
an optional first-row opening balance, intermediate subtotals and a last-row final total have distinct
semantics. Source row types use explicit configurable text markers, not label guessing. Empty totals
are calculated; supplied totals are reconciled exactly. Empty contributions fail. An explicit option
adds a final total when the source has none. Unique nonempty labels and at most 2000 output steps are
required; use upstream sorting/grouping for business order/detail. Integer/decimal balances remain
exact, with explicit overflow errors. The graphical waterfall (ADR-135) binds these prepared steps,
with vertical/horizontal layouts, an exact step table and stable selection. Full-data scale always
includes zero; filters must apply before preparation. Zero strokes and explicitly explained sub-pixel
nonzero dots stay distinct. Button-based chart windows and table pages never recalculate balances.
Complete frozen results and restored graphs retain every bounded step, not just a preview page.

Combination charts (ADR-136) compare 2–8 prepared bar/line series over unique categories, with both
styles required. A second axis is explicitly enabled and assigned; units/currencies must match
within each axis. Both scales include zero and expose exact values/bounds. Missing values are gaps,
never zeros or connected lines. Data preparation/order remain in the graph. Up to 2000 categories
are retained completely, including frozen releases; excessive detail fails rather than truncates.
An exact table, stable selection and keyboard category windows complement the chart in both themes.

Analytical table totals (ADR-137) prepares 0–8 grouping levels and explicit measures in the graph.
Sum, average, extrema, counts and ratio of sums use full observation data; intermediate/grand totals
never sum rounded averages or percentages. Integer/decimal values remain exact within Decimal128;
averages/ratios use explicit half-even rounding. Ratios independently sum nonempty numerator and
denominator values; zero/missing denominator remains empty. Group order follows first occurrence;
subtotals follow children, grand total is last. Null categories are distinct from total rows.
Up to 20000 output rows including totals, with stable identities and ordinary preview/publication/
release support. Analytical-table presentation (ADR-138) hides technical roles and distinguishes
detail/subtotal/grand-total rows. Choose visible measures/order, 0–4 pinned data columns and normal
or compact density. Ordered conditional rules compare exact decimal thresholds on the server;
empty values are not zero. Labels accompany semantic colours. Bounded pages and frozen releases
retain complete totals and stable navigation; population filters must precede preparation.

Exact calculated columns support conditional numeric results with `if_else` (ADR-160), including
typed comparisons, `is_null`, `and`, `or` and `not`. Text/boolean/date/datetime conditions never
implicitly coerce to numbers. Null comparisons stay unknown; false/unknown conditions choose
otherwise. Only the selected branch executes, while all branches undergo schema validation.
The same behavior is available in row, after-total and alignment formulas through the common graph.
Exact Window v3 (ADR-161) adds exact partition sums, cumulative sums/maxima and previous-row values
for decimal/integer inputs; explicit ordered row numbers are also available. Monetary scale is
preserved, overflow is an error, and Float64 conversion is never automatic. Null observations stay
empty in cumulative output without resetting the accumulator; previous includes null rows. Every
ordered operation requires unique ordering keys within its partition. Legacy window versions remain
unchanged. The Share and rank helper supports decimal fields and explicitly selected exact integer
calculations (ADR-162), with configurable share decimal places. Exact ranks are row positions with
unique tie-breaking, not dense ranks. Optional parameter selection occurs after calculation, so
selecting a row does not shrink its denominator. Other analytical shortcuts still need parity audits.
Decimal Unpivot preserves all source digits using the maximum declared scale and explicit metadata
(ADR-163); incompatible units/currencies or insufficient precision fail instead of silently rounding.
This fixes prior six-place truncation. Frozen historical artifacts are not rewritten automatically.
Exact Pivot v2 (ADR-164) adds decimal/integer cross-tab sums, averages, minima/maxima and nonempty
counts. Average decimal places are explicit; rounding is half-even. Missing numeric cells are empty,
not zero; count returns zero. Dynamic category fields retain stable identities and a 128-category
limit. Float64 arithmetic remains in legacy Pivot v1, without automatic graph upgrades.
Convert Types rejects fractional decimal-to-integer conversion under the error policy (ADR-165),
or produces null only when explicitly selected. It never silently discards fractional digits.
Join/Union preserve every decimal digit at a common maximum scale (ADR-166), including matching
keys in unmatched/duplicate diagnostics. Conflicting known units/currencies and rescale overflow
are explicit errors, not automatic conversions. Empty keys still never match; non-key Join fields
retain their own units/scales. Frozen releases are not rewritten by this correctness fix.
Field copying and conditional decimal selection preserve precision/scale and compatible unit
metadata through preview, Append Field and downstream exact aggregation (ADR-167). Coalesce and
if_else widen selected value branches without rounding; nullif retains the left field's scale.
Unrepresentable values and incompatible known units fail explicitly. Legacy decimal scalar outputs
remain unsupported with preflight guidance to keep an exact table result; no Float64 fallback.

The initial prepared-result reuse path adds a report branch to the existing calculation graph.
It shares preparation rather than copying it; workflow parameter defaults apply. Context-filtered
results need explicit graph configuration. Cross-workflow references are not implied by this slice.

Named shared measures reference an existing numeric result and its declared grain. Direct reuse
must not aggregate an already prepared ratio or average. One measure supports Table, one-grain Bar/Line
or single-total KPI. Up to eight distinct measures from one publication with identical grain can be
displayed together in a table, without joins or reaggregation (ADR-125). Every render checks all selected
numeric fields and full-data grain;
incompatible shared calculation changes produce an explicit error. Removing a definition from the
catalog leaves existing reports/calculations intact. Side-by-side display never implicitly aligns
different results. The graph now offers an explicit Align measures step (ADR-126): two prepared
numeric fields, 1–8 key pairs, full one-to-one alignment and separate row-presence flags. Both sides
must be unique by the selected keys. Empty keys fail unless matching them is explicitly enabled;
missing measures remain empty, never zero. Full-data match counts accompany preview. A guided
alignment builder (ADR-127) selects two prepared results within one workflow and creates an ordinary
alignment node, publication and table report atomically. Preview is read-only; stale input conflicts
and retries are explicit. Up to 16 ordered exact formulas can be authored after alignment (ADR-158),
including differences, ratios and references to earlier formula results. No repeated aggregation:
each expression applies to one aligned key, preserves nulls and explicitly handles zero denominators.
Server-checked field pickers, decimal precision/scale and same-tab recovery are available. Float64
inputs require explicit upstream normalization for exact arithmetic. Saved compatible alignment
calculations can be edited through the wizard (ADR-159), preserving both preparation branches,
formula identities, appearance and layout. Key/field changes require explicit table rebinding.
Shared/context-bound/manual terminal chains remain graph steps; source connections are edited in
the graph. Cross-workflow alignment is planned.

Calendar comparison authoring supports month/quarter/year reports, comparing one
prepared measure with the previous calendar period or the same period last year. Show previous
value, difference, change percentage and baseline availability. Missing periods/nulls never become
zero; a zero baseline has no percentage. Timestamps require explicit timezone-to-date preparation.
Filters affect both periods; no extrapolation of partial periods. Decimal/integer arithmetic is
exact. Table, Bar and Line presentations are supported. Charts require the date as their only
dimension and show exactly the compared value and its baseline on one axis, not change percentages
mixed with absolute values (ADR-124). Multiple partitions remain table-only. Saved comparison reports
can be edited in the wizard when their recognized steps are exclusive;
shared/manual or incompatible chains stay in the graph (ADR-123). Adding/removing comparison requires
explicit visualization field rebinding. Changing a chart's compared measure also requires rebinding.
Removing comparison also removes calendar bucketing. Broader measure composition remains planned.

## Regular report cycle (approved 2026-09-24)

The financial and multi-workbook reports must support immutable Excel versions, staged complete
replacement or explicit period accumulation, field mapping, full-data quality checks, atomic
application, compatible rollback, frozen releases and restoration into a new editable project.
The operator route is Data → Checks → Dashboard → Release. All calculations remain generic
workflow operations. Releases preserve complete visible datasets and frozen context, independent
of later edits. Users/permissions, scheduling, new connectors and new navigation are excluded.
Detailed behavior and operating limits: docs/REPORT_CYCLE.md.

## Authoring usability follow-up (2026-09-24)

Project entry explains Data -> Workflow -> Dashboard; the visualization library remains accessible.
Incomplete chart forms explain missing selections before requesting preview or allowing save.
Tables use a single searchable ordered column selection; workbook actions and editor tabs support
keyboard interaction. No automatic analytics or new product subsystem is introduced.

## Dashboard workspace UX (2026-09-24)

Dashboard editing is explicitly in scope: compact widget headers, settings in a right panel,
in-place draft preview, on-demand chart library, free-space placement and local undo/redo.
Independent visualizations retain shared ownership and explicit save; dashboard layout saves
separately. Creation/copy preserves unsaved layout. See docs/DASHBOARD_WORKSPACE.md.
This supersedes deferral of dashboard UI redesign only; node editor redesign, new interactive
filters, transitions and users remain outside this iteration.

## Simple configurable dashboards (2026-09-24)

Priority: workbooks -> node calculations -> published results -> configured visualizations ->
saved dashboard layout. All functions remain accessible to everyone. This supersedes the
viewer-only proposal. New navigation, hierarchical drill-down, category filters and redesign
are deferred. Existing period filtering is optional for the first delivery. Reuse simple tables,
KPI and charts. See docs/SIMPLE_DASHBOARDS_PLAN.md for the staged implementation and examples.
Join supports multiple explicit key pairs in v2, with user-selected relationship validation.
Preparation includes typed conditions, string/date functions, explicit Excel row exclusions,
ordered Window v2 and a Calendar source. Join diagnostics expose unmatched/duplicate input rows.
Independent Bar and Line can show up to eight prepared numeric measures without aggregation.
The public four-book P&L example and explicit differences from AlMaBi are documented in
docs/ALMA_SIMPLE_DASHBOARD.md. Real-data validation and human operator timing are separate checks.

## Guided table workflow (2026-09-23, ADR-108)

The field editor offers a Next step panel for Join, calculated field, Group By and publication.
Other operations remain available in the expandable catalog. Calculated fields use the same
simple arithmetic form for creation and later editing; complex formulas retain advanced editing.
An on-demand bottom preview supports pinned A/B views. Join previews report full-input matches,
unmatched rows and duplicate-key expansion without silently removing records. Node captions
describe configured data and operations. These changes do not claim measured human speed gains.

## Table-driven node authoring (2026-09-23)

Table outputs offer Join with another table and Add calculated field. Each action creates
ordinary editable nodes atomically, without rewiring existing branches. Published outputs
have visible result cards; these are presentation references, not calculation/chart nodes.
The walkthrough is docs/TABLE_AUTHORING.md. Other table-header transformations remain deferred.

## Approved primary dashboard workflow (2026-09-22)

Prepare data with nodes, publish a named table/scalar output, create independent visualizations,
then place them on a dashboard. Visualization owns chart fields and appearance. Calculations,
aggregations, denominators and ranks remain explicit graph operations. A shared date period and
dashboard navigation are in scope; category filter panels and click cross-filtering are deferred.
Data context is configured once and inherited by visualizations. UI and acceptance details:
docs/PUBLISHED_DASHBOARDS.md; architecture: ADR-106. This supersedes the requirement to create a
chart node in the original MVP journey. Historical chart nodes remain readable for existing
projects and numerical reference checks, but are not a second actively developed authoring path.

## Approved extension: functional nodes and field connections (2026-09-21)

Priority clarification (2026-09-22): the owner requests a newly assembled financial dashboard
using field nodes; maintaining the old dashboard implementation is not an acceptance objective.
Use existing results as a numerical oracle. Do not infer permission to reset user data. Judge
usability separately from correctness; automated assembly is not a human timing experiment.

Implement the opt-in field editor specified in docs/FIELD_EDITOR_PLAN.md: expandable workbook
cards, real typed table/field/scalar connections, explicit calculations, A/B previews and one-level
composite blocks. Preserve stable node/field identities, dashboard links, three languages and
both themes. Different row contexts require an explicit Join. Existing projects remain usable;
conversion is explicit and the original financial project must not be converted automatically.
Enable the new mode only through staged acceptance; internal computation functions alone do not
constitute completed operator-facing nodes. Human usability claims require measured evidence.

## Dashboard viewing and placement

Authors can switch between editing and viewing a dashboard. Viewing retains filters and
transitions but hides configuration, movement and resize controls. The selected mode survives
URL reloads and navigation. Unsaved drafts remain visible with an explicit warning.
Two optional placement templates (KPI and charts; report) offer preview, cancel, apply and undo.
They change only widget positions/sizes in the draft, persisted by normal dashboard saving.
Names, calculations, formats and transitions remain intact. View mode is not a permission boundary.

## Approved extension: constructor dashboard parity (2026-09-14)

Authors can configure a transition directly at its widget, inspect required destination inputs,
request unambiguous typed mapping suggestions and preview values from an example result row.
Applying merges into the current dashboard draft; cancellation preserves unrelated edits.
Missing visualization context fields can be selected from its input and reviewed with shared uses.
From a saved dashboard, authors save added fields and the transition atomically; stale source,
destination or workflow revisions reject the operation while preserving the modal review.

Dashboard choice sources may use separate value and display-label fields. Filters and URL state
retain typed values; identical names with distinct IDs remain selectable. Search covers both
fields, and selected labels remain visible outside a limited search page. Conflicting labels for
one ID are reported explicitly; null labels fall back to the value. Existing selectors are compatible.

Reproduce the six analytical screens in opop_bi v1.2 using ordinary editable Node BI
graphs and dashboards. Financial mappings and formulas belong only to project
configuration, never special application endpoints or executors. Extend general
Excel layouts, preparation nodes, parameters, navigation and visualization controls
as specified in docs/OPOP_CONSTRUCTOR_PLAN.md. Three interface languages and both
themes remain supported. Spreadsheet editing and reference deployment/authentication
are outside this extension. This work is additional to the completed original MVP.

Large workflows must allow users to find and open existing nodes by configured name, type
or identity while preserving drafts. Selecting a node does not save a graph revision.
Nodes may have separate presentation labels, without renaming output fields. Authors can
open a widget's exact calculation node from its dashboard, including in projects with multiple
workflows. The editor reveals a collapsed target and highlights its upstream dependencies;
navigation does not create a graph revision. Missing targets are reported explicitly. Authors can
highlight a node's sources/dependents, append a compatible next step with its connection and
replace an input without persisting a disconnected intermediate state. The approved usability
redesign follows docs/CONSTRUCTOR_UX_REVIEW.md; its stages are tracked separately from parity.
Saved formula fields expose their original workbook, sheet and header where lineage is available;
source search and details preserve rename and multi-input identity. This is value provenance,
not a claim to enumerate every row-filtering dependency.
Authors can add share/rank chains from a saved dataset using explicit input/group scope,
zero-denominator policy, ordering and optional post-calculation parameter selection. Generated
nodes remain individually editable; existing upstream filters are disclosed as affecting scope.
Authors can inspect a chosen saved total/rank node, see filter and parameter application points,
highlight its input path or subsequent path, and reuse its output through ordinary graph controls.
This inspector describes connections; it does not infer denominator meaning from arbitrary formulas.
Saved widget visualization settings can be edited from the dashboard using the same form as
its workflow node. Shared uses are disclosed; saving updates all uses with workflow revision
protection while retaining dashboard layout drafts. Creation and independent copies save node, edge and widget atomically with both revisions checked.
Authors can arrange the graph by dependencies and undo/redo graph edits within the current
editor session. Undo saves through normal revision checks. A visualization used on a dashboard
must be detached there before removing its graph node; graph undo cannot delete its widgets.

Authors can organize nodes into named flat groups, collapse them while retaining boundary
connections, and open members from a list. Group membership survives saves; dissolving a group
preserves its nodes. Panel widths and collapse state restore on same-tab reload without graph
revisions. Group nesting and moving groups as a unit are not part of this delivery.

Calculated formulas provide a readable field-token view beside the canonical text editor.
Users can search fields by name, insert at the cursor and replace a selected token. Stable
references retain identity after upstream renaming; backend validation remains authoritative.

Authors can stage up to 20 dependent calculated fields in a table and apply them as one
ordinary node-chain edit. Existing chain tables read the graph itself and preserve connections;
no independent calculation engine or duplicate persisted recipe is introduced.

A preparation table stages field selection, names, target types, conversion-error policy and
missing-value handling. Before Apply it lists the ordinary nodes to create. Strict conversion
is the default. Filling creates new calculated fields; existing downstream edges are preserved.

Grouped Unpivot authoring assigns fields to named groups and independently labels articles,
including repeated labels. The result is an editable graph of ordinary Unpivot, Calculated
Column and Union nodes. Source field identities and individual records are preserved.

## 1. Document Purpose

This document defines the product requirements for the MVP of the node-based Business Intelligence platform.

It describes:

* the product vision;
* target users;
* primary user journeys;
* MVP capabilities;
* expected behavior;
* functional requirements;
* UX requirements;
* non-functional product requirements;
* explicit exclusions;
* acceptance criteria.

Technical implementation details belong primarily in `ARCHITECTURE.md`.

Development process rules belong in `AGENTS.md`.

---

# 2. Product Name

Working name:

**Node BI**

The final product name may change later.

---

# 3. Product Vision

Node BI is a web-based Business Intelligence application that allows users to transform Excel data into reusable analytical workflows and dashboards without writing code.

The core interaction model is visual and node-based.

Users should be able to:

* import data;
* visually transform it;
* inspect intermediate results;
* build charts;
* combine charts into dashboards;
* save their work;
* reopen and continue later.

The product should provide a simpler and more transparent alternative to traditional BI tools for users who prefer visual data pipelines.

---

# 4. Product Principles

The MVP should follow these product principles.

## 4.1 Visual First

The primary method of building data logic is a visual node graph.

Users should not need to write Python, SQL, or JavaScript to complete the core workflow.

---

## 4.2 Transparent Data Flow

Users should be able to understand where data comes from and how it changes.

The workflow should visually represent:

`Source → Transformation → Transformation → Visualization`

Intermediate results should be inspectable.

---

## 4.3 Immediate Feedback

Where practical, the interface should provide immediate feedback about:

* available columns;
* data types;
* invalid configurations;
* node errors;
* output schema;
* preview results.

---

## 4.4 Safe by Default

User-entered formulas or expressions must not execute arbitrary server-side code.

Invalid workflow configurations should fail clearly and predictably.

---

## 4.5 Progressive Complexity

Simple workflows should be easy to build.

More advanced functionality should not make basic workflows difficult to understand.

---

## 4.6 Persistent Work

Users must be able to save a project and return later without rebuilding the workflow or dashboard.

---

# 5. Target User

The primary MVP user is a business analyst or technically capable business user who works with Excel data.

Typical characteristics:

* comfortable with spreadsheets;
* understands columns, filters, grouping, formulas, and charts;
* may know basic BI concepts;
* does not necessarily know SQL or Python;
* wants more repeatable analysis than manual Excel work provides.

Example roles:

* financial analyst;
* sales analyst;
* operations analyst;
* marketing analyst;
* business owner;
* reporting specialist.

---

# 6. Primary User Problem

The user has business data stored in Excel and repeatedly performs operations such as:

* filtering;
* selecting columns;
* calculating new fields;
* grouping;
* aggregating;
* joining;
* sorting;
* creating charts;
* assembling reports.

In Excel, these workflows can become:

* difficult to reproduce;
* difficult to inspect;
* fragile;
* dependent on manual steps;
* hard to reuse.

Node BI should turn these steps into a persistent visual workflow.

---

# 7. Primary MVP User Journey

The primary user journey is:

1. User opens Node BI.
2. User creates a new project.
3. User uploads an Excel workbook.
4. User selects a worksheet.
5. User previews the imported data.
6. User opens the workflow editor.
7. User creates transformation nodes.
8. User connects the nodes.
9. User configures transformations.
10. User previews intermediate results.
11. User creates one or more visualizations.
12. User adds visualizations to a dashboard.
13. User rearranges dashboard widgets.
14. User saves the project.
15. User leaves the application.
16. User returns later.
17. User reopens the project.
18. The workflow and dashboard are restored.

This journey defines the central MVP experience.

---

# 8. Product Information Architecture

The MVP should conceptually contain the following main areas:

* Projects
* Data
* Workflow
* Dashboard

A project acts as the container for all related analysis state.

Conceptually:

`Project`
→ `Data Sources`
→ `Workflow`
→ `Visualizations`
→ `Dashboards`

---

# 9. Projects

## 9.1 Project Definition

A project is the top-level user workspace.

A project contains:

* project metadata;
* uploaded data sources;
* workflows;
* node configurations;
* visualizations;
* dashboards.

---

## 9.2 Project Requirements

The user must be able to:

* create a project;
* view existing projects;
* open a project;
* rename a project;
* delete a project.

A new project must have:

* unique ID;
* name;
* creation timestamp;
* last updated timestamp.

---

## 9.3 Project List

The project list should display at minimum:

* project name;
* last updated timestamp.

The user should be able to identify and open an existing project easily.

---

## 9.4 Project Deletion

Deleting a project is destructive.

The user should receive a confirmation step before permanent deletion.

Associated project resources should be removed or marked for removal according to the persistence architecture.

---

# 10. Authentication

User authentication is not required for the first MVP unless technically necessary.

The MVP may operate in single-user mode.

The architecture should not prevent future introduction of:

* user accounts;
* organizations;
* project ownership;
* permissions.

Multi-user authorization is outside MVP scope.

---

# 11. Data Sources

The MVP supports Excel as the primary data source.

Supported workbook formats:

* `.xlsx`;
* `.xlsm` where practical.

Legacy `.xls` support is optional for the first MVP and should not block release.

---

# 12. Excel Upload

The user must be able to upload an Excel workbook into a project.

The system must:

* validate that the upload is an accepted workbook type;
* store the uploaded source;
* inspect workbook metadata;
* discover worksheets;
* report errors for invalid or unreadable workbooks.

The user must not be required to manually describe the workbook schema.

---

# 13. Workbook Behavior

After upload, the system should expose:

* workbook filename;
* worksheet names;
* file size where useful;
* source status.

The system should not immediately load an entire large workbook into the browser.

---

# 14. Worksheet Selection

The user must be able to choose a worksheet from an uploaded workbook.

A worksheet used as a data source should expose:

* column names;
* inferred data types;
* row preview;
* approximate or exact row count where practical.

---

# 15. Header Detection

For MVP, the first non-empty row may be treated as the header row by default.

If implementation allows, the user may be able to override the header row.

Automatic advanced header detection is not required.

---

# 16. Column Names

The application must handle common problematic Excel column names.

Examples:

* spaces;
* punctuation;
* duplicate names;
* blank names;
* unicode;
* long names.

The UI should display recognizable user-facing labels.

Internally, the system may normalize or uniquely identify columns.

Normalization must not silently make two distinct columns indistinguishable.

---

# 17. Type Inference

The system should infer logical column types.

Supported logical types:

* string;
* integer;
* float;
* boolean;
* date;
* datetime;
* null/unknown.

The type model must be understandable to users.

Raw engine-specific types should not leak unnecessarily into the user interface.

---

# 18. Mixed-Type Columns

Excel columns may contain mixed values.

The system must handle mixed-type columns without crashing.

When a reliable specific type cannot be inferred, the system may infer the column as string or unknown according to documented behavior.

---

# 19. Null Values

Null or empty cells must be supported.

Transformations should behave predictably around null values.

The product must not silently replace missing values with arbitrary values.

---

# 20. Data Preview

Users should be able to preview data without opening the workbook externally.

Preview should display:

* a limited number of rows;
* column names;
* logical data types;
* values.

The interface should clearly indicate that the displayed data is a preview rather than necessarily the full dataset.

---

# 21. Workflow Editor

The workflow editor is the primary analytical workspace.

It must provide a visual canvas containing nodes and directed edges.

The user must be able to:

* add nodes;
* select nodes;
* move nodes;
* connect compatible nodes;
* disconnect nodes;
* delete nodes;
* configure nodes;
* inspect node status.

Zoom and canvas navigation should be supported.

---

# 22. Node Categories

The MVP contains three conceptual node categories:

## Source Nodes

Produce datasets from external data.

MVP:

* Excel Source

## Transformation Nodes

Receive one or more datasets and return transformed datasets.

MVP:

* Select Columns
* Rename Columns
* Filter
* Sort
* Limit
* Calculated Column
* Group By / Aggregate
* Join
* Union
* Pivot

## Visualization Nodes

Consume a dataset and produce a visualization configuration/result.

MVP:

* Table
* KPI
* Bar Chart
* Line Chart
* Area Chart
* Pie / Donut Chart
* Scatter Chart

---

# 23. Node Visual State

A node should visually communicate its state.

Possible states include:

* unconfigured;
* ready;
* executing;
* successful;
* warning;
* error.

The exact visual design is implementation-specific.

An error state must be discoverable without requiring the user to inspect server logs.

---

# 24. Node Configuration

Selecting a node should make its editable configuration accessible.

A configuration panel should display controls appropriate to the selected node.

Where possible, configuration controls should use upstream schema information.

Examples:

Instead of manually typing:

`revenue`

the user should be able to select `revenue` from available columns.

---

# 25. Connections

Users must connect nodes through compatible input and output ports.

The interface should prevent or clearly reject invalid connections.

Examples of invalid graph states:

* cycle;
* incompatible port type;
* missing required upstream dataset;
* unsupported number of inputs.

---

# 26. Workflow Execution

The workflow represents executable data logic.

When a node result is requested, the system should execute the dependencies necessary to produce that result.

The user should not need to manually execute every upstream node one by one.

---

# 27. Partial Workflow Execution

If the user previews an intermediate node, the system should execute only the relevant upstream dependency path where practical.

Unrelated workflow branches should not need to execute.

---

# 28. Node Preview

Transformation nodes should support output preview where practical.

When a user selects a successfully configured node, the user should be able to inspect a sample of its resulting dataset.

Preview should include:

* resulting columns;
* types;
* limited rows;
* execution status;
* understandable errors if execution fails.

Useful additional metadata may include:

* row count;
* execution duration.

---

# 29. Schema Propagation

The workflow editor must use output schemas from upstream nodes.

Schema propagation should allow the interface to:

* populate column selectors;
* validate configurations;
* display resulting columns;
* prevent some invalid operations before execution.

Schema propagation is part of the MVP, not a future enhancement.

---

# 30. Select Columns Node

The user can select which columns continue downstream.

Requirements:

* show available upstream columns;
* allow multiple selection;
* preserve chosen order where practical;
* reject missing selected columns.

Output contains only selected columns.

---

# 31. Rename Columns Node

The user can rename one or more columns.

Requirements:

* choose existing column;
* define new name;
* support multiple renames;
* detect conflicting resulting names.

The output schema must reflect renamed fields.

---

# 32. Filter Node

The user can filter rows using one or more conditions.

MVP operators should support appropriate subsets of:

For numbers:

* equals;
* not equals;
* greater than;
* greater than or equal;
* less than;
* less than or equal.

For strings:

* equals;
* not equals;
* contains;
* does not contain;
* starts with;
* ends with.

For general/null handling:

* is null;
* is not null.

For dates, support basic comparisons where possible.

---

# 33. Multiple Filter Conditions

The filter node should support multiple conditions.

At minimum the user should be able to combine conditions using:

* AND

OR support is desirable but may be introduced after basic AND behavior if necessary.

If OR is included, grouping behavior must remain understandable.

---

# 34. Sort Node

The user can sort by one or more columns.

Each sort field should support:

* ascending;
* descending.

Sorting priority should follow the configured field order.

---

# 35. Limit Node

The user can restrict the number of rows passed downstream.

Configuration:

* positive row limit.

The node must reject invalid negative limits.

---

# 36. Calculated Column Node

The user can create a new column from existing columns.

Example:

`revenue = quantity * price`

The system should support a controlled expression language.

The expression system must not execute arbitrary Python, JavaScript, shell commands, or operating-system code.

MVP expressions should support common arithmetic.

At minimum:

* addition;
* subtraction;
* multiplication;
* division;
* parentheses;
* references to columns;
* numeric constants.

Additional safe functions may be included where implementation remains manageable.

---

# 37. Calculated Column Validation

The system should detect common errors before or during execution.

Examples:

* unknown column;
* invalid expression;
* invalid operation between types;
* duplicate output field name.

Errors must identify the calculated column node.

---

# 38. Group By / Aggregate Node

The user can group rows by one or more dimensions and calculate aggregations.

Supported MVP aggregations should include:

* count;
* sum;
* average;
* minimum;
* maximum.

Useful additional aggregation:

* distinct count.

The UI should restrict incompatible aggregations where practical.

Example:

Group by:

`country`

Aggregation:

`sum(revenue)`

Result:

`country`
`sum_revenue`

---

# 39. Join Node

The Join node accepts two upstream datasets.

Supported MVP join types:

* inner;
* left.

Additional join types such as right and full outer may be included if straightforward.

The user must be able to select:

* left key;
* right key;
* join type.

Multiple-column joins are desirable but may be implemented after stable single-column joins.

---

# 40. Join Column Conflicts

When two joined datasets contain columns with the same name, the result must remain unambiguous.

The system should use a predictable conflict strategy.

For example:

* suffix conflicting columns;
* preserve join keys appropriately.

The behavior must be documented and visible to the user.

---

# 41. Union Node

The Union node combines rows from two compatible datasets.

The system must validate schema compatibility.

For MVP, union may require matching column sets and compatible types.

If schemas are incompatible, show a clear error.

---

# 42. Pivot Node

The Pivot node should support basic pivot-table behavior.

User selects:

* index/group field;
* pivot column;
* value field;
* aggregation.

The feature should target common spreadsheet-style pivot use cases rather than complex OLAP behavior.

---

# 43. Table Visualization

The Table visualization displays dataset rows.

Requirements:

* column headers;
* data rows;
* limited/paginated presentation;
* reasonable handling of wide tables.

The table must not attempt to render arbitrarily large datasets at once.

---

# 44. KPI Visualization

The KPI visualization displays a single primary value.

Example:

`Total Revenue`
`$1,204,302`

The KPI should accept a dataset result that can resolve to a single value.

Configuration may include:

* metric field;
* aggregation;
* title;
* numeric formatting.

---

# 45. Bar Chart

The Bar Chart should support:

* category axis;
* value axis;
* title;
* optional series grouping where practical;
* basic labels/legend behavior.

The user should select compatible fields from the upstream schema.

---

# 46. Line Chart

The Line Chart should support:

* X field;
* Y field;
* title;
* optional series.

Dates and ordered categories should render predictably.

---

# 47. Area Chart

The Area Chart behaves similarly to a line chart with filled series visualization.

Configuration should remain consistent with the Line Chart where possible.

---

# 48. Pie / Donut Chart

The Pie/Donut visualization should support:

* category field;
* value field;
* title;
* pie or donut presentation.

The application should avoid silently creating meaningless charts from incompatible data.

---

# 49. Scatter Chart

The Scatter Chart should support:

* numeric X field;
* numeric Y field;
* optional grouping/series where practical.

The UI should restrict clearly incompatible field types.

---

# 50. Visualization Configuration

Visualizations should provide a common configuration experience where practical.

Common settings may include:

* title;
* selected fields;
* aggregation where applicable;
* legend visibility;
* labels;
* number formatting.

Advanced styling is not required for MVP.

---

# 51. Separation of Transformation and Visualization

Visualization nodes should primarily visualize prepared data.

Users should not have to rediscover hidden transformation logic inside chart configuration.

Complex reusable transformation logic belongs in transformation nodes.

Simple visualization-specific aggregation may be supported where explicitly documented.

---

# 52. Dashboard

A dashboard is a layout containing visualization widgets.

Users must be able to:

* create a dashboard;
* add visualizations;
* remove widgets;
* move widgets;
* resize widgets;
* save layout.

At least one dashboard per project must be supported.

Multiple dashboards per project are desirable and should be supported if architecture allows without excessive complexity.

---

# 53. Dashboard Widget

A dashboard widget references a visualization.

A widget should store layout information such as:

* position;
* width;
* height.

Widget layout must persist.

Changing dashboard layout must not alter the analytical workflow itself.

---

# 54. Dashboard Editing

Dashboard edit mode should make it clear that widgets can be moved and resized.

The user should be able to arrange the dashboard without manually entering pixel positions.

---

# 55. Dashboard Viewing

A saved dashboard should render using the latest valid visualization configuration and associated workflow results.

The exact refresh behavior for MVP may be based on project open or explicit refresh.

Scheduled refresh is outside MVP scope.

---

# 56. Saving

The user should not lose meaningful project configuration when leaving the page.

The application should persist project changes predictably.

The final interaction design may use:

* explicit Save;
* autosave;
* or a combination.

The UI must make saved state understandable.

---

# 57. Reload Behavior

After a browser reload, the application should restore the active project's persisted state.

At minimum:

* sources;
* workflow nodes;
* edges;
* configurations;
* visualizations;
* dashboards;
* widget layouts.

---

# 58. Server Restart Behavior

Restarting the backend must not destroy persisted project configuration or metadata.

Uploaded source files should remain available according to the configured storage environment.

---

# 59. Error Experience

Errors should be associated with the relevant part of the product.

Examples:

Upload error:

`The workbook could not be read.`

Filter error:

`Column "Revenue" is no longer available from the upstream node.`

Formula error:

`Expression references unknown column "PriceUSD".`

Join error:

`Left and right join keys have incompatible types.`

Errors should favor actionable language.

---

# 60. Upstream Changes

If an upstream node changes its schema, downstream nodes may become invalid.

Example:

`Select Columns`

removes `Revenue`.

A downstream chart still references `Revenue`.

The chart should become invalid and clearly indicate why.

The system must not silently render stale results as though they were current.

---

# 61. Node Deletion

Deleting an upstream node may disconnect or invalidate downstream nodes.

The workflow editor must update graph state accordingly.

The user must not be left with invisible dependencies to deleted nodes.

---

# 62. Empty Results

A valid workflow may produce zero rows.

This is not necessarily an execution error.

The UI should distinguish:

* successful empty result;
* failed execution.

Visualizations should show an appropriate empty-state message.

---

# 63. Execution Feedback

When workflow execution takes noticeable time, the user should receive feedback.

Possible states:

* waiting;
* executing;
* success;
* error.

The MVP does not require a sophisticated distributed job monitoring interface.

---

# 64. Large Excel Files

The MVP should make reasonable attempts to handle larger workbooks without freezing the browser.

The product should:

* avoid sending entire datasets unnecessarily;
* limit previews;
* perform transformations server-side.

A strict supported maximum workbook size may be documented later based on testing.

---

# 65. Undo / Redo

Undo/redo is desirable but not mandatory for initial MVP acceptance unless implementation is straightforward.

The product must not delay MVP solely to provide a sophisticated command-history system.

---

# 66. Node Duplication

Node duplication is desirable because it improves workflow authoring efficiency.

If implemented, copied nodes should receive new IDs.

Duplicating a node should not automatically duplicate unrelated graph connections unless explicitly designed.

This feature is not a release blocker.

---

# 67. Auto Layout

Automatic graph layout is outside core MVP requirements.

Basic manual positioning, zooming, panning, and fit-to-view are sufficient.

---

# 68. Search

Global search across projects, nodes, or fields is outside MVP scope.

---

# 69. Collaboration

Real-time collaborative editing is outside MVP scope.

The MVP may assume one active editor.

---

# 70. Version History

Project version history and rollback are outside MVP scope.

Future architecture should not make versioning impossible, but no implementation is required.

---

# 71. Scheduled Refresh

Scheduled data refresh is outside MVP scope.

Users may manually refresh or re-execute the workflow.

---

# 72. External Connectors

The following are explicitly deferred:

* PostgreSQL source;
* MySQL source;
* SQL Server source;
* Google Sheets;
* REST API;
* CSV source;
* cloud warehouses.

CSV is likely an early post-MVP source because it fits the same Dataset abstraction.

---

# 73. AI Features

AI-generated transformations, natural-language querying, AI chart suggestions, and automatic dashboard generation are outside the MVP.

The MVP must remain fully usable without AI functionality.

---

# 74. Export

Exporting dashboards to PDF, PowerPoint, or images is outside the initial MVP.

Exporting transformed datasets is also optional post-MVP functionality.

---

# 75. Mobile

The workflow editor is primarily intended for desktop-sized screens.

Responsive behavior should prevent broken layouts, but full mobile workflow editing is outside MVP scope.

---

# 76. Browser Support

The MVP should target current major desktop browsers.

Primary target:

* Chromium-based browsers.

Reasonable support for current Firefox and Safari is desirable.

Legacy browser support is not required.

---

# 77. Accessibility

The MVP should use standard accessible UI controls where practical.

Important interactions should not depend exclusively on color.

Full formal accessibility certification is outside initial MVP scope.

---

# 78. Localization

The interface also supports light and dark themes (requested 2026-09-14). Dark remains the
default. A persistent theme selector is available alongside the language selector. Theme changes
must preserve drafts and saved data and apply consistently to forms, workflow canvas and charts.

The interface supports Russian (default), English and Tatar (Cyrillic), as requested on 2026-09-11.
An always-available language selector persists the choice across navigation and browser visits.
The initial server-rendered language and document language must agree with that choice.
Navigation, node controls, validation feedback, dashboards and accessibility labels are localized.
Numbers and dates use the selected locale for presentation; dates are displayed in UTC.
Project names, workbook/sheet/column names, chart titles and string data are user content and
must not be translated or rewritten. Formula syntax and API identifiers remain language-neutral.

---

# 79. Data Privacy

Uploaded workbook contents must be treated as user data.

The product should not transmit workbook contents to unrelated third-party services as part of core execution.

Logs should avoid including complete source rows unless specifically required for debugging in a development environment.

---

# 80. Formula Security

Calculated expressions are an important security boundary.

The expression system must not allow arbitrary:

* Python execution;
* JavaScript execution;
* shell execution;
* file access;
* network access;
* module imports.

Only explicitly supported operations and functions may be evaluated.

---

# 81. Data Integrity

Transformations must be deterministic for the same:

* input data;
* workflow configuration;
* engine version.

The product should avoid silent mutation of uploaded source data.

Original uploaded Excel files should be treated as immutable source artifacts.

---

# 82. User-Friendly Data Types

The product should expose logical BI-friendly types rather than library-specific implementation details.

Example UI labels:

* Text
* Integer
* Decimal
* Boolean
* Date
* Date & Time
* Unknown

Internal names may differ.

---

# 83. Number Formatting

Visualizations should support basic numeric formatting.

Useful MVP formats include:

* plain number;
* decimal;
* percentage;
* currency.

Full locale-aware formatting is desirable but not a release blocker.

---

# 84. Date Formatting

Dates should render in a consistent human-readable form.

The underlying data type should remain a date or datetime rather than being permanently converted to display text.

---

# 85. Workflow Validation

The product should identify invalid workflow states before execution where possible.

Examples:

* cycles;
* missing required input;
* invalid field selection;
* invalid formula;
* unsupported join configuration.

Not every runtime error can be known in advance, but obvious configuration errors should be caught early.

---

# 86. Workflow Persistence

A workflow must preserve:

* node identity;
* node type;
* node version;
* node position;
* node configuration;
* edges;
* port relationships where relevant.

Reloading a workflow must preserve the visual graph.

---

# 87. Node Versioning

Node types should contain a version identifier in persisted configuration.

The MVP does not require a complete migration framework for historical node versions.

However, saved workflows should not assume that node definitions can never evolve.

---

# 88. Visualization Persistence

Visualization state should persist independently from temporary execution results.

Persist:

* visualization type;
* field mapping;
* formatting configuration;
* title;
* relevant display options.

Do not require chart image snapshots to recreate the chart.

---

# 89. Project State Consistency

The project must not enter obviously contradictory saved states.

Examples to avoid:

* dashboard references nonexistent visualization;
* edge references deleted node;
* source node references deleted source metadata.

Deletion operations should clean up or explicitly invalidate dependent entities.

---

# 90. MVP UX Standard

The MVP does not need enterprise-grade polish.

However, the primary journey must feel coherent.

The user should not need developer knowledge to answer:

* Where do I upload data?
* How do I add a node?
* How do I configure it?
* Why is this node invalid?
* How do I preview the result?
* How do I create a chart?
* How do I put it on a dashboard?
* Did my work save?

---

# 91. Empty States

Major screens should provide meaningful empty states.

Examples:

Projects:

`No projects yet. Create your first project.`

Data:

`Upload an Excel workbook to start analyzing data.`

Workflow:

`Add an Excel Source node or drag a node from the node library.`

Dashboard:

`Add a visualization to start building your dashboard.`

---

# 92. Loading States

Longer operations should not appear frozen.

Loading states are required where appropriate for:

* workbook upload;
* worksheet inspection;
* preview execution;
* workflow execution;
* project loading;
* dashboard loading.

---

# 93. Destructive Actions

Destructive actions should require reasonable safeguards.

Examples:

* deleting project;
* deleting source currently used by workflow.

A confirmation dialog is appropriate where accidental action would cause significant loss.

---

# 94. Non-Functional Product Requirements

The MVP should prioritize:

1. correctness;
2. recoverability;
3. understandable errors;
4. acceptable interactive performance;
5. maintainability;
6. predictable persistence.

The MVP should not prioritize:

* extreme scale;
* enterprise administration;
* pixel-perfect visual customization;
* distributed computing.

---

# 95. Expected MVP Scale

The first MVP is intended for individual analytical workloads rather than enterprise-wide data processing.

Target use case:

* one active user;
* a small number of projects;
* workbook-scale datasets;
* local or small-server deployment.

Architecture should permit scaling later without requiring complete product redesign.

---

# 96. Performance Expectations

The interface should remain responsive during normal interaction.

For typical workbook previews and moderate transformations:

* the user should receive visible execution feedback quickly;
* the browser should not freeze because of dataset processing;
* previews should be bounded.

Hard performance SLAs are not required for the initial MVP.

Performance should be measured during QA and documented.

---

# 97. Reliability Expectations

An invalid node should not crash the entire application.

A failed workflow branch should produce a controlled error.

Reloading a project should not randomly change configuration.

Persisted project state should be recoverable after normal application restart.

---

# 98. MVP Acceptance Dataset

A representative acceptance workbook should exist for development and automated testing.

Suggested columns:

* order_id;
* order_date;
* country;
* category;
* product;
* quantity;
* price.

Representative data should contain:

* multiple countries;
* multiple categories;
* different dates;
* numeric values;
* some nulls.

---

# 99. Core Acceptance Workflow

The following workflow is the canonical MVP acceptance flow:

`Excel Source`
→ `Filter`
→ `Calculated Column`
→ `Group By`
→ `Bar Chart`

Example configuration:

Filter:

`country = "Korea"`

Calculated column:

`revenue = quantity * price`

Group By:

Dimension:

`category`

Aggregation:

`SUM(revenue)`

Bar Chart:

X:

`category`

Y:

`sum_revenue`

---

# 100. KPI Acceptance Flow

The user must also be able to create a KPI showing total revenue.

The exact workflow may use an aggregate transformation or visualization-supported aggregation according to final architecture.

Expected result:

A single value representing total revenue for the selected dataset.

---

# 101. Dashboard Acceptance Flow

The user creates a dashboard containing:

* the revenue-by-category Bar Chart;
* the total revenue KPI.

The user must be able to:

* position both widgets;
* resize at least one widget;
* save the dashboard.

---

# 102. Persistence Acceptance Flow

After saving:

1. reload the browser;
2. reopen the project;
3. verify uploaded source exists;
4. verify workflow nodes exist;
5. verify connections exist;
6. verify node settings exist;
7. verify chart configuration exists;
8. verify KPI exists;
9. verify dashboard exists;
10. verify widget positions and sizes exist.

---

# 103. Restart Acceptance Flow

After backend/database application restart:

* project metadata remains;
* persisted workflow remains;
* dashboard remains;
* uploaded workbook remains accessible;
* workflow can execute again.

Temporary cached execution results do not necessarily need to survive restart.

---

# 104. Error Acceptance Flow

At least the following user errors must produce controlled feedback:

* unsupported upload type;
* unreadable workbook;
* missing worksheet;
* filter references nonexistent column;
* invalid calculated expression;
* workflow cycle attempt;
* missing node input;
* incompatible join;
* visualization references removed field.

None of these should crash the whole application.

---

# 105. Definition of MVP Complete

The MVP is considered complete only when all of the following are true:

## Project Management

* project can be created;
* project can be reopened;
* project can be renamed;
* project can be deleted.

## Excel

* workbook can be uploaded;
* sheets can be inspected;
* worksheet can be selected;
* columns and types can be discovered;
* data can be previewed.

## Workflow

* nodes can be added;
* nodes can be moved;
* nodes can be connected;
* nodes can be configured;
* invalid cycles are rejected;
* graph persists after reload.

## Transformations

Working implementations exist for:

* Select Columns;
* Rename Columns;
* Filter;
* Sort;
* Limit;
* Calculated Column;
* Group By / Aggregate;
* Join;
* Union;
* Pivot.

## Schema

* schemas propagate downstream;
* configuration UI uses upstream schemas;
* removed fields invalidate dependent configuration clearly.

## Preview

* intermediate transformation results can be previewed;
* previews are row-limited;
* execution errors are attributable to nodes.

## Visualization

Working implementations exist for:

* Table;
* KPI;
* Bar;
* Line;
* Area;
* Pie/Donut;
* Scatter.

## Dashboard

* visualization can be added;
* widgets can be moved;
* widgets can be resized;
* layout can be saved;
* layout restores after reload.

## Persistence

* project configuration survives normal restart;
* workbook references survive restart;
* workflows restore;
* visualization configurations restore;
* dashboards restore.

## Quality

* P0 defects: 0;
* P1 defects: 0;
* critical automated tests pass;
* frontend production build succeeds;
* documented startup instructions work.

---

# 106. Explicit Non-Goals for MVP

The following are not required for MVP completion:

* authentication;
* team collaboration;
* enterprise permissions;
* row-level security;
* audit logs;
* SQL data sources;
* Google Sheets;
* API sources;
* realtime streaming;
* scheduled refresh;
* cloud SaaS deployment;
* mobile editor;
* workflow version history;
* dashboard sharing;
* public dashboard links;
* PDF export;
* PowerPoint export;
* dataset export;
* AI assistant;
* natural-language query;
* automatic dashboard generation;
* plugins;
* marketplace;
* distributed query engine;
* advanced OLAP model;
* semantic metrics layer;
* enterprise governance.

---

# 107. Post-MVP Candidate Roadmap

Potential post-MVP priorities:

## Data Connectivity

* CSV
* PostgreSQL
* MySQL
* SQL Server
* REST API
* Google Sheets

## Workflow

* additional formulas;
* conditional expressions;
* date transformations;
* string transformations;
* data cleaning nodes;
* reusable subflows;
* workflow templates.

## BI

* filters/slicers;
* dashboard-level filters;
* cross-filtering;
* drill-down;
* drill-through;
* richer formatting.

## Platform

* user authentication;
* organizations;
* cloud storage;
* scheduled refresh;
* background jobs;
* sharing;
* permissions.

## AI

* natural-language workflow creation;
* formula generation;
* chart recommendations;
* automated insights;
* dashboard generation.

These features must not be allowed to expand the MVP unless the product specification is intentionally revised.

---

# 108. Product Success Criteria

The first MVP is successful if a target user can take a normal Excel sales workbook and, without writing code:

1. import it;
2. transform it;
3. understand the transformation flow;
4. inspect intermediate data;
5. create useful visualizations;
6. assemble a dashboard;
7. save the analysis;
8. reopen it later;
9. modify the workflow without rebuilding everything.

The product does not need to compete with mature enterprise BI platforms at MVP stage.

The goal is to prove that the core interaction model is useful, reliable, and extensible.

---

# 109. Product Decision Priority

When product requirements compete, use the following priority:

1. data correctness;
2. user work persistence;
3. workflow clarity;
4. error transparency;
5. usability;
6. performance;
7. feature richness;
8. visual polish.

A smaller reliable workflow is preferred over a larger unreliable feature set.
