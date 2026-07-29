import { PrismaClient } from "@prisma/client";

import { loadTestEnv } from "@/infrastructure/config/env";

/**
 * Integration-test database harness.
 *
 * This client is deliberately separate from the application singleton in
 * `src/infrastructure/persistence/prisma-client.ts`. The suite deletes rows,
 * so pointing it at the application client — and therefore at `DATABASE_URL` —
 * would let a test run wipe development data.
 *
 * `loadTestEnv` is the guard: it requires `TEST_DATABASE_URL`, requires it to
 * be a valid PostgreSQL URL, and refuses to run when it equals `DATABASE_URL`.
 * Validation happens before a client is constructed, not after.
 */

let testClient: PrismaClient | undefined;

export function getTestPrismaClient(): PrismaClient {
  if (testClient) {
    return testClient;
  }

  // Throws EnvironmentValidationError — with no credential in the message —
  // when TEST_DATABASE_URL is missing, malformed, or equal to DATABASE_URL.
  const env = loadTestEnv();

  testClient = new PrismaClient({
    datasources: { db: { url: env.TEST_DATABASE_URL } },
  });

  return testClient;
}

/**
 * Removes every row this project owns, in foreign-key-safe order.
 *
 * Uses the typed model API rather than raw SQL: no `$executeRawUnsafe`, no
 * string interpolation, and nothing that could reach a table outside the
 * three models. Migration metadata (`_prisma_migrations`) is untouched, and
 * neither the schema nor the database is dropped — a truncated database still
 * has to be migrated, and re-migrating on every run would be slow and
 * fragile.
 */
export async function resetTestDatabase(): Promise<void> {
  const prisma = getTestPrismaClient();

  // Plan → Requirement → Project. Cascades would handle this, but deleting
  // explicitly keeps the intent visible and independent of schema changes.
  await prisma.plan.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.project.deleteMany();
}

/** Disconnects the test client. Safe to call when no client was created. */
export async function disconnectTestPrismaClient(): Promise<void> {
  if (!testClient) {
    return;
  }

  await testClient.$disconnect();
  testClient = undefined;
}
