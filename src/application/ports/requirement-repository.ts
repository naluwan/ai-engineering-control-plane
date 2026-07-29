import type {
  CreateRequirementInput,
  Requirement,
  UpdateRequirementInput,
} from "@/domain/requirement";

/**
 * Persistence contract for requirements, owned by the application layer.
 *
 * Follows the same expected-not-found contract as `ProjectRepository`:
 * `findById` → `null`, `listByProjectId` → `[]`, `update` → `null`,
 * `delete` → `false`. Unexpected failures are thrown.
 */
export type ListRequirementsOptions = {
  skip?: number;
  take?: number;
};

export interface RequirementRepository {
  create(input: CreateRequirementInput): Promise<Requirement>;
  findById(id: string): Promise<Requirement | null>;
  listByProjectId(
    projectId: string,
    options?: ListRequirementsOptions,
  ): Promise<Requirement[]>;
  update(
    id: string,
    input: UpdateRequirementInput,
  ): Promise<Requirement | null>;
  delete(id: string): Promise<boolean>;
}
