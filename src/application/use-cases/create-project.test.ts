import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProject } from "@/application/use-cases/create-project";
import { InMemoryProjectRepository } from "@/test/in-memory-project-repository";

let repository: InMemoryProjectRepository;

beforeEach(() => {
  repository = new InMemoryProjectRepository();
});

describe("createProject", () => {
  it("persists a valid project and returns it", async () => {
    const result = await createProject(repository, { name: "Slice" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Slice");
      expect(result.data.id).toMatch(/\S/);
    }
    expect(await repository.count()).toBe(1);
  });

  it("persists every supported field", async () => {
    const result = await createProject(repository, {
      name: "Slice",
      description: "A description.",
      repositoryUrl: "https://github.com/naluwan/ai-engineering-control-plane",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.description).toBe("A description.");
      expect(result.data.repositoryUrl).toBe(
        "https://github.com/naluwan/ai-engineering-control-plane",
      );
    }
  });

  it("stores the trimmed name", async () => {
    const result = await createProject(repository, { name: "  Slice  " });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Slice");
    }
  });

  it("returns VALIDATION_ERROR for a missing name", async () => {
    const result = await createProject(repository, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details?.some((d) => d.path === "name")).toBe(true);
    }
  });

  it("returns VALIDATION_ERROR for an empty name", async () => {
    const result = await createProject(repository, { name: "   " });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR for a name longer than 100 characters", async () => {
    const result = await createProject(repository, { name: "x".repeat(101) });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR for a description longer than 1000 characters", async () => {
    const result = await createProject(repository, {
      name: "Slice",
      description: "x".repeat(1001),
    });

    expect(result.ok).toBe(false);
  });

  it("returns VALIDATION_ERROR for an invalid repositoryUrl", async () => {
    const result = await createProject(repository, {
      name: "Slice",
      repositoryUrl: "not-a-url",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.error.details?.some((d) => d.path === "repositoryUrl"),
      ).toBe(true);
    }
  });

  it("returns VALIDATION_ERROR for an unknown field", async () => {
    const result = await createProject(repository, {
      name: "Slice",
      stackSummary: "Next.js",
    });

    expect(result.ok).toBe(false);
  });

  it("does not call the repository when validation fails", async () => {
    const create = vi.spyOn(repository, "create");

    await createProject(repository, { name: "" });

    expect(create).not.toHaveBeenCalled();
    expect(await repository.count()).toBe(0);
  });

  it("propagates an unexpected repository failure instead of swallowing it", async () => {
    repository.failure = new Error("connection refused");

    await expect(
      createProject(repository, { name: "Slice" }),
    ).rejects.toThrow("connection refused");
  });
});
