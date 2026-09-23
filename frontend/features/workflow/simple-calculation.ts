/** Recognize only the small expression grammar emitted by the simple form. Never evaluate. */
export type SimpleCalculation = { a: string; b: string; ac: string; bc: string; operation: string; zero: string };
export const emptyCalculation: SimpleCalculation = { a: "", b: "", ac: "0", bc: "0", operation: "*", zero: "" };
const number = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
const atom = `(?:\\[[^\\[\\]]+\\]|\\(${number}\\)|${number})`;
const binary = new RegExp(`^\\s*(${atom})\\s*([+*/-])\\s*(${atom})\\s*$`);
const nullableDivision = new RegExp(`^\\s*\\((${atom})\\)\\s*/\\s*nullif\\(\\s*(${atom})\\s*,\\s*0\\s*\\)\\s*$`);
export function parseSimpleCalculation(expression: string): SimpleCalculation | null {
  const nullable = nullableDivision.exec(expression), match = binary.exec(expression);
  if (!nullable && !match) return null;
  const left = nullable?.[1] ?? match![1], right = nullable?.[2] ?? match![3];
  const read = (value: string) => value.startsWith("[") ? { field: value.slice(1, -1), value: "0" } : { field: "constant", value: value.replace(/^\(|\)$/g, "") };
  const a = read(left), b = read(right);
  return { a: a.field, b: b.field, ac: a.value, bc: b.value, operation: nullable ? "/" : match![2], zero: nullable ? "null" : match![2] === "/" ? "error" : "" };
}
