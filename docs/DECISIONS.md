# Architecture Decision Records

Every meaningful architectural decision in this repository is recorded here.
A decision is reversed by writing a new ADR that supersedes the old one, never
by quietly changing the code.

| ADR | Title                                                              | Status   |
| --- | ------------------------------------------------------------------ | -------- |
| 001 | Use a modular monolith for MVP                                     | Accepted |
| 002 | Use deterministic orchestration instead of a complex Agent framework | Accepted |
| 003 | Use mock providers before real LLM and GitHub integrations         | Accepted |
| 004 | Use Zod for all Agent structured outputs                           | Accepted |
| 005 | Do not introduce Redis or queues during the first vertical slice   | Accepted |
| 006 | Use human approval before code execution and PR creation           | Accepted |
| 007 | Use PostgreSQL and Prisma in a later Task, not during repository bootstrap | Accepted |

---

## ADR-001: Use a modular monolith for MVP

**Status:** Accepted

### Context

The product has several plausible service boundaries — orchestration, agent
execution, repository analysis, audit. It is tempting to split them up front,
partly because the domain sounds distributed and partly because a
microservice diagram photographs well.

But the boundaries are not yet known. They will be discovered by building the
first vertical slice, not by drawing it. Meanwhile the project has one
operator, no traffic, and no independent scaling requirement. Splitting now
would buy deployment independence nobody needs and pay for it with network
failure modes, distributed transactions, and a local development setup that
requires several processes to be running before a single test passes.

The real risk is not "the monolith will not scale". It is "we will freeze the
wrong boundaries before understanding the domain".

### Decision

Build the MVP as a single Next.js application — one deployable unit, one
database — with strict internal module boundaries:

- Four layers: presentation, application, domain, infrastructure.
- Dependencies point inward only.
- The domain layer performs no I/O and imports no framework.
- All external capabilities sit behind application-owned interfaces.

Boundaries are enforced by review and by the dependency rule, not by network
calls.

### Consequences

**Positive**

- One process to run, one to debug, one to deploy.
- Refactoring across boundaries is a compiler-checked operation.
- Integration tests run in-process against a real database.
- Boundaries can move cheaply while they are still being learned.

**Negative**

- Nothing prevents a boundary violation except discipline and review.
- The whole application deploys together.
- Everything shares one runtime; a hot path cannot be scaled independently.

**Mitigations**

- The dependency rule is explicit in `ARCHITECTURE.md` §2.5 and is a review
  gate.
- Extraction seams and their triggers are documented in `ARCHITECTURE.md` §9,
  so extraction is planned rather than reactive.

### Alternatives considered

**Microservices from day one.** Rejected: it would fix boundaries before they
are understood, and add distributed failure modes to a system with a single
operator and no scaling pressure.

**Serverless functions per agent.** Rejected: agent steps share run state and
execute in sequence. Splitting them across function invocations would require
externalising the pipeline state for no current benefit, and would make local
testing markedly harder.

**Separate frontend and backend repositories.** Rejected: it duplicates types
across a network boundary and doubles the release process for a single-operator
project. Next.js already provides a server runtime.

---

## ADR-002: Use deterministic orchestration instead of a complex Agent framework

**Status:** Accepted

### Context

Agent frameworks such as LangGraph offer graph-based orchestration, state
management and replanning loops. The obvious question is whether to build on
one.

The MVP pipeline is a fixed linear sequence: Planner → Architect → gate →
Coder → Reviewer → Tester → Security → Quality Gate → gate → PR draft. There
is no dynamic branching, no cycle, and no agent-decided routing. Every
transition is known before the run starts.

More importantly, this product's value proposition is auditability. If the
control flow is owned by a framework, then explaining *why a run did what it
did* means explaining the framework's execution semantics. That is exactly the
opacity the product exists to remove.

### Decision

Implement orchestration as ordinary TypeScript in the application layer: a
function that executes the pipeline steps in order, validates each output,
records each invocation, and evaluates gates explicitly.

- The orchestrator owns sequencing, retries and gates.
- Agents are stateless functions from validated input to validated output.
- An agent never invokes another agent.
- The Quality Gate is a deterministic rule, not a model decision.

### Consequences

**Positive**

- Control flow is readable in one file and steps through in a debugger.
- The pipeline is unit-testable end to end without a framework harness.
- Failure points are explicit and enumerable.
- No framework version to track, and no framework abstraction leaking into the
  domain.
- Gates cannot be bypassed by a model, because no model decides routing.

**Negative**

