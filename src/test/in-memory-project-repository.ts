import type {
  ListProjectsOptions,
  ProjectRepository,
} from "@/application/ports/project-repository";
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/domain/project";

/**
 * In-memory `ProjectRepository` for use-case unit tests.
 *
 * It implements the same interface and the same expected-not-found contract as
 * the Prisma adapter, so a use case cannot pass here and fail there. It holds
 * no global state: every test constructs its own instance.
 *
 * Identifiers and timestamps are deterministic — a counter and a fixed clock,
 * not `randomUUID()` and `Date.now()` — so assertions do not have to work
 * around values that change per run.
 */
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();
  private sequence = 0;
  private clockTicks = 0;

  /**
   * Optional failure injection, for proving that an unexpected repository
   * failure propagates rather than being swallowed. This is a test-only knob:
   * nothing in `ProjectRepository` mentions it, so production code cannot
   * depend on it.
   */
  failure: Error | null = null;

  private nextId(): string {
    this.sequence += 1;

    return `project-${String(this.sequence).padStart(4, "0")}`;
  }

  private nextDate(): Date {
    this.clockTicks += 1;

    return new Date(Date.UTC(2026, 0, 1, 0, 0, this.clockTicks));
  }

  private guard(): void {
    if (this.failure) {
      throw this.failure;
    }
  }

  /** Seeds a project directly, bypassing input validation. */
  seed(project: Project): void {
    this.projects.set(project.id, project);
  }

  async create(input: CreateProjectInput): Promise<Project> {
    this.guard();

    const now = this.nextDate();
    const project: Project = {
      id: this.nextId(),
      name: input.name,
      description: input.description ?? null,
      repositoryUrl: input.repositoryUrl ?? null,
      stackSummary: input.stackSummary ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(project.id, project);

    return project;
  }

  async findById(id: string): Promise<Project | null> {
    this.guard();

    return this.projects.get(id) ?? null;
  }

  async list(options: ListProjectsOptions = {}): Promise<Project[]> {
    this.guard();

    // Newest first, matching the Prisma adapter's ordering.
    const ordered = [...this.projects.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const skip = options.skip ?? 0;
    const end = options.take === undefined ? undefined : skip + options.take;

    return ordered.slice(skip, end);
  }

  async count(): Promise<number> {
    this.guard();

    return this.projects.size;
  }

  async update(
    id: string,
    input: UpdateProjectInput,
  ): Promise<Project | null> {
    this.guard();

    const existing = this.projects.get(id);

    if (!existing) {
      return null;
    }

    const updated: Project = {
      ...existing,
      // `undefined` means "not supplied"; `null` means "clear it".
      name: input.name ?? existing.name,
      description:
        input.description === undefined
          ? existing.description
          : (input.description ?? null),
      repositoryUrl:
        input.repositoryUrl === undefined
          ? existing.repositoryUrl
          : (input.repositoryUrl ?? null),
      stackSummary:
        input.stackSummary === undefined
          ? existing.stackSummary
          : (input.stackSummary ?? null),
      updatedAt: this.nextDate(),
    };

    this.projects.set(id, updated);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.guard();

    return this.projects.delete(id);
  }
}
