import type { RendererId } from "./types.js";

/**
 * Capability snapshot for a specific renderer backend.
 *
 * Describes what optional rendering features the active backend supports.
 * Backward-compatible capability expansion is allowed; hosts must ignore
 * unknown fields.
 */
export interface RendererCapabilitySnapshot {
  /** Renderer backend identifier. */
  rendererId: RendererId;
  /** Semantic version string of the renderer package. */
  rendererVersion: string;
  /** Whether the renderer supports third-party node renderer plugins. */
  supportsNodeRendererPlugins: boolean;
  /** Whether the renderer supports nested inline graph projection. */
  supportsNestedInlineProjection: boolean;
  /** Whether the renderer supports route overlay projection. */
  supportsRouteOverlayProjection: boolean;
  /**
   * Optional list of known rendering limitations for this backend version.
   * Each entry is a short human-readable string.
   */
  knownLimits?: string[];
}

/**
 * Full capability snapshot returned by {@link HostEditorContract.getCapabilities}.
 *
 * Hosts use this payload to verify compatibility before issuing API calls.
 * The payload must remain stable across patch releases; only additive changes
 * are allowed without a `contractVersion` bump.
 */
export interface CapabilitySnapshot {
  /**
   * Semantic version of the host–editor contract implemented by this bundle.
   * Follows SemVer; hosts should reject incompatible major versions.
   */
  contractVersion: string;
  /**
   * Version of the Serverless Workflow specification this editor targets
   * (e.g. `"0.9"`, `"1.0"`).
   */
  targetVersion: string;
  /**
   * All Serverless Workflow specification versions this editor can parse and
   * validate, including `targetVersion`.
   */
  supportedVersions: string[];
  /** Renderer backend compiled into this bundle. */
  rendererId: RendererId;
  /** Renderer-specific capability details. */
  rendererCapabilities: RendererCapabilitySnapshot;
}
