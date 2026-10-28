import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { TemplateCatalog } from "@/features/report-builder/TemplateCatalog";
import { readCatalogRecovery, catalogRecoveryKey } from "@/features/report-builder/template-catalog-recovery";
import { I18nProvider } from "@/lib/i18n";
import { ApiError, apiRequest } from "@/lib/api";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); sessionStorage.clear(); });
const entry = { id: "397f44ae-ff0e-4f50-9bb6-3348571a58e5", revision: 1, name: "Revenue", family: "report", presentation: "bar_chart", archived: false, input_grain: "One transaction", fields: [{ key: "f1", name: "Amount", logical_type: "decimal", currency: "RUB" }] };
const page = (items = [entry], total = items.length) => ({ items, total, active_count: total, archived_count: 0 });
function show(locale: "en" | "ru" | "tt" = "en") {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><I18nProvider initialLocale={locale}><TemplateCatalog projectId="project" /></I18nProvider></QueryClientProvider>);
}
it("searches and filters on the server with bounded pagination", async () => {
  vi.mocked(apiRequest).mockResolvedValue(page([entry], 23));
  show();
  await screen.findByRole("heading", { name: "Revenue" });
  fireEvent.change(screen.getByLabelText("Search templates"), { target: { value: "  выручка  " } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(apiRequest).toHaveBeenLastCalledWith(expect.stringContaining("q=%D0%B2%D1%8B%D1%80%D1%83%D1%87%D0%BA%D0%B0")));
  fireEvent.change(screen.getByLabelText("Template family"), { target: { value: "report" } });
  fireEvent.change(screen.getByLabelText("Catalog state"), { target: { value: "archived" } });
  await screen.findByRole("button", { name: "Next" });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(apiRequest).toHaveBeenLastCalledWith(expect.stringMatching(/state=archived&offset=20&limit=20&family=report/)));
});
it("cancels a name edit without submitting and confirms reversible archive", async () => {
  vi.mocked(apiRequest).mockResolvedValue(page());
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  show(); await screen.findByRole("heading", { name: "Revenue" });
  fireEvent.click(screen.getByRole("button", { name: "Rename" }));
  expect(screen.getByLabelText("Template name")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Unsaved" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(apiRequest).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Archive template" }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(apiRequest).toHaveBeenCalledTimes(1);
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Archive template" }));
  await screen.findByText("Template catalog updated. Existing reports are unchanged.");
  const sent = vi.mocked(apiRequest).mock.calls.find(([, options]) => options?.method === "PATCH")!;
  expect(JSON.parse(sent[1]!.body as string)).toMatchObject({ expected_revision: 1, archived: true });
});
it("does not silently overwrite a conflict; reload is explicit", async () => {
  vi.mocked(apiRequest).mockImplementation(async (_, options) => {
    if (options?.method === "PATCH") throw new ApiError("The template changed. Reload the catalog before saving.", 409, "TEMPLATE_REVISION_CONFLICT");
    return page();
  });
  show(); await screen.findByRole("heading", { name: "Revenue" });
  fireEvent.click(screen.getByRole("button", { name: "Rename" }));
  fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Changed" } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  // Presence can precede DataStatePanel's effect that moves keyboard focus.
  await waitFor(() => expect(screen.getByRole("alert", { name: "Template change failed" })).toHaveFocus());
  expect(screen.getByRole("button", { name: "Save name" })).toBeDisabled();
  expect(apiRequest).toHaveBeenCalledTimes(2);
  expect(sessionStorage.getItem(catalogRecoveryKey("project"))).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reload template list" }));
  await screen.findByRole("button", { name: "Rename" });
  expect(apiRequest).toHaveBeenCalledTimes(3);
});
it("replays a lost response after remount even when catalog discovery is offline", async () => {
  const sends: string[] = [];
  let offline = false;
  vi.mocked(apiRequest).mockImplementation(async (_, options) => {
    if (options?.method === "PATCH") {
      sends.push(options.body as string);
      if (sends.length === 1) throw new TypeError("response lost");
      return entry;
    }
    if (offline) throw new TypeError("list unavailable");
    return page();
  });
  const view = show(); await screen.findByRole("heading", { name: "Revenue" });
  fireEvent.click(screen.getByRole("button", { name: "Rename" }));
  fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Renamed" } });
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Retry catalog change" })).toBeEnabled());
  view.unmount(); offline = true; show();
  fireEvent.click(screen.getByRole("button", { name: "Retry catalog change" }));
  await screen.findByText("Template catalog updated. Existing reports are unchanged.");
  expect(sends).toHaveLength(2); expect(sends[0]).toBe(sends[1]);
  expect(sessionStorage.getItem(catalogRecoveryKey("project"))).toBeNull();
});
it.each([["ru", "Каталог шаблонов", "Подходящих шаблонов нет"], ["tt", "Шаблоннар каталогы", "Туры килгән шаблоннар юк"]] as const)("localizes empty state in %s", async (locale, title, empty) => {
  vi.mocked(apiRequest).mockResolvedValue(page([]));
  show(locale);
  expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  await screen.findByRole("heading", { name: empty });
  expect(screen.queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
});
it("rejects corrupt recovery without sending a mutation", async () => {
  sessionStorage.setItem(catalogRecoveryKey("project"), '{"templateId":"../../other"}');
  expect(readCatalogRecovery("project")).toEqual({ error: true });
  vi.mocked(apiRequest).mockResolvedValue(page());
  show();
  await screen.findByRole("alert", { name: "Template recovery unavailable" });
  expect(screen.queryByRole("button", { name: "Retry catalog change" })).not.toBeInTheDocument();
  expect(vi.mocked(apiRequest).mock.calls.every(([, options]) => !options?.method)).toBe(true);
});
