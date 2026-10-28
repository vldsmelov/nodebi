import type { Page } from "@playwright/test";

/** Exercise a fixed production UI build against disposable acceptance data, never live sources. */
export async function isolatedBrowserApi(page: Page, api: string) {
  const builtApi = process.env.NODEBI_E2E_BROWSER_API;
  if (!builtApi) return;
  const origin = new URL(process.env.NODEBI_E2E_URL ?? "http://localhost:3000").origin;
  await page.route(`${new URL(builtApi).origin}/api/**`, async route => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type",
      } });
      return;
    }
    const target = new URL(request.url());
    const response = await route.fetch({ url: `${api}${target.pathname}${target.search}` });
    await route.fulfill({ response, headers: { ...response.headers(), "access-control-allow-origin": origin } });
  });
}
