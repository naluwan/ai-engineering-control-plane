import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders a native button carrying its label as the accessible name", () => {
    render(<Button>Try again</Button>);

    const button = screen.getByRole("button", { name: "Try again" });

    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Retry</Button>);

    expect(screen.getByRole("button", { name: "Retry" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("allows the caller to override the type", () => {
    render(<Button type="submit">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("forwards className instead of discarding it", () => {
    render(<Button className="mt-8">Retry</Button>);

    expect(screen.getByRole("button", { name: "Retry" })).toHaveClass("mt-8");
  });

  it("renders visually distinct primary and secondary variants", () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    const primaryClass = screen.getByRole("button", { name: "Go" }).className;

    rerender(<Button variant="secondary">Go</Button>);
    const secondaryClass = screen.getByRole("button", { name: "Go" }).className;

    expect(primaryClass).not.toBe(secondaryClass);
  });

  it("stays keyboard focusable when enabled and exposes the disabled state", () => {
    const { rerender } = render(<Button>Retry</Button>);
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();

    rerender(<Button disabled>Retry</Button>);
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
  });
});
