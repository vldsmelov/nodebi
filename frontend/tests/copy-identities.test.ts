import { expect, it } from "vitest";
import { remapIdentities } from "../e2e/copy-identities";

it("remaps nested node IDs, generated field keys and formula references reversibly", () => {
  const old = "11111111-1111-4111-8111-111111111111", next = "22222222-2222-4222-8222-222222222222";
  const field = `calc_${old.replaceAll("-", "")}`;
  const input = { node_id: old, formats: { [field]: { decimals: 2 } }, expression: `\`${field}\` * 2`, values: [null, 3, false, "Unrelated text"], action: { dashboard_id: old } };
  const copy = remapIdentities(input, { [old]: next });
  expect(copy.node_id).toBe(next);
  expect(Object.keys(copy.formats)).toEqual([`calc_${next.replaceAll("-", "")}`]);
  expect(copy.expression).toBe(`\`calc_${next.replaceAll("-", "")}\` * 2`);
  expect(remapIdentities(copy, { [next]: old })).toEqual(input);
  expect(input.node_id).toBe(old);
});
