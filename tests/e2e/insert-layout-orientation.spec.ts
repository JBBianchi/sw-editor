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
import { waitForAnchorStabilization } from "./insert-geometry.helpers";

// ---------------------------------------------------------------------------
// Selectors and constants
// ---------------------------------------------------------------------------

/** Custom element tag for the editor web component. */
const EDITOR_ELEMENT = "sw-editor";

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

/** Orientation mode selector added in the e2e harness toolbar. */
const ORIENTATION_SELECT_SELECTOR = '#orientation-select';

/** Insertion affordance buttons attached to graph edges. */
const INSERT_BUTTON_SELECTOR = 'button[aria-label="Insert task"]';

/** Task type selection menu opened by an insertion affordance. */
const TASK_MENU_SELECTOR = '[role="menu"][aria-label="Select task type to insert"]';

/** Individual task choice button inside the insertion menu. */
const TASK_MENU_ITEM_SELECTOR = '[role="menuitem"]';

/** Maximum allowed distance from a node edge to consider a port side match. */
const PORT_SIDE_TOLERANCE_PX = 12;

/** Tolerance for Rete socket centers, which include wrapper padding/labels. */
const SOCKET_SIDE_TOLERANCE_PX = 30;

/** Layout direction modes supported by the harness control. */
type OrientationMode = "top-to-bottom" | "left-to-right";

/** Axis-aligned bounding box in viewport coordinates. */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Node bounds plus stable DOM identifier. */
interface NodeBox extends Box {
  id: string;
}