- Genuinely dynamic workflows would need to be built by hand.
- Features a framework provides free — checkpointing, graph visualisation,
  streaming intermediate state — must be implemented if wanted.
- Some orchestration code is written that a library would have supplied.

**Mitigations**

- `ROADMAP.md` records the trigger for revisiting: the pipeline requiring
  genuine branching or cyclic replanning.
- The pipeline is a function, so replacing its internals later does not disturb
  callers.

### Alternatives considered

**LangGraph.** Rejected for the MVP: it would replace readable control flow
with framework-owned control flow, add a dependency with its own upgrade
cadence, and complicate the audit story. Revisit when real branching exists.

**A workflow engine (Temporal, Inngest).** Rejected: these solve durability
across process restarts and long-running steps. Mock runs complete in
milliseconds within one request. Correct when real provider latency arrives —
see ADR-005.

**Agent-to-agent delegation.** Rejected outright: it makes the execution path
model-decided, which makes gate enforcement unverifiable. Gates must be
structural.

---

## ADR-003: Use mock providers before real LLM and GitHub integrations

**Status:** Accepted

### Context

The instinctive first step is to connect a real model and see the system
produce something impressive. That instinct is wrong here.

The hard, valuable parts of this product are the orchestration, the approval
gates, the schema contracts and the audit trail. None of them require a real
model to build or to validate. Introducing one early makes every test slow,
non-deterministic, costly and network-dependent, and it obscures orchestration
bugs behind model variance. The same applies to GitHub: real integration means
an app registration, installation tokens, and write access to a repository —
significant secret-handling surface bolted onto a system whose control flow is
not yet proven.

There is also a demonstration argument. A run that fails because a model
returned unexpected JSON teaches nothing about the platform. A run that fails
because a deliberately malformed fixture was rejected by the schema proves the
platform works.

### Decision

The MVP ships mock providers only, implementing the same interfaces the real
providers will implement.

- Mocks are deterministic: identical input yields identical output.
- Mock fixtures include deliberately invalid responses to exercise the failure
  path.
- Latency and failure injection are configurable.
- Zero tokens, zero cost, no network access.
- Provider selection is configuration-driven; no call site branches on provider
  identity.
- The PR Generator produces a draft artifact. It does not create a real Pull
  Request.

A mock is a first-class implementation of the interface, never a stub with
special-cased handling in the application layer.

### Consequences

**Positive**

- The full flow runs in CI, offline, deterministically, in seconds.
- No API keys are required to develop or run the project — which is what makes
  it safe as a public portfolio repository.
- Failure paths are tested properly, because failures can be produced on demand.
- Swapping in a real provider is a configuration change.

**Negative**

- Prompt engineering, real output variance and real rate limits are not
  exercised.
- Real integration may reveal that the interface needs adjusting.
- A reader could mistake the mock flow for a working AI product — which is why
  `README.md`, `PRD.md` and `AGENTS.md` all state the status explicitly.

**Mitigations**

- The interface is designed around what real providers actually return:
  `LlmProvider.invoke` returns `unknown`, so validation is mandatory rather
  than incidental.
- Token and cost fields exist from day one, so real usage needs no migration.

### Alternatives considered

**Real provider from the start.** Rejected: slow, non-deterministic, costly
tests, and it hides orchestration defects behind model variance.

**Recorded fixtures from real calls (VCR-style).** Rejected for now: it
requires a real integration to record against, and stale recordings drift
silently. Reasonable once real providers exist.

**A small local model.** Rejected: adds a heavy runtime dependency and
non-determinism without teaching anything about the orchestration.

---

## ADR-004: Use Zod for all Agent structured outputs

**Status:** Accepted

### Context

Model output is untrusted input that happens to look trustworthy. It is JSON
shaped roughly like what was asked for — which makes `as SomeType` feel
harmless. It is not: a cast is a promise to the compiler with nothing behind it,
and the failure surfaces later, somewhere else, as a confusing bug.

For a platform whose entire claim is auditability, storing an artifact that was
never checked against its contract is disqualifying.

There is also a subtler failure mode: catching a validation error and returning
a default. The run then appears to succeed with empty content. That is worse
than crashing, because it is invisible.

### Decision

Every structured output crossing a boundary is validated with a Zod schema
owned by the application, not by the provider.

- `LlmProvider.invoke` returns `unknown`. Validation is the caller's
  responsibility.
- `safeParse` only. The failure branch is handled explicitly.
- Types are inferred with `z.infer`. A hand-written type paired with a schema
  will drift.
