# TASK-008：Requirement Planning Flow

**Status:** Not started.
**Depends on:**

- TASK-005 (Projects API, use cases, result type and error taxonomy).
- TASK-006 (Projects UI and the project detail page).
- TASK-007 (`LlmProvider`, `PlanSchema`, mock Planner, invocation runner, audit
  records).

TASK-007 in turn depends on TASK-004. Do not start this task until all three
direct dependencies are complete.

## Context

Every piece of the Sprint 1 slice now exists in isolation: projects can be
created and viewed, and the mock Planner can produce a validated plan. Nothing
connects them.

This task closes the loop. A human submits a requirement against a project, the
Planner runs, the plan is validated and persisted, and the result — including a
failure, when it fails — is visible in the UI along with its audit record.

That last part is the point. A run that fails must be visibly failed, with its
reason. This is the task where the product's central claim either holds or does
not.

## Goal

An end-to-end requirement planning flow: submit a requirement from the project
detail page, run the mock Planner, persist requirement and plan, and display the
plan or the failure with its audit trail.

## Scope

- The `submitRequirement` use case: persist the requirement, run the Planner via
  the TASK-007 runner, persist the validated plan, update requirement status.
- Requirement status transitions: `SUBMITTED` → `PLANNING` → `PLANNED` /
  `PLANNING_FAILED`.
- Zod schemas for requirement input and for the requirement and plan view
  models.
- `POST /api/projects/[id]/requirements` — submit.
- `GET /api/requirements/[id]` — fetch a requirement with its plan.
- A requirement submission form on the project detail page.
- `/requirements/[id]` — a plan view rendering summary, goals, non-goals,
  assumptions, open questions, risks with severity, and acceptance criteria.
- A failure view rendering the failure reason and the attempt count when
  planning failed.
- An audit panel on the requirement view listing the invocation attempts:
  status, attempt number, timing, token and cost fields.
- A requirement list on the project detail page.
- Unit tests for the use case, integration tests for the endpoints, and
  component tests for the views.

## Out of Scope

- The Architect Agent, task generation, and gate G1. Sprint 2.
- Any of Coder, Reviewer, Tester, Security, the Quality Gate, or a Pull Request
  draft. Sprint 2.
- GitHub issue import. `sourceType` is stored, but only `MANUAL` is offered.
- Editing or deleting a requirement, or re-running the Planner on an existing
  requirement.
- Real LLM providers. Mock only, per ADR-003.
- Background execution, queues or streaming. The run is synchronous, per
  ADR-005.
- Real-time progress. The page shows a pending state and then the result.
- Cost budgets, quotas or rate limiting.
- Modifying `PlanSchema` or the `LlmProvider` interface from TASK-007. If either
  is inadequate, report it rather than changing it.
- Authentication and ownership checks.

## Acceptance Criteria

1. The project detail page renders a requirement submission form with a labelled
   text area.
2. Submitting a valid requirement persists it, runs the Planner, persists the
   validated plan, and shows the plan.
3. Submitting an empty or whitespace-only requirement returns a field-level
   validation error and persists nothing.
4. When the mock provider returns schema-violating output, the requirement ends
   at `PLANNING_FAILED`, **no plan row is written**, and the UI shows the
   failure with its reason.
5. **No fallback:** no code path produces an empty or partial plan on failure,
   and a failed run is never displayed as successful.
6. The plan view renders every `PlanSchema` field: summary, goals, non-goals,
   assumptions, open questions, risks with severity, acceptance criteria.
7. `openQuestions` is displayed prominently — it is what a human must act on.
8. The audit panel lists every invocation attempt with status, attempt number,
   provider, model, timing, and token and cost fields (zero for mocks).
9. The project detail page lists the project's requirements with their status.
10. `POST /api/projects/[id]/requirements` returns `201` on success and `400`
    with field errors on invalid input.
11. `POST /api/projects/[id]/requirements` returns `404` for an unknown project.
12. `GET /api/requirements/[id]` returns the requirement with its plan, or
    `404`.
13. A planning failure returns a response that distinguishes "the request was
    invalid" from "planning failed", with different status codes.
14. Requirement status transitions follow the declared state machine; an illegal
    transition is rejected in the domain layer.
15. A complete mock run finishes in under 5 seconds.
16. No component imports Prisma or anything from
    `src/infrastructure/persistence/`.
17. `pnpm verify` exits 0.
18. No new runtime dependency was added.

## Technical Requirements

- The status state machine lives in the domain layer with legal transitions
  declared explicitly, and is unit-tested independently of the database.
- `submitRequirement` returns the discriminated result type from TASK-005.
- A planning failure is an expected outcome: the use case returns a failure
  result rather than throwing.
- Requirement persistence and status update are transactional with respect to
  the plan write — a persisted plan implies a `PLANNED` requirement, and the
  reverse.
- Submission from the UI uses a Server Action; the HTTP endpoint exists for
  integration tests and external consumers.
- Reads use Server Components calling use cases directly.
- Requirement text: 10–10000 characters after trimming.
- The audit panel reads through the `AgentInvocationRepository` interface from
  TASK-007. It renders `rawResponse` only when it is safe to display, and never
  renders an environment value.
- No `as` casts on persisted JSON. The stored plan is re-validated against
  `PlanSchema` when read, and a version mismatch is surfaced rather than
  ignored.
