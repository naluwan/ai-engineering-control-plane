import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

import { NavLink } from "@/components/layout/NavLink";

describe("NavLink", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it("marks the link as the current page when the route matches", () => {
    usePathnameMock.mockReturnValue("/projects");

    render(<NavLink href="/projects">Projects</NavLink>);

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark the link when the route does not match", () => {
    usePathnameMock.mockReturnValue("/docs");

    render(<NavLink href="/projects">Projects</NavLink>);

    expect(
      screen.getByRole("link", { name: "Projects" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the link as current for a nested route beneath it", () => {
    usePathnameMock.mockReturnValue("/projects/abc123");

    render(<NavLink href="/projects">Projects</NavLink>);

    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("matches the home route exactly so it is not current on every page", () => {
    usePathnameMock.mockReturnValue("/projects");

    render(<NavLink href="/">Overview</NavLink>);

    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the home route as current on the home page", () => {
    usePathnameMock.mockReturnValue("/");

    render(<NavLink href="/">Overview</NavLink>);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders a real anchor pointing at the href", () => {
    usePathnameMock.mockReturnValue("/");

    render(<NavLink href="/docs">Docs</NavLink>);

    const link = screen.getByRole("link", { name: "Docs" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/docs");
  });

  it("forwards className instead of discarding it", () => {
    usePathnameMock.mockReturnValue("/");

    render(
      <NavLink className="uppercase" href="/docs">
        Docs
      </NavLink>,
    );

    expect(screen.getByRole("link", { name: "Docs" })).toHaveClass("uppercase");
  });
});
