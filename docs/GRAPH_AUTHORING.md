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
dependencies were needed for the first delivery. Grouping and adjustable panels remain U1
work; layout/history are described below. Formula tokens and later stages remain planned.

## Dependency layout and undo/redo (second U1 delivery)

Choose **Arrange by dependencies** to place sources on the left and their dependents to the
right. Shared inputs precede their consumers. Layout affects positions only; **Undo graph change**
returns to the previous layout. Long branches can still require panning; grouping remains planned.

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
