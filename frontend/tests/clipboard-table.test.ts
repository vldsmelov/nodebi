import { expect, it } from "vitest";
import { clipboardTable } from "@/features/report-cycle/clipboard-table";

it("preserves codes, exact money, literal formulas and quoted tabs/newlines", () => {
  expect(clipboardTable('0001\t9007199254740993.11\t=1+1\r\n"a\tb"\t"two\nlines"\t"say ""yes"""\r\n')).toEqual([
    ["0001", "9007199254740993.11", "=1+1"], ["a\tb", "two\nlines", 'say "yes"'],
  ]);
});
it("retains explicit empty cells without inventing a trailing data row", () => {
  expect(clipboardTable("a\t\r\n")).toEqual([["a", ""]]);
});
it("rejects incomplete quotes and oversized ranges instead of silently truncating", () => {
  expect(() => clipboardTable('"unfinished')).toThrow("incomplete quoted values");
  expect(() => clipboardTable(Array(2001).fill("x").join("\t"))).toThrow("too large");
  expect(() => clipboardTable("x".repeat(200001))).toThrow("too large");
});
