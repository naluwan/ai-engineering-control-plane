# AGENTS.md

Specification of the agents in the AI Engineering Control Plane.

> **Status: specification only.** None of the agents described here are
> implemented. This document defines the contracts that the implementation must
> satisfy; it does not describe existing behaviour. Implementation is tracked
> in [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## 1. Universal rules

These apply to every agent without exception.

### 1.1 Structured output

- Every agent returns a single JSON object matching a Zod schema owned by the
  application, not by the provider.
- The provider is asked for JSON; the application decides whether that JSON is
  acceptable. `schema.safeParse` is the only accepted entry point.
- A parse failure is a first-class failure. It is never patched with defaults,
  never coerced, never cast with `as`.
- Free-form prose is not an agent output. Prose belongs inside a schema field.

### 1.2 Retry limit

- At most **2 retries** per agent invocation (3 attempts total).
- A retry is only permitted for a transient failure: schema validation failure,
  malformed JSON, provider timeout, or a 5xx from the provider.
- A retry must feed the validation error back into the prompt. Retrying an
  identical prompt is not a retry strategy.
- Deterministic failures (invalid input, missing project, exceeded budget) are
  not retried.

### 1.3 Failure handling

- On final failure the agent run transitions to `FAILED` with a machine-readable
  reason and the last validation error.
- A failed agent never advances the workflow. The run halts and waits for a
  human.
- Partial output is discarded, not persisted as if it were valid.
- No silent fallback. An agent must never substitute an empty or default result
  for a failure. See ADR-004.

### 1.4 Audit logging

Every invocation records:

| Field                | Description                                        |
| -------------------- | -------------------------------------------------- |
| `agentRunId`         | Identifier for this invocation                     |
| `projectId`          | Owning project                                     |
| `agentType`          | Planner, Architect, Coder, …                       |
| `inputSnapshot`      | The exact input the agent received                 |
| `promptVersion`      | Version of the prompt template used                |
| `providerName`       | `mock` in the MVP; a real provider later           |
| `model`              | Model identifier, or `mock`                        |
| `rawResponse`        | Unparsed provider response                         |
| `validatedOutput`    | Parsed output, or `null` on failure                |
| `attempts`           | Number of attempts made                            |
| `status`             | `SUCCEEDED` / `FAILED` / `REJECTED_BY_HUMAN`       |
| `failureReason`      | Populated when `status` is `FAILED`                |
| `tokensIn` / `tokensOut` | Token usage; `0` for mock providers            |
| `costUsd`            | Estimated cost; `0` for mock providers             |
| `startedAt` / `finishedAt` | Timing                                       |

Audit records are append-only. Agents cannot delete or rewrite them.

### 1.5 Universal prohibitions

No agent may:

- Write to the filesystem outside the workspace assigned to its run.
- Execute arbitrary shell commands outside the defined execution surface.
- Read or emit secrets, environment variables, or credentials.
- Call the GitHub API directly. Only the PR Generator, through the platform's
  GitHub adapter, performs remote Git operations.
- Push to a branch, force-push, merge, or modify repository settings.
- Advance the workflow past a gate that requires human approval.
- Invoke another agent directly. The orchestrator owns sequencing. See ADR-002.
- Modify its own budget, retry limit, or audit records.

---

## 2. Human approval gates

The workflow stops and waits for a human at three points. Gates are enforced by
the orchestrator, not by agent self-restraint. See ADR-006.

| Gate | Position                          | Human decides                                    |
| ---- | --------------------------------- | ------------------------------------------------ |
| G1   | After Architect, before execution | Are the generated tasks correct and in scope?     |
| G2   | After the Quality Gate            | Do the review, test and security results pass?   |
| G3   | Before Pull Request creation      | May this change leave the platform?              |

Rules:

- A gate decision is recorded with actor, timestamp, decision and comment.
- Rejection at any gate halts the run. It does not silently retry.
- No agent, prompt, or configuration may bypass a gate.

---

## 3. Quality Gate

The Quality Gate is a deterministic rule evaluated by the orchestrator, not an
agent. It consumes Reviewer, Tester and Security output and produces a pass or
fail.

Fails if any of the following hold:

- Tester status is not `PASSED`.
- Security findings include any `CRITICAL` or `HIGH` severity item.
- Reviewer findings include any `BLOCKER` severity item.
- Any agent in the run finished with status `FAILED`.
- The diff touches a path outside the approved task's declared scope.

Fail means the run stops at G2. There is no automatic remediation loop in the
MVP.

---

## 4. Agents

### 4.1 Planner Agent

Turns an unstructured requirement into a structured problem statement.

**Input**

- Project metadata (name, description, tech stack summary).
- Raw requirement text, or an imported GitHub issue.
- Existing project constraints.

**Output** — `PlanSchema`

- `summary` — restatement of the requirement.
- `goals[]` — what success means.
- `nonGoals[]` — explicitly excluded.
- `assumptions[]`
- `openQuestions[]` — ambiguities requiring a human answer.
- `risks[]` — each with `description` and `severity`.
- `acceptanceCriteria[]` — each independently verifiable.

**Must not**

- Propose file changes, a technical design, or an implementation.
- Invent requirements that the input does not support.
- Resolve an ambiguity by guessing. Ambiguity goes into `openQuestions`.
- Read repository source code. Planning is requirement-level.

---

### 4.2 Architect Agent

Turns a plan into a technical approach and a set of executable tasks.

**Input**

- Validated Planner output.
- Repository structure summary and stack metadata.
- Architectural constraints from `docs/ARCHITECTURE.md`.

**Output** — `ArchitectureProposalSchema`

- `approach` — the chosen design.
- `alternativesConsidered[]` — each with `option` and `rejectionReason`.
- `affectedAreas[]` — layers and directories.
- `dataModelChanges[]`
- `tasks[]` — each with `title`, `description`, `scope[]`, `outOfScope[]`,
  `expectedFiles[]`, `acceptanceCriteria[]`, `testRequirements[]`,
  `dependsOn[]` and `estimatedComplexity`.
- `risks[]`

**Must not**

- Write or modify code.
- Emit a task that spans frontend, backend, database and agent layers at once.
- Emit a task whose acceptance criteria cannot be objectively verified.
- Introduce a dependency, service or infrastructure component that is not
  covered by an accepted ADR.
- Skip `dependsOn` when a task requires earlier work.

**Gate**: output goes to **G1**. No execution before approval.

---

### 4.3 Coder Agent

Implements exactly one approved task.

**Input**

- One approved task.
- The repository workspace for the run.
- Development guidelines.

**Output** — `CodeChangeSchema`

- `changedFiles[]` — each with `path`, `changeType` and `rationale`.
- `diff` — unified diff.
- `testsAdded[]`
- `notes`
- `outOfScopeObservations[]` — problems seen and deliberately left alone.

**Must not**

- Touch a file outside the task's declared scope.
- Modify, delete, skip or weaken any existing test.
- Relax `tsconfig.json`, ESLint configuration, or coverage thresholds.
- Add a dependency the task did not authorise.
- Commit, branch, push, or open a Pull Request.
- Write a secret into any file.
- Continue past a compilation failure by disabling the check.

---

### 4.4 Reviewer Agent

Reviews the produced diff for correctness and convention compliance.

**Input**

- Validated Coder output and the diff.
- The approved task, for scope comparison.
- Development guidelines.

**Output** — `ReviewResultSchema`

- `verdict` — `APPROVE` / `REQUEST_CHANGES`.
- `findings[]` — each with `file`, `line`, `severity`
  (`BLOCKER` / `MAJOR` / `MINOR` / `INFO`), `category` and `explanation`.
- `scopeViolations[]` — files changed outside the approved scope.
- `summary`

**Must not**

- Modify code. Review is read-only.
- Approve a diff containing a scope violation.
- Approve a diff that removes or disables a test.
- Report a finding without a concrete file reference.

---

### 4.5 Tester Agent

Executes the project's verification commands and reports the result.

**Input**

- The workspace after the Coder Agent's changes.
- The task's test requirements.

**Output** — `TestResultSchema`

- `status` — `PASSED` / `FAILED`.
- `commands[]` — each with `command`, `exitCode` and truncated `output`.
- `failedTests[]` — each with `name`, `file` and `message`.
- `coverage` — optional summary.
- `summary`

**Must not**

- Modify source code or test files to make the suite pass.
- Skip, filter or deselect tests.
- Report `PASSED` when any command exited non-zero.
- Run a command outside the project's declared script surface.
- Access the network beyond what the build requires.

---

### 4.6 Security Agent

Reviews the change for security problems.

**Input**

- The diff and the list of changed files.
- Dependency changes.
- The project's security boundary definition.

**Output** — `SecurityReviewSchema`

- `status` — `PASSED` / `FAILED`.
- `findings[]` — each with `severity`
  (`CRITICAL` / `HIGH` / `MEDIUM` / `LOW`), `category`, `file`, `evidence` and
  `remediation`.
- `secretsDetected[]` — location only, never the value.
- `dependencyConcerns[]`
- `summary`

**Must not**

- Reproduce a discovered secret in its output, logs, or the audit record.
- Modify code or attempt remediation.
- Downgrade a finding's severity to let a run proceed.
- Execute the code it is reviewing.

---

### 4.7 PR Generator

Assembles the Pull Request artifact from the run's record.

**Input**

- The approved task, the diff, and the Reviewer, Tester and Security outputs.
- The Quality Gate result.
- The G3 approval record.

**Output** — `PullRequestDraftSchema`

- `title` — conventional-commit style.
- `body` — summary, task reference, agent results, test results, security
  summary and reviewer notes.
- `branchName`
- `baseBranch`
- `checklist[]`
- `auditTrailRef` — pointer to the run's audit records.

**Must not**

- Create a real Pull Request in the MVP. The MVP output is a draft artifact
  only. See ADR-003.
- Run without a passing Quality Gate and a recorded G3 approval.
- Claim a check passed when the corresponding agent did not report success.
- Push to an existing branch, force-push, or target a protected branch without
  explicit configuration.
- Include secrets, tokens or raw environment values in the body.

---

## 5. Orchestration summary

```text
Requirement
  → Planner        → PlanSchema
  → Architect      → ArchitectureProposalSchema
  → [G1 human approval]
  → Coder          → CodeChangeSchema
  → Reviewer       → ReviewResultSchema
  → Tester         → TestResultSchema
  → Security       → SecurityReviewSchema
  → Quality Gate   (deterministic)
  → [G2 human approval]
  → [G3 human approval]
  → PR Generator   → PullRequestDraftSchema
```

Sequencing, retries, gates and the Quality Gate are owned by the orchestrator.
Agents are stateless functions from validated input to validated output.
