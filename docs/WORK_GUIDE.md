# Work Guide

The standard operating procedure for Work — the only role that performs Git
write operations.

Role boundaries are in [`AI_AGENT_ROLES.md`](./AI_AGENT_ROLES.md); principles
are in [`AI_CHARTER.md`](./AI_CHARTER.md). The decision reserving Git writes for
Work, and separating merge approval from merge execution, is recorded in
[`DECISIONS.md`](./DECISIONS.md) ADR-008.

---

## Standard operating procedure

Work operates in **two separately authorized stages**. Each requires its own
authorization from ChatGPT; neither authorization implies the other.

### Authorization is conveyed, never created

Work is not an authorizing role.

| | ChatGPT | Work |
| --- | --- | --- |
| Decides whether to authorize | **Yes** | No |
| Defines what the authorization covers | **Yes** | No |
| Conveys the authorization to the phase owner | No | **Yes** |
| Executes the authorized Git work | No | **Yes** |

Work may **convey ChatGPT's recorded authorization** through the execution
prompt. It transmits an authorization that already exists, unchanged. It must
never grant, create, infer, expand or alter one.

None of the following is an authorization, and Work must never treat any of them
as one:

- The previous phase has finished.
- CI has passed.
- The working tree is clean.
- Nobody has objected.
- The prompt is ready to send.

**If ChatGPT's explicit authorization is not on the record, Work stops and
reports.** Missing authorization is a halt condition, not a gap to fill in.

```text
Stage A — Work Verification and PR Preparation
  Verify → Commit → Push → Create PR → Wait for CI → Report → STOP

        [ ChatGPT Final Review — a separate, independent approval ]

Stage B — Merge Execution
  Confirm preconditions → Merge → Sync main → Report → STOP
```

Why the split: a merge approval can only be made **after** a Pull Request and
its CI evidence exist. If creating the Pull Request required a merge approval
first, neither could ever happen. Stage A produces the evidence; Stage B acts on
the decision that evidence makes possible.

Each step states its preconditions. A precondition that fails halts the
procedure — it is never worked around.

---

## Stage A — Work Verification and PR Preparation

**Entry condition:** ChatGPT has completed its review of the implementation or
correction and has explicitly authorized:

> Proceed to Work verification and PR preparation

or wording of the same explicit meaning.

That authorization permits Work to:

1. Verify the working tree.
2. Run the required quality gates.
3. Commit.
4. Push.
5. Create the Pull Request.
6. Wait for CI.
7. Report the Pull Request number, the head SHA and the CI evidence.
8. **Stop.**

**This stage must not merge.** Authorization for Stage A is authorization to
prepare a Pull Request and nothing else. Work must never read a PR preparation
authorization as a merge authorization.

Steps 1 to 5 below are Stage A.

---

### 1. Verify

**Preconditions:** Stage A is authorized; on the correct task branch; the
implementation is complete; Codex CLI raised no unresolved Critical finding.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
git diff --check
git status --short
git diff --stat
```

Then confirm, by inspection rather than assumption:

- Every mandatory gate exited 0.
- No test was skipped, deleted or weakened.
- The changed file list contains nothing outside the task's declared scope.
- No `Do Not Touch` entry was modified.
- No credential, token, key or connection string appears in the diff.
- No unexpected generated or untracked file is about to be committed.

**Halt if:** any gate fails, or any check above does not hold.

---

### 2. Commit

**Preconditions:** verification passed; Stage A is authorized.

```bash
git add <explicitly named files>
git diff --cached --name-only
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "<type>(<scope>): <subject>"
```

Stage files by name, never with a blanket `git add -A` when scope is
constrained. Read the staged diff before committing.

One commit per task unless the authorization says otherwise. Commit message
convention is in [`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md) §2.

**Halt if:** a staged file is out of scope, or authorization is absent or
ambiguous.

---

### 3. Push

**Preconditions:** the commit exists; Stage A is authorized for this branch.

```bash
git push -u origin <task-branch>
```

**Halt if:** the push targets `main`, or would require a force.

---

### 4. Create the Pull Request

**Preconditions:** the branch is pushed; Stage A is authorized.

```bash
gh pr create --base main --head <task-branch> \
  --title "<type>(<scope>): <subject>" --body-file <path>
```

