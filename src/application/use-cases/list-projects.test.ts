import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProjects } from "@/application/use-cases/list-projects";
import { InMemoryProjectRepository } from "@/test/in-memory-project-repository";

let repository: InMemoryProjectRepository;

async function seed(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await repository.create({ name: `Project ${index + 1}` });
  }
}

beforeEach(() => {
  repository = new InMemoryProjectRepository();
});

describe("listProjects", () => {
  it("returns an empty page when no project exists", async () => {
    const result = await listProjects(repository, {});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projects).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.totalPages).toBe(0);
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("returns the persisted projects", async () => {
    await seed(3);

    const result = await listProjects(repository, {});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projects).toHaveLength(3);
      expect(result.data.total).toBe(3);
      expect(result.data.totalPages).toBe(1);
    }
  });

  it("applies the requested page and pageSize", async () => {
    await seed(5);

    const result = await listProjects(repository, { page: "2", pageSize: "2" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(2);
      expect(result.data.projects).toHaveLength(2);
    }
  });

  it("computes totalPages by rounding up", async () => {
    await seed(5);

    const result = await listProjects(repository, { pageSize: "2" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.total).toBe(5);
      expect(result.data.totalPages).toBe(3);
    }
  });

  it("returns an empty page beyond the last one, without erroring", async () => {
    await seed(2);

    const result = await listProjects(repository, { page: "5", pageSize: "2" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.projects).toEqual([]);
      expect(result.data.total).toBe(2);
    }
  });

  it("passes the correct skip and take to the repository", async () => {
    const list = vi.spyOn(repository, "list");

    await listProjects(repository, { page: "3", pageSize: "10" });

    expect(list).toHaveBeenCalledWith({ skip: 20, take: 10 });
  });

  it("uses skip 0 for the first page", async () => {
    const list = vi.spyOn(repository, "list");

    await listProjects(repository, {});

    expect(list).toHaveBeenCalledWith({ skip: 0, take: 20 });
  });

  it("asks the repository for the total count", async () => {
    const count = vi.spyOn(repository, "count");

    await listProjects(repository, {});

    expect(count).toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR for a page below 1", async () => {
    const result = await listProjects(repository, { page: "0" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.details?.some((d) => d.path === "page")).toBe(true);
    }
  });

  it("returns VALIDATION_ERROR for a non-numeric page", async () => {
    const result = await listProjects(repository, { page: "abc" });

    expect(result.ok).toBe(false);
  });

  it("returns VALIDATION_ERROR for pageSize outside 1 to 100", async () => {
    expect((await listProjects(repository, { pageSize: "0" })).ok).toBe(false);
    expect((await listProjects(repository, { pageSize: "101" })).ok).toBe(false);
  });

  it("does not call the repository when validation fails", async () => {
    const list = vi.spyOn(repository, "list");
    const count = vi.spyOn(repository, "count");

    await listProjects(repository, { page: "0" });

    expect(list).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });

  it("propagates an unexpected repository failure instead of swallowing it", async () => {
    repository.failure = new Error("connection refused");

    await expect(listProjects(repository, {})).rejects.toThrow(
      "connection refused",
    );
  });
});
