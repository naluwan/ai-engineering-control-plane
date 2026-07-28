# TASK-006：Projects UI

**Status:** Not started.
**Depends on:**

- TASK-003 (application shell, layout and UI primitives must exist).
- TASK-005 (Projects API and use cases must exist).

Do not start this task if either dependency is incomplete. It requires both the
`Button`, `Card`, `PageHeader` and `EmptyState` primitives and the working
`/api/projects` endpoints.

## Context

TASK-003 left `/projects` as a placeholder. TASK-005 built the API behind it.
This task connects them: the first screen in the product where a human creates
something and sees it persisted.

It also fixes the data-access pattern for every screen that follows — where
reads happen, how a form submits, how a validation error from the server is
displayed, and what the user sees while something is loading or when it fails.

## Goal

A working projects section — list, detail and creation — built on the existing
shell primitives and the TASK-005 API, with loading, empty and error states
that behave correctly.

## Scope

- `/projects` — replaces the TASK-003 placeholder with a real project list.
- `/projects/new` — a project creation form.
- `/projects/[id]` — a project detail view.
- Read paths use Server Components calling the application use cases directly.
- Creation uses a Server Action that calls `createProject`.
- Field-level display of server validation errors.
- Empty state when no project exists.
- Loading state for each route that reads data.
- Error boundary for the projects section.
- Redirect to the created project's detail page on success.
- Component and integration tests for each state.

## Out of Scope

- Editing or deleting a project. The API does not expose either — see TASK-005.
- Requirements, plans, tasks or agent runs. The detail page states that
  requirement submission arrives in TASK-008.
- TanStack Query and Zustand. Reads happen on the server and the form has no
  shared client state, so neither is needed. Adding either requires justifying
  it against `docs/DEVELOPMENT_GUIDELINES.md` §7.
- Optimistic updates, real-time refresh, polling or websockets.
- Search, filtering or sorting. Pagination only.
- File upload, avatars or images.
- Any change to the API, the use cases or the Prisma schema. If something is
  missing, report it rather than reaching around it.
- New UI primitives beyond a form input set. Reuse TASK-003's components.
- Animation libraries.

## Acceptance Criteria

1. `/projects` lists persisted projects, each linking to its detail page.
2. `/projects` renders the `EmptyState` from TASK-003 when no project exists,
   with a link to `/projects/new`.
3. `/projects` paginates when the project count exceeds the page size, and the
   pagination controls are keyboard operable.
4. `/projects/new` renders a form with name, description and repository URL,
   each with an associated `<label>`.
5. Submitting a valid form creates the project and redirects to its detail page.
6. Submitting an invalid form re-renders with the server's field errors shown
   next to the corresponding inputs, and the entered values preserved.
7. Client-side validation, if present, never replaces server validation.
8. `/projects/[id]` renders the project's name, description, repository URL and
   creation time.
9. `/projects/[id]` for an unknown id renders the not-found page.
10. `/projects/[id]` states that requirement submission is not implemented yet
    and references TASK-008.
11. Each data-reading route has a loading state.
12. A failure in the projects section renders the error boundary with a retry
    affordance, and never displays a raw internal error.
13. No component imports Prisma or anything from
    `src/infrastructure/persistence/`.
14. `"use client"` appears only where interactivity requires it, justified in
    the report.
15. Every form control is labelled, and the form is fully keyboard operable.
16. `pnpm verify` exits 0.
17. No new runtime dependency was added.

## Technical Requirements

- Server Components for all reads. They call application use cases directly,
  not the HTTP API — the API exists for external consumers and integration
  tests.
- Creation uses a Server Action calling `createProject`.
- The Server Action returns a serialisable result carrying field errors; it does
  not throw for a validation failure.
- Form state uses `useActionState`. The submit control is disabled while
  pending.
- Reuse `Button`, `Card`, `PageHeader` and `EmptyState` from TASK-003. New form
  primitives (`Input`, `Textarea`, `Field`) may be added under
  `src/components/ui/` if needed, each with tests.
- Errors are associated with inputs via `aria-describedby`, and invalid inputs
  carry `aria-invalid`.