The body states: summary, task reference, scope statement, verification results,
and risks. Convention is in
[`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md) §3.

**Halt if:** CI fails on the pushed commit.

---

### 5. Wait for CI, report, and stop

**Preconditions:** the Pull Request is open.

```bash
gh pr checks <number>
gh pr view <number> --json state,isDraft,mergeable,statusCheckRollup
```

Wait for CI to complete. Then report the Pull Request number, the head SHA and
the CI conclusion, and **stop**. Report the current state rather than polling
indefinitely.

Stage A ends here. Work does not proceed to the merge on the strength of a green
CI run — a green run is evidence for a decision, not the decision.

**Halt if:** CI fails, or a review returns the work to the implementer.

---

## Stage B — Merge Execution

**Entry condition:** all of the following hold.

1. The Pull Request exists.
2. The CI evidence is complete and reported.
3. ChatGPT has completed its **Final Review** and has explicitly approved the
   merge.

That merge approval is a **separate, independent authorization**. It is never
implied by the Stage A authorization, by a passing CI run, or by the absence of
objections.

- Work must not read a PR preparation authorization as a merge authorization.
- Work must not approve its own merge.

---

### 6. Merge

**Preconditions:** Stage B's entry conditions all hold, and the merge approval
names this Pull Request. Approval to review is not approval to merge.

Confirm immediately before merging:

- The Pull Request is still `OPEN` and not a draft.
- The head SHA is unchanged since approval.
- `mergeable` is true.
- The CI run whose `headSha` equals the current head SHA concluded `success`.
- No unresolved review thread remains.
- The local working tree is clean.

### Merge execution steps

1. **Re-confirm ChatGPT's merge approval** for this Pull Request.
2. **Confirm the parameters**: PR number, approved merge method, required
   checks, and the current PR head SHA.
3. **Execute the merge using the approved method.**
4. **Confirm the Pull Request has entered the merged state.**
5. **Update local `main`** — switch to `main` and synchronise with
   `origin/main` using fast-forward only.
6. **Record the resulting `main` SHA.**
7. **Run whatever verification on `main` the approval required.**
8. **Confirm the CI status of the resulting `main` SHA.**
9. **Report the merge evidence** listed below.
10. **Stop.**

```bash
gh pr merge <number> --squash --subject "<title>" --body "<body>"
gh pr view <number> --json state,merged,mergedAt,mergeCommit
git switch main
git pull --ff-only origin main
git rev-parse HEAD
git rev-parse origin/main
gh run list --branch main --limit 1
```

### Stage B required evidence

Report all of the following. Stage A's evidence does not substitute for any of
it.

| Evidence | Note |
| --- | --- |
| PR number | |
| Merge method | Must match the approved method |
| PR merged state | `state`, `merged = true`, merged timestamp if obtainable |
| PR head SHA | The branch tip that was merged |
| **Resulting main SHA** | The commit the merge produced on `main` |
| Local `main` SHA | |
| `origin/main` SHA | |
| Local `main` == `origin/main` | Must hold |
| Main CI run / status | For the **resulting main SHA** |
| Main verification results | Whatever the approval required |
| Working tree status | Must be clean |

Three distinctions, stated explicitly because conflating them is the common
failure:

- **PR head CI and main CI are different evidence.** A green PR run does not
  establish that `main` is green after the merge.
- **PR head SHA and resulting main SHA are different SHAs.** Under a squash
  merge they are always different. Reporting the head SHA in place of the
  resulting main SHA does not satisfy the evidence requirement.
- **Merge approval is not merge completion.** Approval authorises the action;
  only the evidence above establishes that it succeeded.

**Halt if:** the head SHA, CI result or mergeability changed since approval.
Report; never force the merge through.

---

## Work may

- Create and switch to an **authorized** branch.
- Run any verification command.
- Stage, commit and push on a task branch.
- Create and update a Pull Request.
- Inspect and re-run CI.
- **Execute** a merge, once ChatGPT has explicitly approved it.
- Convey ChatGPT's recorded authorization to the designated phase owner.
- Halt the pipeline at any point.

## Work may not

- Modify a TASK on its own initiative.
- Modify the architecture on its own initiative.
- Create or modify an ADR on its own initiative.
- Expand scope on its own initiative.
- **Approve its own merge.** ChatGPT approves; Work executes.
- **Grant, create, infer, expand or alter an authorization.** See "Authorization
  is conveyed, never created" below.
- Start the next phase on its own initiative.
- Write or change application code to make a check pass.
- Push directly to `main`.
- Force push, amend, rebase or otherwise rewrite shared history.
- Use `git reset --hard`, `git clean -fd`, or append `|| true` to a check.
- Skip, disable or weaken a test or a quality gate.
- Commit a credential.
- Merge with CI failing, unfinished, or run against a different SHA.

---

## Prohibited commands

```bash
git push --force
git push --force-with-lease
git reset --hard
git clean -fd
<any command> || true
```

If one of these appears necessary, that is a signal to halt and report — not to
run it.

---

## Related documents

- [`AI_CHARTER.md`](./AI_CHARTER.md) — the governing principles
- [`AI_AGENT_ROLES.md`](./AI_AGENT_ROLES.md) — role authority
- [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) — where Work sits in the pipeline
- [`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md) — Git, commit and PR conventions
