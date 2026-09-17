# Graph authoring usability: first U1 delivery

The editor now uses meaningful titles on existing graphs without converting their data.
Cards and node search use the visualization title, calculated output name or source sheet.
Set **Node label** to name an otherwise generic step, such as a Filter or Group By. This
changes presentation only; it does not rename output fields or break downstream references.
An empty label restores the automatic name. Input choices show both meaning and operation type.

Select a node and choose **Show dependencies → Sources of selected node** or
**Affected downstream nodes**. The relevant branch is framed; other nodes/edges are dimmed
and remain selectable. Return to **Entire workflow** to remove highlighting. This browsing
state does not save a workflow revision or remove any part of the graph.

**Add next step** creates a compatible node and connects it to the selected output. It
positions the step beside its input, avoiding nearby occupied positions. The chooser only
offers unambiguous single-input operations; create Join/Union through the normal library
and select both inputs explicitly. Existing library actions still create disconnected nodes.

An input selector can now replace an existing connection directly. The final graph is checked
for port limits and cycles before saving; there is no separate disconnected save. Changing an
input does not silently rewrite field references: repair incompatible downstream configuration
using the normal schema/error feedback.

Names persist in existing node UI metadata with optimistic revision checks and draft recovery.
Three languages and both themes remain supported. No execution/API/database changes or new
dependencies were needed for the first delivery. Grouping and adjustable panels are described below, along with layout/history. Formula tokens and later stages remain planned.

## Dependency layout and undo/redo (second U1 delivery)

Choose **Arrange by dependencies** to place sources on the left and their dependents to the
right. Shared inputs precede their consumers. Layout affects positions only; **Undo graph change**
returns to the previous layout. Long branches can still require panning; named groups reduce visible detail.

Undo/redo covers configuration, presentation labels, parameters, node/edge creation/deletion,
input replacement and movement. One focused text-field editing session or drag is one step.
Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) act on the graph outside editable fields. Inside a
text field, native text undo remains active; toolbar buttons always act on the graph.
Selecting nodes, highlighting dependencies and previewing parameter values do not create steps.

Undo is a new save, not a rollback of the server revision. It supports edits during a slow save;
conflicts/network failures retain the draft through the existing recovery interface. Reloading
restores the saved/pending graph but starts a fresh history. History retains up to 50 steps
subject to a memory budget; a new edit after undo clears redo.

If a visualization is used by a dashboard, a graph edit or undo that removes it is rejected
with an explicit message. Detach its widgets in the dashboard before deleting it, or redo/undo
the graph change to restore a valid draft. This also protects concurrent dashboard attachments.
Layout never runs automatically on existing projects. No original reference-project positions
were modified while implementing this feature.

Human evaluation protocol: [operator tasks](UX_OPERATOR_PROTOCOL.md).
Design and complete roadmap: [UX review](CONSTRUCTOR_UX_REVIEW.md).

## Groups and panel widths (third U1 delivery)

Click a node, then Shift-click additional nodes. Open **Node groups**, enter a name and choose
**Group selected nodes**. Select an existing group to add selected nodes, rename it, or open
individual members. **Ungroup selected nodes** removes their membership; **Dissolve group**
removes the entire group without deleting nodes or connections. Membership changes support undo.

**Collapse group** replaces its members visually with a summary showing boundary connections.
Expand it to edit or connect members. Searching for a member or choosing it in the group list
expands the group and opens its configuration. Groups are flat presentation sections, not new
calculation operations. Their summary cards cannot be dragged or deleted. Expanded members
remain individually movable. Use **Fit view** after resizing panels if nodes leave the viewport.

Open **Editor panels** to adjust library/configuration widths or reset both. Widths are capped
by the available viewport; the desktop editor retains a minimum canvas width. Collapse and
width preferences restore on reload in the same tab, independently of graph saves and undo.
Authored group names remain user content; all controls support Russian, English and Tatar.

## Configuration feedback (first U2 delivery)

Incomplete nodes remain saveable drafts. The output panel identifies required settings instead
of displaying validation-library internals. An empty Filter asks you to add list items; use
**Add condition**, choose its field/operator/value, wait for saving and run **Preview output**.
Nested errors identify their row starting from one. The same details remain available in
Russian, English and Tatar, including execution diagnostics. Changing language preserves edits.
This first U2 delivery does not yet change formula authoring or add batch preparation forms.

## Named formula fields (second U2 delivery)

Calculated Column now shows **Readable formula** above its canonical **Expression** text.
Bracket references display current field names/types. Click a token, then choose a field in
**Insert formula field** to replace just that reference. Alternatively place the cursor or
select text in Expression before inserting. **Find formula field** searches names and IDs.
Operators/functions can still be typed normally; **Formula function help** lists signatures.

Selecting a field inserts its stable ID. An upstream rename updates the token label without
changing the saved formula. Bare field identifiers typed manually retain their existing
name-dependent semantics; the helper does not silently convert them. Duplicate display names
show engine names/IDs; the token tooltip exposes those identifiers too. Missing fields are
marked explicitly and must be repaired before execution. Quoted text is not rendered as a
reference. Backend validation and preview remain the authority for type/operation correctness.
The named view supplements the text editor; it is not a rich text replacement in this delivery.

## Calculated-field table (third U2 delivery)

Select a saved node with an available output schema and choose **Add calculated fields**.
Enter a name/formula for each row; add rows with **Add calculated field**. Field choices include
source columns and previous row results. Select those results to insert stable references;
reordering a row ahead of its referenced predecessor disables Apply until repaired. Names must
be unique, including against input engine names. The table is limited to 20 rows at a time.

