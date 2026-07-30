# AI Engineering Control Plane

**An AI-Native Software Engineering Platform.**

An auditable control plane for turning software requirements into structured, reviewable, testable, and traceable engineering workflows.

將軟體需求轉換為具備規劃、審核、測試與追蹤能力之工程流程的 AI 原生軟體工程平台。

> **Current Status: Sprint 1 Foundation — Active Development**
>
> **目前狀態：Sprint 1 基礎建設階段，持續開發中**

The repository currently includes PostgreSQL and Prisma persistence, Project API use cases, integration tests, CI quality gates, and domain foundations for Requirements and Plans.

The interactive Project workflow, Requirement-to-Plan orchestration, Planner execution, Human-in-the-Loop approvals, Audit Trail, GitHub integration, Pull Request generation, and LLM providers are not implemented yet.

目前已完成 PostgreSQL 與 Prisma 持久層、Project API 與 Use Case、整合測試、CI 品質檢查，以及 Requirement 與 Plan 的領域與資料存取基礎。

可操作的 Project 工作流程、Requirement-to-Plan 編排、Planner 執行、Human-in-the-Loop 審核、Audit Trail、GitHub 整合、Pull Request 產生與 LLM Provider 尚未完成。

Nothing in this README describes a planned capability as operational.

本文件會明確區分已完成與規劃中的能力，不會將尚未完成的功能描述為可使用狀態。

---

## Status / 開發狀態

| Area | Status |
|---|---|
| Application shell and docs | Implemented |
| PostgreSQL and Prisma | Implemented |
| Project API and persistence | Implemented |
| Project workflow UI | Not started — `/projects` is a placeholder route (TASK-006) |
| Requirement and Plan persistence | Implemented foundation |
| Requirement-to-Plan orchestration | Planned |
| Planner execution | Not started |
| Human approval | Not started |
| Audit Trail | Not started |
| GitHub and LLM integrations | Not started |

| 領域 | 狀態 |
|---|---|
| Application shell 與文件 | 已完成 |
| PostgreSQL 與 Prisma | 已完成 |
| Project API 與持久層 | 已完成 |
| Project 操作介面 | 尚未開始，`/projects` 仍為 placeholder 路由（TASK-006） |
| Requirement 與 Plan 持久層 | 基礎已完成 |
| Requirement-to-Plan 編排 | 規劃中 |
| Planner 執行 | 尚未開始 |
| 人工批准流程 | 尚未開始 |
| Audit Trail | 尚未開始 |
| GitHub 與 LLM 整合 | 尚未開始 |

## Product Problem / 產品問題

Teams adopting coding agents can quickly lose the reasoning behind a generated change: requirements, design decisions, review evidence, test results, and approval boundaries become scattered or invisible.

AI Engineering Control Plane explores the opposite approach. Engineering work should move through explicit stages, produce reviewable artifacts, preserve human authority at important transitions, and make the path from requirement to change traceable.

團隊導入 Coding Agent 後，常難以追溯一項變更如何從需求演變而來；設計決策、審核證據、測試結果與批准邊界容易分散或消失。

AI Engineering Control Plane 探索另一種做法：讓工程工作經過明確階段、產生可審核產物、在重要轉換保留人工決策，並使需求到程式碼變更的過程可追蹤。

## Implemented / 已完成

- Next.js App Router application shell with TypeScript strict mode and Tailwind CSS
- PostgreSQL development and isolated integration-test databases through Docker Compose
- Prisma schema and migration for `Project`, `Requirement`, and `Plan`
- Project creation, listing, and detail use cases
- `POST /api/projects`, `GET /api/projects`, and `GET /api/projects/[id]`
- Repository ports with Prisma persistence adapters
- Environment validation and a guard that prevents test cleanup from targeting the application database
- Structured error responses, correlation IDs, and database-credential redaction
- Unit, component, repository integration, and API integration tests
- CI workflow for migrations, type checking, linting, tests, and build
- Product, architecture, decision, roadmap, development, and AI collaboration documentation

- 使用 Next.js App Router、TypeScript strict mode 與 Tailwind CSS 建立應用程式基礎
- 透過 Docker Compose 提供 PostgreSQL 開發資料庫及獨立的整合測試資料庫
- 完成 `Project`、`Requirement`、`Plan` 的 Prisma Schema 與 Migration
- 完成 Project 建立、列表與詳細資料 Use Case
- 提供 `POST /api/projects`、`GET /api/projects`、`GET /api/projects/[id]`
- 以 Repository Port 與 Prisma Adapter 實作持久層邊界
- 驗證環境設定，並防止測試清理誤用正式開發資料庫
- 提供結構化錯誤、Correlation ID 與資料庫憑證遮罩
- 建立 Unit、Component、Repository Integration 與 API Integration Tests
- CI 執行 Migration、Type Check、Lint、Test 與 Build
- 建立產品、架構、決策、Roadmap、開發與 AI 協作文件

