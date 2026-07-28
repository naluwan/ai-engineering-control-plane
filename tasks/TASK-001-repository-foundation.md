# TASK-001：Repository Foundation

**Status:** Completed by the repository bootstrap.
**Depends on:** none.

## Context

`ai-engineering-control-plane` is a public portfolio project: an AI-Native
Software Engineering Platform that turns a requirement into planned, reviewed,
tested and traceable code changes, and finally into a Pull Request.

Before any product feature exists, the repository needs a foundation that can
be trusted: a toolchain where `pnpm verify` is a meaningful signal, and CI that
runs the same commands. Every later task's Definition of Done depends on this
being correct.

This task is the bootstrap. It is documented here after the fact so that the
task series is complete and TASK-002 has something to validate against.

## Goal

A public GitHub repository containing a Next.js App Router application with
TypeScript strict mode, Tailwind CSS, ESLint, a working Vitest test suite and a
CI workflow — where `pnpm verify` passes from a clean checkout.

## Scope

- Create the public GitHub repository with `main` as the default branch.
- Initialise a Next.js App Router project using `pnpm`, with `src/`, TypeScript,
  Tailwind CSS, ESLint and the `@/*` import alias.
- Install and configure Vitest, React Testing Library, `@testing-library/jest-dom`,
  jsdom and a Vitest coverage provider.
- Add the `typecheck`, `lint`, `test`, `test:watch`, `test:coverage`, `build` and
  `verify` scripts.
- Build a static placeholder home page stating the product positioning and the
  current implementation status.
- Write one test file covering the home page's main heading.
- Write the documentation set: `README.md`, `CLAUDE.md`, `AGENTS.md`,
  `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_GUIDELINES.md`,
  `docs/ROADMAP.md`, `docs/DECISIONS.md`.
- Write `tasks/TASK-001` … `tasks/TASK-008`.
- Add the CI workflow.
- Add `.gitignore`, `.editorconfig`, `.nvmrc`, `.env.example` and `LICENSE`.
- Produce a single commit and push it to `main`.

## Out of Scope

- Any product feature: projects, requirements, tasks, agent runs, dashboards.
- Database, Prisma, PostgreSQL, migrations. See ADR-007 and TASK-004.
- Any real LLM provider, API key, or LLM SDK.
- Any GitHub API integration or GitHub SDK.
- Authentication, authorisation, users.
- Redis, BullMQ, LangGraph, MCP, RAG.
- Playwright and E2E tests. Introduced with the first complete user journey.
- Deployment, hosting, or infrastructure configuration.
- State management libraries (TanStack Query, Zustand). Added when a task needs
  them.
- More than one commit.

## Acceptance Criteria

1. The GitHub repository `ai-engineering-control-plane` exists, is public, and
   its default branch is `main`.
2. `pnpm install` succeeds from a clean checkout with no manual steps.
3. `pnpm typecheck` exits 0.
4. `pnpm lint` exits 0 with no warnings.
5. `pnpm test` exits 0, with at least one test asserting the home page renders
   the heading `AI Engineering Control Plane`, and no skipped tests.
6. `pnpm build` exits 0.
7. `pnpm verify` exits 0.
8. `tsconfig.json` has `"strict": true`, and no source file contains `any`.
9. The home page renders: `AI Engineering Control Plane`,
   `AI-Native Software Engineering Platform`, a one-line positioning statement,
   `Repository foundation initialized`, and a statement that no real agent,
   GitHub or LLM integration is connected.
10. All eight documents listed in **Expected Files** exist and agree with each
    other on stack, scope and status.
11. `tasks/` contains TASK-001 … TASK-008, each using the standard section
    structure.
12. `.github/workflows/ci.yml` runs typecheck, lint, test and build on push and
    pull request against `main`.
13. `package.json` contains no dependency that shipped code does not import.
14. `git grep` for `API_KEY`, `SECRET`, `TOKEN`, `PASSWORD` and `PRIVATE_KEY`
    returns only documentation prose and `.env.example` placeholders.
