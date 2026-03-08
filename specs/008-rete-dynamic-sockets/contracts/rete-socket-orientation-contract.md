# Contract: Rete Socket Orientation Rendering

## Scope

Defines renderer-internal behavior for `rete-lit` socket placement by orientation.  
No changes to `RendererAdapter` public API are introduced.

## Requirements

- `rete-lit` MUST render sockets via `rete-ref` entries (`type: "socket"`).
- Node rendering MUST map orientation to socket placement:
  - `top-to-bottom`: input sockets above title/content, output sockets below.
  - `left-to-right`: input sockets on left, output sockets on right.
- `setOrientation()` MUST trigger node rerendering for the active graph.
- Existing midpoint-anchor and viewport update behavior MUST remain intact.

## Testability Hooks

- Node DOM MUST expose stable node-level test IDs and node IDs.
- Input/output socket DOM wrappers MUST remain queryable for side assertions.