## Partially Implemented / 部分完成

### Project management

What is partially implemented is the **Project management capability**, not the
user interface. The API, use cases, validation, persistence, and tests are
implemented. The user interface is not: `/projects` remains a placeholder route
and is not connected to the API.

此處「部分完成」指的是 **Project 管理能力**，不是操作介面已可部分使用。Project
API、Use Case、驗證、持久層與測試已完成；操作介面則尚未開始，`/projects` 仍為
placeholder 路由，未串接 API。

### Requirement and Plan foundations

Domain models and Prisma repositories exist. Requirement submission, Planner execution, workflow transitions, and user-facing screens do not.

Requirement 與 Plan 已具備 Domain Model 及 Prisma Repository；需求提交、Planner 執行、流程狀態轉換與操作介面尚未完成。

### AI Engineering Governance

The repository documents how humans and AI tools collaborate while developing this project. These documents guide development; they are not product-enforced governance features or an operational Agent Runtime.

Repository 已記錄本專案開發過程中人員與 AI 工具的協作規則。這些內容屬於開發治理文件，並不代表產品已具備強制治理功能或可執行的 Agent Runtime。

## Planned / 規劃中

The planned MVP will validate this workflow end to end with deterministic mock providers before integrating a real model.

規劃中的 MVP 將先以可重現的 Mock Provider 驗證完整流程，再整合真實模型。

Planned capabilities:

- Requirement submission
- schema-validated deterministic Mock Planner
- Requirement-to-Plan orchestration
- explicit workflow transitions and failure handling
- Human-in-the-Loop review and approval
- agent invocation and audit records
- Reviewer, Tester, and Security workflow stages
- Quality Gate
- GitHub integration and Pull Request generation
- LLM provider adapters

規劃中的能力：

- Requirement 提交
- 通過 Schema 驗證且結果可重現的 Mock Planner
- Requirement-to-Plan 編排
- 明確的流程狀態轉換與失敗處理
- Human-in-the-Loop 審核與批准
- Agent Invocation 與 Audit Record
- Reviewer、Tester 與 Security 流程階段
- Quality Gate
- GitHub 整合與 Pull Request 產生
- LLM Provider Adapter

## Not Started / 尚未開始

The following capabilities are specified or discussed in documentation but have no operational implementation:

- real or mock Agent Runtime
- Planner execution
- Human-in-the-Loop approval workflow
- product Audit Trail
- GitHub App or GitHub API integration
- Pull Request generation
- real LLM provider integration
- demo-data workflow

以下能力雖已出現在規格或規劃文件中，但目前沒有可執行的實作：

- 真實或模擬的 Agent Runtime
- Planner 執行
- Human-in-the-Loop 批准流程
- 產品層 Audit Trail
- GitHub App 或 GitHub API 整合
- Pull Request 產生
- 真實 LLM Provider 整合
- Demo Data 流程

## Current Implemented Architecture / 目前已實作架構

```text
HTTP Route
→ Handler
→ Use Case
→ Repository Port
→ Prisma Repository
→ PostgreSQL
```

Supporting concerns:

```text
Request
→ Correlation ID
→ Validation
→ Structured Result / Error
→ Redacted Logging
```

The current persistence model is:

```text
Project 1 ── N Requirement 1 ── 0..1 Plan
```

目前架構採用 HTTP Route、Handler、Use Case、Repository Port 與 Prisma Repository 分層，並以 PostgreSQL 持久化資料。Requirement 與 Plan 的存在不代表 Planner 已可執行；目前僅完成其領域與資料存取基礎。

## Target MVP Architecture — Planned / 目標 MVP 架構（規劃中）

> **Planned — this workflow is not operational.**
>
> **規劃中——此流程目前尚不可執行。**

```text
Create or select Project
→ Submit Requirement
→ Persist Requirement
→ Deterministic Mock Planner
→ Validate structured Plan
→ Persist Plan
→ Human Review and Approval
→ Reviewer / Tester / Security stages
→ Quality Gate
→ Pull Request draft
→ GitHub Pull Request
```

The first demonstrable vertical slice will stop at a persisted, validated Plan. Later stages will remain marked Planned until implementation and tests exist.

第一個可展示的垂直切片將以「完成驗證並持久化的 Plan」為終點。後續階段在具備實作與測試前，都會維持 Planned 標記。

## API Foundation / API 基礎

| Method | Route | Current behavior |
|---|---|---|
| `POST` | `/api/projects` | Validate and create a Project |
| `GET` | `/api/projects` | List Projects |
| `GET` | `/api/projects/[id]` | Get one Project by ID |

There is no Requirement submission or planning API yet.

目前尚未提供 Requirement 提交或 Planning API。

## Tech Stack / 技術棧

