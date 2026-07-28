import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders its children", () => {
    render(
      <Card>
        <p>Repository foundation initialized</p>
      </Card>,
    );

    expect(
      screen.getByText("Repository foundation initialized"),
    ).toBeInTheDocument();
  });

  it("forwards className instead of discarding it", () => {
    render(<Card className="mt-4">content</Card>);

    expect(screen.getByText("content")).toHaveClass("mt-4");
  });

  it("keeps its own styling when a className is supplied", () => {
    render(<Card className="mt-4">content</Card>);

    const card = screen.getByText("content");

    expect(card.className.split(" ").length).toBeGreaterThan(1);
  });
});
