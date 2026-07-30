# Product Requirements Document

**Product:** AI Engineering Control Plane
**Category:** AI-Native Software Engineering Platform
**Status:** Sprint 1 backend foundation is implemented through TASK-005.
PostgreSQL/Prisma persistence and the create, list and get-by-id Projects API
are available. The Projects UI and the real agent execution workflow have not
been implemented yet, and Sprint 1 is not finished.

---

## 1. Product vision

Software teams are adopting coding agents faster than they are adopting a way
to supervise them. The result is a familiar failure: a large diff appears,
nobody can reconstruct the reasoning that produced it, and review degrades into
archaeology.

The AI Engineering Control Plane inverts that. A requirement is decomposed into
explicit, approvable tasks *before* code is written. Each step produces a
schema-validated artifact. Humans approve the transitions that carry risk. The
resulting Pull Request arrives with its full derivation attached.

The product is not a chatbot and does not aim to be. It is a control plane: the
supervisory layer that makes agent-driven engineering auditable enough to use
on code that matters.

---

## 2. Target users

### 2.1 Primary — Engineering lead / tech lead

Accountable for what merges. Needs to see how a change was derived, what was
checked, and where a human intervened. Will not adopt a tool that produces
unexplainable diffs.

### 2.2 Primary — Senior engineer

Willing to delegate mechanical work, unwilling to delegate judgement. Wants to
approve the plan, then review a scoped diff rather than supervise a stream of
tokens.

### 2.3 Secondary — Product / project manager

Wants requirement-to-change traceability without reading code.

### 2.4 Explicit non-user

Someone looking for a conversational coding assistant. That need is served well
by existing tools and is not what this product optimises for.

---

## 3. User problems

| ID | Problem                                                                                   |
| -- | ----------------------------------------------------------------------------------------- |
| P1 | Agent output is unreviewable: large, unscoped diffs with no recorded reasoning.             |
| P2 | There is no approval point between "requirement" and "code changed".                        |
| P3 | Agents silently expand scope and touch unrelated files.                                     |
| P4 | Claims about what was tested or reviewed are unverifiable.                                  |
| P5 | Failures are hidden behind plausible-looking fallback output.                               |
| P6 | Cost and token usage are invisible until the bill arrives.                                  |
| P7 | Nothing links a merged change back to the requirement that motivated it.                    |

---

## 4. Product positioning

> An auditable control plane that turns a software requirement into planned,
> reviewed, tested and traceable code changes — and finally into a Pull Request.

Positioning commitments:

- **Structured, not conversational.** Every step emits a typed artifact.
- **Human-gated, not autonomous.** Three approval gates are mandatory.
- **Auditable, not opaque.** Every invocation is recorded, including failures.
- **Honest, not optimistic.** No fallback output. A failure surfaces as a
  failure.

---

## 5. Core user journey

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

---

## 6. MVP goals

| ID    | Goal                                                                                 |
| ----- | ------------------------------------------------------------------------------------ |
| MG-01 | Prove the orchestration and approval model end to end without any real model calls.   |
| MG-02 | Make every agent artifact schema-validated and persisted.                             |
| MG-03 | Make the audit trail complete enough to reconstruct a run from the database alone.    |
| MG-04 | Enforce human approval gates structurally, not by convention.                         |
| MG-05 | Keep the provider boundary clean enough that swapping mock for real is a config change. |

`MG-*` identifies an MVP goal. `G1`, `G2` and `G3` are reserved throughout this
repository for the human approval gates defined in [`../AGENTS.md`](../AGENTS.md)
§2, and are never used for anything else.

Why mocks first: the expensive, risky part of this product is the orchestration,
the gates and the audit model — not the model call. Validating those against
deterministic mock providers is faster, cheaper and more testable. See ADR-003.

---

## 7. MVP scope

### 7.1 In scope

**Projects**

- Create, list and view a project.
- Project metadata: name, description, repository URL, stack summary.

**Requirements**

- Submit a free-text requirement against a project.
- View requirement history.

**Planning**

- Mock Planner produces a validated `PlanSchema` artifact.
- Mock Architect produces a validated `ArchitectureProposalSchema` artifact,
  including generated tasks.

**Tasks**

- Persist generated tasks with scope, out-of-scope, acceptance criteria and
  dependencies.
- Human approval gate G1 over the task set.

**Simulated execution**

- A simulated agent run producing Coder, Reviewer, Tester and Security
  artifacts from mock providers.
- Deterministic Quality Gate evaluation.
- Human approval gates G2 and G3.

**Outputs**

- A mock Pull Request draft artifact.
- Per-run audit log with token and cost fields (zero for mocks).

**Platform**

- PostgreSQL persistence via Prisma.
- Zod validation on every agent boundary.
- Structured application logging.

### 7.2 Explicit non-MVP scope

Not in the MVP, deliberately:

| Excluded                                   | Reason                                                        |
| ------------------------------------------ | ------------------------------------------------------------- |
| Real LLM provider integration              | Orchestration is validated with mocks first (ADR-003)          |
| Real GitHub App / GitHub API integration   | Requires an app registration and secret handling; later phase  |
| Actual code execution or a sandbox         | Executing generated code needs isolation the MVP does not have |
| Authentication, users, teams, RBAC         | Single-operator assumption for the MVP                         |
| Background job queue (Redis, BullMQ)       | Synchronous orchestration is sufficient at MVP volume (ADR-005) |
| Agent framework (LangGraph) or MCP         | Deterministic orchestration is simpler and more testable (ADR-002) |
| RAG / repository embedding                 | No retrieval need until real repository analysis exists        |
| Real-time streaming UI                     | Artifacts are reviewed after completion, not streamed          |
| Billing, quotas, multi-tenancy             | Not a hosted product                                           |
| Kubernetes, microservices, autoscaling     | A modular monolith is correct at this size (ADR-001)           |
| Mobile application                         | Desktop review workflow only                                   |

