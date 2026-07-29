import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaProjectRepository } from "@/infrastructure/persistence/prisma-project-repository";
import {
  disconnectTestPrismaClient,
  getTestPrismaClient,
  resetTestDatabase,
} from "@/test/database";

const prisma = getTestPrismaClient();
const repository = new PrismaProjectRepository(prisma);

const UNKNOWN_ID = "clv0000000000000000000000";

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await disconnectTestPrismaClient();
});

describe("PrismaProjectRepository", () => {
  describe("create", () => {
    it("persists a project and returns it with generated fields", async () => {
      const project = await repository.create({ name: "Control Plane" });

      expect(project.id).toMatch(/\S/);
      expect(project.name).toBe("Control Plane");
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it("stores null for omitted optional fields", async () => {
      const project = await repository.create({ name: "Minimal" });

      expect(project.description).toBeNull();
      expect(project.repositoryUrl).toBeNull();
      expect(project.stackSummary).toBeNull();
    });

    it("stores every optional field when supplied", async () => {
      const project = await repository.create({
        name: "Full",
        description: "A description.",
        repositoryUrl: "https://github.com/naluwan/ai-engineering-control-plane",
        stackSummary: "Next.js, PostgreSQL",
      });

      expect(project.description).toBe("A description.");
      expect(project.repositoryUrl).toBe(
        "https://github.com/naluwan/ai-engineering-control-plane",
      );
      expect(project.stackSummary).toBe("Next.js, PostgreSQL");
    });

    it("rejects a null name at the database level", async () => {
      // Parameterised tagged-template SQL, so the NOT NULL constraint is the
      // thing under test — not TypeScript, and not a cast that pretends null
      // is a string.
      await expect(
        prisma.$executeRaw`
          INSERT INTO "Project" ("id", "name", "updatedAt")
          VALUES (${"project-null-name"}, ${null}, NOW())
        `,
      ).rejects.toThrowError();
    });
  });

  describe("findById", () => {
    it("returns the project when it exists", async () => {
      const created = await repository.create({ name: "Findable" });

      const found = await repository.findById(created.id);

      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("Findable");
    });

    it("returns null for an unknown id", async () => {
      expect(await repository.findById(UNKNOWN_ID)).toBeNull();
    });
  });

  describe("list", () => {
    it("returns an empty array when no project exists", async () => {
      expect(await repository.list()).toEqual([]);
    });

    it("returns every persisted project", async () => {
      await repository.create({ name: "One" });
      await repository.create({ name: "Two" });

      const projects = await repository.list();

      expect(projects).toHaveLength(2);
      expect(projects.map((project) => project.name).sort()).toEqual([
        "One",
        "Two",
      ]);
    });

    it("honours skip and take", async () => {
      await repository.create({ name: "One" });
      await repository.create({ name: "Two" });
      await repository.create({ name: "Three" });

      expect(await repository.list({ take: 2 })).toHaveLength(2);
      expect(await repository.list({ skip: 2, take: 2 })).toHaveLength(1);
    });
  });

  describe("update", () => {
    it("updates only the supplied fields", async () => {
      const created = await repository.create({
        name: "Before",
        description: "Kept.",
      });

      const updated = await repository.update(created.id, { name: "After" });

      expect(updated?.name).toBe("After");
      expect(updated?.description).toBe("Kept.");
    });

    it("can clear an optional field by setting it to null", async () => {
      const created = await repository.create({
        name: "Clearable",
        description: "Present.",
      });

      const updated = await repository.update(created.id, {
        description: null,
      });

      expect(updated?.description).toBeNull();
    });

    it("returns null for an unknown id", async () => {
      expect(await repository.update(UNKNOWN_ID, { name: "Nope" })).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true and removes the project", async () => {
      const created = await repository.create({ name: "Doomed" });

      expect(await repository.delete(created.id)).toBe(true);
      expect(await repository.findById(created.id)).toBeNull();
    });

    it("returns false for an unknown id", async () => {
      expect(await repository.delete(UNKNOWN_ID)).toBe(false);
    });
  });
});
