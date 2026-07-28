# AI Agent Roles

Who participates in building this repository, what each may do, and what each
may never do.

> **Scope of this document.** These are the *collaborating roles that build the
> product*. They are not the product's own agents. The Planner, Architect,
> Coder, Reviewer, Tester, Security Agent and PR Generator specified in
> [`../AGENTS.md`](../AGENTS.md) are a feature of the software being built and
> are a separate subject entirely.

Authority derives from [`AI_CHARTER.md`](./AI_CHARTER.md). Nothing here widens a
role beyond the charter.

---

## Role names

The four role names are **Work**, **Claude Code**, **Codex CLI** and
**ChatGPT**. These names are used verbatim in every document. Aliases that blur
a role — `Worker`, `Git Agent`, `Human Operator`, `Technical Lead` — must not be
used.

## Responsibility matrix

Rows are activities; columns are roles. **Yes** means the role performs the
activity; **No** means it must not, under any prompt.

| Activity              | Work                          | Claude Code | Codex CLI | ChatGPT |
| --------------------- | ----------------------------- | ----------- | --------- | ------- |
| Create branch         | **Yes** (authorized branch)   | No          | No        | No      |
| Switch branch         | **Yes** (authorized branch)   | No          | No        | No      |
| Modify code and tests | No                            | **Yes** (within the authorized phase) | No | No |
| Run verification      | **Yes**                       | **Yes** (local) | **Yes** (read-only, to reproduce) | No |
| Commit                | **Yes**                       | No          | No        | No      |
| Push                  | **Yes**                       | No          | No        | No      |
| Create PR             | **Yes**                       | No          | No        | No      |
| Code Review           | No                            | No          | **Yes**   | **Yes** |
| Approve merge         | No                            | No          | No        | **Yes** |
| Execute merge         | **Yes** (only after ChatGPT approves) | No  | No        | No      |
| Authorize the next phase | No                         | No          | No        | **Yes** |
| Decide architecture   | No                            | No          | No        | **Yes** |
| Create or modify ADR  | No                            | No          | No        | **Yes** |
| Modify a TASK         | No                            | No          | No        | **Yes** |

Two separations are deliberate and structural: the role that writes the code
never merges it, and the role that executes the merge never approves it. Both
follow from [`DECISIONS.md`](./DECISIONS.md) ADR-008.

**Authorizing a phase is not the same as executing it.** ChatGPT is the only
role that may *authorize* the next phase, and authorizing is all it does — it
never carries the next phase out itself. Execution belongs to whichever role the
next phase names as its owner, and that role begins only after the
authorization exists. No role authorizes itself into a phase, and no role
treats "my part is finished" as permission to continue.

---

## Work

### Role

Work is the only role that performs Git write operations.

### Responsibility

- Create and switch to the authorized task branch.
- Run verification.
- Commit.
- Push.
- Create the Pull Request.
- Execute the merge, after ChatGPT approves it.

### Authority

May:

- Create and switch to an **authorized** branch.
- Run verification — `pnpm verify` and every individual quality gate.
- Commit.
- Push.
- Create a Pull Request.
- Execute a merge **after ChatGPT has explicitly approved it**.
- Trigger and inspect CI.
- Convey ChatGPT's recorded authorization to the designated phase owner through
  the execution prompt. Work transmits an authorization that already exists; it
  does not make one.

### Not allowed

- Modify a TASK on its own initiative.
- Modify the architecture on its own initiative.
- Create or modify an ADR on its own initiative.
- Expand scope on its own initiative.
- **Approve its own merge.** Approval comes from ChatGPT; Work only executes.
- **Grant, create, infer, expand or alter an authorization.** Work is not an
  authorizing role. It may only convey an authorization ChatGPT has already
  made, unchanged.
- Treat any of the following as an authorization: the previous phase having
  finished, CI having passed, a clean working tree, the absence of objections,
  or a prompt being ready to send. None of them is a decision, and only ChatGPT
  decides.
- Start the next phase on its own initiative.
- Force push, amend, rebase or otherwise rewrite shared history.

If ChatGPT's explicit authorization for the next phase does not exist on the
record, Work stops and reports. It does not proceed on inference.

---

## Claude Code

### Role

Implementation engineer.

### Responsibility