### 7.3 MVP core flow

```text
Create Project
→ Submit Requirement
→ Mock Planner
→ Mock Architect
→ Generate Tasks
→ Human Approval
→ Simulated Agent Run
→ Review/Test/Security Results
→ Mock PR Ready
```

Note the two differences from the full journey in section 5: no GitHub
connection, and no real Pull Request. Both are deliberate MVP exclusions.

---

## 8. Functional requirements

| ID    | Requirement                                                                                     | Priority |
| ----- | ----------------------------------------------------------------------------------------------- | -------- |
| FR-01 | A user can create a project with a name, description and repository URL.                         | Must     |
| FR-02 | A user can list projects and open a project detail view.                                         | Must     |
| FR-03 | A user can submit a free-text requirement against a project.                                     | Must     |
| FR-04 | Submitting a requirement invokes the Planner and persists a validated plan artifact.             | Must     |
| FR-05 | The Architect produces a validated proposal containing one or more tasks.                        | Must     |
| FR-06 | Every generated task records scope, out-of-scope, acceptance criteria and dependencies.          | Must     |
| FR-07 | Tasks cannot be executed until a human approves them at gate G1.                                 | Must     |
| FR-08 | Approval and rejection are recorded with actor, timestamp, decision and comment.                 | Must     |
| FR-09 | An approved task set can start a simulated agent run.                                            | Must     |
| FR-10 | A run produces Coder, Reviewer, Tester and Security artifacts, each schema-validated.            | Must     |
| FR-11 | The Quality Gate result is computed deterministically from those artifacts.                      | Must     |
| FR-12 | A failing Quality Gate halts the run and surfaces the reason.                                    | Must     |
| FR-13 | A run reaching G2 and G3 approval produces a mock Pull Request draft.                            | Must     |
| FR-14 | Every agent invocation is recorded with input, raw output, validated output, status and timing.  | Must     |
| FR-15 | Schema validation failure is recorded as a failure and never replaced with default output.       | Must     |
| FR-16 | Agent invocations retry at most twice, and only for transient failures.                          | Must     |
| FR-17 | Token and cost fields are recorded per invocation, zero for mock providers.                      | Should   |
| FR-18 | A user can view the complete audit trail of a run.                                               | Should   |
| FR-19 | A user can reject at any gate and see the run halted with the recorded reason.                   | Should   |
| FR-20 | Provider selection is configuration-driven with no call-site changes.                            | Should   |

---

## 9. Non-functional requirements

| ID     | Requirement                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------- |
| NFR-01 | TypeScript `strict` mode; `any` is prohibited without a documented justification.                |
| NFR-02 | `pnpm verify` (typecheck, lint, test, build) passes on every commit and in CI.                   |
| NFR-03 | Every agent boundary is validated by a Zod schema. No unvalidated model output is persisted.     |
| NFR-04 | No secrets in source control. `.env.example` contains placeholders only.                         |
| NFR-05 | Application logs are structured and never contain secrets or raw credentials.                    |
| NFR-06 | A mock run completes in under 5 seconds so the flow stays testable in CI.                        |
| NFR-07 | Audit records are append-only.                                                                   |
| NFR-08 | The provider boundary is an interface; no provider SDK type leaks into application code.         |
| NFR-09 | Layer boundaries in `docs/ARCHITECTURE.md` are respected; UI never touches persistence directly. |
| NFR-10 | No test is skipped, deleted or weakened to achieve a green build.                                |

---

## 10. Success metrics

Portfolio-scale metrics. This is not a hosted product and has no user base.

| Metric                                                                              | Target       |
| ----------------------------------------------------------------------------------- | ------------ |
| A complete requirement → mock PR run is reproducible from a clean checkout           | Yes          |
| A run is fully reconstructable from persisted audit records alone                    | Yes          |
| Agent boundaries covered by schema validation                                        | 100%         |
| Approval gates enforceable only through the orchestrator                             | 3 of 3       |
| `pnpm verify` green on `main`                                                        | Always       |
| Unhandled provider output shapes reaching the database                               | 0            |
| Mock end-to-end run duration                                                         | < 5 s        |

---

## 11. Acceptance principles

1. **Honest status.** A feature is documented as working only when it works. No
   document claims implemented behaviour that does not exist.
2. **No hidden fallback.** A failure is reported as a failure. Default or empty
   output is never substituted for an error.
3. **Verifiable acceptance criteria.** Every criterion is objectively checkable
   by a person or a test. "Works well" is not a criterion.
4. **Gates are structural.** Human approval is enforced by the orchestrator, not
   by asking an agent to behave.
5. **Scope is binding.** A task that touches files outside its declared scope
   fails review, regardless of the quality of the change.
6. **Traceability.** Every task links to its requirement; every run links to its
   task; every artifact links to its run.
7. **Reversible by design.** Any MVP decision that would be expensive to reverse
   requires an ADR before implementation.

---

## 12. Related documents

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design and boundaries
- [`ROADMAP.md`](./ROADMAP.md) — delivery sequence
- [`DECISIONS.md`](./DECISIONS.md) — ADR-001 … ADR-007
- [`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md) — engineering conventions
- [`../AGENTS.md`](../AGENTS.md) — agent contracts
