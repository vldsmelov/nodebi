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
