/**
 * Rete-lit bundle entry for `@sw-editor/editor-host-client`.
 *
 * Importing this module wires the `rete-lit` renderer backend into the
 * host–editor contract surface. The renderer is selected at build time by
 * choosing this entry point; no runtime switching is possible once an entry
 * point has been imported.
 *
 * @example
 * ```ts
 * import { getCapabilities } from "@sw-editor/editor-host-client/rete-lit";
 *
 * const snapshot = getCapabilities();
 * console.log(snapshot.rendererId); // "rete-lit"
 * ```
 *
 * @module
 */

import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";
import { type CapabilitySnapshot, createCapabilitySnapshot } from "./contracts/capabilities.js";

// Instantiate a transient adapter solely to read its static capability snapshot.
// The adapter is not mounted and will not render anything; `capabilities` is a
// module-level constant on the adapter class.
const _adapter = new ReteLitAdapter();

/**
 * The capability snapshot for the `rete-lit` renderer bundle, computed once
 * at module evaluation time and frozen for the lifetime of the process.
 */
const _snapshot: CapabilitySnapshot = createCapabilitySnapshot(_adapter.capabilities);

/**
 * Return the capability snapshot for the active `rete-lit` editor bundle.
 *
 * Hosts should call this function once after mounting the editor to verify
 * contract and spec version compatibility before issuing further API calls.
 * The returned snapshot is identical on every call; it is computed at module
 * load time and cannot change at runtime.
 *
 * @returns The {@link CapabilitySnapshot} for this rete-lit bundle.
 */
export function getCapabilities(): CapabilitySnapshot {
  return _snapshot;
}

export type { CapabilitySnapshot };
export type { RendererCapabilitySnapshot } from "./contracts/capabilities.js";
