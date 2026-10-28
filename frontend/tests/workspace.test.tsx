import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { parseTheme } from "@/lib/theme";
import { ProjectNavigation } from "@/features/workspace/ProjectNavigation";
import { DataStatePanel, TableDensity, WizardHeading, WizardSteps } from "@/components/ui/workspace";

vi.mock("next/navigation", () => ({ useParams: () => ({ projectId: "sales" }), usePathname: () => "/projects/sales/reports" }));

describe("report-first workspace", () => {
  it.each([
    ["en", ["No data yet", "Loading data", "Finish configuration", "Calculation failed", "Showing the previous result"]],
    ["ru", ["Данных пока нет", "Загрузка данных", "Завершите настройку", "Ошибка расчёта", "Показан предыдущий результат"]],
    ["tt", ["Әлегә мәгълүмат юк", "Мәгълүмат йөкләнә", "Көйләүне тәмамлагыз", "Исәпләү хатасы", "Элеккеге нәтиҗә күрсәтелә"]],
  ] as const)("keeps all five state names and announcement roles distinct in %s", (locale, names) => {
    const states = ["empty", "loading", "incomplete", "error", "previous"] as const;
    const view = render(<I18nProvider initialLocale={locale}><DataStatePanel state="empty" /></I18nProvider>);
    for (const [index, state] of states.entries()) {
      view.rerender(<I18nProvider initialLocale={locale}><DataStatePanel state={state} /></I18nProvider>);
      const panel = screen.getByRole(state === "error" ? "alert" : "status", { name: names[index] });
      expect(panel).toHaveAttribute("aria-busy", String(state === "loading"));
      expect(screen.getAllByRole("heading")).toHaveLength(1);
      expect(panel).not.toHaveClass("sr-only");
    }
  });
  it.each([
    ["en", "Import action failed"],
    ["ru", "Не удалось выполнить действие импорта"],
    ["tt", "Импорт гамәлен башкарып булмады"],
  ] as const)("focuses localized action errors only when explicitly requested (%s)", (locale, title) => {
    const view = render(<I18nProvider initialLocale={locale}><input aria-label="Settings" /><DataStatePanel state="error" title="Import action failed" focusOnMount>Details</DataStatePanel></I18nProvider>);
    expect(screen.getByRole("alert", { name: title })).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveAttribute("tabindex", "-1");
    screen.getByLabelText("Settings").focus();
    view.rerender(<I18nProvider initialLocale={locale}><input aria-label="Settings" /><DataStatePanel state="error" title="Import action failed" focusOnMount>Same operation</DataStatePanel></I18nProvider>);
    expect(screen.getByLabelText("Settings")).toHaveFocus();
    view.rerender(<I18nProvider initialLocale={locale}><input aria-label="Settings" /><DataStatePanel state="loading" /></I18nProvider>);
    expect(screen.getByLabelText("Settings")).toHaveFocus();
    expect(screen.getByRole("status")).not.toHaveAttribute("tabindex");
  });
  it("focuses changed wizard stages without stealing focus during edits or translations", () => {
    const view = render(<><WizardHeading stage={0}>Source</WizardHeading><input aria-label="Example" /></>);
    expect(screen.getByRole("heading", { name: "Source" })).toHaveFocus();
    screen.getByLabelText("Example").focus();
    view.rerender(<><WizardHeading stage={0}>Источник</WizardHeading><input aria-label="Example" /></>);
    expect(screen.getByLabelText("Example")).toHaveFocus();
    view.rerender(<><WizardHeading stage={1}>Acquisition</WizardHeading><input aria-label="Example" /></>);
    expect(screen.getByRole("heading", { name: "Acquisition" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Acquisition" })).toHaveAttribute("tabindex", "-1");
  });
  it("defaults to light while preserving explicit dark preferences", () => {
    expect(parseTheme(undefined)).toBe("light");
    expect(parseTheme("invalid")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });
  it("preserves deep links and distinguishes reports from history", () => {
    render(<I18nProvider initialLocale="en"><ProjectNavigation /></I18nProvider>);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/projects/sales/dashboard?mode=view");
    expect(screen.getByRole("navigation")).toHaveAccessibleName("Project navigation");
  });
  it("announces incomplete, loading and previous-result states distinctly", () => {
    const { rerender } = render(<I18nProvider initialLocale="en"><DataStatePanel state="incomplete" /></I18nProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("Finish configuration");
    rerender(<I18nProvider initialLocale="en"><DataStatePanel state="loading" /></I18nProvider>);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    rerender(<I18nProvider initialLocale="en"><DataStatePanel state="previous" /></I18nProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("Showing the previous result");
  });
  it("uses native controls for density and announces the current step", () => {
    const change = vi.fn();
    render(<I18nProvider initialLocale="en"><TableDensity value="normal" onChange={change} /><WizardSteps labels={["Data", "Reports"]} current={1} /></I18nProvider>);
    fireEvent.change(screen.getByRole("combobox", { name: "Table density" }), { target: { value: "compact" } });
    expect(change).toHaveBeenCalledWith("compact");
    expect(screen.getByText("Reports").closest("li")).toHaveAttribute("aria-current", "step");
  });
});