- No `as` casts on provider output.
- A validation failure is recorded with the raw response and the issue list,
  and fails the run.
- **No fallback.** A default object is never substituted for a parse failure.
- Schemas are versioned, and the version is stored with the artifact so old
  records stay interpretable.

The same mechanism validates HTTP input and environment configuration.

### Consequences

**Positive**

- No unvalidated data reaches the database.
- Schema and type cannot drift apart.
- The schema doubles as executable documentation of each agent's contract.
- Validation failures are legible, with the exact failing path.
- Versioned schemas make stored artifacts durable across contract changes.

**Negative**

- A runtime validation cost on every boundary crossing — negligible at this
  scale.
- Schema changes require a version bump and a migration consideration.
- Strict validation means a nearly-correct model response is rejected outright.

**Mitigations**

- The last point is intended. A retry feeds the validation error back into the
  prompt, which is a better repair strategy than accepting partial data.
- Retries are capped at two, so a persistently malformed provider fails loudly.

### Alternatives considered

**TypeScript types with `as` casts.** Rejected: no runtime guarantee whatsoever.
This is the failure mode the decision exists to prevent.

**JSON Schema with Ajv.** Rejected: no type inference, so the type and the
schema are maintained separately and drift.

**Provider-native structured output (function calling / JSON mode).** Not
rejected — complementary. It improves the odds of a conforming response, but it
is the provider's guarantee, not the application's. Validation stays mandatory
regardless.

**Valibot / ArkType.** Reasonable alternatives. Zod chosen for ecosystem
maturity and familiarity; nothing in the design depends on the specific library.

---

## ADR-005: Do not introduce Redis or queues during the first vertical slice

**Status:** Accepted

### Context

"Agent runs are long-running, therefore they need a job queue" is a reasonable
prior. It is also, right now, false.

With mock providers a full run completes in milliseconds. There is no
long-running work to defer. Adding BullMQ means adding Redis, a worker process,
a job-state model that duplicates the run-state model, and a second place where
failures can hide. It also means local development and CI need Redis running
before a test can pass.

The genuine trigger for a queue is real provider latency — multi-minute runs
that cannot live inside a request lifecycle. That trigger has not fired.

### Decision

No Redis, no BullMQ, no background worker in the first vertical slice.

- The pipeline executes synchronously within the request lifecycle.
- Run state lives in PostgreSQL, which is the durable record regardless.
- Nothing requires a shared cache or a distributed lock: one process, one
  database.

### Consequences

**Positive**

- One less service to run locally, in CI and in deployment.
- Run state has one home, not two.
- Failures surface directly in the request rather than in a worker log.
- The full flow is testable in CI with no infrastructure.

**Negative**

- Long-running work would block a request.
- No automatic retry or backoff infrastructure.
- No scheduled or deferred execution.

**Mitigations**

- `runPipeline` is written as a plain function taking a run identifier. Moving
  it behind a queue later changes the caller, not the pipeline.
- Run state already lives in the database, so a worker would read the same
  record. No state migration is needed.
- The trigger is recorded in `ROADMAP.md`: real provider latency.

### Alternatives considered

**BullMQ + Redis now.** Rejected: infrastructure for a problem that does not
exist yet, at the cost of a mandatory service in every environment.

**PostgreSQL-backed queue (pg-boss, or `SELECT … FOR UPDATE SKIP LOCKED`).**
Deferred, and the likely first choice when the trigger fires — it needs no new
service. Still unnecessary today.

**Next.js `after()` / fire-and-forget.** Rejected: no durability. A crash loses
the run with no record of why, which is unacceptable in a system built on
auditability.

---

## ADR-006: Use human approval before code execution and PR creation

**Status:** Accepted

### Context

A fully autonomous pipeline is technically straightforward and commercially
tempting. It is also the reason engineering leads refuse to adopt these tools:
the failure mode is a large, plausible, wrong change landing without anyone
having decided that it should.

Two further considerations. First, requirement text and GitHub issue bodies are
untrusted input; if a model decides whether a run may proceed, prompt injection
becomes privilege escalation. Second, "the model checked its own work" is not
an audit trail — a run needs a recorded human decision to be accountable.

Approval must therefore be structural. Asking an agent to pause is not a
control; an agent that can choose to pause can choose not to.

### Decision

Three mandatory human approval gates, enforced by the orchestrator's state
machine:

| Gate | Position                          | Human decides                                   |
| ---- | --------------------------------- | ----------------------------------------------- |
| G1   | After Architect, before execution | Are the generated tasks correct and in scope?    |
| G2   | After the Quality Gate            | Do review, test and security results pass?      |
| G3   | Before Pull Request creation      | May this change leave the platform?             |

