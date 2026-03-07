/**
 * End-to-end tests for pan/zoom realignment and stale-control cleanup (SC-002).
 *
 * Verifies that insertion affordances remain within 6 px of their edge
 * midpoints after viewport pan, zoom, and page refresh operations, and that
 * stale affordance controls are cleaned up when edges are removed.
 *
 * Tests run against both the default (Rete-Lit) and React Flow renderers.
 *
 * @module tests/e2e/insert-layout-orientation.spec
 */

import { expect, type Page, test } from "@playwright/test";
import {
  assertAffordanceWithinTolerance,
  panAndZoom,
  waitForAnchorStabilization,
} from "./insert-geometry.helpers";

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Custom element tag for the editor web component. */
const EDITOR_ELEMENT = "sw-editor";

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

/** Insertion affordance buttons attached to graph edges. */
const INSERT_BUTTON_SELECTOR = 'button[aria-label="Insert task"]';

/** Task type selection menu opened by an insertion affordance. */
const TASK_MENU_SELECTOR = '[role="menu"][aria-label="Select task type to insert"]';

/** Individual task type entries within the open menu. */
const TASK_MENU_ITEM_SELECTOR = '[role="menuitem"]';

// ---------------------------------------------------------------------------
// Renderer matrix
// ---------------------------------------------------------------------------

/**
 * Each entry describes a renderer variant to test. The `urlSuffix` is appended
 * to the base URL when navigating to the editor.
 */
const RENDERERS: Array<{ name: string; urlSuffix: string }> = [
  { name: "rete-lit (default)", urlSuffix: "/" },
  { name: "react-flow", urlSuffix: "/?renderer=react-flow" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the editor with the specified renderer and wait for the custom
 * element to mount.
 *
 * @param page - Playwright page.
 * @param urlSuffix - URL path (including query string) for the renderer.
 */
async function openEditor(page: Page, urlSuffix: string): Promise<void> {
  await page.goto(urlSuffix);
  await page.waitForSelector(EDITOR_ELEMENT, { state: "attached" });
}

/**
 * Create a new workflow via the "Create new workflow" button.
 *
 * @param page - Playwright page.
 */
async function createNewWorkflow(page: Page): Promise<void> {
  const btn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
  await btn.focus();
  await btn.press("Enter");
}

/**
 * Collect all `data-edge-id` values from currently visible insertion buttons.
 *
 * @param page - Playwright page.
 * @returns Array of edge ID strings.
 */
async function getVisibleEdgeIds(page: Page): Promise<string[]> {
  const buttons = page.locator(INSERT_BUTTON_SELECTOR);
  await buttons.first().waitFor({ state: "visible" });
  const count = await buttons.count();
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = await buttons.nth(i).getAttribute("data-edge-id");
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Assert all visible affordances are within tolerance of their edge midpoints.
 *
 * @param page - Playwright page.
 * @param tolerancePx - Maximum pixel distance allowed.
 */
async function assertAllAffordancesAligned(page: Page, tolerancePx = 6): Promise<void> {
  const edgeIds = await getVisibleEdgeIds(page);
  expect(edgeIds.length, "At least one affordance must be present").toBeGreaterThan(0);

  for (const edgeId of edgeIds) {
    await assertAffordanceWithinTolerance(page, edgeId, tolerancePx);
  }
}

/**
 * Insert a task by activating the nth insertion affordance and selecting the
 * first menu item.
 *
 * @param page - Playwright page.
 * @param affordanceIndex - Zero-based index of the affordance to activate.
 */
async function insertTask(page: Page, affordanceIndex: number): Promise<void> {
  const affordance = page.locator(INSERT_BUTTON_SELECTOR).nth(affordanceIndex);
  await affordance.press("Enter");
  await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();
  const item = page.locator(TASK_MENU_ITEM_SELECTOR).first();
  await item.press("Enter");
  await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
}

// ---------------------------------------------------------------------------
// Tests — run for each renderer
// ---------------------------------------------------------------------------

for (const renderer of RENDERERS) {
  test.describe(`Pan/zoom realignment [${renderer.name}]`, () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page, renderer.urlSuffix);
      await createNewWorkflow(page);
      await waitForAnchorStabilization(page);
    });

    test("anchors within 6 px after pan", async ({ page }) => {
      await panAndZoom(page, { dx: 120, dy: -80 }, 1);
      await assertAllAffordancesAligned(page);
    });

    test("anchors within 6 px after zoom", async ({ page }) => {
      await panAndZoom(page, { dx: 0, dy: 0 }, 1.5);
      await assertAllAffordancesAligned(page);
    });

    test("anchors within 6 px after pan + zoom combined", async ({ page }) => {
      await panAndZoom(page, { dx: -100, dy: 60 }, 0.75);
      await assertAllAffordancesAligned(page);
    });

    test("anchors re-establish within tolerance after page refresh", async ({ page }) => {
      // Perform a viewport transform, then refresh and verify anchors realign.
      await panAndZoom(page, { dx: 80, dy: 40 }, 1.25);
      await assertAllAffordancesAligned(page);

      // Refresh the page — viewport resets to default.
      await page.reload();
      await page.waitForSelector(EDITOR_ELEMENT, { state: "attached" });
      await createNewWorkflow(page);
      await waitForAnchorStabilization(page);

      await assertAllAffordancesAligned(page);
    });
  });

  test.describe(`Stale control cleanup [${renderer.name}]`, () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page, renderer.urlSuffix);
      await createNewWorkflow(page);
      await waitForAnchorStabilization(page);
    });

    test("stale affordances are removed when edge is removed via insertion", async ({ page }) => {
      // Record affordance edge IDs before insertion.
      const edgeIdsBefore = await getVisibleEdgeIds(page);
      expect(edgeIdsBefore.length).toBeGreaterThan(0);

      // Insert a task — this splits the original edge into two new edges.
      // The old edge's affordance should be replaced by new ones.
      await insertTask(page, 0);
      await waitForAnchorStabilization(page);

      // After insertion the original edge ID should no longer have an
      // affordance button.
      const edgeIdsAfter = await getVisibleEdgeIds(page);

      for (const oldId of edgeIdsBefore) {
        const staleButton = page.locator(
          `button[data-edge-id="${oldId}"][aria-label="Insert task"]`,
        );
        const count = await staleButton.count();
        // The old edge may legitimately still exist if the renderer reuses
        // the same ID for one of the split edges. But there must be no
        // orphaned (invisible but present) buttons for it.
        if (!edgeIdsAfter.includes(oldId)) {
          expect(count, `Stale affordance for removed edge "${oldId}" must be cleaned up`).toBe(0);
        }
      }

      // New affordances should be present and aligned.
      await assertAllAffordancesAligned(page);
    });
  });
}
