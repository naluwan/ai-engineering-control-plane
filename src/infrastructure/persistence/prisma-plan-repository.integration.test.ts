import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaPlanRepository } from "@/infrastructure/persistence/prisma-plan-repository";
import { PrismaProjectRepository } from "@/infrastructure/persistence/prisma-project-repository";
import { PrismaRequirementRepository } from "@/infrastructure/persistence/prisma-requirement-repository";
import {
  disconnectTestPrismaClient,
  getTestPrismaClient,
  resetTestDatabase,
} from "@/test/database";

const prisma = getTestPrismaClient();
const projects = new PrismaProjectRepository(prisma);
const requirements = new PrismaRequirementRepository(prisma);
const repository = new PrismaPlanRepository(prisma);

const UNKNOWN_ID = "clv0000000000000000000000";
const RAW_TEXT = "Allow a user to submit a requirement against a project.";
const SCHEMA_VERSION = "1.0.0";

async function createRequirement(): Promise<string> {
  const project = await projects.create({ name: "Host project" });
  const requirement = await requirements.create({
    projectId: project.id,
    rawText: RAW_TEXT,
    sourceType: "MANUAL",
    status: "SUBMITTED",
  });

  return requirement.id;
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await resetTestDatabase();
  await disconnectTestPrismaClient();
});

describe("PrismaPlanRepository", () => {
  describe("create", () => {
    it("persists a plan and returns it with generated fields", async () => {
      const requirementId = await createRequirement();

      const plan = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: { summary: "Restated requirement" },
      });

      expect(plan.id).toMatch(/\S/);
      expect(plan.requirementId).toBe(requirementId);
      expect(plan.schemaVersion).toBe(SCHEMA_VERSION);
      expect(plan.createdAt).toBeInstanceOf(Date);
    });

    it("round-trips nested JSON content unchanged", async () => {
      const requirementId = await createRequirement();
      const content = {
        summary: "Restated",
        goals: ["one", "two"],
        risks: [{ description: "Scope drift", severity: "MEDIUM" }],
        openQuestions: [],
        nested: { deep: { value: 1, flag: false, nothing: null } },
      };

      const created = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content,
      });

      expect(created.content).toEqual(content);
      expect((await repository.findById(created.id))?.content).toEqual(content);
    });

    it("round-trips a JSON null content value", async () => {
      const requirementId = await createRequirement();

      const created = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: null,
      });

      expect(created.content).toBeNull();
      expect((await repository.findById(created.id))?.content).toBeNull();
    });

    it("rejects a second plan for the same requirement", async () => {
      const requirementId = await createRequirement();

      await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: {},
      });

      await expect(
        repository.create({
          requirementId,
          schemaVersion: SCHEMA_VERSION,
          content: {},
        }),
      ).rejects.toThrowError();
    });

    it("rejects a plan whose requirement does not exist", async () => {
      await expect(
        repository.create({
          requirementId: UNKNOWN_ID,
          schemaVersion: SCHEMA_VERSION,
          content: {},
        }),
      ).rejects.toThrowError();
    });

    it("rejects a null requirementId at the database level", async () => {
      await expect(
        prisma.$executeRaw`
          INSERT INTO "Plan" ("id", "requirementId", "schemaVersion", "content", "updatedAt")
          VALUES (${"plan-null-requirement"}, ${null}, ${SCHEMA_VERSION}, '{}'::jsonb, NOW())
        `,
      ).rejects.toThrowError();
    });

    it("rejects a null schemaVersion at the database level", async () => {
      const requirementId = await createRequirement();

      await expect(
        prisma.$executeRaw`
          INSERT INTO "Plan" ("id", "requirementId", "schemaVersion", "content", "updatedAt")
          VALUES (${"plan-null-version"}, ${requirementId}, ${null}, '{}'::jsonb, NOW())
        `,
      ).rejects.toThrowError();
    });

    it("rejects a null content at the database level", async () => {
      const requirementId = await createRequirement();

      await expect(
        prisma.$executeRaw`
          INSERT INTO "Plan" ("id", "requirementId", "schemaVersion", "content", "updatedAt")
          VALUES (${"plan-null-content"}, ${requirementId}, ${SCHEMA_VERSION}, NULL, NOW())
        `,
      ).rejects.toThrowError();
    });
  });

  describe("findById and findByRequirementId", () => {
    it("finds a plan by its own id", async () => {
      const requirementId = await createRequirement();
      const created = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: {},
      });

      expect((await repository.findById(created.id))?.id).toBe(created.id);
    });

    it("finds a plan by its requirement id", async () => {
      const requirementId = await createRequirement();
      const created = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: {},
      });

      expect((await repository.findByRequirementId(requirementId))?.id).toBe(
        created.id,
      );
    });

    it("returns null for an unknown plan id", async () => {
      expect(await repository.findById(UNKNOWN_ID)).toBeNull();
    });

    it("returns null when the requirement has no plan yet", async () => {
      const requirementId = await createRequirement();

      expect(await repository.findByRequirementId(requirementId)).toBeNull();
    });
  });

  describe("list", () => {
    it("returns an empty array when no plan exists", async () => {
      expect(await repository.list()).toEqual([]);
    });

    it("returns every persisted plan", async () => {
      await repository.create({
        requirementId: await createRequirement(),
        schemaVersion: SCHEMA_VERSION,
        content: {},
      });
      await repository.create({
        requirementId: await createRequirement(),
        schemaVersion: SCHEMA_VERSION,
        content: {},
      });

      expect(await repository.list()).toHaveLength(2);
    });
  });

  describe("update", () => {
    it("replaces the content", async () => {
      const requirementId = await createRequirement();
      const created = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: { summary: "First" },
      });

      const updated = await repository.update(created.id, {
        content: { summary: "Second" },
      });

      expect(updated?.content).toEqual({ summary: "Second" });
    });

    it("leaves content untouched when only the version changes", async () => {
      const requirementId = await createRequirement();
      const created = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: { summary: "Kept" },
      });

      const updated = await repository.update(created.id, {
        schemaVersion: "2.0.0",
      });

      expect(updated?.schemaVersion).toBe("2.0.0");
      expect(updated?.content).toEqual({ summary: "Kept" });
    });

    it("returns null for an unknown id", async () => {
      expect(
        await repository.update(UNKNOWN_ID, { schemaVersion: "2.0.0" }),
      ).toBeNull();
    });
  });

  describe("delete", () => {
    it("returns true and removes the plan", async () => {
      const requirementId = await createRequirement();
      const created = await repository.create({
        requirementId,
        schemaVersion: SCHEMA_VERSION,
        content: {},
      });

      expect(await repository.delete(created.id)).toBe(true);
      expect(await repository.findById(created.id)).toBeNull();
    });

    it("returns false for an unknown id", async () => {
      expect(await repository.delete(UNKNOWN_ID)).toBe(false);
    });
  });
});

