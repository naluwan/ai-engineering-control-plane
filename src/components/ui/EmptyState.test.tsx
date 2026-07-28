import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders the title as a level-2 heading", () => {
    render(
      <EmptyState
        title="No projects yet"
        description="Project management is not implemented yet."
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "No projects yet" }),
    ).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <EmptyState
        title="No projects yet"
        description="Project management is not implemented yet."
      />,
    );

    expect(
      screen.getByText("Project management is not implemented yet."),
    ).toBeInTheDocument();
  });

  it("renders an optional action passed as children", () => {
    render(
      <EmptyState title="No projects yet" description="Nothing here.">
        <a href="/docs">Read the roadmap</a>
      </EmptyState>,
    );

    expect(
      screen.getByRole("link", { name: "Read the roadmap" }),
    ).toBeInTheDocument();
  });

  it("renders no action region when no children are supplied", () => {
    render(<EmptyState title="No projects yet" description="Nothing here." />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("forwards className instead of discarding it", () => {
    const { container } = render(
      <EmptyState
        className="mt-12"
        title="No projects yet"
        description="Nothing here."
      />,
    );

    expect(container.firstElementChild).toHaveClass("mt-12");
  });
});
