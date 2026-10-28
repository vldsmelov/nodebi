import { expect, it } from "vitest";
import { chartLegend } from "@/features/dashboard/chart-legend";

it("uses native names, labels and selection without exposing formatted IDs or duplicate helper series", () => {
  expect(chartLegend({ legend: { formatter: name => ({ metric: "Revenue", outlier: "Outliers" })[name] ?? name, selected: { outlier: false } },
    series: [{ type: "boxplot", name: "metric" }, { type: "scatter", name: "outlier" }, { type: "scatter", name: "metric", silent: true }] }))
    .toEqual([{ name: "metric", label: "Revenue", selected: true }, { name: "outlier", label: "Outliers", selected: false }]);
});

it("resolves pie categories and explicit radar profile identities in native order", () => {
  expect(chartLegend({ legend: {}, series: [{ type: "pie", data: [{ name: "North", value: 2 }, { name: "North", value: 3 }, { name: "South", value: 4 }] }] }).map(item => item.name)).toEqual(["North", "South"]);
  expect(chartLegend({ legend: { data: [{ name: "profile2" }, "profile1"], formatter: "Profile {name}" }, series: [{ type: "radar", data: [{ name: "profile1", value: [1, 2, 3] }] }] }).map(item => item.label)).toEqual(["Profile profile2", "Profile profile1"]);
});

it("omits hidden, static and absent legends", () => {
  expect(chartLegend({ series: [{ type: "bar", name: "Value" }] })).toEqual([]);
  for (const legend of [{ show: false }, { selectedMode: false as const }]) expect(chartLegend({ legend, series: [{ type: "bar", name: "Value" }] })).toEqual([]);
});
