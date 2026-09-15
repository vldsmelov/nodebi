import { expect, type Page } from "@playwright/test";

export const hex = (id: string) => id.replaceAll("-", "");
export const calculated = (id: string) => `calc_${hex(id)}`;
export const aggregate = (id: string, index: number) => `agg_${hex(id)}_${index}`;

/** Operates the same controls an author uses. No graph JSON or DB writes. */
export class ConstructorAuthor {
  readonly created: string[] = [];
  constructor(readonly page: Page) {}
  saved = () => expect(this.page.getByText("Saved", { exact: true })).toBeVisible();

  async add(kind: string, upstream: string | null, configure: () => Promise<void>) {
    const page = this.page, count = await page.locator(".react-flow__node").count();
    await page.getByTitle(`Add ${kind}`, { exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(count + 1);
    const id = (await page.locator(".react-flow__node").last().getAttribute("data-id"))!;
    this.created.push(id);
    if (upstream) await page.getByLabel("Input input", { exact: true }).selectOption(`${upstream}:dataset`);
    await configure(); await this.saved(); return id;
  }

  calc(upstream: string, name: string, expression: string) {
    return this.add("Calculated Column", upstream, async () => {
      await this.page.getByLabel("Output field name", { exact: true }).fill(name);
      await this.page.getByLabel("Expression", { exact: true }).fill(expression);
    });
  }

  group(upstream: string, dimensions: string[], aggregations: [string | null, string, string][]) {
    return this.add("Group By", upstream, async () => {
      for (const name of dimensions) await this.page.getByRole("checkbox", { name, exact: true }).check();
      for (const [index, [column, operation, name]] of aggregations.entries()) {
        await this.page.getByRole("button", { name: "Add aggregation", exact: true }).click();
        if (column) await this.page.getByLabel(`Aggregate field ${index + 1}`, { exact: true }).selectOption(column);
        await this.page.getByLabel(`Aggregation ${index + 1}`, { exact: true }).selectOption(operation);
        await this.page.getByLabel(`Aggregate name ${index + 1}`, { exact: true }).fill(name);
      }
    });
  }

  filter(upstream: string, column: string, parameter: string) {
    return this.add("Filter", upstream, async () => {
      await this.page.getByRole("button", { name: "Add condition", exact: true }).click();
      await this.page.getByLabel("Filter column 1", { exact: true }).selectOption(column);
      await this.page.getByLabel("Filter value source 1", { exact: true }).selectOption(parameter);
    });
  }

  window(upstream: string, name: string, column: string, partitions: string[] = []) {
    return this.add("Window", upstream, async () => {
      await this.page.getByLabel("Output field name", { exact: true }).fill(name);
      await this.page.getByLabel("Value field", { exact: true }).selectOption(column);
      for (const name of partitions) await this.page.getByRole("group", { name: "Partition fields", exact: true }).getByLabel(name, { exact: true }).check();
    });
  }

  sort(upstream: string, keys: [string, string][]) {
    return this.add("Sort", upstream, async () => {
      for (const [index, [field, direction]] of keys.entries()) {
        await this.page.getByRole("button", { name: "Add sort field", exact: true }).click();
        await this.page.getByLabel(`Sort field ${index + 1}`, { exact: true }).selectOption(field);
        await this.page.getByLabel(`Sort direction ${index + 1}`, { exact: true }).selectOption(direction);
      }
    });
  }

  chart(kind: string, upstream: string, title: string, value: string, category?: string, format = "number", decimals = 2) {
    return this.add(kind, upstream, async () => {
      await this.page.getByLabel("Chart title", { exact: true }).fill(title);
      if (category) await this.page.getByLabel("Chart category", { exact: true }).selectOption(category);
      await this.page.getByLabel("Chart value", { exact: true }).selectOption(value);
      await this.page.getByLabel("Number format", { exact: true }).selectOption(format);
      await this.page.getByLabel("Decimal places", { exact: true }).fill(String(decimals));
      if (kind === "Bar Chart") await this.page.getByLabel("Orientation", { exact: true }).selectOption("horizontal");
    });
  }

  table(upstream: string, title: string, names: string[]) {
    return this.add("Table", upstream, async () => {
      await this.page.getByLabel("Chart title", { exact: true }).fill(title);
      for (const checkbox of await this.page.locator('aside').last().locator('input[type="checkbox"]:visible').all()) {
        const label = await checkbox.evaluate(element => element.closest("label")?.textContent?.trim() ?? "");
        if (!names.includes(label)) await checkbox.uncheck();
      }
      for (const name of names) await this.page.getByRole("checkbox", { name, exact: true }).check();
    });
  }
}