| Concern | Current choice |
|---|---|
| Runtime | Node.js 22 |
| Package manager | pnpm 11 |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript 5, strict mode |
| Validation | Zod 4 |
| Persistence | PostgreSQL 16, Prisma 6 |
| Testing | Vitest 4, React Testing Library, real PostgreSQL integration tests |
| Linting | ESLint 9 |
| CI | GitHub Actions |

Deliberately absent from the current implementation: Redis, BullMQ, LangGraph, MCP, RAG, Kubernetes, and microservices. Architectural reasoning is documented in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) and [`docs/DECISIONS.md`](./docs/DECISIONS.md).

目前刻意未導入 Redis、BullMQ、LangGraph、MCP、RAG、Kubernetes 與 Microservices。相關架構取捨記錄於 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) 及 [`docs/DECISIONS.md`](./docs/DECISIONS.md)。

## Getting Started / 開始使用

Requirements:

- Node.js 22
- pnpm 11
- Docker with Compose v2

Install dependencies:

```bash
pnpm install
```

Create local environment files from the documented placeholders and configure separate application and test database values:

```bash
cp .env.example .env.local
```

Start PostgreSQL:

```bash
docker compose up -d
docker compose ps
```

Apply the existing migration:

```bash
pnpm prisma migrate deploy
```

Start the application:

```bash
pnpm dev
```

The integration suite deletes `Project`, `Requirement`, and `Plan` rows from the configured test database. The application and test database values must be different; environment validation rejects equal values.

整合測試會清除指定測試資料庫中的 `Project`、`Requirement` 與 `Plan` 資料。應用程式與測試資料庫必須分離，環境驗證會拒絕兩者使用相同設定。

## Verification / 品質檢查

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Or run the repository quality gate:

```bash
pnpm verify
```

GitHub Actions is configured to provision PostgreSQL, apply migrations, and run type checking, linting, tests, and the production build. This README does not include a CI badge.

GitHub Actions 已設定為佈建 PostgreSQL、套用 Migration，並執行 Type Check、Lint、Test 與 Production Build。本文件未加入 CI Badge。

## Documentation / 文件

| Document | Purpose |
|---|---|
| [`docs/PRD.md`](./docs/PRD.md) | Product vision, users, scope, and requirements |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Current boundaries and target architecture |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Architecture decision records |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Delivery sequence and planned milestones |
| [`docs/DEVELOPMENT_GUIDELINES.md`](./docs/DEVELOPMENT_GUIDELINES.md) | Engineering conventions and quality gates |
| [`AGENTS.md`](./AGENTS.md) | Product agent role specifications — not an operational Agent Runtime |
| [`docs/AI_CHARTER.md`](./docs/AI_CHARTER.md) | Development collaboration principles |
| [`docs/AI_AGENT_ROLES.md`](./docs/AI_AGENT_ROLES.md) | Human and AI development responsibilities |
| [`docs/AI_WORKFLOW.md`](./docs/AI_WORKFLOW.md) | Development collaboration workflow |
| [`docs/CODEX_REVIEW_GUIDE.md`](./docs/CODEX_REVIEW_GUIDE.md) | Review severity and checklist |
| [`docs/WORK_GUIDE.md`](./docs/WORK_GUIDE.md) | Repository write-operation procedure |
| [`tasks/`](./tasks) | Verifiable implementation tasks |

`AGENTS.md` specifies planned product roles. The documents under `docs/AI_*` govern collaboration while building the repository. Neither is evidence that the product currently runs agents or enforces approval gates.

`AGENTS.md` 定義規劃中的產品角色；`docs/AI_*` 文件規範開發期間的協作方式。兩者都不代表產品目前已能執行 Agent 或強制套用批准流程。

## Next Milestone / 下一個里程碑

### Next implementation task

The next task on the roadmap is **TASK-006 Projects UI** — connecting the
`/projects` route to the existing Projects API. See
[`docs/ROADMAP.md`](./docs/ROADMAP.md).

Roadmap 上的下一項任務是 **TASK-006 Projects UI**，也就是將 `/projects` 路由串接
到既有的 Projects API。

### Next demonstrable vertical slice

```text
Submit Requirement
→ Persist Requirement
→ Run deterministic Mock Planner
→ Validate Plan
→ Persist Plan
→ Display result
```

This slice is **not a current capability**. It requires three tasks that have
all yet to begin — TASK-006 Projects UI, TASK-007 Mock Planner contracts, and
TASK-008 Requirement planning flow — and it must include explicit failure
handling and integration tests before it is described as implemented.

此垂直切片**並非目前已具備的能力**。它需要三項尚未開始的任務：TASK-006 Projects
UI、TASK-007 Mock Planner 契約，以及 TASK-008 Requirement Planning Flow。必須完成
明確的失敗處理與整合測試後，才能標示為已完成。

## License

This project is licensed under the terms in [`LICENSE`](./LICENSE).

