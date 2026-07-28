const PLANNED_WORKFLOW = [
  "Submit a requirement or GitHub issue",
  "Planner Agent analyzes the requirement",
  "Architect Agent proposes an implementation",
  "Generate executable tasks",
  "Human approves the tasks",
  "Coder Agent applies the changes",
  "Reviewer, Tester and Security Agents evaluate the result",
  "Open a Pull Request with a full audit trail",
] as const;

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16 sm:py-24">
      <header className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
          AI-Native Software Engineering Platform
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          AI Engineering Control Plane
        </h1>
        <p className="text-base leading-relaxed text-foreground/80">
          An auditable control plane that turns a software requirement into
          planned, reviewed, tested and traceable code changes, and finally into
          a Pull Request.
        </p>
      </header>

      <section
        aria-labelledby="status-heading"
        className="flex flex-col gap-3 rounded-lg border border-foreground/15 p-6"
      >
        <h2 id="status-heading" className="text-sm font-semibold">
          Repository foundation initialized
        </h2>
        <p className="text-sm leading-relaxed text-foreground/70">
          This page is a placeholder for the product direction. No real agent
          execution, GitHub integration or LLM provider is connected yet. The
          orchestration workflow described below is planned work, not shipped
          behaviour.
        </p>
      </section>

      <section
        aria-labelledby="workflow-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="workflow-heading" className="text-sm font-semibold">
          Planned workflow
        </h2>
        <ol className="flex flex-col gap-2 text-sm text-foreground/70">
          {PLANNED_WORKFLOW.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="w-5 shrink-0 font-mono text-foreground/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

    </div>
  );
}
