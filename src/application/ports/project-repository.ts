import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/domain/project";

/**
 * Persistence contract for projects, owned by the application layer.
 *
 * No signature here mentions Prisma, a database client, an SQL option or a
 * framework type. Infrastructure implements this interface; it does not define
 * it. See docs/ARCHITECTURE.md §2.2 and §2.5.
 *
 * Expected-not-found contract, applied consistently across every repository:
 *
 * - `findById` returns `null` when nothing matches.
 * - `list` returns an empty array when nothing matches.
 * - `update` returns `null` when the record does not exist.
 * - `delete` returns `false` when the record does not exist, `true` when it
 *   was deleted.
 *
 * A record that is missing is an expected outcome and is reported as a value.
 * Anything else — a constraint violation, a connection failure, malformed
 * stored data — is unexpected and is thrown, never swallowed.
 */
export type ListProjectsOptions = {
  /** Number of records to skip. Defaults to 0. */
  skip?: number;
  /** Maximum number of records to return. Defaults to the adapter's limit. */
  take?: number;
};

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  list(options?: ListProjectsOptions): Promise<Project[]>;
  /**
   * Total number of projects, ignoring any pagination window.
   *
   * A paginated response needs the total, and deriving it from `list()` would
   * mean loading every row into memory to read its length — which stops being
   * viable at exactly the point pagination starts to matter.
   */
  count(): Promise<number>;
  update(id: string, input: UpdateProjectInput): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}