- Each decision records actor, timestamp, decision and comment.
- Rejection halts the run. It does not silently retry.
- No agent output, prompt or configuration can advance a run past a gate.
- The Quality Gate feeding G2 is a deterministic rule, not a model judgement.

### Consequences

**Positive**

- Scope errors are caught at the plan stage, before code is written — where
  they are cheapest.
- Every change carries a recorded human decision.
- Prompt injection cannot escalate into an unapproved change, because gates are
  not model-decided.
- The workflow matches how engineering teams already review work.

**Negative**

- Runs are not autonomous, and a run can stall waiting for a person.
- Three gates is friction, and friction invites pressure to remove them.
- Throughput is bounded by reviewer availability.

**Mitigations**

- Gates sit at genuine decision points, not at arbitrary intervals. Three is the
  minimum that covers: before writing code, after checking it, before publishing
  it.
- The UI presents each gate with the artifacts needed to decide, so approval is
  informed rather than reflexive.
- Any future reduction in gates requires a superseding ADR.

### Alternatives considered

**Fully autonomous execution.** Rejected: it is precisely the failure mode the
product exists to prevent, and it makes untrusted requirement text
security-relevant.

**A single approval at the end.** Rejected: by then the code is written. Scope
errors caught after implementation have already cost the implementation.

**Agent-based self-approval.** Rejected: not an audit trail, and not a control.
A model deciding whether a model's work may proceed is a loop, not a gate.

**Configurable auto-approval for "low-risk" changes.** Rejected for the MVP:
risk classification would itself be a model judgement, reintroducing the
problem one level down. Reconsider only with a deterministic risk rule.

---

## ADR-007: Use PostgreSQL and Prisma in a later Task, not during repository bootstrap

**Status:** Accepted

### Context

The MVP needs PostgreSQL and Prisma — that is settled in `ARCHITECTURE.md`. The
question is *when* they arrive.

Installing Prisma during the bootstrap task would mean adding a dependency, a
schema, a migration setup, a client generation step and a CI database service
before there is a single entity worth persisting. Prisma's `generate` step also
changes the shape of `pnpm build` and CI, and would need to be debugged
alongside a toolchain that is itself brand new. If something failed, the cause
would be ambiguous.

The bootstrap task has one job: establish a repository where `pnpm verify`
passes and CI is green. Every dependency added to it enlarges the surface over
which that claim has to hold.

### Decision

Repository bootstrap installs no database dependency. PostgreSQL and Prisma are
introduced in **TASK-004: Database Foundation**, together with:

- The Prisma schema for the entities that exist at that point.
- The initial migration.
- A test database configuration.
- A CI service container.
- The repository interfaces the application layer will depend on.

`ARCHITECTURE.md` documents the target data model; nothing is installed until
TASK-004.

### Consequences

**Positive**

- The bootstrap commit is small and independently verifiable.
- CI has no database service until something needs one.
- The repository clones and runs with `pnpm install && pnpm dev`, with no local
  PostgreSQL — which matters for a public portfolio repository.
- No unused dependency in `package.json`, consistent with the project's own
  rule.

**Negative**

- The data model stays on paper for two tasks, so a modelling problem surfaces
  later.
- TASK-004 is a larger task than the ones around it.
- Documentation describes a schema that does not yet exist — which every
  document states explicitly.

**Mitigations**

- The entity outline in `ARCHITECTURE.md` §5 is detailed enough that TASK-004 is
  implementation rather than design.
- TASK-004 is scoped to persistence only, with no product features attached, so
  its size is contained.

### Alternatives considered

**Install Prisma during bootstrap with an empty schema.** Rejected: an unused
dependency and a generation step in the build, contradicting the project's own
"no unused dependencies" rule.

**SQLite for the MVP, PostgreSQL later.** Rejected: PostgreSQL-specific
features (JSON operators, enums, constraint behaviour) are relevant to the
audit model, and a late engine swap risks subtle behavioural differences.
Docker makes local PostgreSQL cheap enough.

**A hosted database from day one.** Rejected: it introduces a credential and an
external dependency into a repository that currently needs neither.

---

## Related documents

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the design these decisions produce
- [`PRD.md`](./PRD.md) — scope these decisions serve
- [`ROADMAP.md`](./ROADMAP.md) — triggers for revisiting deferred decisions
- [`../AGENTS.md`](../AGENTS.md) — agent contracts and gates
