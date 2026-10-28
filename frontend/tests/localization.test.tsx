import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import Home from "@/app/page";
import { NodeConfiguration } from "@/features/workflow/NodeConfiguration";
import { I18nProvider, LanguageSwitcher, useI18n } from "@/lib/i18n";
import { formatCell, localeCookie, nodeNames, parseDataDate, parseLocale, translate } from "@/lib/locale";
import { translations } from "@/lib/translations";
import { localizeError } from "@/lib/localized-errors";

it("retains typed input diagnostics and translates repair messages in all locales", () => {
  for (const locale of ["ru", "en", "tt"] as const) {
    const text = localizeError(locale, { code: "INVALID_TYPED_NODE", node_id: "node-1", field: "b", message: "Logical operations require boolean fields." });
    expect(text).toContain("node-1");
    expect(text).toContain("INVALID_TYPED_NODE");
    expect(text).toContain("b");
    expect(text).toContain(locale === "ru" ? "Вход:" : locale === "tt" ? "Кереш:" : "Input:");
    expect(text).not.toContain("could not be completed");
    if (locale !== "en") expect(text).not.toContain("Logical operations require");
    expect(localizeError(locale, { field: "config.name", message: "Workflow parameter 'factor' is not declared." })).toContain("factor");
  }
});
import { ApiError } from "@/lib/api";

afterEach(() => { cleanup(); document.cookie = `${localeCookie}=; Max-Age=0; Path=/`; });

it("defaults to Russian and retains the choice through a fresh provider", () => {
  const view = render(<I18nProvider><LanguageSwitcher /><Home /></I18nProvider>);
  expect(screen.getByRole("heading", { name: "От таблиц — к понятным решениям." })).toBeVisible();
  expect(screen.getByText("Преобразование", { exact: true })).toBeVisible();
  fireEvent.change(screen.getByLabelText("Язык"), { target: { value: "tt" } });
  expect(screen.getByRole("heading", { name: "Таблицалардан — аңлаешлы карарларга." })).toBeVisible();
  expect(screen.getByText("Үзгәртү", { exact: true })).toBeVisible();
  expect(document.documentElement.lang).toBe("tt");
  expect(document.cookie).toContain("nodebi-language=tt");
  view.unmount();
  const saved = document.cookie.split("; ").find(c => c.startsWith(`${localeCookie}=`))?.split("=")[1];
  render(<I18nProvider initialLocale={parseLocale(saved)}><LanguageSwitcher /><Home /></I18nProvider>);
  expect(screen.getByLabelText("Тел")).toHaveValue("tt");
  fireEvent.change(screen.getByLabelText("Тел"), { target: { value: "en" } });
  expect(screen.getByRole("heading", { name: "Turn spreadsheets into clear decisions." })).toBeVisible();
  expect(document.documentElement.lang).toBe("en");
  expect(parseLocale("unsupported")).toBe("ru");
});

it("translates controls while preserving field names and machine configuration values", () => {
  render(<I18nProvider initialLocale="tt"><NodeConfiguration type="filter" config={{ conditions: [{ column_id: "field", operator: "equals", value: "Title" }] }}
    onChange={() => {}} columns={[{ column_id: "field", engine_name: "Title", display_name: "Title", logical_type: "string", nullable: false, metadata: {} }]} sources={[]} /></I18nProvider>);
  expect(screen.getByLabelText("Сөзгеч кыры 1")).toHaveTextContent("Title · текст");
  expect(screen.getByLabelText("Сөзгеч операторы 1")).toHaveValue("equals");
  expect(screen.getByLabelText("Сөзгеч кыйммәте 1")).toHaveValue("Title");
  expect(screen.getByRole("option", { name: "тигез" })).toHaveValue("equals");
});

it("localizes structured errors without dropping fields, nodes, codes or diagnostics", () => {
  const error = new ApiError("Unknown server wording", 409, "WORKFLOW_CONFLICT", "node-id", "config.expression", [
    { code: "INVALID_FIELD", message: "Invalid arithmetic expression.", field: "expression" },
  ], "diagnostic-id");
  const ru = localizeError("ru", error);
  expect(ru).toContain("Схема изменена");
  for (const text of ["WORKFLOW_CONFLICT", "node-id", "Выражение", "diagnostic-id", "Некорректное арифметическое выражение."]) expect(ru).toContain(text);
  expect(localizeError("tt", error)).toContain("Схема башка салынмада");
  expect(localizeError("ru", "Unknown field: Title. Use [column_id] for unusual names.")).toContain("Неизвестное поле: Title.");
  expect(localizeError("ru", new Error("Unexpected English"))).not.toContain("Unexpected English");
  expect(localizeError("en", error)).toContain("Invalid arithmetic expression.");
  expect(localizeError("en", error)).toContain("Field: Expression");
});

