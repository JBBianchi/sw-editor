/**
 * End-to-end tests for orientation switching behavior (US3, SC-003).
 *
 * Verifies both switch directions (top-to-bottom <-> left-to-right), confirms
 * insertion anchors stay within 6 px of edge midpoints after each switch, and
 * validates orientation-correct port-side mapping for start/end nodes.
 *
 * Tests run against both the default (Rete-Lit) and React Flow renderers.
 *
 * @module tests/e2e/insert-layout-orientation.spec
 */

import { expect, type Page, test } from "@playwright/test";
import {
  assertAffordanceWithinTolerance,
  waitForAnchorStabilization,
  waitForLayoutSettled,
} from "./insert-geometry.helpers";

// ---------------------------------------------------------------------------
// Selectors and constants
// ---------------------------------------------------------------------------

/** Custom element tag for the editor web component. */
const EDITOR_ELEMENT = "sw-editor";

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

/** Orientation mode selector added in the e2e harness toolbar. */
const ORIENTATION_SELECT_SELECTOR = "#orientation-select";

/** Insertion affordance buttons attached to graph edges. */
const INSERT_BUTTON_SELECTOR = 'button[aria-label="Insert task"]';

/** Maximum allowed midpoint delta, in pixels. */
const MIDPOINT_TOLERANCE_PX = 6;

/** Maximum allowed distance from a node edge to consider a port side match. */
const PORT_SIDE_TOLERANCE_PX = 12;

/** Layout direction modes supported by the harness control. */
type OrientationMode = "top-to-bottom" | "left-to-right";

/** Axis-aligned bounding box in viewport coordinates. */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 2-D point in viewport coordinates. */
interface Point {
  x: number;
  y: number;
}

/** Symbolic side name for a node boundary. */
type Side = "top" | "right" | "bottom" | "left";

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
// Harness helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to the editor with the specified renderer and wait for mount.
 *
 * @param page - Playwright page.
 * @param urlSuffix - URL path (including query string) for the renderer.
 */
async function openEditor(page: Page, urlSuffix: string): Promise<void> {
  await page.goto(urlSuffix);
  await page.waitForSelector(EDITOR_ELEMENT, { state: "attached" });
}

/**
 * Create a new workflow via the toolbar button.
 *
 * @param page - Playwright page.
 */
async function createNewWorkflow(page: Page): Promise<void> {
  const btn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
  await btn.focus();
  await btn.press("Enter");
}

/**
 * Change orientation using the harness orientation selector.
 *
 * After selecting the new orientation, waits for rendered edges to be
 * present in the DOM and for anchor positions to stabilize. This two-phase
 * wait eliminates transient failures caused by the renderer tearing down
 * and rebuilding edge elements asynchronously during re-layout.
 *
 * @param page - Playwright page.
 * @param mode - Requested orientation mode.
 */
async function setOrientation(page: Page, mode: OrientationMode): Promise<void> {
  await page.locator(ORIENTATION_SELECT_SELECTOR).selectOption(mode);

  // Use the deterministic settling signal exposed by the harness, then
  // confirm edge elements are present and anchors are position-stable.
  await waitForLayoutSettled(page);

  const edgeSelector = '[data-testid^="rf__edge-"], [data-connection-id]';
  await page.locator(edgeSelector).first().waitFor({ state: "attached", timeout: 5_000 });

  await waitForAnchorStabilization(page);
}

/**
 * Collect all `data-edge-id` values from currently visible insertion buttons.
 *
 * Uses an explicit timeout so the wait does not hang indefinitely when
 * buttons have not yet been rendered after an orientation change.
 *
 * @param page - Playwright page.
 * @returns Array of visible edge IDs.
 */
