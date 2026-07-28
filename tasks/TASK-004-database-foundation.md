# TASK-004：Database Foundation

**Status:** Not started.
**Depends on:** TASK-001 (project and verification toolchain must exist).

Does **not** depend on TASK-002 or TASK-003. This task adds no UI and must not
assume the application shell exists.

## Context

ADR-007 deferred PostgreSQL and Prisma out of the repository bootstrap so that
the bootstrap commit stayed small and independently verifiable. That deferral
ends here.

`docs/ARCHITECTURE.md` §5 specifies the target data model. This task installs
the persistence layer and implements the part of that model needed by the
Sprint 1 slice — projects, requirements, plans and tasks — together with the
repository interfaces the application layer will depend on.

The entities for agent runs, approvals, quality gates and pull request drafts
belong to Sprint 2 and are deliberately not modelled here.

## Goal

PostgreSQL and Prisma installed, the Sprint 1 schema migrated, repository
interfaces defined in the application layer with Prisma implementations in
infrastructure, and integration tests running against a real test database in
CI.

## Scope

- Install `prisma` and `@prisma/client`.
- `prisma/schema.prisma` covering:
  - `Project` — id, name, description, repositoryUrl, stackSummary, timestamps.
  - `Requirement` — id, projectId, sourceType (`MANUAL` / `GITHUB_ISSUE`),
    rawText, status, timestamps.
  - `Plan` — id, requirementId, schemaVersion, content (JSON), timestamps.
  - `Task` — id, planId, title, description, scope, outOfScope, expectedFiles,
    acceptanceCriteria, testRequirements, dependsOn, estimatedComplexity,
    status, ordering, timestamps.
- The initial migration.
- A Prisma client singleton safe under Next.js development hot reload.
- Repository **interfaces** in the application layer:
  `ProjectRepository`, `RequirementRepository`, `PlanRepository`,
  `TaskRepository`.
- Prisma implementations of those interfaces in the infrastructure layer.
- Domain types for the four entities, defined in the domain layer and free of
  Prisma imports.
- Environment configuration validated at startup, with `DATABASE_URL` required.
- `.env.example` updated with a `DATABASE_URL` placeholder.
- `docker-compose.yml` providing a local PostgreSQL instance for development
  and testing.
- Integration tests for each repository implementation against a real test
  database.
- CI updated with a PostgreSQL service container and a migration step.
- `README.md` updated with database setup instructions.

## Out of Scope

- Any UI. No page, no component, no route.
- Any route handler or API endpoint. That is TASK-005.
- Agent entities: `AgentRun`, `AgentInvocation`, `Approval`,
  `QualityGateResult`, `PullRequestDraft`. Those belong to Sprint 2.
- Agent schemas, providers or orchestration. `Plan.content` is stored as JSON
  and is validated in TASK-007, not here.
- Seed data beyond what integration tests create and clean up.
- Authentication, users, ownership, multi-tenancy.
- Redis, caching, connection pooling beyond Prisma's default.
- A hosted or cloud database. Local Docker only.
- Database backup, replication or performance tuning.

## Acceptance Criteria

1. `prisma` and `@prisma/client` are in `package.json`, and no other new
   dependency was added.
2. `prisma/schema.prisma` defines exactly the four entities listed in Scope,
   with the stated relations and cascade behaviour.
3. `pnpm prisma migrate dev` produces a migration that applies cleanly to an
   empty database.
4. `pnpm prisma migrate deploy` applies cleanly to an empty database — proving
   the migration is not dependent on development state.
5. `docker compose up -d` starts a PostgreSQL instance the application can
   connect to.
6. `.env.example` contains a `DATABASE_URL` placeholder and no real credential.
7. Startup fails with a clear error when `DATABASE_URL` is absent or malformed.
8. Each of the four repository interfaces is declared in the application layer
   and contains no Prisma type in any signature.
9. Each interface has a Prisma implementation in the infrastructure layer.
10. Domain types contain no import from `@prisma/client`.
11. Integration tests cover create, read, update and delete for each repository,
    run against a real test database, and clean up after themselves.
12. Tests are isolated: running the suite twice in a row produces the same
    result.
13. CI provisions PostgreSQL, applies migrations, and runs the full suite.
14. The Prisma client singleton does not leak connections under `pnpm dev` hot
    reload.
15. `pnpm verify` exits 0.
16. No secret appears in any tracked file.

## Technical Requirements