**Apply calculated fields** creates a new branch of ordinary Calculated Column nodes in row
order. Existing outgoing connections are preserved; connect the new final node to downstream
consumers explicitly. The action saves once and can be undone/redone as a whole. Verify schema
and preview afterward: formula semantics and types are checked by the backend, and staged
results are marked unknown until then. Normal autosave errors/conflicts retain the graph draft.

Select an existing Calculated Column and choose **Edit calculated chain** to edit its actual
consecutive chain, up to a branch/non-calculated node or 20 rows. Names/formulas change together;
IDs, layout and connections stay intact. Reorder/delete/connect existing nodes on the canvas.
Reopening the table reflects those real graph edits instead of regenerating an old template.
The table is a transient staging form: Apply before leaving to retain work. Cancel/Escape asks
before discarding changed rows, and browser unload warns. Closing it without Apply leaves the
graph untouched. Applied work restores normally after reload.

## Preparation table (fourth U2 delivery)

Select a saved node with an available schema and choose **Prepare data table**. Keep the needed
columns, set unique output names, choose target types and conversion-error policies. Strict
conversion is the default: invalid text stops execution. Opt into **Invalid value to null** only
when intended. Missing-value handling runs after conversion: retain nulls, drop affected rows,
fill numeric nulls with zero or string nulls with empty text. Empty text itself is not null.
Rules are per field; multiple drop conditions combine with AND. Kept fields retain source order.

Review **Nodes to create**, then **Apply preparation**. The wizard adds one ordinary branch;
existing downstream edges stay unchanged. Connect consumers to the prepared output explicitly.
Undo/redo handles the entire addition; graph edits restore through existing autosave/recovery.
Edit any generated Select, Convert, Filter, Calculated Column or Rename node normally afterward.
Reopening the wizard starts from the current selected output, not a stored copy of earlier rules.

Filled columns receive new IDs, and temporary columns are removed from the final output.
Integer fill uses text/coalesce/integer steps to retain exact integers in backend execution.
The previewed extra conversions are intentional. Limits: 1024 retained fields, 20 fills per
batch. Duplicate output names or incompatible policies disable Apply. Schema/runtime errors
still come from the backend after applying. Unapplied table changes are transient: Cancel or
Escape confirms discarding modifications and browser unload warns. Apply before leaving.

## Grouped Unpivot (fifth U2 delivery)

Select a saved dataset output and choose **Grouped Unpivot**. Name up to ten nonempty groups,
choose a name for the group output field, mark shared identifiers and assign value columns to
groups. A value field can belong to only one group. Unassigned fields are omitted; identifiers
repeat for each result row. Assign custom article labels as needed: matching labels do not
combine records. Original source IDs remain in field_id.

Value columns must share a known logical type. Use Convert Types/preparation beforehand for
mixed or unknown types. Identifier names must not conflict with field_id, field_name, value
or the group field. Preview the generated nodes and apply once: each group gets Unpivot and
a Calculated Column containing its name; Union joins branches in group order. Existing source
connections stay unchanged. Node execution resource limits still apply to the expanded result.

Use Undo/Redo for the complete addition. Afterward edit group constants in Calculated Column,
field membership/labels in Unpivot, and connections on the canvas. The ordinary Unpivot form
now offers an optional label for each selected value field. Clearing it restores the current
source name; duplicate labels are valid. There is no separate persisted wizard recipe.
Unapplied choices are transient; Cancel/Escape asks before discarding edits and unload warns.


### Formula diagnostics

The single-node expression editor displays server schema/configuration issues directly below
its expression. Messages retain node and configuration-path context and use the selected UI
language. Editing or awaiting the saved revision's schema hides old diagnostics. No message is
not proof of validity: runtime data errors still appear in output preview. Staged batch formulas
are validated by the server after Apply, when ordinary graph nodes have been saved.


### Field sources

The saved single-node formula editor shows a Field sources section for referenced fields.
It lists workbook, sheet, original Excel column (A, B, ... AA) and header levels, even after
renaming. Search also matches these labels. Join keeps its input origins separate; Union and
calculated fields can list multiple origins. Duplicate filenames include source IDs. The #
column denotes an imported source row number. Missing metadata is explicitly unavailable;
constant/count/rank fields may have no source value fields. These labels describe value origins,
not every filtering/grouping dependency. Edits hide origins until the saved schema is current.
Staged batch rows are inspected through their ordinary nodes after Apply.


### Share and rank helper

Select a saved dataset node and open Share and rank. Select a numeric value and name the
result. For Share, name the denominator and select group fields, or leave groups empty to sum
all rows of this input. Choose null (default) or zero for a zero/missing denominator. The sum
ignores nulls and an all-null group has no denominator. Negative amounts remain arithmetic
values. Shares are ratios; choose percent formatting in the visualization.

For Row rank, choose direction and a separate ascending tie-break field, preferably a unique
source row ID. Rank means row position, not dense rank. Remaining ties retain input order.
Optional Selection field + Parameter adds a Filter after totals/ranks. Leave both empty to
keep all comparison rows. Prior upstream filters still affect scope and are listed in the dialog.
Use an earlier dataset node when a denominator must precede an existing selection.

Review Nodes to create and Apply. The new branch contains only ordinary nodes; it does not
rewire existing consumers. Edit generated Window/Calculated Column/Filter forms afterward.
The whole insertion supports Undo/Redo. Unapplied settings are transient and discarded only
with confirmation; concurrent graph changes reject Apply. Reuse a pre-selection output by
connecting another branch explicitly. No private financial engine or persisted recipe exists.
