import { beforeEach, describe, expect, it, vi } from "vitest";

import { getProjectById } from "@/application/use-cases/get-project-by-id";
import { InMemoryProjectRepository } from "@/test/in-memory-project-repository";

let repository: InMemoryProjectRepository;

beforeEach(() => {
  repository = new InMemoryProjectRepository();
});

describe("getProjectById", () => {
  it("returns the project when it exists", async () => {
    const created = await repository.create({ name: "Slice" });

    const result = await getProjectById(repository, created.id);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(created.id);
      expect(result.data.name).toBe("Slice");
    }
  });

  it("returns NOT_FOUND for an unknown id", async () => {
    const result = await getProjectById(repository, "project-9999");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("returns the same NOT_FOUND for a deleted project as for one that never existed", async () => {
    const created = await repository.create({ name: "Doomed" });
    await repository.delete(created.id);

    const deleted = await getProjectById(repository, created.id);
    const neverExisted = await getProjectById(repository, "project-9999");

    expect(deleted.ok).toBe(false);
    expect(neverExisted.ok).toBe(false);
    if (!deleted.ok && !neverExisted.ok) {
      expect(deleted.error).toEqual(neverExisted.error);
    }
  });

  it("returns VALIDATION_ERROR for an empty id", async () => {
    const result = await getProjectById(repository, "   ");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR for a non-string id", async () => {
    const result = await getProjectById(repository, 123);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("does not call the repository when validation fails", async () => {
    const findById = vi.spyOn(repository, "findById");

    await getProjectById(repository, "");

    expect(findById).not.toHaveBeenCalled();
  });

  it("propagates an unexpected repository failure instead of swallowing it", async () => {
    const created = await repository.create({ name: "Slice" });
    repository.failure = new Error("connection refused");

    await expect(getProjectById(repository, created.id)).rejects.toThrow(
      "connection refused",
    );
  });
});
