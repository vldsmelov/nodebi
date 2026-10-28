import { expect, it } from "vitest";
import { choiceLabels } from "@/features/workflow/choice-labels";

it("disambiguates without changing identities, user names or colliding with authored suffixes", () => {
  const items = ["Limit", "Limit", "Limit · 1", "Sales"].map((label, index) => ({ id: String(index), label }));
  const labelled = choiceLabels(items);
  expect(labelled.map(item => item.label)).toEqual(["Limit · 2", "Limit · 3", "Limit · 1", "Sales"]);
  expect(labelled.map(item => item.id)).toEqual(items.map(item => item.id));
  expect(items.map(item => item.label)).toEqual(["Limit", "Limit", "Limit · 1", "Sales"]);
  expect(labelled.filter(item => item.id === "1")[0].label).toBe("Limit · 3");
  expect(choiceLabels(items)).toEqual(labelled);
});
