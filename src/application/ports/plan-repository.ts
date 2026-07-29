import type { CreatePlanInput, Plan, UpdatePlanInput } from "@/domain/plan";

/**
 * Persistence contract for plans, owned by the application layer.
 *
 * Follows the same expected-not-found contract as `ProjectRepository`:
 * `findById` and `findByRequirementId` → `null`, `list` → `[]`,
 * `update` → `null`, `delete` → `false`. Unexpected failures are thrown.
 *
 * A requirement has at most one plan, which is why `findByRequirementId`
 * returns a single value rather than a collection.
 */
export type ListPlansOptions = {
  skip?: number;
  take?: number;
};

export interface PlanRepository {
  create(input: CreatePlanInput): Promise<Plan>;
  findById(id: string): Promise<Plan | null>;
  findByRequirementId(requirementId: string): Promise<Plan | null>;
  list(options?: ListPlansOptions): Promise<Plan[]>;
  update(id: string, input: UpdatePlanInput): Promise<Plan | null>;
  delete(id: string): Promise<boolean>;
}
