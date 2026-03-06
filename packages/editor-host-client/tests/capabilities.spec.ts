/**
 * Unit tests for `src/contracts/capabilities.ts`.
 *
 * Covers the static metadata constants and the `createCapabilitySnapshot`
 * pure factory function. No renderer adapters or DOM stubs are required.
 *
 * @module
 */

import { describe, expect, it } from "vitest";
import type { RendererCapabilitySnapshot } from "../src/contracts/capabilities.js";
import {
  CONTRACT_VERSION,
  createCapabilitySnapshot,
  SUPPORTED_VERSIONS,
  TARGET_VERSION,
} from "../src/contracts/capabilities.js";

// ---------------------------------------------------------------------------
// Shared test fixture — a minimal RendererCapabilitySnapshot for a rete-lit renderer.
// ---------------------------------------------------------------------------

const reteLitCaps: RendererCapabilitySnapshot = {
  rendererId: "rete-lit",
  rendererVersion: "1.0.0",
  supportsNodeRendererPlugins: true,
  supportsNestedInlineProjection: false,
  supportsRouteOverlayProjection: false,
};

const reactFlowCaps: RendererCapabilitySnapshot = {
  rendererId: "react-flow",
  rendererVersion: "12.0.0",
  supportsNodeRendererPlugins: true,
  supportsNestedInlineProjection: false,
  supportsRouteOverlayProjection: false,
};

// ---------------------------------------------------------------------------
// Metadata constants
// ---------------------------------------------------------------------------

describe("metadata constants", () => {
  it("CONTRACT_VERSION is defined and non-empty", () => {
    expect(CONTRACT_VERSION).toBeDefined();
    expect(typeof CONTRACT_VERSION).toBe("string");
    expect(CONTRACT_VERSION.length).toBeGreaterThan(0);
  });

  it("TARGET_VERSION is defined and non-empty", () => {
    expect(TARGET_VERSION).toBeDefined();
    expect(typeof TARGET_VERSION).toBe("string");
    expect(TARGET_VERSION.length).toBeGreaterThan(0);
  });

  it("SUPPORTED_VERSIONS is defined and non-empty", () => {
    expect(SUPPORTED_VERSIONS).toBeDefined();
    expect(Array.isArray(SUPPORTED_VERSIONS)).toBe(true);
    expect(SUPPORTED_VERSIONS.length).toBeGreaterThan(0);
  });

  it("SUPPORTED_VERSIONS includes TARGET_VERSION", () => {
    expect(SUPPORTED_VERSIONS).toContain(TARGET_VERSION);
  });
});

// ---------------------------------------------------------------------------
// createCapabilitySnapshot factory
// ---------------------------------------------------------------------------

describe("createCapabilitySnapshot", () => {
  it("sets contractVersion equal to CONTRACT_VERSION", () => {
    const snapshot = createCapabilitySnapshot(reteLitCaps);
    expect(snapshot.contractVersion).toBe(CONTRACT_VERSION);
  });

  it("sets targetVersion equal to TARGET_VERSION", () => {
    const snapshot = createCapabilitySnapshot(reteLitCaps);
    expect(snapshot.targetVersion).toBe(TARGET_VERSION);
  });

  it("sets supportedVersions equal to SUPPORTED_VERSIONS content", () => {
    const snapshot = createCapabilitySnapshot(reteLitCaps);
    expect(snapshot.supportedVersions).toEqual([...SUPPORTED_VERSIONS]);
  });

  it("copies rendererId from the renderer capabilities", () => {
    const snapshot = createCapabilitySnapshot(reteLitCaps);
    expect(snapshot.rendererId).toBe(reteLitCaps.rendererId);
  });

  it("embeds the renderer capabilities object as-is", () => {
    const snapshot = createCapabilitySnapshot(reteLitCaps);
    expect(snapshot.rendererCapabilities).toBe(reteLitCaps);
  });

  it("returns correct rendererId for react-flow renderer caps", () => {
    const snapshot = createCapabilitySnapshot(reactFlowCaps);
    expect(snapshot.rendererId).toBe("react-flow");
  });

  it("supportedVersions is a fresh array copy, not the same reference as SUPPORTED_VERSIONS", () => {
    const snapshot = createCapabilitySnapshot(reteLitCaps);
    expect(snapshot.supportedVersions).not.toBe(SUPPORTED_VERSIONS);
  });
});
