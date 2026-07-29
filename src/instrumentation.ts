/**
 * Next.js server startup hook.
 *
 * This is the runtime wiring that makes environment validation real rather
 * than a helper nobody calls: if `DATABASE_URL` is absent or malformed, the
 * server fails here, at startup, with a credential-free message — instead of
 * failing later inside a request with a driver-level error.
 *
 * It validates format only. It opens no connection, so a valid-but-unreachable
 * URL still starts, and `next build` stays independent of a live database.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { loadAppEnv } = await import("@/infrastructure/config/env");

  loadAppEnv();
}
