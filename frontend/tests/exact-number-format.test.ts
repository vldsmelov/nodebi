import { expect, it } from "vitest";
import { formatExactNumber } from "@/lib/exact-number-format";
import { numberLocale } from "@/lib/locale";

const settings = { number_format: "number" as const, currency: "RUB", decimals: 2 };
it("formats large decimal and integer strings without binary floating-point loss", () => {
  expect(formatExactNumber("9007199254740993.125", settings, "en")).toBe("9,007,199,254,740,993.13");
  expect(formatExactNumber("999999999999999999999999999999999999.995", settings, "en")).toBe("1,000,000,000,000,000,000,000,000,000,000,000,000.00");
  expect(formatExactNumber("-0.005", settings, "en")).toBe("-0.01");
  expect(formatExactNumber("-0.004", settings, "en")).toBe("-0.00");
  expect(formatExactNumber("123456789012345678901234567890", { ...settings, decimals: 0 }, "en")).toBe("123,456,789,012,345,678,901,234,567,890");
  expect(formatExactNumber("0.00000000000000000000000000000000000001", settings, "en")).toBe("0.00");
  expect(formatExactNumber("0.123456789", { ...settings, decimals: 8 }, "en")).toBe("0.12345679");
});
it.each(["ru", "en", "tt"] as const)("matches locale currency/percent conventions on %s without changing stored values", locale => {
  for (const number_format of ["number", "currency", "percent"] as const) {
    for (const [text, sample] of [["1455960.32", 1455960.32], ["-0.300570", -0.300570], ["0", 0]] as const) {
      expect(formatExactNumber(text, { ...settings, number_format }, locale)).toBe(new Intl.NumberFormat(numberLocale[locale], { style: number_format === "number" ? "decimal" : number_format, currency: "RUB", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sample));
    }
  }
  expect(formatExactNumber("0.300570", { ...settings, number_format: "percent" }, locale)).toBe(new Intl.NumberFormat(numberLocale[locale], { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0.30057));
});
it("leaves noncanonical strings and invalid display settings to the caller", () => {
  for (const value of ["NaN", "1e200", "1,000", "text", "1".repeat(161)]) expect(formatExactNumber(value, settings, "en")).toBeNull();
  expect(formatExactNumber("1.23", { ...settings, decimals: -1 }, "en")).toBeNull();
});
