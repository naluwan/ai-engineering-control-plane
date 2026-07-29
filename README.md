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
| Testing           | Vitest 4, React Testing Library, jsdom          |
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

### Database setup

Requires Docker with Compose v2. The stack runs one PostgreSQL 16 container
holding two databases: `acp_dev` for the application and `acp_test` for the
integration suite.

> **Local-development-only credentials.** `docker-compose.yml` contains fixed,
> well-known credentials for a container bound to `127.0.0.1`. They are not a
> production secret, must not be reused anywhere else, and must not be copied
> into `.env.example`. Never commit a real credential.

Start the database and wait for it to report healthy:

```bash
docker compose up -d
docker compose ps
```

Point your shell at it. `.env.local` is git-ignored; `.env.example` documents
the shape and holds placeholders only.

```bash
export DATABASE_URL="postgresql://acp:acp_local_dev_only@127.0.0.1:5432/acp_dev"
export TEST_DATABASE_URL="postgresql://acp:acp_local_dev_only@127.0.0.1:5432/acp_test"
```

`TEST_DATABASE_URL` is a **destructive target**: the integration suite deletes
every `Project`, `Requirement` and `Plan` row from it. It must be a different
database from `DATABASE_URL` — test setup refuses to run when the two are
equal.

Apply the schema. Use `migrate dev` while developing, when you have changed
`prisma/schema.prisma` and want a new migration generated:

```bash
pnpm prisma migrate dev
```

Use `migrate deploy` to apply existing migrations without generating any — this
is what CI runs, and how the test database is prepared:

```bash
pnpm prisma migrate deploy                                    # application database
DATABASE_URL="$TEST_DATABASE_URL" pnpm prisma migrate deploy  # test database
```

Run the suites. `pnpm test` runs both the unit/component tests and the
repository integration tests against the real test database:

```bash
pnpm test
pnpm verify
```

Stop the database when you are done. `stop` keeps the data volume; `down -v`
deletes it:

```bash
docker compose stop
```

`pnpm build` does **not** need a live database connection. It requires
`DATABASE_URL` to be well-formed, but never opens a connection, so a build
succeeds with the database stopped.

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
| [`docs/DECISIONS.md`](./docs/DECISIONS.md)                           | ADR-001 … ADR-008                                |
| [`AGENTS.md`](./AGENTS.md)                                           | **Product** agent contracts — Planner, Architect, Coder, Reviewer, Tester, Security, PR Generator: their I/O, prohibitions and gates |
| [`CLAUDE.md`](./CLAUDE.md)                                           | Working rules for Claude Code in this repository |
| [`tasks/`](./tasks)                                                  | TASK-001 … TASK-008, each independently verifiable |

### AI governance

How the humans and AI roles that *build* this repository collaborate. This is a
separate subject from [`AGENTS.md`](./AGENTS.md), which specifies the agents the
product itself will run.

| Document                                                            | Contents                                        |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| [`docs/AI_CHARTER.md`](./docs/AI_CHARTER.md)                         | AI collaboration authority hierarchy and governing principles |
| [`docs/AI_AGENT_ROLES.md`](./docs/AI_AGENT_ROLES.md)                 | **Development collaboration roles** — responsibilities, authority and restrictions for Work, Claude Code, Codex CLI and ChatGPT |
| [`docs/AI_WORKFLOW.md`](./docs/AI_WORKFLOW.md)                       | The end-to-end collaboration pipeline, its phase gates and phase results |
| [`docs/CODEX_REVIEW_GUIDE.md`](./docs/CODEX_REVIEW_GUIDE.md)         | Review checklist and severity classification for Codex CLI |
| [`docs/WORK_GUIDE.md`](./docs/WORK_GUIDE.md)                         | Standard operating procedure for Work, the only role that performs Git writes |

---

## Repository layout

```text
.
├── .github/workflows/ci.yml   CI: typecheck, lint, test, build
├── docs/                      Product, architecture and AI governance documentation
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