- PostgreSQL 16 or later.
- Prisma with the `postgresql` provider.
- `cuid()` identifiers.
- Enums for `RequirementSourceType`, `RequirementStatus` and `TaskStatus`.
- `Plan.content` typed as `Json`; the Zod schema that validates it arrives in
  TASK-007.
- `Task.dependsOn` stores task identifiers; cycles are rejected in the domain
  layer, not by the database.
- Cascade delete from `Project` down through `Requirement`, `Plan` and `Task`.
- Repository interfaces live in `src/application/ports/`; implementations live
  in `src/infrastructure/persistence/`.
- Domain types live in `src/domain/` and import nothing from infrastructure.
- Environment validation uses Zod at startup — the first use of Zod in the
  project, which is why `zod` is added here.
- Integration tests use a separate `DATABASE_URL` and a transaction or truncate
  strategy for isolation.
- `postinstall` runs `prisma generate`.
- `pnpm build` must not require a live database connection.

## Expected Files

```text
docker-compose.yml                                        created
prisma/schema.prisma                                      created
prisma/migrations/<timestamp>_init/migration.sql          created
src/domain/project.ts                                     created
src/domain/requirement.ts                                 created
src/domain/plan.ts                                        created
src/domain/task.ts                                        created
src/application/ports/project-repository.ts               created
src/application/ports/requirement-repository.ts           created
src/application/ports/plan-repository.ts                  created
src/application/ports/task-repository.ts                  created
src/infrastructure/persistence/prisma-client.ts           created
src/infrastructure/persistence/prisma-project-repository.ts      created
src/infrastructure/persistence/prisma-requirement-repository.ts  created
src/infrastructure/persistence/prisma-plan-repository.ts         created
src/infrastructure/persistence/prisma-task-repository.ts         created
src/infrastructure/config/env.ts                          created
src/test/database.ts                                      created
src/infrastructure/persistence/*.integration.test.ts      created
.env.example                                              modified
.github/workflows/ci.yml                                  modified
README.md                                                 modified
package.json                                              modified
vitest.config.ts                                          modified if integration tests need a separate project
```

## Do Not Touch

```text
src/app/**
src/components/**
docs/**            except a documented schema correction
tasks/**
CLAUDE.md
AGENTS.md
LICENSE
```

## Test Requirements

- Integration tests, not mocked-Prisma unit tests. Mocking the database proves
  nothing about the schema.
- Each repository: create, read by id, list, update, delete.
- Cascade delete behaviour is asserted explicitly.
- Unique and required constraints are asserted by attempting a violation.
- Environment validation is unit-tested for missing and malformed input.
- Every test cleans up; the suite is order-independent and repeatable.
- No skipped tests. If CI cannot provision PostgreSQL, fix CI — do not skip.

## Verification Commands

```bash
docker compose up -d
pnpm prisma migrate deploy
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
```

## Required Output

Report using the format in `CLAUDE.md` §9, plus:

- The final schema, entity by entity.
- The migration file name and confirmation it applies to an empty database.
- Confirmation that no Prisma type appears in an application or domain
  signature.
- The test isolation strategy used.
- Confirmation that `pnpm build` succeeds without a database connection.

## Claude Code Execution Prompt

```text
Execute TASK-004 as specified in tasks/TASK-004-database-foundation.md.

First read CLAUDE.md, docs/ARCHITECTURE.md (especially §2 layers, §5 data
model), docs/DECISIONS.md ADR-007, and docs/DEVELOPMENT_GUIDELINES.md.

Install prisma, @prisma/client and zod. Create the Prisma schema for exactly
four entities — Project, Requirement, Plan, Task — with the fields, enums,
relations and cascade behaviour listed in the task. Generate the initial
migration. Add docker-compose.yml with PostgreSQL 16.

Define repository interfaces in src/application/ports/ and Prisma
implementations in src/infrastructure/persistence/. Define domain types in
src/domain/. No Prisma type may appear in an application or domain signature,
and no domain file may import @prisma/client.

Add Zod-validated environment configuration requiring DATABASE_URL, and add a
DATABASE_URL placeholder to .env.example. Never write a real credential.

Write integration tests against a real test database — do not mock Prisma.
Cover CRUD for each repository, cascade deletes, and constraint violations.
Make the suite isolated and repeatable. Update CI with a PostgreSQL service
container and a migration step.

Do not model AgentRun, AgentInvocation, Approval, QualityGateResult or
PullRequestDraft — those are Sprint 2. Do not add any UI or route handler. Do
not touch src/app/ or src/components/.

pnpm build must succeed without a live database.

Run pnpm verify. Report in the format required by CLAUDE.md §9.
```
