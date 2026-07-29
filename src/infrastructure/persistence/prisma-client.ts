import { Prisma, PrismaClient } from "@prisma/client";

import { loadAppEnv } from "@/infrastructure/config/env";

/**
 * The application's Prisma client.
 *
 * Two things this module deliberately does not do at import time: validate the
 * environment, and construct a client. Both happen on the first call to
 * `getPrismaClient()`. That keeps `next build` — which loads modules but never
 * queries — independent of a live database.
 *
 * Constructing a `PrismaClient` does not open a connection; Prisma connects
 * lazily on the first query.
 */

const PRISMA_CLIENT_KEY = Symbol.for("acp.prismaClient");

/**
 * A typed view of `globalThis` for the development hot-reload singleton. The
 * property is declared here rather than assigned to an untyped global.
 */
type PrismaGlobal = {
  [PRISMA_CLIENT_KEY]?: PrismaClient;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

/** Memoised for the lifetime of this module instance. */
let moduleClient: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  const env = loadAppEnv();

  return new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
  });
}

/**
 * Returns the process-wide Prisma client, creating it on first use.
 *
 * In development, Next.js re-evaluates modules on hot reload. Without the
 * global, every reload would create another client and leak its connection
 * pool until the database refused new connections. In production the module is
 * evaluated once, so the module-level memo is sufficient and nothing is
 * attached to `globalThis`.
 */
export function getPrismaClient(): PrismaClient {
  if (moduleClient) {
    return moduleClient;
  }

  const existing = globalForPrisma[PRISMA_CLIENT_KEY];

  if (existing) {
    moduleClient = existing;

    return existing;
  }

  const client = createPrismaClient();

  moduleClient = client;

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma[PRISMA_CLIENT_KEY] = client;
  }

  return client;
}

/** Prisma's code for "an operation required a record that does not exist". */
const RECORD_NOT_FOUND = "P2025";

/**
 * Narrows the one Prisma failure the repositories treat as an expected
 * outcome.
 *
 * Only this code maps to the not-found contract. Every other failure —
 * a unique violation, a foreign-key violation, a null constraint, a lost
 * connection — is unexpected and must propagate. Catching broadly here is how
 * a repository starts reporting `null` for a broken database.
 */
export function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === RECORD_NOT_FOUND
  );
}