15. Exactly one commit exists, and it is pushed to `origin/main`.

## Technical Requirements

- Package manager: `pnpm`. No `npm`, no `yarn`, no `package-lock.json`, no
  `yarn.lock`.
- Node.js 22; `.nvmrc` pins the major version; `package.json` declares
  `packageManager` and `engines.node`.
- TypeScript strict mode. `any` is prohibited.
- Next.js App Router with `src/` and the `@/*` import alias.
- No custom Turbopack configuration.
- Vitest with the jsdom environment, a setup file importing
  `@testing-library/jest-dom/vitest`, and `cleanup` in `afterEach`.
- ESLint flat config from `create-next-app`, unmodified.
- `.env.example` contains placeholders only. Every `.env*` except `.env.example`
  is git-ignored.
- MIT licence.

## Expected Files

```text
.editorconfig
.env.example
.github/workflows/ci.yml
.gitignore
.nvmrc
AGENTS.md
CLAUDE.md
LICENSE
README.md
docs/ARCHITECTURE.md
docs/DECISIONS.md
docs/DEVELOPMENT_GUIDELINES.md
docs/PRD.md
docs/ROADMAP.md
eslint.config.mjs
next.config.ts
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
postcss.config.mjs
src/app/globals.css
src/app/layout.tsx
src/app/page.test.tsx
src/app/page.tsx
src/test/setup.ts
tasks/TASK-001-repository-foundation.md
tasks/TASK-002-documentation-baseline.md
tasks/TASK-003-application-shell.md
tasks/TASK-004-database-foundation.md
tasks/TASK-005-projects-api.md
tasks/TASK-006-projects-ui.md
tasks/TASK-007-mock-planner-contracts.md
tasks/TASK-008-requirement-planning-flow.md
tsconfig.json
vitest.config.ts
```

## Do Not Touch

- Any directory outside the repository root.
- Any other project on the machine.
- Global git, pnpm or Node configuration.
- An existing remote repository's contents, if one is found.

## Test Requirements

- One test file, `src/app/page.test.tsx`.
- At least one test asserting the level-1 heading
  `AI Engineering Control Plane` is rendered.
- Queries use roles and accessible names, not CSS selectors or test IDs.
- No skipped tests.

## Verification Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
git diff --check
git status --short
```

## Required Output

Report using the format in `CLAUDE.md` §9, plus:

- Repository URL, visibility and default branch.
- Commit hash and message.
- Whether the push succeeded.
- Whether CI is configured and its status, if available.

## Claude Code Execution Prompt

```text
Bootstrap the ai-engineering-control-plane repository per tasks/TASK-001-repository-foundation.md.

Before starting, confirm the working directory is empty or contains only this
task file, and confirm that no GitHub repository of this name already has
content. If either check fails, stop and report — do not delete or overwrite
anything.

Then:
1. Create the public GitHub repository with main as the default branch.
2. Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint, src/, @/* alias)
   using pnpm.
3. Add Vitest, React Testing Library, @testing-library/jest-dom, jsdom and a
   coverage provider. Create vitest.config.ts and src/test/setup.ts.
4. Add the typecheck, lint, test, test:watch, test:coverage, build and verify
   scripts.
5. Replace the home page with the static placeholder described in Acceptance
   Criteria 9, and write src/app/page.test.tsx.
6. Write the eight documents and the eight task files listed in Expected Files.
7. Add .github/workflows/ci.yml, .gitignore, .editorconfig, .nvmrc,
   .env.example and an MIT LICENSE.
8. Run pnpm verify. If anything fails, fix the root cause. Do not disable a
   lint rule, skip a test, or relax TypeScript to get green.
9. Scan for secrets, then create exactly one commit and push to main.

Constraints: pnpm only; TypeScript strict; no any; no unused dependencies; no
Redis, BullMQ, LangGraph, MCP, Prisma, PostgreSQL, LLM SDK or GitHub SDK; no
force push; exactly one commit.

Report in the format required by CLAUDE.md §9.
```
