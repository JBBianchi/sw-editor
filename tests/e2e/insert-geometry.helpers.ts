/**
 * Playwright-specific helper utilities for end-to-end geometry assertions on
 * insertion affordances.
 *
 * These helpers work with both the React Flow and Rete-Lit renderer views by
 * using renderer-agnostic DOM selectors (`data-edge-id`, `aria-label`,
 * `data-testid`). They follow Playwright best practices: locator-based
 * queries, built-in auto-waiting, and no raw `querySelector` calls.
 *
 * @module tests/e2e/insert-geometry.helpers
 */

import { expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared selectors (renderer-agnostic)
// ---------------------------------------------------------------------------

/** Insertion affordance button for a specific edge. */
const insertButtonByEdge = (edgeId: string): string =>
  `button[data-edge-id="${edgeId}"][aria-label="Insert task"]`;

/** Any insertion affordance button. */
const INSERT_BUTTON_SELECTOR = 'button[aria-label="Insert task"]';

/**
 * SVG edge element selector.
 *
 * React Flow uses `[data-testid="rf__edge-<id>"]` elements; Rete-Lit renders
 * SVG `<path>` elements inside `[data-connection-id]` containers. The helpers
 * fall through both patterns so they work regardless of the active renderer.
 */
const svgEdgeById = (edgeId: string): string =>
  `[data-testid="rf__edge-${edgeId}"], [data-connection-id="${edgeId}"]`;

/** Canvas / viewport container (covers both renderers). */
const CANVAS_SELECTOR = '[data-testid="editor-canvas"], .react-flow__viewport, .react-flow, .rete';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A 2-D point in viewport pixel coordinates. */
export interface Point2D {
  /** Horizontal coordinate (pixels). */
  x: number;
  /** Vertical coordinate (pixels). */
  y: number;
}

/** Delta vector for a pan operation. */
export interface PanDelta {
  /** Horizontal pixel displacement. */
  dx: number;
  /** Vertical pixel displacement. */
  dy: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Locate the insertion affordance button for the given edge and return its
 * bounding-box center in viewport coordinates.
 *
 * The function uses a Playwright locator with built-in auto-waiting so the
 * button does not need to be visible at call time.
 *
 * @param page - The Playwright {@link Page} instance.
 * @param edgeId - The `data-edge-id` attribute value identifying the target edge.
 * @returns The `{ x, y }` center of the insertion button bounding box.
 * @throws If the button is not found or has no bounding box.
 */
export async function getInsertButtonCenter(page: Page, edgeId: string): Promise<Point2D> {
  const locator = page.locator(insertButtonByEdge(edgeId));
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Insert button for edge "${edgeId}" has no bounding box`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Extract the rendered SVG edge midpoint for the given edge ID.
 *
 * For React Flow the helper reads the `<path>` element inside the edge group
 * and samples its geometric midpoint via `getPointAtLength`. For Rete-Lit it
 * falls back to the bounding-box center of the connection container. Both
 * approaches yield viewport-space coordinates suitable for pixel-tolerance
 * comparisons.
 *
 * @param page - The Playwright {@link Page} instance.
 * @param edgeId - The identity of the edge to query.
 * @returns The `{ x, y }` midpoint of the rendered edge path.
 * @throws If the edge element is not found in the DOM.
 */
export async function getEdgeMidpoint(page: Page, edgeId: string): Promise<Point2D> {
  const edgeLocator = page.locator(svgEdgeById(edgeId)).first();
  await edgeLocator.waitFor({ state: "attached" });

  // Try SVG path sampling first (React Flow renders edges as <path>).
  const midpoint = await edgeLocator.evaluate((el: Element): { x: number; y: number } | null => {
    const path = el.tagName === "path" ? (el as SVGPathElement) : el.querySelector("path");
    if (path && typeof path.getTotalLength === "function") {
      const totalLength = path.getTotalLength();
      const pt = path.getPointAtLength(totalLength / 2);
      // Convert from SVG coordinate space to viewport via CTM.
      const ctm = (path.ownerSVGElement ?? path).getScreenCTM();
      if (ctm) {
        return {
          x: pt.x * ctm.a + ctm.e,
          y: pt.y * ctm.d + ctm.f,
        };
      }
      return { x: pt.x, y: pt.y };
    }
    return null;
  });

  if (midpoint) {
    return midpoint;
  }

  // Fallback: bounding-box center (works for any renderer).
  const box = await edgeLocator.boundingBox();
  if (!box) {
    throw new Error(`Edge "${edgeId}" element has no bounding box`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Assert that the insertion affordance for a given edge is positioned within
 * `tolerancePx` pixels of the rendered edge midpoint.
 *
 * This is a composite helper that calls {@link getInsertButtonCenter} and
 * {@link getEdgeMidpoint}, computes the Euclidean distance, and uses a
 * Playwright `expect` assertion with a descriptive failure message.
 *
 * @param page - The Playwright {@link Page} instance.
 * @param edgeId - The identity of the edge to verify.
 * @param tolerancePx - Maximum allowed pixel distance (default `6`).
 */
export async function assertAffordanceWithinTolerance(
  page: Page,
  edgeId: string,
  tolerancePx = 6,
): Promise<void> {
  const buttonCenter = await getInsertButtonCenter(page, edgeId);
  const edgeMidpoint = await getEdgeMidpoint(page, edgeId);
  const dist = Math.sqrt(
    (buttonCenter.x - edgeMidpoint.x) ** 2 + (buttonCenter.y - edgeMidpoint.y) ** 2,
  );

  expect(
    dist,
    `Affordance for edge "${edgeId}" at (${buttonCenter.x.toFixed(1)}, ${buttonCenter.y.toFixed(1)}) ` +
      `is ${dist.toFixed(1)}px from edge midpoint ` +
      `(${edgeMidpoint.x.toFixed(1)}, ${edgeMidpoint.y.toFixed(1)}); ` +
      `tolerance is ${tolerancePx}px`,
  ).toBeLessThanOrEqual(tolerancePx);
}

/**
 * Simulate a pan-then-zoom viewport transform on the editor canvas.
 *
 * Panning is performed via a mouse drag on the canvas center. Zooming is
 * performed via a `wheel` event with the sign of `zoomFactor` controlling
 * direction: values greater than 1 zoom in, values less than 1 zoom out.
 *
 * @param page - The Playwright {@link Page} instance.
 * @param panDelta - Pixel displacement for the pan gesture.
 * @param zoomFactor - Zoom multiplier. Values > 1 zoom in; values < 1 zoom out.
 *   A value of `1` skips the zoom step entirely.
 */
export async function panAndZoom(
  page: Page,
  panDelta: PanDelta,
  zoomFactor: number,
): Promise<void> {
  const canvas = page.locator(CANVAS_SELECTOR).first();
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) {
    throw new Error("Canvas element not found or not visible");
  }

  const centerX = canvasBox.x + canvasBox.width / 2;
  const centerY = canvasBox.y + canvasBox.height / 2;

  // --- Pan ---
  if (panDelta.dx !== 0 || panDelta.dy !== 0) {
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + panDelta.dx, centerY + panDelta.dy, { steps: 10 });
    await page.mouse.up();
  }

  // --- Zoom ---
  if (zoomFactor !== 1) {
    const targetX = centerX + panDelta.dx;
    const targetY = centerY + panDelta.dy;
    await page.mouse.move(targetX, targetY);
    // Negative deltaY zooms in (scroll up), positive zooms out (scroll down).
    const wheelDelta =
      zoomFactor > 1 ? -120 * Math.log2(zoomFactor) : 120 * Math.log2(1 / zoomFactor);
    await page.mouse.wheel(0, wheelDelta);
  }

  // Let the renderer settle after viewport changes.
  await waitForAnchorStabilization(page);
}

/**
 * Wait until insertion anchor positions have settled after a viewport or
 * graph change.
 *
 * When no affordance buttons are present yet (e.g. immediately after an
 * orientation switch that destroys and rebuilds the DOM), the function waits
 * for at least one button to appear before starting the position-polling
 * loop. This eliminates transient timing flakes caused by assertions
 * running before the renderer has re-created its edge affordances.
 *
 * @param page - The Playwright {@link Page} instance.
 */
export async function waitForAnchorStabilization(page: Page): Promise<void> {
  const buttons = page.locator(INSERT_BUTTON_SELECTOR);

  // If no affordances exist yet, wait for at least one to appear (up to 5 s).
  // This handles the gap between orientation-triggered DOM teardown and the
  // renderer rebuilding affordance buttons.
  let count = await buttons.count();
  if (count === 0) {
    try {
      await buttons.first().waitFor({ state: "attached", timeout: 5_000 });
    } catch {
      // Affordances never appeared — fall back to a short fixed wait so the
      // caller can proceed (e.g. empty graphs with no edges).
      await page.waitForTimeout(200);
      return;
    }
  }

  // Snapshot current positions.
  const snapshot = async (): Promise<Array<{ x: number; y: number }>> => {
    const positions: Array<{ x: number; y: number }> = [];
    const n = await buttons.count();
    for (let i = 0; i < n; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        positions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
      }
    }
    return positions;
  };

  // Poll up to 15 times with 50 ms intervals (~750 ms max).
  let previous = await snapshot();
  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await page.waitForTimeout(50);
    const current = await snapshot();

    if (
      current.length > 0 &&
      current.length === previous.length &&
      current.every(
        (pt, i) => Math.abs(pt.x - previous[i].x) <= 1 && Math.abs(pt.y - previous[i].y) <= 1,
      )
    ) {
      return;
    }
    previous = current;
  }
  // Positions did not fully converge; proceed anyway — callers can detect
  // drift through their own tolerance assertions.
}
