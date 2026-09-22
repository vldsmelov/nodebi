# DECISIONS.md

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
