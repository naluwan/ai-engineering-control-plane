# Architecture

**Status:** Target architecture for the MVP. Only a single static placeholder
page and the verification toolchain exist today — the application shell itself
is TASK-003 and is not built yet. PostgreSQL, Prisma, the orchestrator and the
providers are specified here but **not installed and not implemented**.

---

## 1. Architecture at a glance

```text
Next.js modular monolith
PostgreSQL
Prisma
Synchronous in-process agent orchestration
Provider interfaces
Mock providers
```

One deployable unit. One database. No queue, no broker, no sidecar. The
internal module boundaries are strict so that extraction later is a mechanical
operation rather than a rewrite. See ADR-001.

---

## 2. Layers

```text
┌─────────────────────────────────────────────────────┐
│ Presentation layer                                  │
│ React Server Components, Client Components, routes  │
├─────────────────────────────────────────────────────┤
│ Application layer                                   │
│ Use cases, orchestration, approval gates, Quality   │
│ Gate, transaction boundaries                        │
├─────────────────────────────────────────────────────┤
│ Domain layer                                        │
│ Entities, state machines, invariants, pure rules    │
├─────────────────────────────────────────────────────┤
│ Infrastructure layer                                │
│ Prisma repositories, provider adapters, logging     │
└─────────────────────────────────────────────────────┘
```

### 2.1 Presentation layer

- Next.js App Router routes, layouts, Server and Client Components.
- Renders data and collects human decisions. Contains no business rules.
- May call the application layer. **Never** imports Prisma, a provider adapter,
  or a schema from infrastructure.
- Human approval is a form submission that invokes an application use case; the
  UI cannot advance a workflow by itself.

### 2.2 Application layer

- One module per use case: `createProject`, `submitRequirement`, `runPlanner`,
  `approveTasks`, `executeRun`, `evaluateQualityGate`, `generatePrDraft`.
- Owns agent sequencing, retry policy, gate enforcement and transaction
  boundaries.
- Depends on domain types and on infrastructure **interfaces**, never on
  concrete adapters.
- The only layer permitted to orchestrate. An agent never invokes another agent.

### 2.3 Domain layer

- Entities: `Project`, `Requirement`, `Plan`, `ArchitectureProposal`, `Task`,
  `Approval`, `AgentRun`, `AgentInvocation`, `QualityGateResult`,
  `PullRequestDraft`.
- Run and task state machines, with legal transitions declared explicitly.
- Pure TypeScript. No I/O, no framework imports, no Prisma types. Unit-testable
  without a database.

### 2.4 Infrastructure layer

- Prisma client and repository implementations.
- Provider adapters implementing the application's interfaces.
- Structured logger, configuration loading, clock.
- Provider SDK types stay inside the adapter. They must never appear in an
  application or domain signature.

### 2.5 Dependency rule

Dependencies point inward only:

```text
Presentation → Application → Domain
                   ↓ (interfaces only)
              Infrastructure
```

Any import that violates this is a defect, not a style preference.

---

## 3. Agent orchestration

Synchronous and in-process. A run is a deterministic sequence of steps executed
by the application layer within a single request lifecycle. See ADR-002.

```text
runPipeline(runId):
  for step of [Coder, Reviewer, Tester, Security]:
    input    = buildInput(step, runState)
    raw      = provider.invoke(step, input)      // ≤ 2 retries, transient only
    parsed   = schema.safeParse(raw)
    if !parsed.success:
       record FAILED; halt                       // no fallback, no default
    persist(parsed.data); record audit
  gate = evaluateQualityGate(runState)           // deterministic, not an agent
  if !gate.passed: halt at G2
  await human approval G2, G3
  generatePrDraft(runState)
```

Properties this buys:

- The pipeline is a plain function, so it is unit-testable end to end.
- Failure points are explicit and enumerable.
- There is no framework-owned control flow to reason about.

Why not a durable queue yet: at MVP volume, with mock providers completing in
milliseconds, a queue would add operational surface without removing a real
constraint. It becomes correct when real providers introduce multi-minute
latency. See ADR-005.

---

## 4. Provider abstraction

Every external capability sits behind an application-owned interface.

```text
LlmProvider     invoke(agentType, input) → unknown (raw, unvalidated)
GitProvider     readRepositoryStructure, createBranch, openPullRequest
Clock           now()
Logger          structured logging
```

Rules:

- `LlmProvider` returns `unknown`. Validation is the caller's responsibility and
  happens against an application-owned Zod schema.
- Provider selection is configuration-driven. Call sites do not branch on
  provider identity.
- Adapters translate provider errors into a small application-level error
  taxonomy: `TRANSIENT`, `INVALID_OUTPUT`, `RATE_LIMITED`, `PERMANENT`.

### 4.1 Mock providers

The MVP ships mock implementations only.

- Deterministic: the same input yields the same output, so tests are stable.
- Schema-conformant by default, with fixtures that deliberately violate the
  schema to exercise the failure path.
- Configurable latency and failure injection.
- Zero tokens, zero cost, no network access.

A mock is a first-class implementation of the interface, not a stub with
special-cased handling in the application layer. See ADR-003.

---

## 5. Data model outline

Prisma over PostgreSQL. Introduced in a later task, not during bootstrap. See
ADR-007.

Delivery is staged without changing this target model. TASK-004 implements
`Project`, `Requirement` and `Plan`. `ArchitectureProposal` and `Task`
persistence are introduced with the Architect flow in Sprint 2.

```text
Project 1─n Requirement 1─1 Plan
                        1─1 ArchitectureProposal 1─n Task
Task    1─n AgentRun
AgentRun 1─n AgentInvocation      (append-only audit)
AgentRun 1─n Approval             (G1, G2, G3)
AgentRun 1─1 QualityGateResult
AgentRun 1─1 PullRequestDraft
```

