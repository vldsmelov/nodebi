import { numberLocale, type Locale } from "./locale";

type Settings = { number_format: "number" | "currency" | "percent"; currency: string; decimals: number };

/** Presentation only: exact scaled-integer rounding, with Intl supplying grouping and affixes.
 * Never coerce transported decimal/large-integer values to Number. Display ties round away
 * from zero like the existing Intl formatter; the server's calculation scale is unchanged.
 */
export function formatExactNumber(value: string, settings: Settings, locale: Locale): string | null {
  if (value.length > 160 || !Number.isInteger(settings.decimals) || settings.decimals < 0 || settings.decimals > 8) return null;
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const fraction = match[3] ?? "";
  const shift = settings.decimals + (settings.number_format === "percent" ? 2 : 0) - fraction.length;
  let scaled = BigInt(match[2] + fraction);
  if (shift >= 0) scaled *= BigInt(10) ** BigInt(shift);
  else {
    const divisor = BigInt(10) ** BigInt(-shift);
    scaled = scaled / divisor + (scaled % divisor * BigInt(2) >= divisor ? BigInt(1) : BigInt(0));
  }
  const digits = scaled.toString().padStart(settings.decimals + 1, "0");
  const integer = settings.decimals ? digits.slice(0, -settings.decimals) : digits;
  const remainder = settings.decimals ? digits.slice(-settings.decimals) : "";
  try {
    const parts = new Intl.NumberFormat(numberLocale[locale], {
      style: settings.number_format === "number" ? "decimal" : settings.number_format,
      currency: settings.currency,
      minimumFractionDigits: settings.decimals, maximumFractionDigits: settings.decimals,
    }).formatToParts(match[1] ? -1 : 1);
    const numeric = new Intl.NumberFormat(numberLocale[locale], { maximumFractionDigits: 0 }).format(BigInt(integer))
      + (remainder ? (parts.find(part => part.type === "decimal")?.value ?? ".") + remainder : "");
    let inserted = false;
    return parts.map(part => {
      if (!["integer", "group", "decimal", "fraction"].includes(part.type)) return part.value;
      if (inserted) return "";
      inserted = true;
      return numeric;
    }).join("");
  } catch { return null; }
}
