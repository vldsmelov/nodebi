import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // Bound jsdom memory while the local application and database are running.
    maxWorkers: Math.min(4, availableParallelism()),
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
