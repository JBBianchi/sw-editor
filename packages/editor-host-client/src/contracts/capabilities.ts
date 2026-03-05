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

// ---------------------------------------------------------------------------
// Contract-level metadata constants
// ---------------------------------------------------------------------------

/**
 * SemVer string of the host–editor contract implemented by this package.
 *
 * Increment the major version when a backward-incompatible API change is made.
 * Hosts should verify that the major component matches their expectation before
 * issuing further API calls.
 */
export const CONTRACT_VERSION = "0.1.0" as const;

/**
 * Serverless Workflow specification version that this editor primarily targets.
 *
 * Corresponds to the latest specification version whose full feature set is
 * supported by the editor's parse, validate, and project pipeline.
 */
export const TARGET_VERSION = "1.0" as const;

/**
 * All Serverless Workflow specification versions that this editor can parse
 * and validate, including {@link TARGET_VERSION}.
 *
 * Hosts may inspect this list to determine whether a document of a given
 * specification version can be opened without degraded behavior.
 */
export const SUPPORTED_VERSIONS: readonly string[] = ["0.8", "0.9", "1.0"] as const;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Construct a {@link CapabilitySnapshot} from a renderer's capability snapshot.
 *
 * Combines the static contract-level metadata ({@link CONTRACT_VERSION},
 * {@link TARGET_VERSION}, {@link SUPPORTED_VERSIONS}) with the renderer-specific
 * details supplied by the active renderer adapter.
 *
 * Each renderer bundle entry calls this function once at module evaluation time
 * and re-exports the frozen result via its `getCapabilities` export. This
 * ensures that renderer selection is fixed at build time and that no runtime
 * switching is possible.
 *
 * @param rendererCapabilities - The capability snapshot from the active renderer adapter.
 * @returns A fully-populated {@link CapabilitySnapshot} for the current bundle.
 */
export function createCapabilitySnapshot(
  rendererCapabilities: RendererCapabilitySnapshot,
): CapabilitySnapshot {
  return {
    contractVersion: CONTRACT_VERSION,
    targetVersion: TARGET_VERSION,
    supportedVersions: [...SUPPORTED_VERSIONS],
    rendererId: rendererCapabilities.rendererId,
    rendererCapabilities,
  };
}
