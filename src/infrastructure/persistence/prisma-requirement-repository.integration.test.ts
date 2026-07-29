import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaProjectRepository } from "@/infrastructure/persistence/prisma-project-repository";
import { PrismaRequirementRepository } from "@/infrastructure/persistence/prisma-requirement-repository";
import {
  disconnectTestPrismaClient,
  getTestPrismaClient,
  resetTestDatabase,
} from "@/test/database";

const prisma = getTestPrismaClient();
const projects = new PrismaProjectRepository(prisma);
const repository = new PrismaRequirementRepository(prisma);

const UNKNOWN_ID = "clv0000000000000000000000";
const RAW_TEXT = "Allow a user to submit a requirement against a project.";

async function createProject(name = "Host project"): Promise<string> {
  const project = await projects.create({ name });

  return project.id;
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await disconnectTestPrismaClient();
});

describe("PrismaRequirementRepository", () => {
  describe("create", () => {
    it("persists a requirement with the default source type and status", async () => {
      const projectId = await createProject();

      const requirement = await repository.create({
        projectId,
        rawText: RAW_TEXT,
        sourceType: "MANUAL",
        status: "SUBMITTED",
      });

      expect(requirement.id).toMatch(/\S/);
      expect(requirement.projectId).toBe(projectId);
      expect(requirement.sourceType).toBe("MANUAL");
      expect(requirement.status).toBe("SUBMITTED");
      expect(requirement.createdAt).toBeInstanceOf(Date);
    });

    it("persists a GITHUB_ISSUE requirement", async () => {
      const projectId = await createProject();

      const requirement = await repository.create({
        projectId,
        rawText: RAW_TEXT,
        sourceType: "GITHUB_ISSUE",
        status: "SUBMITTED",
      });

      expect(requirement.sourceType).toBe("GITHUB_ISSUE");
    });

    it("rejects a requirement whose project does not exist", async () => {
      await expect(
        repository.create({
          projectId: UNKNOWN_ID,
          rawText: RAW_TEXT,
          sourceType: "MANUAL",
          status: "SUBMITTED",
        }),
      ).rejects.toThrowError();
    });

    it("rejects a null projectId at the database level", async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "Requirement" ("id", "projectId", "rawText", "updatedAt")
          VALUES (${"requirement-null-project"}, ${null}, ${RAW_TEXT}, NOW())
        `,
      ).rejects.toThrowError();
    });

    it("rejects a null rawText at the database level", async () => {
      const projectId = await createProject();

      await expect(
        prisma.$executeRaw`
          INSERT INTO "Requirement" ("id", "projectId", "rawText", "updatedAt")
          VALUES (${"requirement-null-text"}, ${projectId}, ${null}, NOW())
        `,
      ).rejects.toThrowError();
    });
  });

  describe("findById", () => {
    it("returns the requirement when it exists", async () => {
      const projectId = await createProject();
      const created = await repository.create({
        projectId,
        rawText: RAW_TEXT,
        sourceType: "MANUAL",
        status: "SUBMITTED",
      });

      expect((await repository.findById(created.id))?.id).toBe(created.id);
    });

    it("returns null for an unknown id", async () => {
      expect(await repository.findById(UNKNOWN_ID)).toBeNull();
    });
  });

  describe("listByProjectId", () => {
    it("returns an empty array when the project has no requirement", async () => {
      const projectId = await createProject();

      expect(await repository.listByProjectId(projectId)).toEqual([]);
    });

    it("returns an empty array for an unknown project", async () => {
      expect(await repository.listByProjectId(UNKNOWN_ID)).toEqual([]);
    });

    it("returns only the requirements of the given project", async () => {
      const projectA = await createProject("A");
      const projectB = await createProject("B");

      await repository.create({
        projectId: projectA,
        rawText: RAW_TEXT,
        sourceType: "MANUAL",
        status: "SUBMITTED",
      });
      await repository.create({
        projectId: projectB,
        rawText: RAW_TEXT,
        sourceType: "MANUAL",
        status: "SUBMITTED",
      });

      const forA = await repository.listByProjectId(projectA);

      expect(forA).toHaveLength(1);
      expect(forA[0]?.projectId).toBe(projectA);
    });
  });

  describe("update", () => {
    it("moves the requirement through its statuses", async () => {
      const projectId = await createProject();
      const created = await repository.create({
        projectId,
        rawText: RAW_TEXT,
        sourceType: "MANUAL",
        status: "SUBMITTED",
      });

      expect((await repository.update(created.id, { status: "PLANNING" }))?.status).toBe(
        "PLANNING",
      );
      expect((await repository.update(created.id, { status: "PLANNED" }))?.status).toBe(
        "PLANNED",
      );
    });

    it("records a planning failure", async () => {
      const projectId = await createProject();
      const created = await repository.create({
        projectId,
        rawText: RAW_TEXT,
        sourceType: "MANUAL",
        status: "SUBMITTED",
      });

      const updated = await repository.update(created.id, {
        status: "PLANNING_FAILED",
      });

      expect(updated?.status).toBe("PLANNING_FAILED");
    });

    it("returns null for an unknown id", async () => {
      expect(
        await repository.update(UNKNOWN_ID, { status: "PLANNING" }),
      ).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true and removes the requirement", async () => {
      const projectId = await createProject();
      const created = await repository.create({
        projectId,
        rawText: RAW_TEXT,
        sourceType: "MANUAL",
        status: "SUBMITTED",
      });

      expect(await repository.delete(created.id)).toBe(true);
      expect(await repository.findById(created.id)).toBeNull();
    });

    it("returns false for an unknown id", async () => {
      expect(await repository.delete(UNKNOWN_ID)).toBe(false);
    });
  });
});
