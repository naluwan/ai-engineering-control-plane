# FIX-TASK-002A: Resolve Documentation Policy Decisions

Status: Not started
Depends on: TASK-002 and PR #1

## Context

PR #1 completed the documentation consistency review for TASK-002, but three policy questions remain unresolved:

1. Verification command consistency across task files.
2. Whether Git operations require standing permission or per-task permission.
3. When a task status may move to Completed.

These are now resolved by explicit human decisions and must be documented before TASK-002 can be treated as fully accepted.

## Goal

Update the documentation on the existing PR #1 branch so that TASK-002 becomes fully satisfiable, the repository has a clear Git authorization policy, and task status transitions are defined.

## Human Decisions

### Decision 1: Verification commands

Every task must include these mandatory quality gates in this order:

- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm build
- pnpm verify

A task may prepend task-specific environment preparation commands before those quality gates, for example:

- docker compose up -d
- pnpm prisma migrate deploy

A task must not remove, replace, reorder, skip, or weaken the mandatory quality gates.

Update TASK-002 Acceptance Criterion 5 so it checks this rule instead of requiring every complete Verification Commands section to be identical.

### Decision 2: Git authorization

Git operations require explicit authorization in the current user execution prompt for each task.

By default, Claude Code must not:

- create or switch branches
- commit
- push
- open a Pull Request
- merge
- enable auto-merge
- amend, rebase, or rewrite history

A task file mentioning Git commands does not itself grant permission. Permission must come from the current user instruction.

TASK-001 was the first task with explicit Git authorization, but it is not a permanent unique exception.

### Decision 3: Task status

Allowed task statuses are:

- Not started
- In progress
- In review
- Completed
- Blocked

A task may be marked Completed only when all of these are true:

1. All Acceptance Criteria pass.
2. All required verification commands pass.
3. Scope validation passes.
4. No unresolved blocking issue remains.
5. The Pull Request is ready to merge.

Task status describes execution and verification state. It does not mean the Pull Request has already been merged.

The main branch remains the official source of truth only after the Pull Request is merged.

## Scope

Allowed repository file changes:

- CLAUDE.md
- docs/DEVELOPMENT_GUIDELINES.md, only if needed to synchronize verification or Git policy
- docs/ROADMAP.md
- tasks/TASK-002-documentation-baseline.md

Allowed remote change:

- Update PR #1 body after the repository changes are pushed

Required status updates after all verification passes:

- Set tasks/TASK-002-documentation-baseline.md Status to Completed
- Update docs/ROADMAP.md current position so TASK-002 is complete and TASK-003 is next
- Mark TASK-002 as Done in the Sprint 1 roadmap table

## Out of Scope

Do not modify:

