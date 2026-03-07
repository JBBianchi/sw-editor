# Implementation Plan: Tight Insert Geometry

**Branch**: `007-tight-insert-geometry` | **Date**: 2026-03-07 | **Spec**: `specs/007-tight-insert-geometry/spec.md`  
**Input**: Feature specification from `specs/007-tight-insert-geometry/spec.md`

## Summary

Deliver strict, measurable geometry behavior for visual insertion and layout parity across both renderers. The implementation adds deterministic orientation-aware layout, midpoint-anchored insertion controls that stay aligned through pan/zoom/rebuild, and test-facing geometry snapshots so acceptance criteria become enforceable automated gates instead of best-effort checks.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: `@xyflow/react` 12.x, `rete` 2.x plugins, `dagre` for deterministic directed layout (new), shared renderer contract package  
**Storage**: N/A  
**Testing**: Vitest (unit/integration), Playwright (e2e across renderer harness), repository prerequisite script checks  
**Target Platform**: Browser and webview host environments  
**Project Type**: Monorepo library stack (core + renderer adapters + web component + example harness)  
**Performance Goals**: p95 insertion-control realignment <= 100 ms after pan/zoom for fixture graphs up to 25 nodes/30 edges; p95 layout recompute <= 150 ms for same scope  
**Constraints**: No runtime network calls; no viewport-fixed fallback coordinates for graph-anchored controls; keyboard and screen-reader operability for insertion flow; deterministic layout output jitter <= 1 px per axis on repeat runs  
**Scale/Scope**: Edge-anchor geometry, orientation-aware ports, deterministic auto-layout, and parity validation across `react-flow` and `rete-lit`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Initial gate:

- Source-first authoring contract preserved: PASS
- Privacy and network isolation preserved: PASS
- Validation and diagnostics ownership unchanged: PASS
- Accessibility baseline maintained for insert/focus flows: PASS
- Compatibility and extensibility boundaries remain explicit via additive renderer contract surface: PASS

Post-design re-check:

- Source-first authoring contract preserved: PASS
- Privacy and network isolation preserved: PASS
- Validation and diagnostics ownership unchanged: PASS
- Accessibility baseline preserved with explicit keyboard and focus requirements: PASS
- Compatibility and extensibility preserved with typed, additive geometry/orientation interfaces: PASS

## Project Structure

### Documentation (this feature)

```text
specs/007-tight-insert-geometry/
+-- plan.md
+-- research.md
+-- data-model.md
+-- quickstart.md
+-- contracts/
|   +-- renderer-geometry-contract.md
+-- tasks.md
```

### Source Code (repository root)

```text
packages/editor-renderer-contract/src/
packages/editor-renderer-react-flow/src/
packages/editor-renderer-rete-lit/src/
packages/editor-web-component/src/graph/
example/e2e-harness/
tests/integration/
tests/e2e/
```

**Structure Decision**: Keep layout semantics renderer-agnostic in shared contract-facing types and shared geometry helpers, then adapt rendering details in each renderer package. Keep insertion menu/event orchestration in `editor-web-component`, and keep e2e harness aligned with production insertion behavior to avoid validation drift.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
