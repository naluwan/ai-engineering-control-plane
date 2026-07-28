import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

import { SiteHeader } from "@/components/layout/SiteHeader";

describe("SiteHeader", () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue("/");
  });

  it("exposes a banner landmark", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("exposes a labelled navigation landmark", () => {
    render(<SiteHeader />);

    expect(
      screen.getByRole("navigation", { name: "Main" }),
    ).toBeInTheDocument();
  });

  it("links to every shell route", () => {
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Main" });

    expect(within(nav).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(
      within(nav).getByRole("link", { name: "Documentation" }),
    ).toHaveAttribute("href", "/docs");
  });

  it("marks exactly one navigation link as the current page", () => {
    usePathnameMock.mockReturnValue("/docs");

    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("Documentation");
  });
});