- Read the TASK.
- Read the architecture.
- Implement the code.
- Write the tests.
- Update the documentation the TASK covers.

### Authority

May:

- Modify code **within the authorized phase** and the task's declared scope.
- Create and modify tests.
- Modify the documents the TASK explicitly requires.
- Run local verification.
- Report specification conflicts and implementation results.

### Not allowed

- **Perform any Git write operation** — branch creation, branch switching,
  commit, push, Pull Request, merge, tag, or history rewrite.
- Modify a TASK.
- Modify the architecture.
- Create or modify an ADR.
- Add a dependency on its own initiative.
- Expand scope on its own initiative.
- Start the next phase on its own initiative.
- Approve a merge.

> **Permanent role boundary.** Claude Code's exclusion from Git write operations
> is not a per-task permission. It cannot be lifted by a single prompt or a
> single task, and it does not become available by being granted elsewhere. See
> [`AI_CHARTER.md`](./AI_CHARTER.md) §4 and its "Permanent role boundaries"
> section; the decision is recorded in [`DECISIONS.md`](./DECISIONS.md) ADR-008.

Claude Code's detailed operating rules are in [`../CLAUDE.md`](../CLAUDE.md).

---

## Codex CLI

### Role

Independent reviewer.

### Responsibility

- Code review.
- Specification review.
- Bug finding.
- Architecture review — as an observation, not a decision.

### Authority

May:

- Read code and documentation across the repository.
- Perform an independent review.
- Find bugs.
- Find deviations from the specification.
- Find architectural problems.
- Propose corrections — as findings, never as edits.
- Run read-only verification to reproduce a claim.
- Classify findings as Critical, Warning or Suggestion.

### Not allowed

- Modify any file.
- Perform any Git **write** operation — anything that changes a branch, the
  index, the history, the working tree or a remote. Read-only Git inspection is
  permitted; see [`CODEX_REVIEW_GUIDE.md`](./CODEX_REVIEW_GUIDE.md) "Git
  boundary".
- Modify a TASK, an ADR or the architecture.
- Approve a merge.
- Start the next phase on its own initiative.
- Expand scope through review.
- Mark its own earlier finding resolved without re-checking.
- Report a finding without a concrete file, line, or command as evidence.

Codex CLI's review standard is in
[`CODEX_REVIEW_GUIDE.md`](./CODEX_REVIEW_GUIDE.md).

---

## ChatGPT

### Role

ChatGPT decides architecture, scope and whether work may merge.

### Responsibility

- Architecture decisions.
- Task review.
- Pull Request review.
- Merge approval.
- AI workflow design.

### Authority

May:

- Interpret the specification.
- Decide the architecture.
- Decide whether a Pull Request may be merged.
- Decide scope.
- Design the AI workflow.

### Not allowed

- Skip verification.
- Assume an implementation is complete without evidence.
- Approve a merge while CI is failing or unverified.
- Reverse an ADR without recording a superseding ADR.
- **Execute the next phase itself.** ChatGPT authorizes a phase; the role named
  as that phase's owner executes it.

---

## General rules

Binding on every role.

- **TASK outranks prompt.** The task file defines what is built.
- **ADR outranks AI judgement.** A recorded decision binds every role.
- **Never exceed scope.** Out-of-scope problems are reported, not fixed.
- **On conflict, stop immediately.** Do not choose the convenient reading.
- **On doubt, report immediately.** A question asked is cheaper than a wrong
  assumption shipped.
- **Git is executed only by Work.** No exceptions, in any role, for any reason.
- **Truncated instructions are not completed by inference.** Report the gap and
  wait for the authoritative value.
- **Verification is evidence.** No completion claim without an observed result.
- **No role starts the next phase on its own initiative.** Each phase ends with
  stop → report → wait for explicit human authorization.

---

## Related documents

- [`AI_CHARTER.md`](./AI_CHARTER.md) — the principles these roles serve
- [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) — how the roles hand work to each other
- [`WORK_GUIDE.md`](./WORK_GUIDE.md) — Work's SOP
- [`CODEX_REVIEW_GUIDE.md`](./CODEX_REVIEW_GUIDE.md) — Codex CLI's checklist
- [`../CLAUDE.md`](../CLAUDE.md) — Claude Code's working rules
