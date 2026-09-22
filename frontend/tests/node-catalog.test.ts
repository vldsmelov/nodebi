import { expect, it } from "vitest";
import { definitionKey, definitionLabel, findNodeDefinition } from "@/features/workflow/node-catalog";
import type { NodeDefinition } from "@/features/workflow/types";

const old: NodeDefinition = { type: "bar_chart", version: 1, category: "visualization", display_name: "Bar Chart", description: "", icon: null, config_schema: {}, schema_inference_mode: "static", input_ports: [], output_ports: [] };
const modern = { ...old, version: 2 };

it("resolves exact persisted contracts and never substitutes missing versions", () => {
  const catalog = [modern, old];
  expect(findNodeDefinition(catalog, old)).toBe(old);
  expect(findNodeDefinition(catalog, modern)).toBe(modern);
  expect(findNodeDefinition(catalog, { ...old, version: 3 })).toBeUndefined();
  expect(findNodeDefinition(catalog)).toBeUndefined();
});

it("distinguishes versioned creation choices while retaining single-version translated labels", () => {
  expect(definitionKey(old)).not.toBe(definitionKey(modern));
  expect(definitionLabel([old], old, "Диаграмма")).toBe("Диаграмма");
  expect(definitionLabel([modern, old], old, "Диаграмма")).toBe("Диаграмма · v1");
  expect(definitionLabel([old, modern], modern, "Диаграмма")).toBe("Диаграмма · v2");
});
