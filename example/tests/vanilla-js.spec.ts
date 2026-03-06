/**
 * End-to-end tests for the `example/vanilla-js` integration app.
 *
 * Verifies the core load → export flow using the host-client API:
 *   1. The page loads without browser errors.
 *   2. The load button is visible and clickable.
 *   3. Clicking "Load" registers the workflow source and updates the status.
 *   4. Clicking "Export as JSON" produces JSON output in the pre block.
 *   5. Clicking "Export as YAML" produces YAML output in the pre block.
 *
 * The dev server is started automatically by the Playwright config
 * (`example/playwright.config.ts`) on port 5174 before these tests run.
 *
 * @module example/tests/vanilla-js.spec
 */

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Selectors — match the IDs defined in example/vanilla-js/index.html
// ---------------------------------------------------------------------------

const BTN_LOAD = "#btn-load";
const BTN_EXPORT_JSON = "#btn-export";
const BTN_EXPORT_YAML = "#btn-export-yaml";
const LOAD_STATUS = "#load-status";
const EXPORT_STATUS = "#export-status";
const OUTPUT_PRE = "#output";

// ---------------------------------------------------------------------------
// 1. Page load
// ---------------------------------------------------------------------------

test.describe("vanilla-js example — page load", () => {
  test("page loads without uncaught JavaScript errors", async ({ page }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.goto("/");

    // Allow Vite HMR and module resolution to settle.
    await page.waitForLoadState("networkidle");

    expect(jsErrors, `Uncaught JS errors: ${jsErrors.join("; ")}`).toHaveLength(0);
  });

  test("page title matches the example name", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Vanilla JS/i);
  });

  test("main heading is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("sw-editor");
  });

  test("load button is visible and enabled on page load", async ({ page }) => {
    await page.goto("/");
    const btn = page.locator(BTN_LOAD);
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("export buttons are disabled before a workflow is loaded", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(BTN_EXPORT_JSON)).toBeDisabled();
    await expect(page.locator(BTN_EXPORT_YAML)).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 2. Workflow load
// ---------------------------------------------------------------------------

test.describe("vanilla-js example — workflow load", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("clicking load updates the status to 'loaded successfully'", async ({ page }) => {
    await page.click(BTN_LOAD);
    const status = page.locator(LOAD_STATUS);
    await expect(status).toContainText(/loaded successfully/i);
    await expect(status).toHaveClass(/ok/);
  });

  test("clicking load enables the export buttons", async ({ page }) => {
    await page.click(BTN_LOAD);
    await expect(page.locator(BTN_EXPORT_JSON)).toBeEnabled();
    await expect(page.locator(BTN_EXPORT_YAML)).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 3. Export
// ---------------------------------------------------------------------------

test.describe("vanilla-js example — export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Load the workflow before each export test.
    await page.click(BTN_LOAD);
    await expect(page.locator(BTN_EXPORT_JSON)).toBeEnabled();
  });

  test("export as JSON produces non-empty JSON output", async ({ page }) => {
    await page.click(BTN_EXPORT_JSON);

    const status = page.locator(EXPORT_STATUS);
    await expect(status).toContainText(/exported as json/i, { ignoreCase: true });
    await expect(status).toHaveClass(/ok/);

    const output = page.locator(OUTPUT_PRE);
    const text = await output.textContent();
    expect(text, "Export output must not be empty").toBeTruthy();
    // The output must parse as valid JSON.
    expect(() => JSON.parse(text ?? ""), "Export output must be valid JSON").not.toThrow();
  });

  test("exported JSON contains expected workflow fields", async ({ page }) => {
    await page.click(BTN_EXPORT_JSON);
    await expect(page.locator(EXPORT_STATUS)).toHaveClass(/ok/);

    const output = page.locator(OUTPUT_PRE);
    const text = await output.textContent();
    const parsed = JSON.parse(text ?? "{}");
    // The simple.json fixture must have a document field (Serverless Workflow DSL).
    expect(parsed).toHaveProperty("document");
  });

  test("export as YAML produces non-empty YAML output", async ({ page }) => {
    await page.click(BTN_EXPORT_YAML);

    const status = page.locator(EXPORT_STATUS);
    await expect(status).toContainText(/exported as yaml/i, { ignoreCase: true });
    await expect(status).toHaveClass(/ok/);

    const output = page.locator(OUTPUT_PRE);
    const text = await output.textContent();
    expect(text, "YAML export output must not be empty").toBeTruthy();
    // YAML output must not start with '{' (which would indicate JSON was returned instead).
    expect((text ?? "").trimStart()).not.toMatch(/^\{/);
  });
});
