import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DocsPage, { DOCUMENTATION_BASE_URL } from "@/app/docs/page";

/**
 * The authoritative base URL and the seven documentation links, exactly as
 * specified by the TASK-003 URL clarification. These literals are deliberately
 * written out in full rather than composed, so that a wrong owner, repository
 * name or branch fails the test instead of being silently mirrored.
 */
const EXPECTED_BASE_URL =
  "https://github.com/naluwan/ai-engineering-control-plane/blob/main";

const EXPECTED_LINKS = [
  {
    name: "README.md",
    href: "https://github.com/naluwan/ai-engineering-control-plane/blob/main/README.md",
  },
  {
    name: "docs/PRD.md",
    href: "https://github.com/naluwan/ai-engineering-control-plane/blob/main/docs/PRD.md",
  },
  {
    name: "docs/ARCHITECTURE.md",
    href: "https://github.com/naluwan/ai-engineering-control-plane/blob/main/docs/ARCHITECTURE.md",
  },
  {
    name: "docs/ROADMAP.md",
    href: "https://github.com/naluwan/ai-engineering-control-plane/blob/main/docs/ROADMAP.md",
  },
  {
    name: "docs/DECISIONS.md",
    href: "https://github.com/naluwan/ai-engineering-control-plane/blob/main/docs/DECISIONS.md",
  },
  {
    name: "docs/DEVELOPMENT_GUIDELINES.md",
    href: "https://github.com/naluwan/ai-engineering-control-plane/blob/main/docs/DEVELOPMENT_GUIDELINES.md",
  },
  {
    name: "AGENTS.md",
    href: "https://github.com/naluwan/ai-engineering-control-plane/blob/main/AGENTS.md",
  },
] as const;

function getDocumentationLinks(): HTMLElement[] {
  return screen
    .getAllByRole("link")
    .filter((link) =>
      link.getAttribute("href")?.startsWith("https://github.com/"),
    );
}

describe("Docs page", () => {
  it("renders the section title as the level-1 heading", () => {
    render(<DocsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Documentation" }),
    ).toBeInTheDocument();
  });

  it("exports the authoritative base URL as a single constant", () => {
    expect(DOCUMENTATION_BASE_URL).toBe(EXPECTED_BASE_URL);
  });

  it.each(EXPECTED_LINKS)("links $name to $href", ({ name, href }) => {
    render(<DocsPage />);

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  it("renders the seven documents in the specified order", () => {
    render(<DocsPage />);

    expect(getDocumentationLinks().map((link) => link.getAttribute("href"))).toEqual(
      EXPECTED_LINKS.map((link) => link.href),
    );
  });

  it("renders exactly seven documentation links", () => {
    render(<DocsPage />);

    expect(getDocumentationLinks()).toHaveLength(7);
  });

  it("points every link at the naluwan/ai-engineering-control-plane repository", () => {
    render(<DocsPage />);

    for (const link of getDocumentationLinks()) {
      expect(link.getAttribute("href")).toMatch(
        /^https:\/\/github\.com\/naluwan\/ai-engineering-control-plane\//,
      );
    }
  });

  it("points every link at the main branch, never a feature branch", () => {
    render(<DocsPage />);

    for (const link of getDocumentationLinks()) {
      expect(link.getAttribute("href")).toContain("/blob/main/");
    }
  });

  it("opens documentation on GitHub safely in a new tab", () => {
    render(<DocsPage />);

    for (const link of getDocumentationLinks()) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("is an index of external links, not a rendered documentation viewer", () => {
    render(<DocsPage />);

    for (const link of getDocumentationLinks()) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\/github\.com\//);
    }
  });
});
