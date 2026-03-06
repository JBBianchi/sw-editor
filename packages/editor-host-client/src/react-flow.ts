/**
 * React-flow bundle entry for `@sw-editor/editor-host-client`.
 *
 * Importing this module wires the `react-flow` renderer backend into the
 * host–editor contract surface. The renderer is selected at build time by
 * choosing this entry point; no runtime switching is possible once an entry
 * point has been imported.
 *
 * @example
 * ```ts
 * import { getCapabilities } from "@sw-editor/editor-host-client/react-flow";
 *
 * const snapshot = getCapabilities();
 * console.log(snapshot.rendererId); // "react-flow"
 * ```
 *
 * @module
 */

import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { type CapabilitySnapshot, createCapabilitySnapshot } from "./contracts/capabilities.js";

// Instantiate a transient adapter solely to read its static capability snapshot.
// The adapter is not mounted and will not render anything; `capabilities` is a
// module-level constant on the adapter class.
const _adapter = new ReactFlowAdapter();

/**
 * The capability snapshot for the `react-flow` renderer bundle, computed once
 * at module evaluation time and frozen for the lifetime of the process.
 */
const _snapshot: CapabilitySnapshot = createCapabilitySnapshot(_adapter.capabilities);

/**
 * Return the capability snapshot for the active `react-flow` editor bundle.
 *
 * Hosts should call this function once after mounting the editor to verify
 * contract and spec version compatibility before issuing further API calls.
 * The returned snapshot is identical on every call; it is computed at module
 * load time and cannot change at runtime.
 *
 * @returns The {@link CapabilitySnapshot} for this react-flow bundle.
 */
export function getCapabilities(): CapabilitySnapshot {
  return _snapshot;
}

export type { CapabilitySnapshot };
export { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
export type { RendererCapabilitySnapshot } from "./contracts/capabilities.js";
