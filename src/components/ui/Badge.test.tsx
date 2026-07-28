import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/Badge";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge>TASK-006</Badge>);

    expect(screen.getByText("TASK-006")).toBeInTheDocument();
  });

  it("forwards className instead of discarding it", () => {
    render(<Badge className="ml-2">TASK-006</Badge>);

    expect(screen.getByText("TASK-006")).toHaveClass("ml-2");
  });

  it("renders visually distinct neutral and accent variants", () => {
    const { rerender } = render(<Badge variant="neutral">Planned</Badge>);
    const neutralClass = screen.getByText("Planned").className;

    rerender(<Badge variant="accent">Planned</Badge>);
    const accentClass = screen.getByText("Planned").className;

    expect(neutralClass).not.toBe(accentClass);
  });

  it("defaults to the neutral variant", () => {
    const { rerender } = render(<Badge>Planned</Badge>);
    const defaultClass = screen.getByText("Planned").className;

    rerender(<Badge variant="neutral">Planned</Badge>);

    expect(screen.getByText("Planned").className).toBe(defaultClass);
  });
});
