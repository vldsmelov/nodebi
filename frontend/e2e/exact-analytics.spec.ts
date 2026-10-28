import { expect, test, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8010";

test("guided exact shares and ranks preserve full group scope before parameter selection", async ({ page, request }, testInfo) => {
  test.setTimeout(90000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Exact analytics acceptance" } })).json();
  try {
    const csv = "Item,Group,Amount\n1,A,1.00\n2,A,3.00\n3,A,\n4,B,1.00\n5,B,-1.00\n6,C,\n7,D,9007199254740993.11\n8,D,9007199254740993.13\n";
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    expect((await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).ok()).toBeTruthy();
    const [item, group, amount] = profile.fields.map((field: { field_id: string }) => field.field_id);
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Exact analytics" } })).json();
    const sourceId = crypto.randomUUID(), url = `${api}/api/v1/workflows/${workflow.id}`;
    expect((await request.put(url, { data: { name: workflow.name, expected_revision: workflow.revision, nodes: [{ id: sourceId, type: "dataset_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, resource_id: "table" }, ui: { label: "All sales" } }], edges: [], parameters: [{ name: "item", label: "Selected item", logical_type: "integer", default: 1 }] } })).ok()).toBeTruthy();
    const read = async () => (await request.get(url)).json();
    const preview = async (id: string, selected: number) => {
      const response = await request.post(`${url}/nodes/${id}/preview`, { data: { limit: 100, parameters: { item: selected } } });
      expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
    };
    await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}&node=${sourceId}`);
    const author = async (name: string, rank = false, zero = false) => {
      await page.getByLabel("Edit workflow node").selectOption(sourceId);
      await page.getByRole("button", { name: "Share and rank", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Share and rank" });
      if (rank) await dialog.getByLabel("Operation", { exact: true }).selectOption("rank");
      await dialog.getByLabel("Value field", { exact: true }).selectOption(amount);
      await expect(dialog.getByLabel("Exact calculation")).toBeChecked();
      await dialog.getByLabel("Output field name", { exact: true }).fill(name);
      await dialog.getByRole("checkbox", { name: "Group", exact: true }).check();
      if (rank) {
        await dialog.getByLabel("Tie-break field").selectOption(item);
        await expect(dialog).toContainText("remaining ties are an error");
      } else {
        await dialog.getByLabel("Denominator field name").fill(`${name} total`);
        await dialog.getByLabel("Share decimal places").fill("20");
        if (zero) await dialog.getByLabel("Zero or missing denominator").selectOption("zero");
      }
      await dialog.getByLabel("Selection field", { exact: true }).selectOption(item);
      await dialog.getByLabel("Parameter", { exact: true }).selectOption("item");
      const before = await read();
      if (name === "Share") {
        await page.setViewportSize({ width: 760, height: 1000 });
        await page.screenshot({ path: testInfo.outputPath("exact-share-narrow.png") });
      }
      await dialog.getByRole("button", { name: "Apply analytical operation" }).click();
      await expect.poll(async () => (await read()).nodes.length).toBe(before.nodes.length + (rank ? 2 : 3));
      const after = await read();
      const added = after.nodes.filter((node: { id: string }) => !before.nodes.some((old: { id: string }) => old.id === node.id));
      const total = added.find((node: { type: string }) => node.type === "window");
      expect(total.version).toBe(3);
      expect(total.config.partitions).toEqual([group]);
      if (!rank) expect(added.find((node: { type: string }) => node.type === "calculated_column").version).toBe(2);
      return added.find((node: { type: string }) => node.type === "filter").id;
    };
    const share = await author("Share");
    expect((await preview(share, 1)).rows[0].Share).toBe("0.25000000000000000000");
    expect((await preview(share, 3)).rows[0].Share).toBeNull();
    expect((await preview(share, 4)).rows[0].Share).toBeNull();
    expect((await preview(share, 7)).rows[0].Share).toBe("0.49999999999999999944");
    const rank = await author("Rank", true);
    expect((await preview(rank, 7)).rows[0].Rank).toBe(2);
    expect((await preview(rank, 8)).rows[0].Rank).toBe(1);
    const zero = await author("Fallback", false, true);
    expect((await preview(zero, 6)).rows[0].Fallback).toBe("0.00000000000000000000");
    expect((await preview(zero, 3)).rows[0].Fallback).toBeNull();
    await page.reload();
    expect((await preview(share, 7)).rows[0].Share).toBe("0.49999999999999999944");
    expect((await preview(rank, 8)).rows[0].Rank).toBe(1);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