async function getVisibleEdgeIds(page: Page): Promise<string[]> {
  const buttons = page.locator(INSERT_BUTTON_SELECTOR);
  try {
    await buttons.first().waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    return [];
  }

  const count = await buttons.count();
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = await buttons.nth(i).getAttribute("data-edge-id");
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Extract all rendered edge IDs from renderer DOM wrappers.
 *
 * Supports React Flow (`data-testid="rf__edge-<id>"`) and Rete-Lit
 * (`data-connection-id="<id>"`) edge containers.
 *
 * @param page - Playwright page.
 * @returns Unique edge IDs discovered in the DOM.
 */
async function getRenderedEdgeIds(page: Page): Promise<string[]> {
  const isReactFlow = page.url().includes("renderer=react-flow");
  const selector = isReactFlow ? '[data-testid^="rf__edge-"]' : "[data-connection-id]";

  const domIds = await page.locator(selector).evaluateAll((elements) => {
    const ids: string[] = [];
    for (const el of elements) {
      const rfId = el.getAttribute("data-testid");
      if (rfId?.startsWith("rf__edge-")) {
        ids.push(rfId.slice("rf__edge-".length));
        continue;
      }

      const reteId = el.getAttribute("data-connection-id");
      if (reteId) {
        ids.push(reteId);
      }
    }
    return ids;
  });

  return [...new Set(domIds)];
}

/**
 * Assert all visible affordances are within midpoint tolerance.
 *
 * @param page - Playwright page.
 */
async function assertAllAffordancesAligned(page: Page): Promise<void> {
  const buttonCount = await page.locator(INSERT_BUTTON_SELECTOR).count();
  expect(buttonCount, "At least one affordance must be present").toBeGreaterThan(0);

  // Preferred path: edge IDs are available directly on affordance buttons.
  const edgeIdsFromButtons = await getVisibleEdgeIds(page);
  if (edgeIdsFromButtons.length > 0) {
    for (const edgeId of edgeIdsFromButtons) {
      await assertAffordanceWithinTolerance(page, edgeId, MIDPOINT_TOLERANCE_PX);
    }
    return;
  }

  // Fallback for harnesses that do not expose data-edge-id on buttons:
  // derive IDs from rendered edge wrappers and attach them to affordances.
  const edgeIdsFromDom = await getRenderedEdgeIds(page);
  expect(
    edgeIdsFromDom.length,
    "At least one rendered edge must be present for midpoint checks",
  ).toBeGreaterThan(0);

  // When counts mismatch the positional mapping is unreliable — only assert
  // on the smaller set so failures reflect real geometry regressions rather
  // than transient DOM timing differences.
  const mappableCount = Math.min(buttonCount, edgeIdsFromDom.length);

  await page.evaluate(
    ({ edgeIds, count }: { edgeIds: string[]; count: number }) => {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('button[aria-label="Insert task"]'),
      );
      for (let i = 0; i < count; i++) {
        buttons[i]?.setAttribute("data-edge-id", edgeIds[i] as string);
      }
    },
    { edgeIds: edgeIdsFromDom, count: mappableCount },
  );

  for (let i = 0; i < mappableCount; i++) {
    await assertAffordanceWithinTolerance(page, edgeIdsFromDom[i] as string, MIDPOINT_TOLERANCE_PX);
  }
}

/**
 * Read the bounding box for an element containing exact text.
 *
 * @param page - Playwright page.
 * @param text - Exact visible text.
 * @returns Bounding box for the first matching element.
 */
