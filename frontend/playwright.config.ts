import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  use: {
    baseURL: process.env.NODEBI_E2E_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
    viewport: { width: 1600, height: 1000 },
    storageState: { cookies: [{ name: "nodebi-language", value: "en", domain: new URL(process.env.NODEBI_E2E_URL ?? "http://localhost:3000").hostname, path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
