# AI Workflow

How a task travels from assignment to merged code.

Roles are defined in [`AI_AGENT_ROLES.md`](./AI_AGENT_ROLES.md). Principles that
govern every step are in [`AI_CHARTER.md`](./AI_CHARTER.md).

---

## Workflow overview

```text
Work
  ↓
Claude Code
  ↓
Codex CLI
  ↓
ChatGPT Review
  ↓
Work Verify
  ↓
PR
  ↓
ChatGPT Final Review
  ↓
Work Merge
```

The pipeline is sequential. A step never starts before the previous one has
produced its output, and any step may halt the pipeline.

---

## Step 1 — Work: assign the task

| | |
| --- | --- |
| **Owner** | Work |
| **Input** | A task file in `tasks/`, and a decision from ChatGPT on which task is next |
| **Output** | A task branch, and an execution prompt conveying ChatGPT's recorded authorization to Claude Code |
| **Stop condition** | Working tree not clean; branch already exists; the task's dependencies are not complete; the task file is missing or truncated |

The branch is named after the task, per
[`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md) §1.

---

## Step 2 — Claude Code: implement

| | |
| --- | --- |
| **Owner** | Claude Code |
| **Input** | The task file, the architecture, the ADRs, the guidelines, the current source |
| **Output** | Code and tests in the working tree, plus a report in the fixed format |
| **Stop condition** | Task contradicts a document; scope is ambiguous; an instruction is truncated; a required dependency is unauthorized; a quality gate fails for a reason outside the task's scope |

Claude Code leaves changes **uncommitted**. It does not touch Git. Its detailed
process is in [`../CLAUDE.md`](../CLAUDE.md).

---

## Step 3 — Codex CLI: independent review

| | |
| --- | --- |
| **Owner** | Codex CLI |
| **Input** | The working tree diff, the task file, the architecture and the guidelines |
| **Output** | Findings classified Critical / Warning / Suggestion, each with file, line and evidence |
| **Stop condition** | Any Critical finding — the pipeline returns to Step 2 |

Codex CLI modifies nothing. Its checklist is in
[`CODEX_REVIEW_GUIDE.md`](./CODEX_REVIEW_GUIDE.md).

---

## Step 4 — ChatGPT: review

| | |
| --- | --- |
| **Owner** | ChatGPT |
| **Input** | Claude Code's report, Codex CLI's findings, the task's acceptance criteria |
| **Output** | A decision — proceed, or return to Step 2 with specific corrections |
| **Stop condition** | An acceptance criterion is unmet; a Critical finding is unresolved; the change exceeds scope; an architectural decision is required that no ADR covers |

---

## Step 5 — Work: verify

| | |
| --- | --- |
| **Owner** | Work |
| **Input** | The approved working tree |
| **Output** | Observed results for every mandatory quality gate, plus a scope check |
| **Stop condition** | Any gate fails; the diff contains a file outside the task's scope; a secret appears in the diff |

Mandatory quality gates, in order:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
```

A task may prepend environment preparation. No task may remove, replace,
reorder or skip a gate.

---

## Step 6 — Work: commit, push, open the PR

| | |
| --- | --- |
| **Owner** | Work |
| **Input** | A verified working tree and explicit authorization for this run |
| **Output** | One commit, pushed to the task branch, and an open Pull Request |
| **Stop condition** | Authorization absent or ambiguous; CI fails on the pushed commit |

Procedure is in [`WORK_GUIDE.md`](./WORK_GUIDE.md).

---

## Step 7 — ChatGPT: final review

| | |
| --- | --- |
| **Owner** | ChatGPT |
| **Input** | The Pull Request, its diff, its CI result, and the accumulated reports |
| **Output** | Merge approval, or a return to Step 2 |
| **Stop condition** | CI not green; an unresolved review thread; the PR claims something the evidence does not support |

---

## Step 8 — Work: merge

| | |
| --- | --- |
| **Owner** | Work |
| **Input** | Merge approval, a green CI run on the PR head SHA, a mergeable PR |
| **Output** | The resulting merged or squashed commit on `main`, plus the merge completion evidence below; the task status becomes the official record |
| **Stop condition** | Head SHA changed since approval; CI no longer green; mergeability changed |

Merging requires its own explicit authorization. Approval to review is not
approval to merge.

### Merge completion evidence

Step 8 is not complete until all four of the following are reported. Stage A's
evidence does not satisfy any of them.

1. **Merge method** — which method was actually used: squash merge, merge
   commit, or rebase merge. It must match the approved method.

2. **Resulting main SHA** — the actual commit SHA produced on `main` by the
   merge. **The PR head SHA is not the resulting main SHA**, and reporting the
   head SHA in its place does not satisfy this requirement. Under a squash merge
   the two are always different.

3. **PR merged state** — the Pull Request's `state`, `merged = true`, and the
   merged timestamp or equivalent evidence where obtainable.

4. **Main CI evidence** — the CI status of the run whose head SHA equals the
   **resulting main SHA**. **PR head CI is different evidence and does not
   substitute for main CI.** A green PR run says the branch was fine before the
   merge; it says nothing about `main` after it.

Also confirm and report:

- Local `main` has been synchronised with `origin/main`.
- Local `main` SHA equals `origin/main` SHA.
- The `main` working tree is clean.
- Any verification the merge approval required on `main` has been run, with its
  results.

Three distinctions this section exists to enforce:

- PR head SHA ≠ resulting main SHA.
- PR head CI ≠ main CI.
- Merge approval ≠ merge completion. Approval authorises the action; only the
  evidence above establishes that it succeeded.

---

## Phase gates

### The universal rule

Every phase ends the same way, without exception:

```text
1. 停止   — stop
2. 回報   — report
3. 等待明確人工授權 — wait for explicit human authorization
```

No role starts the next phase on its own initiative, however obvious the next
step appears and however complete the current one feels. "The work is done, so I
continued" is a violation, not efficiency. Recorded in
[`DECISIONS.md`](./DECISIONS.md) ADR-008.

### The three gates

| Gate | Position      | Question answered                                  | Decided by |
| ---- | ------------- | -------------------------------------------------- | ---------- |
| **P1** | End of Step 4 | Is the implementation correct and in scope?        | ChatGPT    |
| **P2** | End of Step 5 | Does the evidence support the claim of completion? | Work       |
| **P3** | End of Step 7 | May this change land on `main`?                    | ChatGPT    |

A gate decision is recorded in the report or the Pull Request, together with the
evidence it rested on. A gate is never passed on assertion alone — see
[`AI_CHARTER.md`](./AI_CHARTER.md) §11.

---

## Phase results

Every phase concludes with exactly one of three results. These definitions are
canonical: other documents reference them rather than restating them.

### PASS

- Every requirement of the phase is complete.
- No undecided conflict remains.
- All required verification passed.
- Nothing outside scope was touched.

### PARTIAL

- Part of the work is complete, **and** at least one of:
  - a question requires a human decision;
  - required verification could not be completed;
  - one or more requirements remain unfinished.

### FAIL

- The phase could not be completed; or
- a blocking error occurred; or
- the execution environment was unusable; or
- the result of the changes is untrustworthy or cannot be verified.

Never upgrade a result to make a report read better. A PARTIAL that names its
open question is more useful than a PASS a reviewer has to disprove.

---

## Halting

Any role may halt the pipeline at any step. Halting is not failure — it is the
mechanism that keeps a wrong assumption from propagating.

On halting, the role reports: where it stopped, why, what evidence it has, and
what decision it needs. It does not attempt a workaround.

---

## Related documents

- [`AI_CHARTER.md`](./AI_CHARTER.md) — the governing principles
- [`AI_AGENT_ROLES.md`](./AI_AGENT_ROLES.md) — role authority
- [`WORK_GUIDE.md`](./WORK_GUIDE.md) — Work's SOP
- [`CODEX_REVIEW_GUIDE.md`](./CODEX_REVIEW_GUIDE.md) — review standard
- [`../CLAUDE.md`](../CLAUDE.md) — Claude Code's working rules
