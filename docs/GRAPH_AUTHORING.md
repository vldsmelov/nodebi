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
dependencies were needed. Grouping, layout, adjustable panels and undo/redo are subsequent U1
work; formula tokens and the other UX-review stages are not claimed as delivered here.

Human evaluation protocol: [operator tasks](UX_OPERATOR_PROTOCOL.md).
Design and complete roadmap: [UX review](CONSTRUCTOR_UX_REVIEW.md).