it("changes number and boolean presentation without translating string values", () => {
  expect(formatCell("ru", 1234.5)).toBe("1\u00a0234,5");
  expect(formatCell("en", 1234.5)).toBe("1,234.5");
  expect(formatCell("tt", true)).toBe("дөрес");
  expect(formatCell("ru", "Title")).toBe("Title");
  expect(formatCell("tt", null)).toBe("—");
  expect(formatCell("ru", "2026-09-11", "date")).toBe("11.09.2026");
  expect(parseDataDate("2026-09-11T00:15:00").toISOString()).toBe("2026-09-11T00:15:00.000Z");
  expect(formatCell("ru", "2026-09-11T00:15:00", "datetime")).toBe("11.09.2026, 00:15:00");
  expect(translate("tt", "Delete {0}", { 0: "<Title>{0}" })).toBe("<Title>{0} бетерү");
});

function ErrorExample() {
  const { errorText } = useI18n();
  return <p role="alert">{errorText(new ApiError("Missing", 404, "SOURCE_NOT_FOUND"))}</p>;
}
it("retranslates an existing error when the language changes", () => {
  render(<I18nProvider><LanguageSwitcher /><ErrorExample /></I18nProvider>);
  expect(screen.getByRole("alert")).toHaveTextContent("Источник данных не найден.");
  fireEvent.change(screen.getByLabelText("Язык"), { target: { value: "tt" } });
  expect(screen.getByRole("alert")).toHaveTextContent("Мәгълүмат чыганагы табылмады.");
});

describe("catalog completeness", () => {
  it("translates source-neutral, calendar and exact analytical operation descriptions", () => {
    const descriptions = [
      "Fully align two unique prepared measures without aggregation. Missing sides remain empty.",
      "Create an inclusive daily calendar.",
      "Replace dates with calendar period starts.",
      "Read a normalized table independent of its original source.",
      "Exact decimal sums and half-even averages; legacy numeric fields retain v1 behavior.",
      "Compare prepared values with an exact calendar baseline.",
      "Exact pivot totals, averages and extrema with explicit average rounding.",
      "Exact partition and cumulative totals, extrema and previous values.",
    ];
    for (const description of descriptions) {
      expect(translate("en", description)).toBe(description);
      for (const locale of ["ru", "tt"] as const) {
        expect(translate(locale, description), `${locale}: ${description}`).not.toBe(description);
        expect(translate(locale, description).trim()).not.toBe("");
      }
    }
  });
  it("covers literal UI messages and all registered node labels in both translations", () => {
    const missing: string[] = [];
    for (const dir of ["app", "features", "lib"]) {
      const files = readdirSync(dir, { recursive: true }).filter(f => /\.tsx?$/.test(String(f)));
      for (const file of files) {
        const name = join(dir, String(file));
        const source = ts.createSourceFile(name, readFileSync(name, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const visit = (node: ts.Node) => {
          if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && !translations[node.arguments[0].text]) missing.push(`${name}: ${node.arguments[0].text}`);
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    }
    expect(missing).toEqual([]);
    for (const name of Object.values(nodeNames)) expect(translations[name]).toBeDefined();
    for (const [key, values] of Object.entries(translations)) for (const value of values) {
      expect(value.trim(), key).not.toBe("");
      expect(value.match(/\{\w+\}/g)?.sort() ?? [], key).toEqual(key.match(/\{\w+\}/g)?.sort() ?? []);
    }
  });
});


it("preserves actionable nested configuration issues in all three languages", () => {
  const issue = { code: "INVALID_NODE_CONFIGURATION", message: "Fill in this required setting.", field: "config.conditions.0.column_id", node_id: "node-123" };
  const error = new ApiError("Workflow validation failed before execution.", 422, "WORKFLOW_VALIDATION_FAILED", undefined, undefined, [issue], "diagnostic-123");
  for (const locale of ["ru", "en", "tt"] as const) {
    const text = localizeError(locale, error);
    expect(text).toContain(translate(locale, issue.message));
    expect(text).toContain("node-123");
    expect(text).toContain("diagnostic-123");
    expect(text).toContain("INVALID_NODE_CONFIGURATION");
    expect(text).toContain(" / 1 / ");
    expect(text).not.toContain("config.conditions");
  }
});
