# TASK-007：Mock Planner Contracts

**Status:** Not started.
**Depends on:** TASK-004 (Prisma schema, `Plan` entity and `PlanRepository`
must exist; `zod` installed).

Does **not** depend on TASK-003, TASK-005 or TASK-006. This task adds no UI and
no HTTP endpoint.

## Context

This is the first agent code in the repository, and it fixes the contract every
later agent copies: how a provider is invoked, how its output is validated, how
a failure is recorded, and what an audit record contains.

Two rules matter more than the Planner itself. First, `LlmProvider.invoke`
returns `unknown` — the application, not the provider, decides whether a
response is acceptable (ADR-004). Second, there is no fallback: a schema
validation failure fails the run and is recorded as a failure, never replaced
with an empty plan that makes the run look successful.

Getting these wrong here means getting them wrong six more times in Sprint 2.

## Goal

The `LlmProvider` interface, a versioned `PlanSchema`, a deterministic mock
Planner provider including deliberately invalid fixtures, an invocation runner
with a bounded retry policy, and a persisted audit record for every invocation.

## Scope

- The `LlmProvider` interface in the application layer, with `invoke` returning
  `unknown`.
- The provider error taxonomy: `TRANSIENT`, `INVALID_OUTPUT`, `RATE_LIMITED`,
  `PERMANENT`.
- `PlanSchema` as specified in `AGENTS.md` §4.1, carrying a schema version:
  `summary`, `goals[]`, `nonGoals[]`, `assumptions[]`, `openQuestions[]`,
  `risks[]` (each with `description` and `severity`), `acceptanceCriteria[]`.
- A deterministic mock Planner provider: identical input yields identical
  output.
- Mock fixtures covering a valid plan, malformed JSON, a schema-violating
  object, a transient failure and a permanent failure.
- Configurable latency and failure injection on the mock.
- An invocation runner that invokes the provider, validates with `safeParse`,
  retries at most twice on transient failures only, feeds the validation error
  back into the retry, and records an audit entry for every attempt.
- Persistence of a validated plan through `PlanRepository`, with its schema
  version.
- An `AgentInvocation` audit record containing the fields listed in
  `AGENTS.md` §1.4.
- Configuration-driven provider selection with no call-site branching.
- Unit tests for the schema, the mock provider, the runner and the retry policy.
- Integration tests for plan persistence and audit recording.

## Out of Scope

- Any UI, page or component. TASK-008 displays the plan.
- Any HTTP route handler. TASK-008 wires the flow.
- The Architect Agent, tasks generation, or any Sprint 2 agent.
- Approval gates G1, G2 and G3, and the Quality Gate.
- A real LLM provider, any LLM SDK, any API key. See ADR-003.
- Prompt engineering or prompt templates beyond a versioned identifier field.
- Streaming responses.
- Cost calculation beyond recording zero for mock providers.
- Redis, a queue or background execution. See ADR-005.
- LangGraph, MCP or an agent framework. See ADR-002.
- Modifying the `Project`, `Requirement` or `Task` schema. Adding the
  `AgentInvocation` model is in scope; changing existing models is not.

## Acceptance Criteria

1. `LlmProvider.invoke` returns `unknown`. No signature exposes a provider SDK
   type.
2. `PlanSchema` validates a conforming object and rejects each of: a missing
   required field, a wrong field type, an empty `summary`, an empty
   `acceptanceCriteria`, and an invalid `severity` value.
3. Types are derived from the schema with `z.infer`. No hand-written duplicate
   type exists.
4. The mock provider is deterministic: the same input produces byte-identical
   output across runs.
5. A malformed-JSON fixture causes the invocation to fail with
   `INVALID_OUTPUT`, and no plan is persisted.
6. A schema-violating fixture causes the invocation to fail, and no plan is
   persisted.
7. **No fallback:** there is no code path where a validation failure results in
   a default, empty or partial plan being persisted or returned as success.
8. A transient failure is retried at most twice, for three attempts total.
9. A permanent failure is not retried.
10. A retry includes the previous validation error in the next attempt's input.
11. Every attempt — succeeded or failed — produces an `AgentInvocation` record.
12. An audit record contains every field listed in `AGENTS.md` §1.4, with
    `tokensIn`, `tokensOut` and `costUsd` set to zero for mock providers.
13. `AgentInvocation` records are append-only: no update or delete path exists
    in the repository interface.
14. A validated plan is persisted with its schema version.
15. Provider selection is configuration-driven; no use case branches on provider
    identity.
16. `pnpm verify` exits 0.
17. No LLM SDK, HTTP client or network-capable dependency was added.

## Technical Requirements

- `LlmProvider` lives in `src/application/ports/`; the mock implementation lives
  in `src/infrastructure/providers/mock/`.
- Agent schemas live in `src/application/schemas/agents/`.
- `PlanSchema` exports both the schema and `PLAN_SCHEMA_VERSION`.
- `safeParse` only. No `parse`, no `as`, no non-null assertion on provider
  output.
