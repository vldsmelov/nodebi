import { afterEach, describe, expect, it, vi } from "vitest";

import { listSources, previewSheet, uploadSource } from "@/features/data-sources/api";

afterEach(() => vi.unstubAllGlobals());

describe("data source API", () => {
  it("loads persisted sources and safely encodes worksheet names", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sheet_name: "Sales 2026",
            columns: [],
            rows: [],
            returned_rows: 0,
            truncated: false,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    expect(await listSources("project-1")).toEqual([]);
    await previewSheet("source-1", "Sales 2026");

    expect(fetchMock.mock.calls[1][0]).toContain("Sales%202026/preview");
  });

  it("uploads files as multipart data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "source-1" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["content"], "sales.xlsx");

    await uploadSource("project-1", file);

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });
});