- Pagination reads `page` from search params and validates it.
- TypeScript strict. No `any`. Props typed explicitly.
- Tests query by role and accessible name, never by test id.

## Expected Files

```text
src/app/projects/page.tsx                        modified
src/app/projects/page.test.tsx                   modified
src/app/projects/loading.tsx                     modified
src/app/projects/error.tsx                       created
src/app/projects/new/page.tsx                    created
src/app/projects/new/page.test.tsx               created
src/app/projects/new/actions.ts                  created
src/app/projects/new/actions.test.ts             created
src/app/projects/[id]/page.tsx                   created
src/app/projects/[id]/page.test.tsx              created
src/app/projects/[id]/loading.tsx                created
src/components/projects/ProjectList.tsx          created
src/components/projects/ProjectList.test.tsx     created
src/components/projects/ProjectCard.tsx          created
src/components/projects/ProjectCard.test.tsx     created
src/components/projects/ProjectForm.tsx          created
src/components/projects/ProjectForm.test.tsx     created
src/components/ui/Input.tsx                      created if needed
src/components/ui/Input.test.tsx                 created if needed
src/components/ui/Field.tsx                      created if needed
src/components/ui/Field.test.tsx                 created if needed
```

## Do Not Touch

```text
src/app/api/**
src/application/**
src/infrastructure/**
src/domain/**
prisma/**
docs/**
tasks/**
CLAUDE.md
AGENTS.md
.github/**
src/app/page.tsx
src/app/page.test.tsx
```

## Test Requirements

- Write the failing test first.
- `ProjectList`: empty state, single project, many projects, pagination
  controls.
- `ProjectCard`: renders name, link target and optional fields when absent.
- `ProjectForm`: renders labelled fields, shows server field errors, preserves
  entered values after a failed submit, disables submit while pending.
- Server Action test: valid input creates and returns success; invalid input
  returns field errors and creates nothing.
- Detail page: renders a project; unknown id triggers not-found.
- At least one test asserts the error boundary shows no raw internal error text.
- Queries use roles and accessible names.
- No skipped tests. Existing tests from TASK-003 and TASK-005 must still pass.

## Verification Commands

```bash
docker compose up -d
pnpm prisma migrate deploy
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
```

## Required Output

Report using the format in `CLAUDE.md` §13, plus:

- The route table with each route's Server or Client designation.
- Justification for every `"use client"`.
- Confirmation that no state management library was added, and why none was
  needed.
- Confirmation that no component imports Prisma.
- The accessibility measures applied to the form.

## Claude Code Execution Prompt

```text
Execute TASK-006 as specified in tasks/TASK-006-projects-ui.md.

Confirm first that TASK-003 (shell and UI primitives) and TASK-005 (projects
API and use cases) are both complete. If either is missing, stop and report.

Read CLAUDE.md, docs/ARCHITECTURE.md and docs/DEVELOPMENT_GUIDELINES.md
(especially §5 React rules, §6 Next.js rules and §7 state management
boundaries).

Build /projects (list with pagination and empty state), /projects/new (creation
form) and /projects/[id] (detail). Reads happen in Server Components calling the
application use cases directly. Creation uses a Server Action calling
createProject, returning a serialisable result with field errors rather than
throwing.

Reuse the Button, Card, PageHeader and EmptyState primitives from TASK-003. Add
Input and Field primitives only if genuinely needed, with tests.

Requirements:
- Every form control has a label; errors use aria-describedby and aria-invalid.
- Failed submits preserve the entered values and show server field errors.
- Each data-reading route has a loading state; the section has an error
  boundary that never shows a raw internal error.
- No component imports Prisma or src/infrastructure/persistence/.
- Do not add TanStack Query or Zustand — reads are on the server and there is no
  shared client state. If you believe one is needed, stop and justify it against
  DEVELOPMENT_GUIDELINES §7 before adding it.
- Do not modify src/app/api/, src/application/, src/infrastructure/,
  src/domain/ or prisma/. If something is missing there, report it.

Write the tests first. Query by role and accessible name.

Run pnpm verify. Report in the format required by CLAUDE.md §13.
```
