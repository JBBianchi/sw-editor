/**
 * End-to-end tests for the `example/host-events` integration app.
 *
 * Verifies the event subscription and capability query flows:
 *   1. The page loads without browser errors.
 *   2. Simulation buttons are visible and enabled.
 *   3. Clicking "Simulate diagnostics event" appends an entry to the event log
 *      and increments the event counter.
 *   4. Clicking "Simulate workflow load event" appends a workflowChanged entry.
 *   5. Clicking "Query capabilities" reveals the capabilities table.
 *   6. Clicking "Clear log" resets the event list and counter.
 *
 * The dev server is started automatically by the Playwright config
 * (`example/playwright.config.ts`) on port 5175 before these tests run.
 *
 * @module example/tests/host-events.spec
 */

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Selectors — match the IDs defined in example/host-events/index.html
// ---------------------------------------------------------------------------

const BTN_SIMULATE_LOAD = "#btn-simulate-load";
const BTN_SIMULATE_DIAG = "#btn-simulate-diag";
const BTN_SIMULATE_SELECTION = "#btn-simulate-selection";
const BTN_SIMULATE_ERROR = "#btn-simulate-error";
const BTN_GET_CAP = "#btn-get-cap";
const BTN_CLEAR = "#btn-clear";
const EVENT_LIST = "#event-list";
const EVENT_COUNT = "#event-count";
const CAP_TABLE = "#cap-table";
const CAP_PLACEHOLDER = "#cap-placeholder";

// ---------------------------------------------------------------------------
// 1. Page load
// ---------------------------------------------------------------------------

test.describe("host-events example — page load", () => {
  test("page loads without uncaught JavaScript errors", async ({ page }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => jsErrors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(jsErrors, `Uncaught JS errors: ${jsErrors.join("; ")}`).toHaveLength(0);
  });

  test("page title matches the example name", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Host Events/i);
  });

  test("main heading is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("sw-editor");
  });

  test("all simulation buttons are visible and enabled", async ({ page }) => {
    await page.goto("/");
    for (const selector of [
      BTN_SIMULATE_LOAD,
      BTN_SIMULATE_DIAG,
      BTN_SIMULATE_SELECTION,
      BTN_SIMULATE_ERROR,
      BTN_GET_CAP,
      BTN_CLEAR,
    ]) {
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(selector)).toBeEnabled();
    }
  });

  test("event counter starts at 0", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(EVENT_COUNT)).toHaveText("0");
  });

  test("capabilities table is hidden on page load", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(CAP_TABLE)).toBeHidden();
    await expect(page.locator(CAP_PLACEHOLDER)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Diagnostics event
// ---------------------------------------------------------------------------

test.describe("host-events example — diagnostics event", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("clicking simulate-diag appends an entry to the event log", async ({ page }) => {
    await page.click(BTN_SIMULATE_DIAG);

    const list = page.locator(EVENT_LIST);
    // The event entry must contain the diagnostics event type name.
    await expect(list).toContainText("editorDiagnosticsChanged");
  });

  test("event counter increments after a diagnostics event", async ({ page }) => {
    await page.click(BTN_SIMULATE_DIAG);
    await expect(page.locator(EVENT_COUNT)).toHaveText("1");
  });

  test("diagnostics entry includes revision and severity counts", async ({ page }) => {
    await page.click(BTN_SIMULATE_DIAG);

    const list = page.locator(EVENT_LIST);
    // The formatted entry produced by main.ts includes "revision=" and "warnings=".
    await expect(list).toContainText("revision=");
    await expect(list).toContainText("warnings=");
  });
});

// ---------------------------------------------------------------------------
// 3. Workflow load event
// ---------------------------------------------------------------------------

test.describe("host-events example — workflow load event", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("clicking simulate-load appends a workflowChanged entry", async ({ page }) => {
    await page.click(BTN_SIMULATE_LOAD);

    await expect(page.locator(EVENT_LIST)).toContainText("workflowChanged");
  });

  test("workflowChanged entry shows format and revision", async ({ page }) => {
    await page.click(BTN_SIMULATE_LOAD);

    const list = page.locator(EVENT_LIST);
    await expect(list).toContainText("format=json");
    await expect(list).toContainText("revision=");
  });
});

// ---------------------------------------------------------------------------
// 4. Capability query
// ---------------------------------------------------------------------------

test.describe("host-events example — capability query", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("clicking query-capabilities reveals the capabilities table", async ({ page }) => {
    await page.click(BTN_GET_CAP);

    await expect(page.locator(CAP_TABLE)).toBeVisible();
    await expect(page.locator(CAP_PLACEHOLDER)).toBeHidden();
  });

  test("capabilities table contains renderer ID and contract version", async ({ page }) => {
    await page.click(BTN_GET_CAP);

    const table = page.locator(CAP_TABLE);
    await expect(table).toContainText("Renderer ID");
    await expect(table).toContainText("rete-lit");
    await expect(table).toContainText("Contract version");
  });
});

// ---------------------------------------------------------------------------
// 5. Clear log
// ---------------------------------------------------------------------------

test.describe("host-events example — clear log", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("clicking clear resets the event counter to 0", async ({ page }) => {
    // Add some events first.
    await page.click(BTN_SIMULATE_DIAG);
    await page.click(BTN_SIMULATE_LOAD);
    await expect(page.locator(EVENT_COUNT)).toHaveText("2");

    await page.click(BTN_CLEAR);
    await expect(page.locator(EVENT_COUNT)).toHaveText("0");
  });

  test("clicking clear removes events from the log", async ({ page }) => {
    await page.click(BTN_SIMULATE_DIAG);
    await expect(page.locator(EVENT_LIST)).toContainText("editorDiagnosticsChanged");

    await page.click(BTN_CLEAR);
    await expect(page.locator(EVENT_LIST)).not.toContainText("editorDiagnosticsChanged");
  });
});
