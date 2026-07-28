import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/ui/PageHeader";

describe("PageHeader", () => {
  it("renders the title as the level-1 heading", () => {
    render(<PageHeader title="Projects" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" }),
    ).toBeInTheDocument();
  });

  it("renders the optional eyebrow above the title", () => {
    render(<PageHeader eyebrow="TASK-006" title="Projects" />);

    expect(screen.getByText("TASK-006")).toBeInTheDocument();
  });

  it("renders the optional description", () => {
    render(
      <PageHeader title="Projects" description="Project management lives here." />,
    );

    expect(
      screen.getByText("Project management lives here."),
    ).toBeInTheDocument();
  });

  it("omits the eyebrow and description when they are not supplied", () => {
    render(<PageHeader title="Projects" />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("TASK-006")).not.toBeInTheDocument();
  });

  it("forwards className instead of discarding it", () => {
    const { container } = render(
      <PageHeader className="mb-10" title="Projects" />,
    );

    expect(container.firstElementChild).toHaveClass("mb-10");
  });
});
