import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page", () => {
  it("renders the product name as the main heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "AI Engineering Control Plane" }),
    ).toBeInTheDocument();
  });

  it("renders the product category", () => {
    render(<Home />);

    expect(
      screen.getByText("AI-Native Software Engineering Platform"),
    ).toBeInTheDocument();
  });

  it("states that the repository foundation is initialized", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Repository foundation initialized",
      }),
    ).toBeInTheDocument();
  });

  it("makes clear that no real agent, GitHub or LLM integration is connected", () => {
    render(<Home />);

    expect(
      screen.getByText(/No real agent execution, GitHub integration or LLM provider/i),
    ).toBeInTheDocument();
  });
});