describe("cascade deletes", () => {
  it("deleting a project removes its requirements and their plans", async () => {
    const project = await projects.create({ name: "Cascading" });
    const requirement = await requirements.create({
      projectId: project.id,
      rawText: RAW_TEXT,
      sourceType: "MANUAL",
      status: "SUBMITTED",
    });
    const plan = await repository.create({
      requirementId: requirement.id,
      schemaVersion: SCHEMA_VERSION,
      content: { summary: "Doomed" },
    });

    expect(await projects.delete(project.id)).toBe(true);

    expect(await requirements.findById(requirement.id)).toBeNull();
    expect(await repository.findById(plan.id)).toBeNull();
  });

  it("deleting a requirement removes its plan", async () => {
    const project = await projects.create({ name: "Cascading" });
    const requirement = await requirements.create({
      projectId: project.id,
      rawText: RAW_TEXT,
      sourceType: "MANUAL",
      status: "SUBMITTED",
    });
    const plan = await repository.create({
      requirementId: requirement.id,
      schemaVersion: SCHEMA_VERSION,
      content: { summary: "Doomed" },
    });

    expect(await requirements.delete(requirement.id)).toBe(true);

    expect(await repository.findById(plan.id)).toBeNull();
    // The project itself survives.
    expect(await projects.findById(project.id)).not.toBeNull();
  });
});
