import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";

describe("Not found page", () => {
  it("renders a level-1 heading naming the problem", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("links back to the home page", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("link", { name: "Back to overview" }),
    ).toHaveAttribute("href", "/");
  });
});
