import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProjectsPage from "@/app/projects/page";

afterEach(() => vi.unstubAllGlobals());

describe("ProjectsPage", () => {
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
