import { screen } from "@testing-library/react";
import { render } from "./render";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("introduces the project workspace", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Turn spreadsheets into clear decisions." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open projects" })).toHaveAttribute("href", "/projects");
  });
});

