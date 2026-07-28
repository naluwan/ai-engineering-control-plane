# TASK-002：Documentation Baseline Validation

**Status:** Not started.
**Depends on:** TASK-001 (repository foundation and the initial documentation
set must exist).

## Context

TASK-001 produced the documentation set in a single pass: `README.md`,
`CLAUDE.md`, `AGENTS.md` and five documents under `docs/`, plus eight task
files. Documents written in one pass drift: a stack version stated one way in
the README and another in the architecture document, an ADR whose decision is
contradicted by a roadmap entry, a task that claims a dependency the roadmap
does not list.

Every later task treats these documents as the source of truth. If they
disagree with each other, agents and humans will make different decisions
depending on which document they happened to read.

This task validates and repairs consistency. It is a documentation task. It
changes no engineering.

## Goal

Every document in the repository agrees with every other document and with the
code, and any contradiction found is either fixed or explicitly recorded.

## Scope

- Cross-check all documents for factual consistency:
  - Product name, category and positioning statement.
  - Stack, versions, package manager, Node version.
  - MVP scope and non-MVP scope.
  - Agent names, gate names and gate positions.
  - Task numbering, titles, dependencies and ordering.
  - Verification commands and Definition of Done.
- Verify every internal Markdown link resolves to a file that exists.
- Verify every stated status is honest: no document claims implemented
  behaviour that does not exist in the code.
- Verify each ADR-001 … ADR-007 has Status, Context, Decision, Consequences and
  Alternatives considered.
- Verify each task file uses the standard section structure.
- Verify `docs/ROADMAP.md` task dependencies match the `Depends on` line in each
  task file.
- Verify `package.json` scripts match the commands documented in `README.md`,
  `CLAUDE.md` and `docs/DEVELOPMENT_GUIDELINES.md`.
- Verify the tech stack table in `README.md` matches the installed versions in
  `package.json`.
- Fix every inconsistency found.
- Record findings that need a human decision rather than resolving them by
  guessing.

## Out of Scope

- Any change to application source code under `src/`.
- Any change to `package.json` dependencies, `vitest.config.ts`,
  `eslint.config.mjs`, `next.config.ts` or `tsconfig.json`.
- Adding new documents beyond a consistency report.
- Rewriting a document's structure or tone for preference. Fix contradictions,
  not style.
- Adding new ADRs. A newly *made* decision is out of scope; only recording
  decisions already implicit in the existing documents is in scope.
- Changing product scope, architecture or the roadmap. Report a disagreement;
  do not resolve it unilaterally.
- CI, dependencies, tests, deployment.

## Acceptance Criteria

1. A consistency check has been run over all documents in `README.md`,
   `CLAUDE.md`, `AGENTS.md`, `docs/` and `tasks/`.
2. Every internal Markdown link in those files resolves to an existing file or
   heading.
3. The product name and category are identical everywhere they appear.
4. The stack table in `README.md` matches `package.json` exactly for Next.js,
   React, TypeScript, Tailwind, Vitest, Node and pnpm.
5. The verification command list is identical in `README.md`, `CLAUDE.md`,
   `docs/DEVELOPMENT_GUIDELINES.md` and every task file's Verification Commands
   section, and matches `package.json` scripts.
6. Agent names in `AGENTS.md`, `README.md`, `docs/PRD.md` and
   `docs/ARCHITECTURE.md` are identical.
7. Gate identifiers G1, G2 and G3 have the same position and meaning in
   `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PRD.md` and ADR-006.
8. Task numbering, titles and dependencies are identical in `docs/ROADMAP.md`
   and in the task files themselves.
9. Every ADR contains all five required sections.
10. No document states that an unimplemented feature is implemented.
11. Every task file contains all twelve required `##` sections: Context, Goal,
    Scope, Out of Scope, Acceptance Criteria, Technical Requirements, Expected
    Files, Do Not Touch, Test Requirements, Verification Commands, Required
    Output, Claude Code Execution Prompt.
12. `pnpm verify` still exits 0 — proving no engineering was changed.
13. `git diff --stat` shows changes only to `.md` files.
14. A findings list is produced covering: inconsistencies fixed, and
    inconsistencies deliberately left with the reason.

## Technical Requirements

- Markdown only. No source file, config file or dependency is modified.
- Link checking may be done with a shell command; if it requires a tool, use one
  already available or a one-off script that is not committed.
- Where two documents disagree and neither is obviously correct, the more
  specific document wins: `AGENTS.md` for agent contracts,
  `docs/ARCHITECTURE.md` for design, `docs/PRD.md` for scope,
  `docs/DECISIONS.md` for decisions. Record every application of this rule.
- Corrections are minimal edits. Do not rewrite a section to fix a sentence.

## Expected Files

Modified as needed:

```text
README.md
CLAUDE.md
AGENTS.md
docs/ARCHITECTURE.md
docs/DECISIONS.md
docs/DEVELOPMENT_GUIDELINES.md
docs/PRD.md
docs/ROADMAP.md
tasks/TASK-001-repository-foundation.md
tasks/TASK-002-documentation-baseline.md
tasks/TASK-003-application-shell.md
tasks/TASK-004-database-foundation.md
tasks/TASK-005-projects-api.md
tasks/TASK-006-projects-ui.md
tasks/TASK-007-mock-planner-contracts.md
tasks/TASK-008-requirement-planning-flow.md
```

## Do Not Touch

```text
src/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.json
eslint.config.mjs
next.config.ts
postcss.config.mjs
vitest.config.ts
.github/**
LICENSE
```

## Test Requirements

No new tests. This task adds no behaviour.

`pnpm test` must still pass unchanged, which is the evidence that no
engineering was touched.

## Verification Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
git diff --stat
```

`git diff --stat` must list only `.md` files.

## Required Output

Report using the format in `CLAUDE.md` §9, plus a findings table:

| Finding | Documents involved | Resolution |
| ------- | ------------------ | ---------- |

And a list of contradictions deliberately left unresolved, each with the reason
and the decision a human needs to make.

## Claude Code Execution Prompt

```text
Execute TASK-002 as specified in tasks/TASK-002-documentation-baseline.md.

Read README.md, CLAUDE.md, AGENTS.md, every file in docs/, and every file in
tasks/. Cross-check them for factual consistency: product name and category,
stack and versions, MVP and non-MVP scope, agent names, gate identifiers and
positions, task numbering and dependencies, and the verification command list.
Also verify that every internal Markdown link resolves, that every ADR has all
five required sections, that every task file has all twelve required ##
sections, and that no document claims an unimplemented feature works.

Fix every inconsistency with a minimal edit. Where two documents disagree and
neither is obviously right, prefer the more specific document (AGENTS.md for
agent contracts, ARCHITECTURE.md for design, PRD.md for scope, DECISIONS.md for
decisions) and record that you applied this rule.

Do not modify anything under src/, any config file, package.json, or .github/.
This task changes documentation only.

Then run pnpm verify and git diff --stat. The diff must contain only .md files.

Report in the format required by CLAUDE.md §9, plus a findings table and a list
of contradictions you deliberately left for a human to decide.
```
