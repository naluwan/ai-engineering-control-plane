import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ProjectsPage from "@/app/projects/page";

describe("Projects page", () => {
  it("renders the section title as the level-1 heading", () => {
    render(<ProjectsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" }),
    ).toBeInTheDocument();
  });

  it("states that project management is not implemented yet", () => {
    render(<ProjectsPage />);

    expect(screen.getByText(/not implemented yet/i)).toBeInTheDocument();
  });

  it("tells the reader which task will deliver it", () => {
    render(<ProjectsPage />);

    expect(screen.getAllByText(/TASK-006/).length).toBeGreaterThan(0);
  });

  it("renders the empty state heading", () => {
    render(<ProjectsPage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "No projects yet" }),
    ).toBeInTheDocument();
  });

  it("does not render a project list", () => {
    render(<ProjectsPage />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
