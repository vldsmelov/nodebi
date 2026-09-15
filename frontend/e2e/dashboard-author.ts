import { expect, type Page } from "@playwright/test";

export type ViewParameter = { name: string; label: string; type: string; node: string; column: string };
export type ViewLink = { label: string; target: string; values: Record<string, string> };

export async function authorDashboard(page: Page, projectId: string, workflowId: string, title: string, widgets: string[], parameters: ViewParameter[], links: ViewLink[]) {
  await page.goto(`/projects/${projectId}/dashboard`);
  await page.getByRole("button", { name: "New dashboard", exact: true }).click();
  await expect(page.getByLabel("Dashboard name")).toHaveValue("Sales dashboard");
  const id = new URL(page.url()).searchParams.get("dashboard")!;
  await page.getByLabel("Dashboard name").fill(title);
  for (const widget of widgets) {
    await page.getByLabel("Add visualization", { exact: true }).selectOption(widget);
    await page.getByRole("button", { name: "Add widget", exact: true }).click();
  }
  await page.getByText("Dashboard settings", { exact: true }).click();
  for (const [index, parameter] of parameters.entries()) {
    await page.getByRole("button", { name: "Add dashboard parameter", exact: true }).click();
    await page.getByLabel(`Dashboard parameter name ${index + 1}`).fill(parameter.name);
    await page.getByLabel(`Dashboard parameter type ${index + 1}`).selectOption(parameter.type);
    await page.getByLabel(`Dashboard parameter label ${index + 1}`).fill(parameter.label);
    await page.getByLabel("Required parameter", { exact: true }).nth(index).check();
    await page.getByLabel(`Bind workflow parameter ${index + 1}`).selectOption(`${workflowId}:${parameter.name}`);
    await page.getByLabel(`Choices workflow for ${parameter.name}`).selectOption(workflowId);
    await page.getByLabel(`Choices node for ${parameter.name}`).selectOption(parameter.node);
    await page.getByLabel(`Choices field for ${parameter.name}`).selectOption(parameter.column);
  }
  for (const [index, link] of links.entries()) {
    await page.getByRole("button", { name: "Add navigation link", exact: true }).click();
    await page.getByLabel(`Navigation link label ${index + 1}`).fill(link.label);
    const area = page.locator("div").filter({ has: page.getByLabel(`Navigation link label ${index + 1}`) }).filter({ has: page.getByLabel("Destination dashboard") }).last();
    await area.getByLabel("Destination dashboard").selectOption(link.target);
    for (const [name, value] of Object.entries(link.values)) await area.getByLabel(`Navigation value for ${name}`).selectOption(value);
  }
  await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  return id;
}

export async function widgetAction(page: Page, title: string, target: string, values: Record<string, string>) {
  const area = page.locator("details").filter({ has: page.getByText("Widget navigation", { exact: true }) });
  if (!(await area.evaluate(element => (element as HTMLDetailsElement).open))) await area.locator("summary").click();
  await area.getByLabel("Configure widget navigation").selectOption({ label: title });
  await area.getByLabel("Destination dashboard").selectOption(target);
  for (const [name, value] of Object.entries(values)) await area.getByLabel(`Navigation value for ${name}`).selectOption(value);
  await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
}