- README.md
- AGENTS.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- tasks/TASK-001-repository-foundation.md
- tasks/TASK-003-application-shell.md
- tasks/TASK-004-database-foundation.md
- tasks/TASK-005-projects-api.md
- tasks/TASK-006-projects-ui.md
- tasks/TASK-007-mock-planner-contracts.md
- tasks/TASK-008-requirement-planning-flow.md
- src/**
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- tsconfig.json
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- vitest.config.ts
- .github/**
- LICENSE

Do not:

- add dependencies
- implement TASK-003
- create a new branch
- push to main
- merge PR #1
- enable auto-merge
- amend or rebase existing commits
- use force push
- rewrite unrelated documentation

## Acceptance Criteria

1. TASK-002 Acceptance Criterion 5 requires every task to contain the same mandatory quality gates in the defined order.
2. TASK-002 Acceptance Criterion 5 explicitly allows task-specific environment preparation commands before the mandatory quality gates.
3. CLAUDE.md states that Git operations require explicit authorization in the current user execution prompt for each task.
4. CLAUDE.md no longer describes TASK-001 as a permanent unique exception for commit or push permission.
5. CLAUDE.md defines the five allowed task statuses.
6. CLAUDE.md defines all five conditions required for Completed.
7. tasks/TASK-002-documentation-baseline.md is marked Completed only after every criterion and verification command passes.
8. docs/ROADMAP.md shows TASK-002 as Done and identifies TASK-003 as the next item.
9. No non-Markdown repository file is modified.
10. No Out of Scope file is modified.
11. pnpm verify exits with code 0.
12. GitHub Actions for PR #1 passes after the fix commit.
13. PR #1 body is updated so that:
    - the unresolved decision section is replaced by Human decisions resolved
    - all three decisions are summarized
    - TASK-002 final result is PASS
    - the PR does not claim to be merged

## Technical Requirements

- Use minimal documentation edits.
- Preserve the existing product scope and architecture.
- Do not change any code, dependency, configuration, workflow, or test.
- Do not weaken an Acceptance Criterion except for the human-approved correction to TASK-002 Acceptance Criterion 5 described in this file.
- Do not infer additional policy decisions.

## Expected Files

Expected modified files:

- CLAUDE.md
- docs/ROADMAP.md
- tasks/TASK-002-documentation-baseline.md

Optional modified file only when synchronization is necessary:

- docs/DEVELOPMENT_GUIDELINES.md

Remote metadata:

- PR #1 body

## Do Not Touch

- README.md
- AGENTS.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- tasks/TASK-001-repository-foundation.md
- tasks/TASK-003-application-shell.md
- tasks/TASK-004-database-foundation.md
- tasks/TASK-005-projects-api.md
- tasks/TASK-006-projects-ui.md
- tasks/TASK-007-mock-planner-contracts.md
- tasks/TASK-008-requirement-planning-flow.md
- src/**
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- tsconfig.json
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- vitest.config.ts
- .github/**
- LICENSE

## Test Requirements

No new tests are required because this is a documentation-only fix.

All existing checks must pass unchanged.

Before committing, verify that all repository changes are Markdown files only.

## Verification Commands

Run these commands:

- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm build
- pnpm verify
- git diff --check
- git diff --stat origin/main...HEAD
- git status --short

Also confirm that no changed repository file has a non-.md extension.

## Git and PR Authorization

This task explicitly authorizes only the following Git operations:

- stay on the existing branch docs/task-002-documentation-baseline
- create one additional fix commit
- push that commit to the same remote branch
- update PR #1 body

This task does not authorize:

- creating another branch
- pushing to main
- force push
- amend
- rebase
- merge
- auto-merge
- starting TASK-003

Use this commit message:

- docs: resolve task-002 policy decisions

## Required Output

Report:

1. FIX-TASK-002A result: PASS, PARTIAL, or FAIL
2. TASK-002 final result: PASS, PARTIAL, or FAIL
3. Files changed and the reason for each change
4. Acceptance Criteria 1 through 13, each with PASS or FAIL
5. Verification results for every required command
6. Git summary:
   - git log -2 --oneline
   - git status --short
   - git diff --stat origin/main...HEAD
7. PR #1 status:
   - state
   - mergeable status
   - CI status
   - commit count
   - merged must remain no
8. Risks and open issues
9. Recommended next action must be exactly:
   - Merge PR #1 after human acceptance.

## Claude Code Execution Prompt

Execute tasks/FIX-TASK-002A.md exactly as written.

Before modifying anything, read:

- CLAUDE.md
- docs/DEVELOPMENT_GUIDELINES.md
- docs/ROADMAP.md
- tasks/TASK-002-documentation-baseline.md
- tasks/FIX-TASK-002A.md

Then verify:

- the repository is naluwan/ai-engineering-control-plane
- the current branch is docs/task-002-documentation-baseline
- the working tree is clean before changes
- PR #1 is open
- the current branch is not main

If any precondition fails, stop and report without modifying files.

Do not infer or repair missing instructions. If the end marker below is missing, stop immediately.

END OF TASK FILE
Task ID: FIX-TASK-002A
Expected top-level task sections: 12 plus Git and PR Authorization
Do not execute if this marker is missing.