- The runner is a pure function over its dependencies, so it is unit-testable
  without a database.
- Retry policy: maximum 2 retries; only `TRANSIENT` and `INVALID_OUTPUT` are
  retryable; `PERMANENT` and `RATE_LIMITED` are not retried in the MVP.
- The mock accepts a fixture selector so a test can request a specific failure
  mode.
- The mock performs no network access and reads no environment secret.
- Determinism is achieved without `Math.random()` or `Date.now()` inside the
  mock's output; timestamps come from an injected clock.
- The `AgentInvocation` Prisma model and its migration are added here.
- Provider selection reads a validated environment value; `mock` is the only
  legal value in the MVP, and any other value fails startup.

## Expected Files

```text
prisma/schema.prisma                                              modified
prisma/migrations/<timestamp>_agent_invocation/migration.sql      created
src/application/ports/llm-provider.ts                             created
src/application/ports/agent-invocation-repository.ts              created
src/application/schemas/agents/plan.ts                            created
src/application/schemas/agents/plan.test.ts                       created
src/application/agents/run-agent-invocation.ts                    created
src/application/agents/run-agent-invocation.test.ts               created
src/application/agents/retry-policy.ts                            created
src/application/agents/retry-policy.test.ts                       created
src/application/use-cases/run-planner.ts                          created
src/application/use-cases/run-planner.test.ts                     created
src/infrastructure/providers/mock/mock-llm-provider.ts            created
src/infrastructure/providers/mock/mock-llm-provider.test.ts       created
src/infrastructure/providers/mock/fixtures/planner.ts             created
src/infrastructure/providers/provider-factory.ts                  created
src/infrastructure/persistence/prisma-agent-invocation-repository.ts        created
src/infrastructure/persistence/prisma-agent-invocation-repository.integration.test.ts  created
src/infrastructure/config/env.ts                                  modified
src/domain/agent-invocation.ts                                    created
.env.example                                                      modified
```

## Do Not Touch

```text
src/app/**
src/components/**
docs/**
tasks/**
CLAUDE.md
AGENTS.md
.github/**
prisma/schema.prisma      except adding the AgentInvocation model
```

## Test Requirements

- Write the failing test first.
- `PlanSchema`: one test per rejection case listed in Acceptance Criterion 2,
  plus a valid case.
- Mock provider: determinism (same input twice, identical output), and one test
  per fixture failure mode.
- Runner: success on first attempt; success on a retry; failure after the retry
  limit; permanent failure not retried; an audit record written for every
  attempt.
- An explicit test asserting **no fallback**: after a validation failure, the
  plan repository received no write.
- An explicit test asserting the retry input contains the previous validation
  error.
- Integration test: an `AgentInvocation` record persists every required field
  and cannot be updated through the repository interface.
- No mocking of the module under test. Use the mock provider — that is what it
  exists for.
- No skipped tests. Existing tests must still pass.

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

- The `PlanSchema` definition and its version.
- The `LlmProvider` interface signature.
- The retry policy: which error types retry and which do not.
- The audit record fields, mapped to `AGENTS.md` §1.4.
- Explicit confirmation that no fallback path exists, and the name of the test
  that proves it.

## Claude Code Execution Prompt

```text
Execute TASK-007 as specified in tasks/TASK-007-mock-planner-contracts.md.

Read CLAUDE.md, AGENTS.md (§1 universal rules and §4.1 Planner),
docs/ARCHITECTURE.md (§4 providers, §6 schema validation) and
docs/DECISIONS.md ADR-003 and ADR-004.

Build:
1. The LlmProvider interface in src/application/ports/, with invoke returning
   unknown, plus the provider error taxonomy (TRANSIENT, INVALID_OUTPUT,
   RATE_LIMITED, PERMANENT).
2. PlanSchema in src/application/schemas/agents/plan.ts exactly as specified in
   AGENTS.md §4.1, exporting a schema version. Derive types with z.infer.
3. A deterministic mock Planner provider with fixtures for: a valid plan,
   malformed JSON, a schema-violating object, a transient failure and a
   permanent failure. No network, no secrets, no Math.random or Date.now in the
   output path — use an injected clock.
4. An invocation runner that validates with safeParse, retries at most twice and
   only on transient or invalid-output failures, feeds the validation error into
   the retry input, and writes an AgentInvocation audit record for every
   attempt.
5. The AgentInvocation Prisma model, migration and an append-only repository
   interface — no update, no delete.
6. Configuration-driven provider selection. mock is the only legal value; any
   other value fails startup.

Critical: there must be NO fallback. A validation failure fails the invocation
and persists nothing. Write an explicit test proving the plan repository
received no write after a validation failure, and name that test in your report.

Do not add any LLM SDK, HTTP client or network-capable dependency. Do not add
UI or route handlers. Do not modify the Project, Requirement or Task models.

Write the tests first. Run pnpm verify. Report in the format required by
CLAUDE.md §13.
```
