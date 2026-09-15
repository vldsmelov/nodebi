import { expect, type Page } from "@playwright/test";

export const hex = (id: string) => id.replaceAll("-", "");
export const calculated = (id: string) => `calc_${hex(id)}`;
export const aggregate = (id: string, index: number) => `agg_${hex(id)}_${index}`;

/** Operates the same controls an author uses. No graph JSON or DB writes. */
export class ConstructorAuthor {
  readonly created: string[] = [];
  constructor(readonly page: Page, readonly resume: string[] = []) {}
  saved = () => expect(this.page.getByText("Saved", { exact: true })).toBeVisible();

  async add(kind: string, upstream: string | null, configure: () => Promise<void>) {
    const page = this.page, count = await page.locator(".react-flow__node").count();
    if (this.created.length < this.resume.length) {
      const id = this.resume[this.created.length]; this.created.push(id);
      const node = page.locator(`.react-flow__node[data-id="${id}"]`);
      await node.focus();
      await expect(node).toBeInViewport();
      await node.click();
      await expect(node).toHaveClass(/selected/);
      await this.closeDetails();
      // Reviewed recovery: all earlier nodes are complete; only the final node was interrupted.
      if (this.created.length === this.resume.length) { await configure(); await this.saved(); }
      return id;
    }
    await page.getByTitle(`Add ${kind}`, { exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(count + 1);
    const id = (await page.locator(".react-flow__node").last().getAttribute("data-id"))!;
    this.created.push(id);
    if (upstream) await page.getByLabel("Input input", { exact: true }).selectOption(`${upstream}:dataset`);
    await this.closeDetails();
    await configure(); await this.saved(); return id;
  }

  private async closeDetails() {
    for (const details of await this.page.locator("aside").last().locator("details[open]").all()) await details.locator("summary").first().click();
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

  select(upstream: string, names: string[]) {
    return this.add("Select Columns", upstream, async () => {
      for (const name of names) {
        const label = this.page.locator("aside").last().locator("label").filter({ has: this.page.getByText(name, { exact: true }) });
        // Match the visible field-name span, not the appended logical type.
        await label.locator('input[type="checkbox"]').check();
      }
    });
  }

  rename(upstream: string, rules: [string, string][]) {
    return this.add("Rename Columns", upstream, async () => {
      for (const [index, [column, name]] of rules.entries()) {
        await this.page.getByRole("button", { name: "Add rename", exact: true }).click();
        await this.page.getByLabel(`Column ${index + 1}`, { exact: true }).selectOption(column);
        await this.page.getByLabel(`New name ${index + 1}`, { exact: true }).fill(name);
      }
    });
  }

  unpivot(upstream: string, identifiers: string[], columns: string[]) {
    return this.add("Unpivot", upstream, async () => {
      for (const name of identifiers) await this.page.getByRole("group", { name: "Identifier fields", exact: true }).getByLabel(name, { exact: true }).check();
      for (const name of columns) await this.page.getByRole("group", { name: "Fields to turn into rows", exact: true }).getByLabel(name, { exact: true }).check();
    });
  }

  union(left: string, right: string) {
    return this.add("Union", null, async () => {
      await this.page.getByLabel("Input left", { exact: true }).selectOption(`${left}:dataset`);
      await this.page.getByLabel("Input right", { exact: true }).selectOption(`${right}:dataset`);
    });
  }

  join(left: string, right: string, leftKey: string, rightKey: string) {
    return this.add("Join", null, async () => {
      await this.page.getByLabel("Input left", { exact: true }).selectOption(`${left}:dataset`);
      await this.page.getByLabel("Input right", { exact: true }).selectOption(`${right}:dataset`);
      await this.page.getByLabel("left join key", { exact: true }).selectOption(leftKey);
      await this.page.getByLabel("right join key", { exact: true }).selectOption(rightKey);
    });
  }

  literalFilter(upstream: string, column: string, operator: string, value: string) {
    return this.add("Filter", upstream, async () => {
      await this.page.getByRole("button", { name: "Add condition", exact: true }).click();
      await this.page.getByLabel("Filter column 1", { exact: true }).selectOption(column);
      await this.page.getByLabel("Filter operator 1", { exact: true }).selectOption(operator);
      await this.page.getByLabel("Filter value 1", { exact: true }).fill(value);
    });
  }

  limit(upstream: string, rows: number) {
    return this.add("Limit", upstream, async () => { await this.page.getByLabel("Maximum rows", { exact: true }).fill(String(rows)); });
  }

  rank(upstream: string, name: string, partitions: string[], keys: [string, string][]) {
    return this.add("Window", upstream, async () => {
      await this.page.getByLabel("Output field name", { exact: true }).fill(name);
      await this.page.getByLabel("Operation", { exact: true }).selectOption("row_number");
      for (const label of partitions) await this.page.getByRole("group", { name: "Partition fields", exact: true }).getByLabel(label, { exact: true }).check();
      for (const [index, [column, direction]] of keys.entries()) {
        await this.page.getByRole("button", { name: "Add sort field", exact: true }).click();
        await this.page.getByLabel(`Sort field ${index + 1}`, { exact: true }).selectOption(column);
        await this.page.getByLabel(`Sort direction ${index + 1}`, { exact: true }).selectOption(direction);
      }
    });
  }
}
