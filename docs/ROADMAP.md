# Roadmap

Delivery sequence for the AI Engineering Control Plane.

**Current position:** Sprint 1, items 1 through 5 complete — TASK-001 through
TASK-005. The next item on this list is item 6, **TASK-006 Projects UI**;
TASK-007 and TASK-008 remain not started, and Sprint 1 is not finished.

TASK-007's dependency (TASK-004) is also satisfied, so it could be picked up
independently — but the listed order is TASK-006 next. Everything else on this
page is planned work.

Task status here reflects execution and verification state, not merge state.
See [`../CLAUDE.md`](../CLAUDE.md) §12.

Dates are deliberately absent. This is a portfolio project; the ordering and the
dependencies are the useful information, not a schedule.

---

## Sprint 1 — Vertical slice to a validated plan

Goal: a requirement submitted through the UI produces a persisted, schema-
validated plan and an approvable task set, driven entirely by mock providers.

| # | Item                      | Task     | Depends on | Outcome                                                                                     |
| - | ------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------- |
| 1 | Repository foundation     | TASK-001 | —          | Next.js + TypeScript strict + Tailwind + Vitest + ESLint + CI. `pnpm verify` green. **Done.** |
| 2 | Documentation baseline    | TASK-002 | 001        | All documents cross-checked for consistency. No engineering changes. **Done.**                |
| 3 | Application shell         | TASK-003 | 001        | Layout, navigation, shared UI primitives, route structure. No business features. **Done.**     |
| 4 | Database foundation       | TASK-004 | 001        | PostgreSQL + Prisma installed, schema for Project/Requirement/Plan, migrations, test DB. **Done.** |
| 5 | Projects API              | TASK-005 | 004        | Application use cases and route handlers for create/list/get, Zod-validated. **Done.**         |
| 6 | Projects UI               | TASK-006 | 003, 005   | Project list, detail and creation form wired to the API.                                       |
| 7 | Mock Planner contracts    | TASK-007 | 004        | `LlmProvider` interface, `PlanSchema`, deterministic mock provider, invocation audit record.    |
| 8 | Requirement planning flow | TASK-008 | 005, 006, 007 | Submit a requirement → run mock Planner → persist plan → display it.                        |

**Sprint 1 exit criteria**

- A project can be created through the UI and persisted.
- A requirement can be submitted and produces a validated, persisted plan.
- An invalid mock response fails the run and is recorded as a failure — no
  fallback output.
- Every agent invocation appears in the audit trail.
- `pnpm verify` green; CI green on `main`.

---

## Sprint 2 — Full mock run to a Pull Request draft

Goal: extend the slice from "a plan exists" to "a Pull Request draft is ready",
with all three human gates enforced.

| # | Item                       | Depends on | Outcome                                                                                  |
| - | -------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| 1 | Architect Agent            | Sprint 1   | `ArchitectureProposalSchema`, mock Architect, ArchitectureProposal and generated Task persistence with dependencies. |
| 2 | Task approval              | 1          | Gate G1: review, approve or reject a task set. Decisions recorded with actor and comment.  |
| 3 | Agent run model            | 2          | `AgentRun` entity, run state machine, synchronous pipeline execution.                      |
| 4 | Logs and cost tracking     | 3          | Structured logging with correlation IDs; per-invocation token and cost fields.             |
| 5 | Mock Coder / Reviewer / Tester / Security | 3 | Four mock agents producing validated artifacts, including deliberate failure fixtures. |
| 6 | Quality Gate               | 5          | Deterministic pass/fail from the four artifacts. Failure halts the run at G2.               |
| 7 | Mock PR draft              | 6          | Gates G2 and G3, then a `PullRequestDraftSchema` artifact assembled from the run record.    |

**Sprint 2 exit criteria**

- The full MVP flow runs end to end on mock providers in under 5 seconds.
- All three gates are enforced by the orchestrator and cannot be bypassed.
- A failing Quality Gate halts the run with a legible reason.
- A completed run is fully reconstructable from persisted audit records alone.

---

## Later phases

Ordered by dependency, not by priority. Each carries a trigger — the condition
that makes the work correct to start.

| Phase                        | Trigger                                              | Scope                                                                                       |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Real LLM providers**       | Mock flow proven end to end                          | Real provider adapters behind the existing interface; prompt templates and versioning; real token and cost accounting; rate-limit handling. No call-site changes. |
| **GitHub App**               | A run produces a diff worth pushing                  | App registration, installation flow, repository connection, issue import, branch creation, real Pull Request creation. Secret handling for installation tokens. |
| **Repository analysis**      | Agents need real repository context                  | Structure extraction, stack detection, convention inference, context assembly for prompts.   |
| **Isolated execution sandbox** | The Tester must run real generated code            | Container isolation, network egress control, resource limits, filesystem confinement. Required before any real code execution. |
| **Queue**                    | Real provider latency makes request-scoped runs unviable | Durable job queue and worker process; `runPipeline` moves behind it unchanged. Revisits ADR-005. |
| **Observability**            | More than one process to correlate                   | Distributed tracing, metrics, alerting on failed runs and cost anomalies.                    |
| **RAG**                      | Repository analysis exists and prompts exceed context | Embedding pipeline, vector store, retrieval evaluation. Not adopted without a measurable quality gain. |
| **MCP**                      | Agents need tools beyond input-to-output transformation | Evaluate MCP for standardised tool access.                                                |
| **LangGraph evaluation**     | The pipeline needs genuine branching or replanning cycles | Evaluate against the deterministic orchestrator. Revisits ADR-002. Adopted only if it removes complexity rather than relocating it. |

None of these begins while an earlier dependency is unmet. Each that reverses an
existing decision requires a new ADR recording why the trigger fired.

---

## Explicitly not planned

Multi-tenancy and billing, a mobile application, an agent marketplace,
autonomous merge without human approval, and Kubernetes-based deployment. See
[`PRD.md`](./PRD.md) §7.2 and [`ARCHITECTURE.md`](./ARCHITECTURE.md) §10.

---

## Related documents

- [`PRD.md`](./PRD.md) — scope and requirements
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — target design
- [`DECISIONS.md`](./DECISIONS.md) — ADR-001 … ADR-007
- [`../tasks/`](../tasks) — TASK-001 … TASK-008
