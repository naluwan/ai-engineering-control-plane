import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

/**
 * Authoritative base for every documentation link on this page. Owner,
 * repository name and branch are fixed: they are never derived from the
 * current branch, the environment, or anything else at runtime.
 */
export const DOCUMENTATION_BASE_URL =
  "https://github.com/naluwan/ai-engineering-control-plane/blob/main";

const DOCUMENTS = [
  {
    path: "README.md",
    summary: "Product overview, current status, stack and getting started.",
  },
  {
    path: "docs/PRD.md",
    summary:
      "Vision, users, problems, MVP scope, functional and non-functional requirements.",
  },
  {
    path: "docs/ARCHITECTURE.md",
    summary:
      "Layers, orchestration, provider abstraction, observability and the security boundary.",
  },
  {
    path: "docs/ROADMAP.md",
    summary: "Sprint 1, Sprint 2 and the later phases, with their triggers.",
  },
  {
    path: "docs/DECISIONS.md",
    summary: "ADR-001 to ADR-007, each with context, decision and alternatives.",
  },
  {
    path: "docs/DEVELOPMENT_GUIDELINES.md",
    summary:
      "Git, TypeScript, React, testing conventions and the Definition of Done.",
  },
  {
    path: "AGENTS.md",
    summary:
      "Agent contracts: inputs, outputs, prohibitions, approval gates and the Quality Gate.",
  },
] as const;

export default function DocsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12 sm:py-16">
      <PageHeader
        eyebrow="Reference"
        title="Documentation"
        description="These links open the source files on GitHub. This page is an index, not a rendered documentation viewer."
      />

      <ul className="flex flex-col gap-3">
        {DOCUMENTS.map((document) => (
          <li key={document.path}>
            <Card className="flex flex-col gap-1.5">
              <a
                href={`${DOCUMENTATION_BASE_URL}/${document.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                {document.path}
              </a>
              <p className="text-sm leading-relaxed text-foreground/70">
                {document.summary}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
