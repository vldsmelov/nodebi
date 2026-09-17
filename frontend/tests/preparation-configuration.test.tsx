import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render } from "./render";
import { ConvertTypesConfiguration, UnpivotConfiguration, WindowConfiguration } from "@/features/workflow/PreparationConfiguration";
import type { ResolvedColumn } from "@/features/workflow/types";

const columns: ResolvedColumn[] = [
  { column_id: "team", engine_name: "team", display_name: "Team", logical_type: "string", nullable: false, metadata: {} },
  { column_id: "amount", engine_name: "amount", display_name: "Amount", logical_type: "float", nullable: true, metadata: {} },
];
function Form({ kind }: { kind: "convert" | "unpivot" | "window" }) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const Component = kind === "convert" ? ConvertTypesConfiguration : kind === "unpivot" ? UnpivotConfiguration : WindowConfiguration;
  return <><Component config={config} columns={columns} onChange={setConfig} /><output data-testid="config">{JSON.stringify(config)}</output></>;
}
const config = () => JSON.parse(screen.getByTestId("config").textContent!);
describe("preparation forms", () => {
  it("makes lossy conversion an explicit user choice", () => {
    render(<Form kind="convert" />);
    fireEvent.click(screen.getByText("Add conversion"));
    expect(config().conversions[0].on_error).toBe("error");
    fireEvent.change(screen.getByLabelText("Invalid values"), { target: { value: "null" } });
    expect(config().conversions[0].on_error).toBe("null");
  });
  it("keeps unpivot identifiers separate from value fields", () => {
    render(<Form kind="unpivot" />);
    fireEvent.click(screen.getAllByLabelText("Team")[0]);
    expect(config().identifiers).toEqual(["team"]);
    expect(screen.getAllByLabelText("Team")).toHaveLength(1);
    fireEvent.click(screen.getAllByLabelText("Amount")[1]);
    expect(config().columns).toEqual(["amount"]);
    fireEvent.change(screen.getByLabelText("Unpivot label amount"), { target: { value: "Shared" } });
    expect(config().labels).toEqual({ amount: "Shared" });
    fireEvent.click(screen.getAllByLabelText("Amount")[0]);
    expect(config().columns).toEqual([]);
    expect(config().labels).toEqual({});
  });
  it("exposes the row-number sort order", () => {
    render(<Form kind="window" />);
    fireEvent.change(screen.getByLabelText("Operation"), { target: { value: "row_number" } });
    fireEvent.click(screen.getByText("Add sort field"));
    fireEvent.change(screen.getByLabelText("Sort direction 1"), { target: { value: "descending" } });
    expect(config().order_by).toEqual([{ column_id: "team", direction: "descending" }]);
  });
});