async function getTextBox(page: Page, text: string): Promise<Box> {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not resolve bounding box for text: ${text}`);
  }
  return box;
}

/**
 * Compute Euclidean distance between two points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in pixels.
 */
function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Compute the center point of a box.
 *
 * @param box - Bounding box.
 * @returns Center point.
 */
function centerOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Determine which side of a box a point is closest to.
 *
 * @param point - Point to classify.
 * @param box - Node bounds.
 * @returns Closest side and absolute distance to that side.
 */
function closestSide(point: Point, box: Box): { side: Side; distancePx: number } {
  const distances: Array<{ side: Side; distancePx: number }> = [
    { side: "top", distancePx: Math.abs(point.y - box.y) },
    { side: "right", distancePx: Math.abs(point.x - (box.x + box.width)) },
    { side: "bottom", distancePx: Math.abs(point.y - (box.y + box.height)) },
    { side: "left", distancePx: Math.abs(point.x - box.x) },
  ];

  distances.sort((a, b) => a.distancePx - b.distancePx);
  return distances[0] as { side: Side; distancePx: number };
}

/**
 * Extract rendered start/end points of an edge path in viewport coordinates.
 *
 * @param page - Playwright page.
 * @param edgeId - Edge identifier used by insertion button `data-edge-id`.
 * @returns Start/end points of the rendered SVG path.
 */
async function getEdgeEndpoints(page: Page, edgeId: string): Promise<{ start: Point; end: Point }> {
  const edgeLocator = page
    .locator(`[data-testid="rf__edge-${edgeId}"], [data-connection-id="${edgeId}"]`)
    .first();
  await edgeLocator.waitFor({ state: "attached" });

  const points = await edgeLocator.evaluate((el: Element) => {
    const path = el.tagName === "path" ? (el as SVGPathElement) : el.querySelector("path");
    if (!path || typeof path.getTotalLength !== "function") {
      return null;
    }

    const total = path.getTotalLength();
    const startRaw = path.getPointAtLength(0);
    const endRaw = path.getPointAtLength(total);

    const ctm = (path.ownerSVGElement ?? path).getScreenCTM();
    if (!ctm) {
      return {
        start: { x: startRaw.x, y: startRaw.y },
        end: { x: endRaw.x, y: endRaw.y },
      };
    }

    return {
      start: {
        x: startRaw.x * ctm.a + ctm.e,
        y: startRaw.y * ctm.d + ctm.f,
      },
      end: {
        x: endRaw.x * ctm.a + ctm.e,
        y: endRaw.y * ctm.d + ctm.f,
      },
    };
  });

  if (!points) {
    throw new Error(`Could not resolve rendered path endpoints for edge: ${edgeId}`);
  }

  return points;
}

/**
 * Extract rendered path endpoints from the first visible edge in the graph.
 *
 * @param page - Playwright page.
 * @returns Start/end points of the first rendered edge path.
 */
async function getFirstEdgeEndpoints(page: Page): Promise<{ start: Point; end: Point }> {
  const edgeLocator = page.locator('[data-testid^="rf__edge-"], [data-connection-id]').first();
  await edgeLocator.waitFor({ state: "attached" });

  const points = await edgeLocator.evaluate((el: Element) => {
    const path = el.tagName === "path" ? (el as SVGPathElement) : el.querySelector("path");
    if (!path || typeof path.getTotalLength !== "function") {
      return null;
    }

    const total = path.getTotalLength();
    const startRaw = path.getPointAtLength(0);
    const endRaw = path.getPointAtLength(total);
    const ctm = (path.ownerSVGElement ?? path).getScreenCTM();

    if (!ctm) {
      return {
        start: { x: startRaw.x, y: startRaw.y },
        end: { x: endRaw.x, y: endRaw.y },
      };
    }

    return {
      start: {
        x: startRaw.x * ctm.a + ctm.e,
        y: startRaw.y * ctm.d + ctm.f,
      },
      end: {
        x: endRaw.x * ctm.a + ctm.e,
        y: endRaw.y * ctm.d + ctm.f,
      },
    };
  });

  if (!points) {
    throw new Error("Could not resolve rendered path endpoints for first edge");
  }
  return points;
}

/**
 * Resolve direction using start/end node centers.
 *
 * @param page - Playwright page.
 * @returns Signed deltas from start center to end center.
 */
async function getGraphDirectionDelta(page: Page): Promise<{ dx: number; dy: number }> {
  const startBox = await getTextBox(page, "Start");
  const endBox = await getTextBox(page, "End");
  const start = centerOf(startBox);
  const end = centerOf(endBox);
  return { dx: end.x - start.x, dy: end.y - start.y };
}

/**
 * Assert the overall graph direction matches the selected orientation.
 *
 * @param page - Playwright page.
 * @param mode - Expected layout orientation mode.
 */
async function assertDirectionMatchesOrientation(page: Page, mode: OrientationMode): Promise<void> {
  const { dx, dy } = await getGraphDirectionDelta(page);

  if (mode === "left-to-right") {
    expect(dx, "End node should be to the right of start in LR mode").toBeGreaterThan(20);
    expect(Math.abs(dx), "Horizontal delta should dominate in LR mode").toBeGreaterThan(
      Math.abs(dy),
    );
    return;
  }

  expect(dy, "End node should be below start in TB mode").toBeGreaterThan(20);
  expect(Math.abs(dy), "Vertical delta should dominate in TB mode").toBeGreaterThan(Math.abs(dx));
}

/**
 * Assert that start/end edge endpoints map to orientation-correct node sides.
 *
 * @param page - Playwright page.
 * @param mode - Expected orientation mode.
 */
async function assertPortSidesMatchOrientation(page: Page, mode: OrientationMode): Promise<void> {
  // Ensure rendered edges are present before querying endpoints.
  const edgeSelector = '[data-testid^="rf__edge-"], [data-connection-id]';
  await page.locator(edgeSelector).first().waitFor({ state: "attached", timeout: 5_000 });

  const edgeIds = await getVisibleEdgeIds(page);

  const startBox = await getTextBox(page, "Start");
  const endBox = await getTextBox(page, "End");
  const startCenter = centerOf(startBox);

  const endpoints =
    edgeIds.length > 0
      ? await getEdgeEndpoints(page, edgeIds[0] as string)
      : await getFirstEdgeEndpoints(page);

  // Determine source endpoint as the endpoint closest to the start node center.
  const distanceFromStartA = distance(endpoints.start, startCenter);
  const distanceFromStartB = distance(endpoints.end, startCenter);
  const sourcePoint = distanceFromStartA <= distanceFromStartB ? endpoints.start : endpoints.end;
  const targetPoint = sourcePoint === endpoints.start ? endpoints.end : endpoints.start;

  const sourceSide = closestSide(sourcePoint, startBox);
  const targetSide = closestSide(targetPoint, endBox);

  if (mode === "left-to-right") {
    expect(sourceSide.side, "Start outgoing port side in LR mode").toBe("right");
    expect(targetSide.side, "End incoming port side in LR mode").toBe("left");
  } else {
    expect(sourceSide.side, "Start outgoing port side in TB mode").toBe("bottom");
    expect(targetSide.side, "End incoming port side in TB mode").toBe("top");
  }

  expect(
    sourceSide.distancePx,
    "Source endpoint should be close to expected node side",
  ).toBeLessThanOrEqual(PORT_SIDE_TOLERANCE_PX);
  expect(
    targetSide.distancePx,
    "Target endpoint should be close to expected node side",
  ).toBeLessThanOrEqual(PORT_SIDE_TOLERANCE_PX);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for (const renderer of RENDERERS) {
  test.describe(`Orientation switch [${renderer.name}]`, () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page, renderer.urlSuffix);
      await createNewWorkflow(page);
      await waitForLayoutSettled(page);
      await waitForAnchorStabilization(page);
    });

    test("switch from TB to LR re-renders direction, anchors, and ports", async ({ page }) => {
      await setOrientation(page, "left-to-right");

      await assertDirectionMatchesOrientation(page, "left-to-right");
      await assertAllAffordancesAligned(page);
      await assertPortSidesMatchOrientation(page, "left-to-right");
    });

    test("switch from LR to TB re-renders direction, anchors, and ports", async ({ page }) => {
      await setOrientation(page, "left-to-right");
      await setOrientation(page, "top-to-bottom");

      await assertDirectionMatchesOrientation(page, "top-to-bottom");
      await assertAllAffordancesAligned(page);
      await assertPortSidesMatchOrientation(page, "top-to-bottom");
    });
  });
}
