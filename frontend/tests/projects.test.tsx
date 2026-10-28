import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "./render";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProjectsPage from "@/app/projects/page";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("ProjectsPage", () => {
  it("announces a failed deletion and retains the project instead of failing silently", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => init?.method === "DELETE"
      ? new Response(JSON.stringify({ detail: { code: "PROJECT_CONFLICT", message: "Project changed. Try again." } }), { status: 409 })
      : new Response(JSON.stringify({ items: [{ id: "sales", name: "Sales", created_at: "2026-10-26", updated_at: "2026-10-26" }] }))));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><ProjectsPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Sales" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Project changed. Try again.");
    expect(alert).toHaveFocus();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
  it("renders projects returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "82fef981-704d-43cf-8ce7-515183d61f72",
                name: "Sales Analysis",
                created_at: "2026-09-04T00:00:00Z",
                updated_at: "2026-09-04T00:00:00Z",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <ProjectsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Sales Analysis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/projects/82fef981-704d-43cf-8ce7-515183d61f72",
    );
  });
});
