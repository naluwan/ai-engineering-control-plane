# TASK-003：Application Shell

**Status:** Completed.
**Depends on:** TASK-001 (Next.js project, Tailwind, Vitest must exist).

Does **not** depend on TASK-002, and must not assume a database, an API, or any
agent code exists.

## Context

The repository currently has one placeholder page and no navigation. TASK-005
and TASK-006 will add the Projects API and UI, and they need somewhere to
render: a layout, a navigation structure, and a small set of shared UI
primitives that later features reuse instead of each inventing their own button.

Building the shell separately keeps the feature tasks focused on behaviour
rather than on chrome, and it keeps this task free of any data dependency —
nothing here needs a database, so nothing here should wait for one.

## Goal

A navigable application shell with a persistent layout, working routes, and a
small set of tested, reusable UI primitives — containing no business logic and
no data access.

## Scope

- A root layout with a header, a main content region and a footer.
- Navigation between the routes listed below, with the active route indicated
  accessibly.
- Route structure:
  - `/` — the existing product positioning page, moved under the shell.
  - `/projects` — a placeholder stating that project management arrives in
    TASK-006.
  - `/docs` — a static index linking to the repository's documentation.
- A `not-found.tsx` route.
- An `error.tsx` boundary.
- A `loading.tsx` for the routes that will later fetch data.
- Shared UI primitives under `src/components/ui/`:
  - `Button`
  - `Card`
  - `PageHeader`
  - `EmptyState`
  - `Badge`
- Shared layout components under `src/components/layout/`:
  - `SiteHeader`
  - `SiteFooter`
  - `NavLink`
- Responsive behaviour at mobile and desktop widths.
- Component tests for each primitive and for navigation.

## Out of Scope

- Any data fetching. No `fetch`, no route handler, no database.
- Prisma, PostgreSQL, migrations. That is TASK-004.
- Projects API or Projects UI. Those are TASK-005 and TASK-006.
- Agents, schemas, providers, orchestration.
- Authentication, users, sessions.
- A component library dependency (shadcn/ui, Radix, MUI). Primitives are written
  by hand with Tailwind. Adopting a library is a separate decision requiring an
  ADR.
- State management libraries. The shell has no shared client state.
- Dark-mode toggling. The existing `prefers-color-scheme` behaviour stays.
- Animation libraries.
- Any real content on `/projects`. It is a placeholder.

## Acceptance Criteria

1. `/`, `/projects` and `/docs` all render and are reachable from the header
   navigation by clicking.
2. The header and footer appear on all three routes.
3. The navigation link matching the current route exposes `aria-current="page"`.
4. An unknown URL renders the `not-found` page, which links back to `/`.
5. `/projects` renders an `EmptyState` stating that project management is not
   implemented yet and referencing TASK-006.
6. `/docs` renders links to `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`,
   `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT_GUIDELINES.md` and
   `AGENTS.md`.
7. Each of the five UI primitives has a test asserting its rendered behaviour
   through role or text queries.
8. A test asserts that the navigation marks the active route.
9. No component under `src/components/` performs data fetching or imports from
   an infrastructure module.
10. `"use client"` appears only in components that require interactivity, and
    each occurrence is justified in the report.
11. The home page still renders `AI Engineering Control Plane` as its level-1
    heading, and its existing test still passes unmodified.
12. Every interactive element is reachable and operable by keyboard.
13. `pnpm verify` exits 0.
14. No new runtime dependency was added.

## Technical Requirements

- Next.js App Router. Server Components by default.
- Tailwind CSS v4 utility classes. No CSS-in-JS, no new global stylesheet.
- TypeScript strict. Props typed explicitly. No `React.FC`. No `any`.
- One component per file, named after the component.
- Primitives accept `className` and forward it, so callers can adjust layout
  without a wrapper element.
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<footer>`, headings in order.
- Tests query by role and accessible name.
- The `/docs` links point at the repository files; they are not a rendered
  documentation viewer.

## Expected Files

```text
src/app/layout.tsx                    modified
src/app/page.tsx                      modified
src/app/page.test.tsx                 unchanged
src/app/not-found.tsx                 created
src/app/error.tsx                     created
src/app/projects/page.tsx             created
src/app/projects/loading.tsx          created
src/app/projects/page.test.tsx        created
src/app/docs/page.tsx                 created
src/app/docs/page.test.tsx            created
src/components/layout/SiteHeader.tsx  created
src/components/layout/SiteFooter.tsx  created
src/components/layout/NavLink.tsx     created
src/components/layout/NavLink.test.tsx created
src/components/ui/Button.tsx          created
src/components/ui/Button.test.tsx     created
src/components/ui/Card.tsx            created
src/components/ui/Card.test.tsx       created
src/components/ui/PageHeader.tsx      created
src/components/ui/PageHeader.test.tsx created
src/components/ui/EmptyState.tsx      created
src/components/ui/EmptyState.test.tsx created
src/components/ui/Badge.tsx           created
src/components/ui/Badge.test.tsx      created
```

## Do Not Touch

```text
package.json          except if a justified dev-only change is unavoidable
pnpm-lock.yaml
tsconfig.json
eslint.config.mjs
next.config.ts
vitest.config.ts
.github/**
docs/**
tasks/**
CLAUDE.md
AGENTS.md
src/app/page.test.tsx
```

## Test Requirements

- Write the failing test before the component.
- One test file per primitive, colocated.
- Assertions use `getByRole` with an accessible name wherever a role exists.
- Cover: default render, `className` forwarding, and any variant prop.
- `NavLink` test covers both the active and inactive states.
- `/projects` test asserts the empty-state message is present.
- `/docs` test asserts every expected documentation link is present.
- No test may be skipped. `src/app/page.test.tsx` must pass unmodified.

## Verification Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
```

## Required Output

Report using the format in `CLAUDE.md` §9, plus:

- The list of components created, with each one's Server or Client designation
  and the justification for every `"use client"`.
- Confirmation that no data access exists in any component.
- Confirmation that no runtime dependency was added.

## Claude Code Execution Prompt

```text
Execute TASK-003 as specified in tasks/TASK-003-application-shell.md.

First read CLAUDE.md, docs/ARCHITECTURE.md and docs/DEVELOPMENT_GUIDELINES.md.

Build the application shell: a root layout with header, main and footer; the
routes /, /projects and /docs; not-found, error and loading files; the layout
components SiteHeader, SiteFooter and NavLink; and the UI primitives Button,
Card, PageHeader, EmptyState and Badge under src/components/ui/.

Write each component's test before the component. Query by role and accessible
name. Cover default render, className forwarding, variants, and NavLink's
active and inactive states.

Constraints:
- Server Components by default. Use "use client" only where interactivity
  genuinely requires it, and justify each occurrence in the report.
- No data fetching anywhere. No database, no route handlers, no API calls.
- No new runtime dependency. Do not add a component library — write the
  primitives by hand with Tailwind.
- TypeScript strict, no any, props typed explicitly, no React.FC.
- Do not modify src/app/page.test.tsx, docs/, tasks/, or any config file.
- The home page must keep rendering "AI Engineering Control Plane" as its h1.

Run pnpm verify. Report in the format required by CLAUDE.md §9.
```
