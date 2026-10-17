import { expect, test } from "@playwright/test";

test("shell has one heading and does not overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Maldives Explorer" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});

test("reduced motion shortens transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const motion = await page.locator("body").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transitionDuration: style.transitionDuration,
      scrollBehavior: style.scrollBehavior,
    };
  });
  const duration = motion.transitionDuration.endsWith("ms")
    ? Number.parseFloat(motion.transitionDuration)
    : Number.parseFloat(motion.transitionDuration) * 1000;
  expect(duration).toBeLessThanOrEqual(0.01);
  expect(motion.scrollBehavior).toBe("auto");
});

test("the first tab stop is the skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  const box = await skipLink.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThan(100);
  await skipLink.press("Enter");
  await expect(page.locator("#main")).toBeInViewport();
});

test("a 390px viewport does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Maldives Explorer" })).toBeVisible();
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});

test("health returns only public fields", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(["application", "environment", "status", "version"]);
  expect(body.status).toBe("ok");
  expect(body.application).toBe("Maldives Explorer");
  expect(body.environment).toBe("local");
  expect(body.version).toBe("0.1.0");
  expect(JSON.stringify(body)).not.toContain("claim=");
});
