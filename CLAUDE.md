# CLAUDE.md

Working rules for Claude Code in the `ai-engineering-control-plane` repository.
These rules override default behaviour. Read them before touching any file.

---

## 1. Read before you modify

Before starting any task, read:

1. This file.
2. [`docs/PRD.md`](./docs/PRD.md) — what the product is and is not.
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — layer boundaries and
   where new code belongs.
4. [`docs/DEVELOPMENT_GUIDELINES.md`](./docs/DEVELOPMENT_GUIDELINES.md) —
   coding, testing and Git conventions.
5. [`docs/DECISIONS.md`](./docs/DECISIONS.md) — decisions that are already made
   and must not be silently reversed.
6. The specific `tasks/TASK-XXX-*.md` file you were asked to implement.

If the task touches agent behaviour, also read [`AGENTS.md`](./AGENTS.md).

If a task contradicts these documents, **stop and report the contradiction**.
Do not resolve it by guessing.

---

## 2. Scope discipline

- Implement exactly the task you were given. Nothing more.
- Every task file has an **Out of Scope** section. Treat it as binding.
- Do not expand a task because an adjacent problem looks easy or worth fixing.
- Do not modify files unrelated to the task, including formatting-only changes.
- Do not perform opportunistic refactoring. If you spot a real problem outside
  the task, record it in the final report and leave the code alone.
- Do not add dependencies that the task does not require. A dependency that is
  not imported by shipped code must not be in `package.json`.
- Do not introduce Redis, BullMQ, LangGraph, MCP, RAG, Kubernetes or a
  microservice split without an approved ADR. See ADR-001 and ADR-005.

---

## 3. TypeScript rules

- `strict` mode stays on. Never relax `tsconfig.json` to make an error go away.
- `any` is forbidden. If it is genuinely unavoidable, use `unknown` and narrow.
  In the rare case `any` is truly required, it must carry a comment explaining
  why, on the line above.
- No `@ts-ignore`. `@ts-expect-error` is permitted only with a comment stating
  the reason and the condition under which it can be removed.
- No non-null assertions (`!`) to silence the compiler. Narrow properly.
- Prefer explicit return types on exported functions.

---

## 4. Agent output must be validated

Every structured output produced by an LLM or a mock provider must be parsed
through a Zod schema before it is used or persisted.

- The schema is the contract. Types are derived from the schema
  (`z.infer`), not declared separately and hoped to match.
- Validation failure is a real, handled failure path. It must never fall
  through to a default object that hides the problem.
- No `as` casts on model output. No trusting the shape.

---

## 5. Testing rules

- The project follows a TDD/BDD discipline: write the failing test that
  describes the behaviour, then make it pass.
- Tests describe behaviour, not implementation details. Prefer role- and
  text-based queries in component tests.
- **Never** delete, skip, `.only`, or weaken an existing test to make a build
  pass. A failing test is information — diagnose it.
- Never lower a coverage threshold or disable a lint rule to get green.
- If a test is genuinely wrong, fix it and explain why in the report.

---

## 6. Verification is mandatory

Every task ends with all four commands passing:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm verify` runs all four in sequence.

Rules:

- Never report a task complete without having actually run these commands.
- Never disable a lint rule, skip a test, or loosen a TypeScript setting in
  order to make them pass.
- If a command fails for a reason outside the task's scope, stop and report it
  rather than working around it.

---

## 7. Git rules

- **Do not commit unless explicitly instructed.** The default is to leave
  changes in the working tree and report them.
- Do not push, create branches, create tags, rebase, amend, or rewrite history
  without an explicit instruction.
- Never use `git push --force` or `git push --force-with-lease`.
- Never commit secrets. No API keys, tokens, passwords or private keys in any
  file, including tests, fixtures and documentation. `.env.example` holds
  placeholders only.

### 7.1 Git operations require per-task authorization

Every Git operation that leaves the working tree — creating or switching a
branch, committing, pushing, opening or updating a Pull Request, merging,
enabling auto-merge, amending, rebasing or rewriting history — requires
**explicit authorization in the current user execution prompt**. Authorization
is granted per task and does not carry over to the next one.

- **A document is not an authorization.** A task file, an ADR, a roadmap entry
  or this file describing a branch, commit or push does not grant permission to
  perform it. Only the user's execution prompt for the run in progress does.
- Authorization granted for one task never extends to another, and never
  broadens: permission to commit is not permission to push, and permission to
  push a task branch is never permission to push `main`.
- Merging a Pull Request, enabling auto-merge, force-pushing, amending and
  rebasing each require their own explicit authorization. `git push --force` and
  `git push --force-with-lease` are prohibited outright.
- Without authorization, leave the changes in the working tree and report them.
  Never commit "to be safe".
- When a prompt's authorization is ambiguous, treat it as absent and report
  rather than acting.

---

## 8. Documentation rules

- Every meaningful architectural decision is recorded in
  [`docs/DECISIONS.md`](./docs/DECISIONS.md) as an ADR.
- Documents must stay consistent with each other and with the code. If you
  change the stack, the scope or a boundary, update every document that states
  it.
- Never document a feature as working when it is not. Status text must be
  honest about what is implemented.

---

## 9. Required report format

Finish every task with exactly this structure:

```markdown
## 1. Summary
What was implemented, in two or three sentences.

## 2. Files Changed
- path — created / modified / deleted, and why.

## 3. Decisions
Technical decisions made during the task and the reasoning.

## 4. Verification Results
- pnpm typecheck — PASS / FAIL / NOT RUN
- pnpm lint      — PASS / FAIL / NOT RUN
- pnpm test      — PASS / FAIL / NOT RUN
- pnpm build     — PASS / FAIL / NOT RUN

## 5. Out of Scope Items Observed
Problems noticed but deliberately not fixed.

## 6. Risks and Open Issues
Anything incomplete, uncertain, or needing a human decision.

## 7. Recommended Next Task
Exactly one task. Do not start it.
```

Report failures plainly. A `FAIL` reported honestly is worth more than a
`PASS` that was achieved by weakening the check.

---

## 10. Task status

A task's status records **execution and verification state**. It is not a Pull
Request state, and it does not mean "merged".

Permitted values:

| Status        | Meaning                                                             |
| ------------- | ------------------------------------------------------------------- |
| `Not started` | No work has begun.                                                  |
| `In progress` | Work is under way; acceptance criteria are not all met yet.          |
| `In review`   | Work is complete and awaiting human review.                          |
| `Completed`   | All five conditions below hold.                                      |
| `Blocked`     | Work cannot continue until an external dependency or decision lands. |

A task may be marked `Completed` only when **all** of the following are true:

1. Every acceptance criterion passes.
2. Every verification command passes.
3. Scope validation passes — nothing outside the declared scope was modified.
4. No unresolved blocking issue remains.
5. The Pull Request is ready to be merged.

Note what condition 5 does **not** say: the Pull Request does not have to be
merged. A task can be `Completed` while its Pull Request is still open.

The status written on a task branch is provisional. **Status on `main` becomes
the official source of truth only once the Pull Request is merged.** Until then,
the branch records the executing agent's claim, and the reviewer's job is to
check it.

Never mark a task `Completed` to make a report look finished. A `Blocked` or
`In review` status stated honestly is more useful than a `Completed` that a
reviewer has to disprove.
