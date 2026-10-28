import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { AnalyticalTemplatePicker, TemplateCapturePanel } from "@/features/report-builder/AnalyticalTemplates";
import { I18nProvider } from "@/lib/i18n";
import { ApiError, apiRequest } from "@/lib/api";
import type { ReactNode } from "react";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); sessionStorage.clear(); });
const template = { id: "template", revision: 1, name: "Distribution", input_grain: "One observation", fields: [{ key: "field_1", name: "Revenue", logical_type: "decimal", currency: "RUB" }] };
const columns = [
  { column_id: "amount", engine_name: "amount", display_name: "Revenue", logical_type: "decimal", nullable: false, metadata: { currency: "RUB" } },
  { column_id: "wrong", engine_name: "wrong", display_name: "Approximate", logical_type: "float", nullable: false, metadata: {} },
];
const source = { source_id: "source", resource_id: "table", expected_snapshot_id: "snapshot" };
const settings = { name: "Distribution", filters: [], analysis: { type: "histogram", value_column_id: "amount", bin_count: 20 } };
function show(children: ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nProvider initialLocale="en">{children}</I18nProvider></QueryClientProvider>);
}

it.each(["analytical", "report"] as const)("requires compatible mapping and grain confirmation for %s templates", async family => {
  const expected = family === "analytical" ? settings : { name: "Reusable report", measures: [{ name: "Revenue", operation: "sum", column_id: "amount" }], presentation: "table" };
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/prepare") ? expected : { items: [template] });
  const apply = vi.fn();
  show(<AnalyticalTemplatePicker family={family} projectId="project" requestId="request" source={source} columns={columns} ready onApply={apply} />);
  expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: family === "report" ? "Use report template" : "Use analytical template" }));
  await screen.findByRole("option", { name: "Distribution" });
  fireEvent.change(screen.getByLabelText(family === "report" ? "Report template" : "Analytical template"), { target: { value: "template" } });
  expect(screen.getByLabelText("Map field Revenue")).toHaveValue("");
  expect(screen.queryByRole("option", { name: "Approximate" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Map field Revenue"), { target: { value: "amount" } });
  expect(screen.getByRole("button", { name: "Load template settings" })).toBeDisabled();
  fireEvent.click(screen.getByLabelText("The selected data has the expected row meaning and units"));
  fireEvent.click(screen.getByRole("button", { name: "Load template settings" }));
  await waitFor(() => expect(apply).toHaveBeenCalledWith(expected));
  expect(vi.mocked(apiRequest).mock.calls[0][0]).toBe(`/api/v1/projects/project/${family}-templates`);
  const sent = JSON.parse(vi.mocked(apiRequest).mock.calls.find(([url]) => url.endsWith("/prepare"))![1]!.body as string);
  expect(sent).toEqual({ ...source, request_id: "request", mapping: { field_1: "amount" }, acknowledge_grain: true, expected_template_revision: 1 });
  expect(vi.mocked(apiRequest).mock.calls.some(([url]) => url.endsWith("/apply"))).toBe(false);
});

it.each(["analytical", "report"] as const)("reloads a stale %s template without applying or retaining unconfirmed mappings", async family => {
  let archived = false;
  vi.mocked(apiRequest).mockImplementation(async url => {
    if (url.endsWith("/prepare")) {
      archived = true;
      throw new ApiError("This template is archived. Restore it in the template catalog before using it.", 409, "TEMPLATE_ARCHIVED");
    }
    return { items: archived ? [] : [template] };
  });
  const apply = vi.fn();
  show(<AnalyticalTemplatePicker family={family} projectId="project" requestId="request" source={source} columns={columns} ready onApply={apply} />);
  fireEvent.click(screen.getByRole("button", { name: family === "report" ? "Use report template" : "Use analytical template" }));
  await screen.findByRole("option", { name: "Distribution" });
  fireEvent.change(screen.getByLabelText(family === "report" ? "Report template" : "Analytical template"), { target: { value: "template" } });
  fireEvent.change(screen.getByLabelText("Map field Revenue"), { target: { value: "amount" } });
  fireEvent.click(screen.getByLabelText("The selected data has the expected row meaning and units"));
  fireEvent.click(screen.getByRole("button", { name: "Load template settings" }));
  await screen.findByRole("alert");
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reload template list" }));
  await screen.findByText(family === "report" ? "No report templates yet. Save one from a report calculation." : "No analytical templates yet. Save one from a report calculation.");
  expect(screen.queryByLabelText("Map field Revenue")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Load template settings" })).not.toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledTimes(3);
});

it("does not load a late mapping response into a replacement input form", async () => {
  let finish: (value: unknown) => void = () => {};
  vi.mocked(apiRequest).mockImplementation(async url => url.endsWith("/prepare") ? new Promise(resolve => { finish = resolve; }) : { items: [template] });
  const apply = vi.fn();
  const view = show(<AnalyticalTemplatePicker projectId="project" requestId="request" source={source} columns={columns} ready onApply={apply} />);
  fireEvent.click(screen.getByRole("button", { name: "Use analytical template" }));
  await screen.findByRole("option", { name: "Distribution" });
  fireEvent.change(screen.getByLabelText("Analytical template"), { target: { value: "template" } });
  fireEvent.change(screen.getByLabelText("Map field Revenue"), { target: { value: "amount" } });
  fireEvent.click(screen.getByLabelText("The selected data has the expected row meaning and units"));
  fireEvent.click(screen.getByRole("button", { name: "Load template settings" }));
  view.unmount(); finish(settings);
  await Promise.resolve(); await Promise.resolve();
  expect(apply).not.toHaveBeenCalled();
});

it.each(["analytical", "report"] as const)("recovers an identical pending %s template save without source metadata", async family => {
  const visual = "ce848e64-3ec5-47d2-9333-3271094eb518", sends: string[] = [];
  let offline = false;
  vi.mocked(apiRequest).mockImplementation(async (url, options) => {
    if (!url.endsWith(`/${family}-templates`)) { if (offline) throw new Error("source unavailable"); return { editable: true, expected_token: "a".repeat(64) }; }
    sends.push(options!.body as string);
    if (sends.length === 1) throw new TypeError("response lost");
    return template;
  });
  const form = () => <TemplateCapturePanel family={family} projectId="project" visualizationId={visual} />;
  const view = show(form());
  fireEvent.click(screen.getByRole("button", { name: "Save calculation template" }));
  fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Amounts" } });
  fireEvent.change(screen.getByLabelText("Expected row meaning"), { target: { value: "One category, RUB" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Save template" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Save template" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry template save" })).toBeEnabled());
  expect(screen.getByLabelText("Template name")).toBeDisabled();
  const scope = `nodebi:${family === "report" ? "report-template-capture" : "template-capture"}:project:${visual}`;
  expect(sessionStorage.getItem(scope)).toBe(sends[0]);
  view.unmount(); offline = true; show(form());
  fireEvent.click(screen.getByRole("button", { name: "Save calculation template" }));
  fireEvent.click(screen.getByRole("button", { name: "Retry template save" }));
  await screen.findByText(/Template saved\./);
  expect(sends).toHaveLength(2); expect(sends[1]).toBe(sends[0]);
  expect(sessionStorage.getItem(scope)).toBeNull();
});