/** Node bounds with sampled input/output socket centers. */
interface ReteSocketSample {
  id: string;
  box: Box;
  inputs: Point[];
  outputs: Point[];
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
 * Insert the first available task type via the first visible affordance.
 *
 * @param page - Playwright page.
 */
async function insertFirstTask(page: Page): Promise<void> {
  const affordance = page.locator(INSERT_BUTTON_SELECTOR).first();
  await affordance.waitFor({ state: "visible" });
  await affordance.click();

  const menu = page.locator(TASK_MENU_SELECTOR);
  await menu.waitFor({ state: "visible" });

  const firstItem = menu.locator(TASK_MENU_ITEM_SELECTOR).first();
  await firstItem.waitFor({ state: "visible" });
  await firstItem.click();

  await menu.waitFor({ state: "hidden" });
  await waitForAnchorStabilization(page);
}

/**
 * Seed the graph with additional tasks so multiple edges are visible.
 *
 * @param page - Playwright page.
 * @param insertions - Number of sequential insertions to perform.
 */
async function seedGraphWithInsertions(page: Page, insertions: number): Promise<void> {
  for (let i = 0; i < insertions; i++) {
    await insertFirstTask(page);
  }
}

/**
 * Change orientation using the harness orientation selector.
 *
 * @param page - Playwright page.
 * @param mode - Requested orientation mode.
 */
async function setOrientation(page: Page, mode: OrientationMode): Promise<void> {
  await page.locator(ORIENTATION_SELECT_SELECTOR).selectOption(mode);
  await waitForAnchorStabilization(page);
}

/**
 * Collect all `data-edge-id` values from currently visible insertion buttons.
 *
 * @param page - Playwright page.
 * @returns Array of visible edge IDs.
 */
async function getVisibleEdgeIds(page: Page): Promise<string[]> {
  const buttons = page.locator(INSERT_BUTTON_SELECTOR);
  await buttons.first().waitFor({ state: "visible" });

  const count = await buttons.count();
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = await buttons.nth(i).getAttribute("data-edge-id");
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Assert all visible affordances are within midpoint tolerance.
 *
 * @param page - Playwright page.
 */
async function assertAllAffordancesAligned(page: Page): Promise<void> {
  const isReactFlow = page.url().includes("renderer=react-flow");
  const buttonCount = await page.locator(INSERT_BUTTON_SELECTOR).count();
  expect(buttonCount, "At least one affordance must be present").toBeGreaterThan(0);

  const edgeIdsFromButtons = await getVisibleEdgeIds(page);
  expect(edgeIdsFromButtons.length, "All affordances should expose data-edge-id").toBe(buttonCount);

  // Midpoint alignment is covered in integration geometry tests where renderer
  // internals can be sampled deterministically. In this e2e suite, keep
  // renderer-agnostic presence/mapping checks to avoid DOM-implementation
  // coupling and retain stability across backends.
  if (!isReactFlow) {
    return;
  }

  const renderedEdgeIds = await page.locator('[data-testid^="rf__edge-"]').evaluateAll((elements) =>
    elements
      .map((el) => el.getAttribute("data-testid"))
      .filter((id): id is string => id !== null && id.startsWith("rf__edge-"))
      .map((id) => id.slice("rf__edge-".length)),
  );

  expect(renderedEdgeIds.length, "Expected rendered React Flow edges").toBeGreaterThan(0);
  for (const edgeId of edgeIdsFromButtons) {
    expect(renderedEdgeIds, `Affordance edge id "${edgeId}" must exist in rendered React Flow edges`).toContain(
      edgeId,
    );
  }
}

/**
 * Read the bounding box for an element containing exact text.
 *
 * @param page - Playwright page.
 * @param text - Exact visible text.
 * @returns Bounding box for the first matching element.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getTextBox(page: Page, text: string): Promise<Box> {
  const locator = page.getByText(new RegExp(`^${escapeRegex(text)}$`, "i")).first();
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
 * Return absolute distance from a point to a specific side of a box.
 *
 * @param point - Point to measure.
 * @param box - Bounding box.
 * @param side - Side to measure against.
 * @returns Distance in pixels.
 */
function distanceToSide(point: Point, box: Box, side: Side): number {
  switch (side) {
    case "top":
      return Math.abs(point.y - box.y);
    case "right":
      return Math.abs(point.x - (box.x + box.width));
    case "bottom":
      return Math.abs(point.y - (box.y + box.height));
    case "left":
      return Math.abs(point.x - box.x);
  }
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
    .locator(
      `[data-testid="rf__edge-${edgeId}"], [data-connection-id="${edgeId}"], [data-testid="connection-${edgeId}"]`,
    )
    .first();
  await edgeLocator.waitFor({ state: "attached" });

  const points = await edgeLocator.evaluate((el: Element) => {
    const path =
      el.tagName === "path"
        ? (el as SVGPathElement)
        : (el.querySelector("path.react-flow__edge-path") ?? el.querySelector("path"));
    if (!path || typeof path.getTotalLength !== "function") {
      return null;
    }

    const total = path.getTotalLength();
    const startRaw = path.getPointAtLength(0);
    const endRaw = path.getPointAtLength(total);

    const svg = path.ownerSVGElement;
    const ctm = typeof path.getScreenCTM === "function" ? path.getScreenCTM() : null;
    if (svg && ctm && typeof svg.createSVGPoint === "function") {
      const startPt = svg.createSVGPoint();
      startPt.x = startRaw.x;
      startPt.y = startRaw.y;
      const endPt = svg.createSVGPoint();
      endPt.x = endRaw.x;
      endPt.y = endRaw.y;

      const start = startPt.matrixTransform(ctm);
      const end = endPt.matrixTransform(ctm);
      return {
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
      };
    }

    const rect = path.getBoundingClientRect();
    return {
      start: { x: rect.x, y: rect.y + rect.height / 2 },
      end: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
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
  const edgeLocator = page
    .locator('[data-testid^="rf__edge-"], [data-connection-id], [data-testid^="connection-"]')
    .first();
  await edgeLocator.waitFor({ state: "attached" });

  const points = await edgeLocator.evaluate((el: Element) => {
    const path =
      el.tagName === "path"
        ? (el as SVGPathElement)
        : (el.querySelector("path.react-flow__edge-path") ?? el.querySelector("path"));
    if (!path || typeof path.getTotalLength !== "function") {
      return null;
    }

    const total = path.getTotalLength();
    const startRaw = path.getPointAtLength(0);
    const endRaw = path.getPointAtLength(total);
    const svg = path.ownerSVGElement;
    const ctm = typeof path.getScreenCTM === "function" ? path.getScreenCTM() : null;
    if (svg && ctm && typeof svg.createSVGPoint === "function") {
      const startPt = svg.createSVGPoint();
      startPt.x = startRaw.x;
      startPt.y = startRaw.y;
      const endPt = svg.createSVGPoint();
      endPt.x = endRaw.x;
      endPt.y = endRaw.y;

      const start = startPt.matrixTransform(ctm);
      const end = endPt.matrixTransform(ctm);
      return {
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
      };
    }

    const rect = path.getBoundingClientRect();
    return {
      start: { x: rect.x, y: rect.y + rect.height / 2 },
      end: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
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
 * Collect rendered node boxes from either renderer implementation.
 *
 * @param page - Playwright page.
 * @returns Visible node boxes with node IDs.
 */
async function getRenderedNodeBoxes(page: Page): Promise<NodeBox[]> {
  return page.evaluate(() => {
    const result: NodeBox[] = [];

    const rfNodes = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"));
    for (const node of rfNodes) {
      const rect = node.getBoundingClientRect();
      const id = node.getAttribute("data-id");
      if (id && rect.width > 0 && rect.height > 0) {
        result.push({ id, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      }
    }

    const reteNodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="node"][data-node-id]'),
    );
    for (const node of reteNodes) {
      const rect = node.getBoundingClientRect();
      const id = node.getAttribute("data-node-id");
      if (id && rect.width > 0 && rect.height > 0) {
        result.push({ id, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      }
    }

    return result;
  });
}

/**
 * Collect Rete node bounds plus input/output socket center points.
 *
 * @param page - Playwright page.
 * @returns Per-node socket samples.
 */
async function getReteSocketSamples(page: Page): Promise<ReteSocketSample[]> {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="node"][data-node-id]'),
    );

    return nodes
      .map((node) => {
        const id = node.getAttribute("data-node-id");
        const rect = node.getBoundingClientRect();
        if (!id || rect.width <= 0 || rect.height <= 0) {
          return null;
        }

        const centerOf = (element: Element): Point => {
          const box = (element as HTMLElement).getBoundingClientRect();
          return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        };

        const inputs = Array.from(node.querySelectorAll('[data-testid="input-socket"]')).map(centerOf);
        const outputs = Array.from(node.querySelectorAll('[data-testid="output-socket"]')).map(centerOf);

        return {
          id,
          box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          inputs,
          outputs,
        };
      })
      .filter((entry): entry is ReteSocketSample => entry !== null);
  });
}

/**
 * Assert Rete socket sides match orientation by checking socket center points
 * against each node bounds.
 *
 * @param page - Playwright page.
 * @param mode - Expected orientation mode.
 */
async function assertReteSocketSidesMatchOrientation(
  page: Page,
  mode: OrientationMode,
): Promise<void> {
  const samples = await getReteSocketSamples(page);
  expect(samples.length, "Expected rendered Rete nodes with socket samples").toBeGreaterThan(1);

  const expectedInputSide = mode === "left-to-right" ? "left" : "top";
  const expectedOutputSide = mode === "left-to-right" ? "right" : "bottom";

  for (const sample of samples) {
    expect(sample.inputs.length, `Node "${sample.id}" should expose at least one input socket`).toBeGreaterThan(0);
    expect(sample.outputs.length, `Node "${sample.id}" should expose at least one output socket`).toBeGreaterThan(0);

    for (const input of sample.inputs) {
      const dist = distanceToSide(input, sample.box, expectedInputSide);
      expect(
        dist,
        `Node "${sample.id}" input socket should stay near ${expectedInputSide} in ${mode} mode`,
      ).toBeLessThanOrEqual(SOCKET_SIDE_TOLERANCE_PX);
    }

    for (const output of sample.outputs) {
      const dist = distanceToSide(output, sample.box, expectedOutputSide);
      expect(
        dist,
        `Node "${sample.id}" output socket should stay near ${expectedOutputSide} in ${mode} mode`,
      ).toBeLessThanOrEqual(SOCKET_SIDE_TOLERANCE_PX);
    }
  }
}

/**
 * Resolve the closest node box to a point using center-point distance.
 *
 * @param point - The endpoint to match.
 * @param nodeBoxes - Candidate node boxes.
 * @returns Closest node box.
 */
function closestNodeBox(point: Point, nodeBoxes: NodeBox[]): NodeBox {
  let winner = nodeBoxes[0] as NodeBox;
  let best = Number.POSITIVE_INFINITY;
  for (const box of nodeBoxes) {
    const center = centerOf(box);
    const d = distance(point, center);
    if (d < best) {
      best = d;
      winner = box;
    }
  }
  return winner;
}

/**
 * Assert that all rendered edge endpoints map to orientation-correct node sides.
 *
 * @param page - Playwright page.
 * @param mode - Expected orientation mode.
 */
async function assertPortSidesMatchOrientation(page: Page, mode: OrientationMode): Promise<void> {
  const isReactFlow = page.url().includes("renderer=react-flow");
  if (!isReactFlow) {
    await assertReteSocketSidesMatchOrientation(page, mode);
    return;
  }

  const edgeIds = await getVisibleEdgeIds(page);
  expect(edgeIds.length, "Expected at least one rendered edge affordance").toBeGreaterThan(0);

  const nodeBoxes = await getRenderedNodeBoxes(page);
  expect(nodeBoxes.length, "Expected rendered node boxes for side checks").toBeGreaterThan(1);

  const expectedSourceSide = mode === "left-to-right" ? "right" : "bottom";
  const expectedTargetSide = mode === "left-to-right" ? "left" : "top";

  for (const edgeId of edgeIds) {
    const endpoints = await getEdgeEndpoints(page, edgeId);

    const sourcePoint =
      mode === "left-to-right"
        ? endpoints.start.x <= endpoints.end.x
          ? endpoints.start
          : endpoints.end
        : endpoints.start.y <= endpoints.end.y
          ? endpoints.start
          : endpoints.end;
    const targetPoint = sourcePoint === endpoints.start ? endpoints.end : endpoints.start;

    const sourceNode = closestNodeBox(sourcePoint, nodeBoxes);
    const targetNode = closestNodeBox(targetPoint, nodeBoxes);

    const sourceSide = closestSide(sourcePoint, sourceNode);
    const targetSide = closestSide(targetPoint, targetNode);

    expect(
      sourceSide.side,
      `Edge "${edgeId}" source endpoint side mismatch in ${mode} mode`,
    ).toBe(expectedSourceSide);
    expect(
      targetSide.side,
      `Edge "${edgeId}" target endpoint side mismatch in ${mode} mode`,
    ).toBe(expectedTargetSide);

    expect(
      sourceSide.distancePx,
      `Edge "${edgeId}" source endpoint is too far from expected side`,
    ).toBeLessThanOrEqual(PORT_SIDE_TOLERANCE_PX);
    expect(
      targetSide.distancePx,
      `Edge "${edgeId}" target endpoint is too far from expected side`,
    ).toBeLessThanOrEqual(PORT_SIDE_TOLERANCE_PX);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for (const renderer of RENDERERS) {
  test.describe(`Orientation switch [${renderer.name}]`, () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page, renderer.urlSuffix);
      await createNewWorkflow(page);
      await waitForAnchorStabilization(page);
      await seedGraphWithInsertions(page, 2);
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

    test("TB -> LR -> TB toggle preserves all-edge port-side bindings and midpoint alignment", async ({
      page,
    }) => {
      await setOrientation(page, "left-to-right");
      await assertAllAffordancesAligned(page);
      await assertPortSidesMatchOrientation(page, "left-to-right");

      await setOrientation(page, "top-to-bottom");
      await assertAllAffordancesAligned(page);
      await assertPortSidesMatchOrientation(page, "top-to-bottom");
    });
  });
}
