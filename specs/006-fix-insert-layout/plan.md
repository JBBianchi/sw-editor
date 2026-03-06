# Implementation Plan: Insert Layout Correction

**Branch**: `006-fix-insert-layout` | **Date**: 2026-03-06 | **Spec**: `specs/006-fix-insert-layout/spec.md`
**Input**: Feature specification from `specs/006-fix-insert-layout/spec.md`

## Summary

Correct insertion UX by fixing ordered node placement in editor-core and adding renderer-backed edge affordance anchors so the `+` control sits on the edge it splits in both `react-flow` and `rete-lit` views.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Serverless Workflow TypeScript SDK, React 19, React Flow 12, Lit 3, Rete 2  
**Storage**: N/A  
**Testing**: Vitest package tests, Playwright integration coverage for visual authoring flows  
**Target Platform**: Browser and webview hosts  
**Project Type**: Monorepo feature increment spanning core, renderer contract, renderer adapters, and web component glue  
**Performance Goals**: For linear workflows up to 25 visible nodes and 30 edges, 95th percentile time from insert action to settled layout MUST be <= 250 ms, and insertion-control realignment after pan/zoom MUST complete within 100 ms  
**Constraints**: No runtime network calls; keyboard-operable insertion controls; parity across supported renderer bundles; preserve existing graph edge semantics while changing only visual ordering behavior  
**Scale/Scope**: Linear and boundary-edge insertions, edge-affordance placement, and repeated insertion readability across `react-flow` and `rete-lit`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Initial gate:

- Source-first host contract preserved: PASS
- Privacy and network isolation preserved: PASS
- Validation and diagnostics ownership unchanged: PASS
- Accessibility baseline requires keyboard-operable edge controls and menu focus continuity: PASS
- Compatibility and extensibility remain explicit through additive renderer-contract changes: PASS

Post-design re-check:

- Source-first host contract preserved: PASS
- Privacy and network isolation preserved: PASS
- Validation and diagnostics ownership unchanged: PASS
- Accessibility baseline preserved through edge-anchored button and existing menu keyboard behavior: PASS
- Compatibility and extensibility preserved by keeping renderer hooks additive and renderer-specific implementations bounded: PASS

## Project Structure

### Documentation (this feature)

```text
specs/006-fix-insert-layout/
+-- plan.md
+-- research.md
+-- data-model.md
+-- quickstart.md
+-- contracts/
|   +-- renderer-insertion-contract.md
+-- tasks.md
```

### Source Code (repository root)

```text
packages/editor-core/src/commands/
packages/editor-core/src/graph/
packages/editor-core/tests/commands/
packages/editor-renderer-contract/src/
packages/editor-renderer-react-flow/src/
packages/editor-renderer-rete-lit/src/
packages/editor-web-component/src/graph/
packages/editor-web-component/tests/graph/
tests/integration/
tests/e2e/
```

**Structure Decision**: Keep ordered graph semantics in `editor-core`, define renderer insertion/focus hooks in the shared renderer contract, implement edge midpoint anchors inside each renderer package, and keep menu/event orchestration in `editor-web-component`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
