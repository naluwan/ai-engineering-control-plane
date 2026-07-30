# TASK-005：Projects API

**Status:** Completed.
**Depends on:** TASK-004 (Prisma schema, `ProjectRepository` interface and its
Prisma implementation must exist).

Does **not** depend on TASK-003 or TASK-006. This task adds no UI.

## Context

TASK-004 established persistence and the repository interfaces. Nothing yet
uses them.

This task builds the first application-layer use cases and exposes them over
HTTP. It sets the pattern every later API follows: input validated with Zod at
the boundary, a use case returning a discriminated result rather than throwing
for expected failures, route handlers that never touch Prisma, and errors that
never leak internals to the client.

Getting this pattern right matters more than the endpoints themselves — TASK-008
and all of Sprint 2 will copy it.

## Goal

Create, list and get-by-id use cases for projects in the application layer,
exposed through validated route handlers, with the error taxonomy and response
shape established for the rest of the project.

## Scope

- Zod schemas for project input and output.
- Application use cases:
  - `createProject`
  - `listProjects`
  - `getProjectById`
- Route handlers:
  - `POST /api/projects` — create
  - `GET /api/projects` — list with pagination
  - `GET /api/projects/[id]` — get by id
- A shared result type distinguishing success from expected failure.
- An application error taxonomy: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`,
  `INTERNAL_ERROR`.
- A consistent JSON error response shape with correct HTTP status codes.
- Structured logging on each request with a correlation identifier.
- Unit tests for the use cases against an in-memory repository.
- Integration tests for the route handlers against a real test database.

## Out of Scope

- Any UI, page or component. That is TASK-006.
- Update and delete endpoints. Not needed by the Sprint 1 slice.
- Requirements, plans, tasks or agent endpoints. TASK-008 and Sprint 2.
- Authentication, authorisation, ownership or rate limiting.
- Real GitHub repository validation. `repositoryUrl` is validated as a URL
  string; it is not fetched or checked for existence.
- Caching, revalidation strategy or `NEXT_PUBLIC_*` configuration.
- OpenAPI or generated API documentation.
- TanStack Query or any client-side data layer. That belongs to TASK-006 and
  only if TASK-006 needs it.
- Changes to the Prisma schema. If a field is missing, report it rather than
  migrating.

## Acceptance Criteria

1. `POST /api/projects` with a valid body returns `201` and the created project.
2. `POST /api/projects` with an invalid body returns `400` with a
   `VALIDATION_ERROR` payload listing the offending fields.
3. `POST /api/projects` never returns a Prisma error message or stack trace to
   the client.
4. `GET /api/projects` returns `200` with a paginated list and a total count.
5. `GET /api/projects` accepts `page` and `pageSize` query parameters, validates
   them, and rejects out-of-range values with `400`.
6. `GET /api/projects/[id]` returns `200` for an existing project.
7. `GET /api/projects/[id]` returns `404` with a `NOT_FOUND` payload for an
   unknown id, and does not distinguish "never existed" from "deleted".
8. Every error response uses the same JSON shape.
9. No route handler imports Prisma, `@prisma/client`, or anything from
   `src/infrastructure/persistence/`.
10. Every use case depends on the `ProjectRepository` interface, never on a
    concrete implementation.
11. Use cases return a discriminated result; they do not throw for expected
    failures.
12. Unit tests cover each use case's success and failure paths using an
    in-memory repository.
13. Integration tests exercise each route handler end to end against a real test
    database.
14. Every request logs a structured entry containing a correlation identifier,
    and no log line contains a secret.
15. `pnpm verify` exits 0.
16. No new runtime dependency beyond what TASK-004 installed.

## Technical Requirements

- Route handlers live under `src/app/api/projects/`.
- Use cases live under `src/application/use-cases/`.
- Zod schemas live next to the boundary they validate.
- Input types are inferred with `z.infer`. No hand-written duplicate types.
- `safeParse` only. No `parse`, no `as` casts.
- Result type: `{ ok: true; data: T } | { ok: false; error: AppError }`.
- `AppError` carries `code`, a client-safe `message`, and optional `details`.
- Status mapping: `VALIDATION_ERROR` → 400, `NOT_FOUND` → 404,
  `CONFLICT` → 409, `INTERNAL_ERROR` → 500.
- An unexpected exception is caught at the handler boundary, logged in full, and
  returned as a generic `INTERNAL_ERROR` with no internal detail.
- Project name: 1–100 characters after trimming. `repositoryUrl`: a valid URL,
  optional. `description`: optional, maximum 1000 characters.
- Pagination: `page` ≥ 1, `pageSize` between 1 and 100, defaulting to 20.
- The in-memory repository used by unit tests implements the same interface and
  lives under `src/test/`.

## Expected Files

```text
src/app/api/projects/route.ts                             created
src/app/api/projects/[id]/route.ts                        created
src/app/api/projects/route.integration.test.ts            created
src/app/api/projects/[id]/route.integration.test.ts       created
src/application/use-cases/create-project.ts               created
src/application/use-cases/create-project.test.ts          created
src/application/use-cases/list-projects.ts                created
src/application/use-cases/list-projects.test.ts           created
src/application/use-cases/get-project-by-id.ts            created
src/application/use-cases/get-project-by-id.test.ts       created
src/application/schemas/project.ts                        created
src/application/schemas/project.test.ts                   created
src/application/result.ts                                 created
src/application/errors.ts                                 created
src/infrastructure/logging/logger.ts                      created
src/infrastructure/http/error-response.ts                 created
src/test/in-memory-project-repository.ts                  created
```

## Do Not Touch

```text
prisma/schema.prisma
prisma/migrations/**
src/components/**
src/app/page.tsx
src/app/layout.tsx
docs/**
tasks/**
CLAUDE.md
AGENTS.md
.github/**
```

## Test Requirements

- Write the failing test first.
- Use-case unit tests run against the in-memory repository — no database, no
  HTTP.
- Cover for `createProject`: valid input, name too short, name too long,
  invalid URL, and a repository failure.
- Cover for `listProjects`: empty result, populated result, pagination
  boundaries, invalid page values.
- Cover for `getProjectById`: found and not found.
- Route integration tests assert status code, response body shape and the error
  shape.
- Assert explicitly that an internal error response contains no Prisma detail.
- No skipped tests. No mocking of the module under test.

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

Report using the format in `CLAUDE.md` §13, plus:

- The endpoint table: method, path, request shape, response shape, status codes.
- The error taxonomy and its status mapping.
- Confirmation that no route handler imports Prisma.
- Confirmation that use cases depend only on the repository interface.

## Claude Code Execution Prompt

```text
Execute TASK-005 as specified in tasks/TASK-005-projects-api.md.

First read CLAUDE.md, docs/ARCHITECTURE.md (§2 layers, §6 schema validation,
§7 observability) and docs/DEVELOPMENT_GUIDELINES.md (§8 Zod, §9 error
handling, §10 logging, §11 no hidden fallback).

Build three use cases — createProject, listProjects, getProjectById — in
src/application/use-cases/, each depending only on the ProjectRepository
interface from TASK-004. Expose them through POST /api/projects,
GET /api/projects and GET /api/projects/[id].

Establish the shared patterns: a discriminated result type, an AppError
taxonomy (VALIDATION_ERROR, NOT_FOUND, CONFLICT, INTERNAL_ERROR) mapped to HTTP
status codes, a single JSON error shape, and structured request logging with a
correlation id.

Validate every input with Zod using safeParse. Infer types with z.infer. Never
cast. Never return a default object when validation fails — a failure is a
failure.

No route handler may import Prisma or anything from
src/infrastructure/persistence/. An unexpected exception is caught at the
handler boundary, logged in full, and returned as a generic INTERNAL_ERROR with
no internal detail leaked.

Write use-case unit tests against an in-memory ProjectRepository in src/test/,
and route integration tests against a real test database. Write the tests
first.

Do not add UI. Do not modify the Prisma schema — if a field is missing, report
it. Do not add update or delete endpoints.

Run pnpm verify. Report in the format required by CLAUDE.md §13.
```
