# Development Guidelines

Engineering conventions for `ai-engineering-control-plane`. These are binding.
`pnpm verify` and CI enforce the mechanical parts; the rest is enforced at
review.

---

## 1. Git branch strategy

Trunk-based, short-lived branches off `main`.

- `main` is always releasable and always green.
- No direct commits to `main` after the bootstrap commit.
- One branch per task, named after the task:

```text
feat/task-003-application-shell
fix/task-005-projects-api-validation
docs/task-002-documentation-baseline
chore/task-001-repository-foundation
```

Prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`.

- Rebase onto `main` before opening a Pull Request; do not merge `main` into a
  feature branch repeatedly.
- Never rewrite history on `main`. `--force` and `--force-with-lease` are
  prohibited against shared branches.
- Delete the branch after merge.

---

## 2. Commit convention

[Conventional Commits](https://www.conventionalcommits.org/).

```text
<type>(<scope>): <subject>

[body]

[footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`,
`perf`, `build`.

Rules:

- Subject in the imperative mood, lower case, no trailing period, ≤ 72 chars.
- One logical change per commit. A commit that both refactors and adds a feature
  is two commits.
- The body explains *why*, not *what* — the diff already says what.
- Reference the task in the footer: `Refs: TASK-004`.
- Never commit commented-out code, debug output, or `.only` on a test.
- Never commit a secret. If one is committed, rotate it first, then remove it.

Examples:

```text
feat(projects): add project creation use case

Refs: TASK-005

fix(agents): reject planner output that fails schema validation

Previously an invalid response fell through to an empty plan, which made
the run look successful. Validation failure now fails the run.

Refs: TASK-007
```

---

## 3. Pull Request convention

Title follows the commit convention. Body must contain:

1. **Summary** — what changed and why.
2. **Task reference** — `TASK-XXX`.
3. **Scope statement** — what was deliberately left alone.
4. **Verification** — the four command results.
5. **Screenshots** — for any UI change.
6. **Risks** — anything a reviewer should look at closely.

Rules:

- One task per Pull Request.
- No unrelated file changes, including reformatting.
- CI must be green before review is requested.
- A PR that grows beyond its task is split, not explained away.
- Merge with squash; the squash message follows the commit convention.

---

## 4. TypeScript rules

- `strict` is permanently on. Loosening `tsconfig.json` to pass a check is
  prohibited.
- **`any` is forbidden.** Use `unknown` and narrow. If `any` is genuinely
  unavoidable, it carries a comment on the preceding line explaining why and
  what would remove it.
- No `@ts-ignore`. `@ts-expect-error` requires a comment with the reason and the
  removal condition.
- No non-null assertions (`!`) used to silence the compiler. Narrow explicitly.
- Exported functions declare their return type.
- Prefer `type` for unions and object shapes, `interface` for contracts intended
  to be implemented.
- Domain types are inferred from Zod schemas via `z.infer`, never duplicated by
  hand.
- No barrel `index.ts` files that re-export whole directories; they obscure the
  dependency graph.
- Discriminated unions over optional-field soup for state.

---

## 5. React rules

- Server Components by default. `"use client"` only when the component needs
  state, an effect, or a browser API — and then at the smallest possible
  boundary.
- Components are functions. No class components.
- Props are typed explicitly. No `React.FC`.
- One component per file; the file is named after the component.
- No business logic in components. Extract to the application layer or a hook.
- Keys are stable identifiers, never array indices.
- Effects are for synchronising with external systems. Deriving state in an
  effect is a bug — compute it during render.
- Accessibility is not optional: semantic elements, labelled controls, and
  headings in order. Component tests query by role.

---

## 6. Next.js rules

- App Router only. No Pages Router.
- Route handlers validate their input with Zod before doing anything else.
- Server Actions and route handlers call the application layer. They never
  import Prisma or a provider adapter directly.
- No secret is ever read in a Client Component. `NEXT_PUBLIC_*` is for genuinely
  public values only.
- Caching and revalidation are explicit and commented where non-obvious.
- `next/image` for images, `next/font` for fonts.
- No custom Turbopack configuration unless a specific problem requires it, and
  then with an ADR.

---

## 7. State management rules

Default to no library. Most state is server state or local component state.

### 7.1 TanStack Query — boundary

Use it for **server state** in Client Components: fetching, caching,
invalidation and mutation status of data owned by the server.

Do not use it for:

- Data that can be fetched in a Server Component. Prefer the server.
- Client-only UI state such as an open dialog or a form draft.
- As a general-purpose cache for values that are not server-owned.

### 7.2 Zustand — boundary

Use it for **client-only state shared across unrelated components**: for
example a run-detail viewer's panel layout.

Do not use it for:

- Server data. That is TanStack Query's job, or the server's.
- State used by a single component. Use `useState`.
- State that can be lifted one level. Prefer props.
- As an event bus or a place to hide business rules.

Neither library is added until a task genuinely needs it. See the
"no unused dependencies" rule below.

---

## 8. Zod validation

Zod is the single validation mechanism. Validated boundaries:

1. HTTP request bodies, search params and form input.
2. Provider and LLM output, before use or persistence.
3. Environment configuration, at startup.

Rules:

- `safeParse`, not `parse`, inside pipelines. Handle the failure branch.
- Types come from the schema via `z.infer`.
- Schemas live next to the module that owns the boundary, not in a global bag.
- Never `as`-cast around a validation failure.
- Never substitute a default object for a parse failure. See §11.
- Agent schemas are versioned, and the version is recorded with the artifact.

---

## 9. Error handling

- Distinguish **expected** failures (validation, not found, rejected at a gate)
  from **unexpected** ones (bug, provider outage). Expected failures are modelled
  as return values; unexpected failures throw.
- Application use cases return a discriminated result rather than throwing for
  expected outcomes.
- Never swallow an error. `catch` blocks either handle meaningfully or rethrow
  with context.
- Never `catch` and return `null` to make a type check pass.
- Error messages carry enough context to diagnose without a debugger, and never
  contain a secret.
- Provider errors are translated into the application taxonomy
  (`TRANSIENT`, `INVALID_OUTPUT`, `RATE_LIMITED`, `PERMANENT`) inside the
  adapter.
- Retries: at most 2, transient failures only, with the error fed back into the
  next attempt.

---

## 10. Logging

- Structured JSON only. No bare `console.log` in shipped code.
- Every log carries `correlationId`, plus `projectId`, `runId` and `agentType`
  where applicable.
- Levels: `error` (needs attention), `warn` (degraded but handled), `info`
  (state transitions), `debug` (development only).
- **Never log**: API keys, tokens, passwords, `.env` values, full request
  headers, or raw provider responses at `info` or above.
- Log the transition, not the payload. Payloads belong in the audit trail.

---

## 11. No hidden fallback

This deserves its own rule because it is the most common way an agent platform
becomes untrustworthy.

Prohibited:

- Returning an empty array, an empty object, or a default when parsing fails.
- `catch { return null }` where the caller cannot distinguish "none" from
  "broken".
- Retrying until something parses and pretending the result is authoritative.
- Reporting a step as succeeded when a downstream check did not run.

Required: a failure surfaces as a failure, with its reason, at the point it
occurs.

---

## 12. TDD / BDD

- Write the failing test first. It documents the intended behaviour.
- Test names read as behaviour:
  `it("rejects planner output that fails schema validation")`.
- Given / When / Then structure inside the test body.
- Test behaviour, not implementation. A refactor that preserves behaviour must
  not break a test.
- **Never** delete, skip, `.only`, or weaken a test to get a green build. Never
  lower a coverage threshold for the same reason.
- Every bug fix starts with a regression test that fails before the fix.

---

## 13. Test layers

| Layer           | Tool                      | Scope                                                        |
| --------------- | ------------------------- | ------------------------------------------------------------ |
| **Unit**        | Vitest                    | Domain rules, schemas, pure functions, state machines. No I/O. |
| **Component**   | Vitest + RTL + jsdom      | A React component's rendered behaviour. Query by role.        |
| **Integration** | Vitest                    | Use case → repository → database, with real Prisma against a test database. Mock providers only. |
| **E2E**         | Playwright — **not yet installed** | A full user journey through the browser.             |

Guidance:

- Most tests are unit tests. Integration tests cover the seams. E2E covers the
  critical journey only.
- Never mock the module under test.
- Prefer mock providers over `vi.mock` of internal modules — the provider
  interface exists precisely so tests do not need to reach inside.
- Playwright is introduced with the first complete user journey, not before. A
  test framework with no journey to test is an unused dependency.

---

## 14. Definition of Done

A task is done when **all** of the following hold:

1. Every acceptance criterion in the task file is met and demonstrable.
2. `pnpm typecheck` passes.
3. `pnpm lint` passes with no warnings.
4. `pnpm test` passes, with no skipped tests.
5. `pnpm build` succeeds.
6. New behaviour has tests written first.
7. No file outside the task's declared scope was modified.
8. No new dependency was added that shipped code does not import.
9. No lint rule, TypeScript setting or test was weakened.
10. Documentation affected by the change was updated in the same task.
11. Any architectural decision made is recorded as an ADR.
12. No secret appears anywhere in the diff.
13. The report follows the format in [`../CLAUDE.md`](../CLAUDE.md) §9.

---

## 15. Verification commands

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
pnpm test        # vitest run
pnpm build       # next build

pnpm verify      # all four, in order
```

Run `pnpm verify` before every commit. CI runs the same commands, so a local
pass is a reliable predictor.

---

## 16. No unrelated refactoring

- Fix what the task asks for. Nothing else.
- A real problem outside the task is reported, not fixed silently.
- Formatting-only changes to untouched files are prohibited — they hide the real
  diff from the reviewer.
- Renames, moves and restructuring get their own task.

---

## 17. No skipped tests

- `.skip`, `.todo` and `.only` must not reach `main`.
- A test that is temporarily invalid is fixed or deleted with a documented
  reason, never silently disabled.
- A flaky test is a bug in the test or the code. Retrying it is not a fix.

---

## 18. No secrets in source control

- No API key, token, password, private key or connection string in any tracked
  file — including tests, fixtures, documentation and commit messages.
- `.env.example` contains placeholders only, and is the single source of truth
  for which variables exist.
- Every `.env*` except `.env.example` is git-ignored.
- Secrets are read from the environment and validated at startup.
- If a secret is committed: rotate it first, then clean the history. Rotation
  comes first because the history is already public.

---

## 19. Dependencies

- Add a dependency only when the current task imports it in shipped code.
- No speculative additions "for later".
- Redis, BullMQ, LangGraph, MCP, a vector database, or a microservice framework
  require an approved ADR first.
- `pnpm` only. `npm` and `yarn` must not be used; a `package-lock.json` or
  `yarn.lock` in this repository is a defect.
- The lockfile is committed and CI installs with `--frozen-lockfile`.

---

## 20. Related documents

- [`../CLAUDE.md`](../CLAUDE.md) — agent working rules and report format
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — layer boundaries
- [`DECISIONS.md`](./DECISIONS.md) — ADRs
- [`../AGENTS.md`](../AGENTS.md) — agent contracts