Constraints:

- `AgentInvocation` is append-only. No update, no delete.
- State transitions are enforced in the domain layer and mirrored by database
  constraints where practical.
- Validated agent output is stored as JSON alongside the schema version that
  validated it, so old records remain interpretable.

---

## 6. Structured schema validation

Zod is the single validation mechanism at every boundary. See ADR-004.

Validated boundaries:

1. HTTP request bodies and form input.
2. Provider output, before any use or persistence.
3. Environment configuration, at startup.

Rules:

- Types are inferred from schemas (`z.infer`). A hand-written type paired with a
  schema will drift.
- `safeParse` only. A thrown parse error inside a pipeline step is a bug.
- Validation failure is recorded with the raw response and the issue list.
- No `as` casts on provider output. No defaults substituted for a parse failure.

Schema versioning: each agent schema carries a version. The version is written
into the audit record so a stored artifact can always be interpreted against
the schema that produced it.

---

## 7. Observability model

Three signals, all locally implemented — no vendor SDK in the MVP.

**Structured logs.** JSON lines with `timestamp`, `level`, `event`,
`correlationId`, `projectId`, `runId`, `agentType`. Never a secret, never a raw
credential, never a full provider response at `info` level.

**Audit trail.** The primary observability artifact. Every agent invocation is
persisted with the fields listed in [`../AGENTS.md`](../AGENTS.md) §1.4. This is
product data, not telemetry: a run must be reconstructable from the database
alone, with no log retention dependency.

**Cost and usage.** `tokensIn`, `tokensOut` and `costUsd` recorded per
invocation, zero under mock providers. Recording them from day one means real
providers become a configuration change rather than a schema migration.

Deferred: distributed tracing, metrics backends, APM. There is one process and
no network hop to trace.

---

## 8. Security boundary

**Secrets.** Loaded from the environment, validated at startup, never written to
a file, a log, an audit record or an agent prompt. `.env.example` holds
placeholders only. Every `.env*` except `.env.example` is git-ignored.

**Agent capability boundary.** Agents are pure functions from validated input to
validated output. They have no filesystem access outside their assigned
workspace, no shell, no network, and no ability to call the GitHub API. Every
side effect is performed by the application layer through an adapter.

**Human gates as security controls.** G1, G2 and G3 are enforced by the
orchestrator's state machine. There is no prompt, configuration or agent output
that can advance a run past a gate. See ADR-006.

**Code execution.** The MVP does not execute generated code. The Tester Agent
runs against mock output. Real execution requires an isolated sandbox with
network egress control and a resource ceiling — an explicit later phase, not an
incremental addition.

**Untrusted input.** Requirement text, GitHub issue bodies and repository
content are untrusted. They are treated as data, never as instructions to the
platform. Prompt injection in a requirement must not be able to move a run past
a gate, because gates are not decided by a model.

**Repository write access.** Only the GitHub adapter performs remote Git
operations, only on a dedicated branch, only after G3. No force-push, ever.

---

## 9. Future extraction strategy

The monolith is a starting point, not a commitment. Extraction is planned along
the seams that already exist.

| Trigger                                        | Extraction                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Provider latency makes request-scoped runs unviable | Move `runPipeline` behind a durable queue; the pipeline function is unchanged |
| Real code execution is required                | Extract the Tester into an isolated sandbox worker with its own network policy |
| Repository analysis becomes expensive          | Extract an indexing service; add retrieval behind a provider interface |
| Multiple teams need independent deploys        | Split along the existing application-module boundaries             |
| Audit volume outgrows the primary database     | Move `AgentInvocation` to append-only storage behind the repository interface |

What makes this cheap: the application layer already depends only on
interfaces, the domain layer is I/O-free, and orchestration is a function rather
than a distributed conversation. Extraction replaces an adapter; it does not
rewrite a rule.

---

## 10. Technologies deliberately excluded from the MVP

| Excluded         | Why not now                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Microservices** | The service boundaries are not yet known. Splitting now would freeze the wrong ones and add network failure modes to a single-operator system. Module boundaries deliver the same discipline at a fraction of the cost. (ADR-001) |
| **Redis**         | Nothing needs a shared cache or a distributed lock. One process, one database. Adding Redis would add an operational dependency with no problem to solve. (ADR-005) |
| **BullMQ**        | Background jobs require Redis and a worker process. Mock runs finish in milliseconds; there is no long-running work to defer. It becomes correct when real providers arrive. (ADR-005) |
| **LangGraph**     | The pipeline is a fixed, linear sequence with explicit gates. A graph framework would replace readable control flow with framework-owned control flow, and make the orchestration harder to unit-test. Revisit if genuine branching or cyclic replanning is needed. (ADR-002) |
| **MCP**           | MCP standardises tool access for agents. MVP agents have no tools — they transform validated input into validated output. Adopting it now would add a protocol with no consumer. |
| **RAG**           | Retrieval needs a corpus. The MVP does not read repository source code, so there is nothing to retrieve over and no way to evaluate retrieval quality. |
| **Kubernetes**    | A single Next.js application with a managed PostgreSQL instance. Kubernetes would add a control plane to operate the control plane. |

Each exclusion is a decision with a stated trigger for revisiting it, not an
oversight. Reversing one requires a new ADR.

---

## 11. Related documents

- [`PRD.md`](./PRD.md) — product scope and requirements
- [`DECISIONS.md`](./DECISIONS.md) — ADR-001 … ADR-007
- [`ROADMAP.md`](./ROADMAP.md) — delivery sequence
- [`../AGENTS.md`](../AGENTS.md) — agent contracts and gates
