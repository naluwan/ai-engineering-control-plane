import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

const INTEGRATION_TESTS = "src/**/*.integration.test.ts";

export default defineConfig({
  test: {
    /**
     * Two projects, because the two kinds of test need different runtimes.
     *
     * Unit and component tests run in jsdom and in parallel. Integration tests
     * run in Node — Prisma has no browser runtime — and serially in a single
     * fork: they share one database, and each test truncates it, so running
     * two files at once would let one wipe the other's rows mid-assertion.
     *
     * Both run under `pnpm test`. Neither is skipped.
     */
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/dist/**", INTEGRATION_TESTS],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: [INTEGRATION_TESTS],
          // One database, shared by every integration file.
          fileParallelism: false,
          pool: "forks",
          maxWorkers: 1,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/test/**"],
    },
  },
});
