# AI Engineering Control Plane

**An AI-Native Software Engineering Platform.**

An auditable control plane that turns a software requirement into planned,
reviewed, tested and traceable code changes — and finally into a Pull Request.

This is not a chatbot. It is a structured engineering workflow in which
specialised agents produce reviewable artifacts, humans approve the important
transitions, and every step is recorded.

---

## Current status

```text
Current status: Repository foundation and product planning.
The real agent execution workflow has not been implemented yet.
```

What exists today:

- A Next.js App Router application with a single placeholder page.
- TypeScript strict mode, ESLint, Tailwind CSS.
- Vitest + React Testing Library with a passing test suite.
- A CI workflow running typecheck, lint, test and build.
- The complete product, architecture and task documentation set.

What does **not** exist yet:

- No database, no Prisma schema, no migrations.
- No agents. Planner, Architect, Coder, Reviewer, Tester, Security and the PR
  Generator are specified in [`AGENTS.md`](./AGENTS.md) but not implemented.
- No LLM provider integration. No API keys are stored or required.
- No GitHub App or GitHub API integration.
- No authentication, no dashboard, no project or task management screens.

Nothing in this repository pretends to be finished. Where a document describes
future behaviour it says so explicitly.

---

## Target problem

Teams that adopt coding agents quickly hit the same wall: the agent produces a
large diff, nobody can explain how it was derived, and there is no record of
what was checked. Review becomes archaeology.

This project takes the opposite position. A requirement is decomposed into
explicit, approvable tasks before any code is written; each agent step emits a
schema-validated artifact; humans gate the transitions that matter; and the
resulting Pull Request carries the full trail.

## Intended workflow

```text
Create Project
→ Connect GitHub Repository
→ Submit Requirement or GitHub Issue
→ Planner Agent analyzes requirement
→ Architect Agent proposes implementation
→ Generate executable Tasks
→ Human approves Tasks
→ Coder Agent modifies code
→ Reviewer Agent reviews changes
→ Tester Agent runs tests
→ Security Agent performs security review
→ Quality Gate
→ Pull Request
```

The MVP implements this flow end to end with **mock providers**, so the
orchestration, approval gates and audit trail can be validated before a single
token is spent on a real model. See [`docs/PRD.md`](./docs/PRD.md).

---

## Tech stack

| Concern           | Choice                                          |
| ----------------- | ----------------------------------------------- |
| Runtime           | Node.js 22                                      |
| Package manager   | pnpm 11                                         |
| Framework         | Next.js 16 (App Router)                         |
| UI                | React 19, Tailwind CSS v4                       |
| Language          | TypeScript 5, `strict` mode, no `any`           |
| Testing           | Vitest, React Testing Library, jsdom            |
| Linting           | ESLint 9 (flat config, `eslint-config-next`)    |
| Persistence       | PostgreSQL + Prisma — **planned, not installed** |
| Agent contracts   | Zod schemas — **planned, not installed**        |

Deliberately absent from the MVP: Redis, BullMQ, LangGraph, MCP, RAG,
Kubernetes, microservices. The reasoning is recorded in
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and
[`docs/DECISIONS.md`](./docs/DECISIONS.md).

---

## Getting started

Requires Node.js 22 and pnpm 11. `corepack enable pnpm` is enough to get the
right pnpm version.

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

### Scripts

| Script               | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `pnpm dev`           | Start the development server                   |
| `pnpm build`         | Production build                               |
| `pnpm start`         | Serve the production build                     |
| `pnpm typecheck`     | `tsc --noEmit`                                 |
| `pnpm lint`          | ESLint over the repository                     |
| `pnpm test`          | Run the test suite once                        |
| `pnpm test:watch`    | Run the test suite in watch mode               |
| `pnpm test:coverage` | Run the test suite with coverage               |
| `pnpm verify`        | typecheck → lint → test → build                |

`pnpm verify` is the gate. Every task must leave it green.

---

## Documentation

| Document                                                            | Contents                                        |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| [`docs/PRD.md`](./docs/PRD.md)                                       | Product vision, users, MVP scope, requirements   |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)                     | Layers, orchestration, providers, boundaries     |
| [`docs/DEVELOPMENT_GUIDELINES.md`](./docs/DEVELOPMENT_GUIDELINES.md) | Git, TypeScript, React, testing, Definition of Done |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md)                               | Sprint 1, Sprint 2, later phases                 |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md)                           | ADR-001 … ADR-007                                |
| [`AGENTS.md`](./AGENTS.md)                                           | Agent responsibilities, I/O contracts, gates     |
| [`CLAUDE.md`](./CLAUDE.md)                                           | Working rules for Claude Code in this repository |
| [`tasks/`](./tasks)                                                  | TASK-001 … TASK-008, each independently verifiable |

---

## Repository layout

```text
.
├── .github/workflows/ci.yml   CI: typecheck, lint, test, build
├── docs/                      Product and architecture documentation
├── src/
│   ├── app/                   Next.js App Router
│   └── test/                  Test setup
├── tasks/                     Executable task specifications
├── AGENTS.md
├── CLAUDE.md
└── vitest.config.ts
```

---

## Contributing

This is a personal portfolio project and is not accepting external
contributions. The conventions it follows are documented in
[`docs/DEVELOPMENT_GUIDELINES.md`](./docs/DEVELOPMENT_GUIDELINES.md) and are
enforced by `pnpm verify` and CI.

## Security

No secrets are stored in this repository. `.env.example` contains placeholders
only; every `.env*` file except `.env.example` is git-ignored. If you find
something that looks like a credential in the history, please open an issue.

## License

[MIT](./LICENSE).

## Portfolio disclaimer

This repository is built as a public portfolio project. It is not a product,
it is not operated as a service, and it carries no availability, support or
fitness guarantees. Features described in the documentation as planned are
planned — not shipped.