- Reuse the primitives from TASK-003 and the patterns from TASK-006. Add new
  primitives only if needed, with tests.

## Expected Files

```text
src/domain/requirement-status.ts                                        created
src/domain/requirement-status.test.ts                                   created
src/application/schemas/requirement.ts                                  created
src/application/schemas/requirement.test.ts                             created
src/application/use-cases/submit-requirement.ts                         created
src/application/use-cases/submit-requirement.test.ts                    created
src/application/use-cases/get-requirement-with-plan.ts                  created
src/application/use-cases/get-requirement-with-plan.test.ts             created
src/application/use-cases/list-project-requirements.ts                  created
src/application/use-cases/list-project-requirements.test.ts             created
src/app/api/projects/[id]/requirements/route.ts                         created
src/app/api/projects/[id]/requirements/route.integration.test.ts        created
src/app/api/requirements/[id]/route.ts                                  created
src/app/api/requirements/[id]/route.integration.test.ts                 created
src/app/requirements/[id]/page.tsx                                      created
src/app/requirements/[id]/page.test.tsx                                 created
src/app/requirements/[id]/loading.tsx                                   created
src/app/projects/[id]/page.tsx                                          modified
src/app/projects/[id]/actions.ts                                        created
src/app/projects/[id]/actions.test.ts                                   created
src/components/requirements/RequirementForm.tsx                         created
src/components/requirements/RequirementForm.test.tsx                    created
src/components/requirements/RequirementList.tsx                         created
src/components/requirements/RequirementList.test.tsx                    created
src/components/plans/PlanView.tsx                                       created
src/components/plans/PlanView.test.tsx                                  created
src/components/plans/PlanFailureView.tsx                                created
src/components/plans/PlanFailureView.test.tsx                           created
src/components/agents/InvocationAuditPanel.tsx                          created
src/components/agents/InvocationAuditPanel.test.tsx                     created
src/test/in-memory-requirement-repository.ts                            created
src/test/in-memory-plan-repository.ts                                   created
```

## Do Not Touch

```text
prisma/schema.prisma                       unless a field is genuinely missing; report first
src/application/schemas/agents/plan.ts
src/application/ports/llm-provider.ts
src/application/agents/**
docs/**
tasks/**
CLAUDE.md
AGENTS.md
.github/**
src/app/page.tsx
src/app/page.test.tsx
```

## Test Requirements

- Write the failing test first.
- Domain state machine: every legal transition succeeds, every illegal one is
  rejected.
- `submitRequirement` unit tests against in-memory repositories and the mock
  provider:
  - valid requirement → plan persisted, status `PLANNED`
  - invalid input → nothing persisted
  - provider returns schema-violating output → status `PLANNING_FAILED`, **no
    plan written**
  - provider fails transiently then succeeds → plan persisted, retry recorded
  - provider fails permanently → status `PLANNING_FAILED`
- An explicit test asserting a failed run is never rendered as a successful one.
- Integration tests for both endpoints, covering success, validation failure,
  unknown project, unknown requirement and planning failure.
- `PlanView` renders every schema field, including empty arrays.
- `PlanFailureView` shows the reason and the attempt count.
- `InvocationAuditPanel` lists multiple attempts in order.
- No skipped tests. All existing tests must still pass.

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

- The requirement status state machine and its legal transitions.
- The end-to-end flow, step by step, from form submission to rendered plan.
- The measured duration of a complete mock run.
- Explicit confirmation that a failed run persists no plan, with the names of
  the tests that prove it.
- Confirmation that Sprint 1's exit criteria in `docs/ROADMAP.md` are met.

## Claude Code Execution Prompt

```text
Execute TASK-008 as specified in tasks/TASK-008-requirement-planning-flow.md.

Confirm first that TASK-005, TASK-006 and TASK-007 are complete. If any is
missing, stop and report.

Read CLAUDE.md, AGENTS.md §4.1, docs/PRD.md §7.3, docs/ARCHITECTURE.md and
docs/DEVELOPMENT_GUIDELINES.md.

Build the end-to-end flow: a requirement submission form on the project detail
page → submitRequirement use case → mock Planner via the TASK-007 runner →
validated plan persisted → plan rendered at /requirements/[id], with an audit
panel listing every invocation attempt.

Implement the requirement status state machine (SUBMITTED → PLANNING → PLANNED
or PLANNING_FAILED) in the domain layer with legal transitions declared
explicitly and unit-tested without a database.

Critical requirements:
- When the provider returns schema-violating output, the requirement must end at
  PLANNING_FAILED and NO plan row may be written. Write explicit tests proving
  this and name them in your report.
- A failed run must never be displayed as successful. The failure view shows the
  reason and the attempt count.
- Re-validate the stored plan JSON against PlanSchema when reading it. Never
  cast. Surface a schema version mismatch rather than ignoring it.
- Distinguish "invalid request" (400) from "planning failed" in the API.

Reads use Server Components calling use cases directly; submission uses a Server
Action. Reuse the TASK-003 primitives and the TASK-006 patterns. Add no new
runtime dependency.

Do not modify PlanSchema, LlmProvider or src/application/agents/ — if any is
inadequate, report it instead. Do not build the Architect Agent, task
generation, or any approval gate.

Write the tests first. Run pnpm verify, and measure how long a complete mock run
takes. Report in the format required by CLAUDE.md §13.
```
