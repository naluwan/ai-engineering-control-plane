# Codex CLI Review Guide

The review standard for the independent reviewer role.

Codex CLI reads and reports. It modifies no file, and it performs **no Git write
operation**. Role boundaries are in
[`AI_AGENT_ROLES.md`](./AI_AGENT_ROLES.md); principles are in
[`AI_CHARTER.md`](./AI_CHARTER.md); the decision establishing this read-only
reviewer role is recorded in [`DECISIONS.md`](./DECISIONS.md) ADR-008.

---

## Git boundary

Reviewing requires reading repository state, so read-only Git inspection is
**permitted and expected**. Changing repository state is not.

**Permitted — read-only Git inspection:**

```bash
git status
git diff
git log
git show
git branch --show-current
git rev-parse
git ls-files
git grep
```

**Prohibited — every Git write operation**, meaning anything that changes a
branch, the index, the history, the working tree, or a remote:

```bash
git add        git commit     git push       git merge
git rebase     git reset      git restore    git stash
git cherry-pick  git tag      git switch     git checkout
```

Also prohibited: creating or deleting a branch, amending, force pushing,
changing a remote, `gh pr create` and `gh pr merge`.

The test is the same one every role uses: if the command would change repository
state, Codex CLI does not run it; if it only reads state, it may. Codex CLI is
never described as able to modify files or Git state.

---

## Review inputs

- The working tree diff under review.
- The task file the change claims to implement.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`DECISIONS.md`](./DECISIONS.md).
- [`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md).
- The implementer's report.

A review that has not read the task file is not a review.

---

## Review checklist

### 1. Specification

- Does the change implement what the task specifies?
- Is every acceptance criterion met, and demonstrably so?
- Does the report's claim match what the diff actually does?
- Is anything claimed complete that is not?

### 2. Architecture

- Does the change respect the layer boundaries in `ARCHITECTURE.md` §2?
- Do dependencies point inward only?
- Does any decision contradict a recorded ADR?
- Was an architectural choice made that should have been an ADR first?

### 3. Dependency

- Was a dependency added, and did the task authorize it?
- Is every added dependency imported by shipped code?
- Was a prohibited package introduced — Redis, BullMQ, LangGraph, MCP, a
  component library, a state management library?

### 4. Layer

- Does the presentation layer reach into infrastructure?
- Does a domain file import a framework or a Prisma type?
- Does an application module depend on a concrete adapter rather than an
  interface?

### 5. Naming

- Do names describe what the thing is, in the vocabulary the codebase already
  uses?
- Is one concept given two names, or two concepts one name?
- Do file names match their exported component or module?

### 6. Error handling

- Are expected failures modelled as return values rather than thrown?
- Is any error swallowed, or converted to `null` to satisfy a type?
- Is there a fallback that hides a failure — a default object, an empty array,
  a retry that pretends?
- Do error messages carry enough context to diagnose, and no secret?

### 7. Security

- Does any tracked file contain a credential, token, key or connection string?
- Is untrusted input validated before use?
- Can a client-side path read a server-only value?
- Does an error response leak an internal detail to the caller?

### 8. Performance

- Is there an obvious N+1 query or an unbounded loop over external calls?
- Is work repeated per render that could be computed once?
- Is a payload fetched or rendered that the view does not use?

Performance findings are Suggestions unless a concrete, reachable degradation is
demonstrated.

### 9. Test coverage

- Is new behaviour covered by a test that would fail without the change?
- Do tests assert behaviour, or implementation detail?
- Was any test skipped, deleted, weakened, or replaced by a snapshot?
- Is a failure path tested, not just the happy path?

### 10. Maintainability

- Would a reader unfamiliar with the change understand why it is shaped this
  way?
- Is there duplicated logic that will drift?
- Is complexity present that the task did not require?

---

## Severity classification

Every finding carries exactly one severity. The classification is not a matter
of taste — it determines whether the pipeline halts.

### Critical — halts the pipeline

The change must not proceed. Returns to the implementer.

- An acceptance criterion is not met.
- The report claims something the code does not do.
- A layer boundary or an ADR is violated.
- A secret appears in a tracked file.
- A test was skipped, deleted or weakened.
- A quality gate does not actually pass.
- Work was done outside the task's declared scope.
- An unauthorized dependency was added.
- A failure is silently swallowed or replaced by a fallback.
- Data loss, a security hole, or a crash on a reachable path.

### Warning — must be resolved or explicitly accepted

The change may proceed only if the decision authority records why.

- A convention in `DEVELOPMENT_GUIDELINES.md` is broken without a stated reason.
- Error handling is present but imprecise.
- A test covers the happy path only.
- Naming is inconsistent with the surrounding code.
- Duplicated logic likely to drift.
- A documented behaviour and the implementation disagree in a minor way.

### Suggestion — optional

Recorded for the future. Never blocks a merge, and never expands the current
task.

- A readability or structure improvement.
- A performance idea without demonstrated impact.
- A refactor that belongs in its own task.
- A documentation clarification.

---

## Finding format

Every finding states:

```text
Severity:  Critical | Warning | Suggestion
Category:  Specification | Architecture | Dependency | Layer | Naming |
           Error Handling | Security | Performance | Test Coverage |
           Maintainability
Location:  path/to/file.ts:line
Evidence:  what was observed — a code excerpt, a command output, a missing test
Impact:    what goes wrong, concretely
Action:    what would resolve it
```

A finding without a location and evidence is not reportable. "This looks
fragile" is not a finding.

---

## Reviewer conduct

- Review the change, not the implementer.
- Verify before asserting. If a claim can be checked by running something, run
  it.
- Do not raise a finding that is really a preference.
- Do not expand scope through review. A real problem outside the task is a
  Suggestion with a note that it needs its own task.
- Report an empty review honestly. Finding nothing is a valid outcome; inventing
  a finding to look thorough is not.

---

## Related documents

- [`AI_CHARTER.md`](./AI_CHARTER.md) — the governing principles
- [`AI_AGENT_ROLES.md`](./AI_AGENT_ROLES.md) — reviewer authority and limits
- [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) — where review sits in the pipeline
- [`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md) — the conventions being checked
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the boundaries being checked
