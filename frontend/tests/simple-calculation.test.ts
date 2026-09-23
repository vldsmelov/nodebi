import { expect, it } from "vitest";
import { parseSimpleCalculation } from "@/features/workflow/simple-calculation";

it("recognizes numeric arithmetic and explicit null division without evaluating expressions", () => {
  expect(parseSimpleCalculation("[quantity] * [price]")).toMatchObject({ a: "quantity", b: "price", operation: "*" });
  expect(parseSimpleCalculation("[amount] / (-2.5e-3)")).toMatchObject({ b: "constant", bc: "-2.5e-3", zero: "error" });
  expect(parseSimpleCalculation("([amount]) / nullif((0), 0)")).toMatchObject({ a: "amount", b: "constant", bc: "0", zero: "null" });
  expect(parseSimpleCalculation("[a] + [b] * 2")).toBeNull();
  expect(parseSimpleCalculation("coalesce([a], 0)")).toBeNull();
  expect(parseSimpleCalculation("alert('x')")).toBeNull();
});
