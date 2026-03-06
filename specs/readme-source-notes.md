# README Source Material Notes

> Gathered by task #81 for use in task #82 (README authoring).

## Repository

- **Name**: `sw-editor`
- **Description**: Serverless Workflow visual editor — monorepo root
- **Package manager**: pnpm@10.30.3
- **Engine requirements**: Node >= 24.0.0, pnpm >= 10.30.3

## Root Scripts

| Script | Command |
|--------|---------|
| `build` | `pnpm -r build` |
| `test` | `pnpm -r test` |
| `lint` | `biome check .` |
| `format` | `biome format --write .` |

## Packages

| Package | Description |
|---------|-------------|
| `@sw-editor/editor-core` | Headless editor core -- source parsing, validation, state management, and event bridge |
| `@sw-editor/editor-web-component` | Embeddable web component integrating editor core with the active renderer |
| `@sw-editor/editor-renderer-contract` | Shared renderer adapter contract -- mount, update, dispose, and event bridge types |
| `@sw-editor/editor-renderer-react-flow` | React Flow renderer adapter implementing the shared renderer contract |
| `@sw-editor/editor-renderer-rete-lit` | Rete.js + Lit renderer adapter implementing the shared renderer contract |
| `@sw-editor/editor-host-client` | Thin host client providing the host-editor contract surface and export utilities |

## Constitution Principles (v1.0.0, ratified 2026-03-02)

| # | Principle | Summary |
|---|-----------|---------|
| I | Source-First Authoring Contract | JSON/YAML source is the canonical host exchange format; host integrations use source input/output APIs |
| II | Privacy and Network Isolation | Editor runtime MUST NOT initiate network calls; all network behavior is host-owned |
| III | Validation and Diagnostics Ownership | Editor owns schema/semantic validation and emits structured diagnostics to hosts |
| IV | Accessibility and Usability Baseline | Core flows must be keyboard operable and screen-reader understandable; no pointer-only blockers on MVP flows |
| V | Compatibility and Extensibility Discipline | Declared SW version range, typed/bounded extensibility points, error-isolated plugins |

## Feature Packages

| Feature | One-Line Summary |
|---------|-----------------|
| `001-visual-authoring-mvp` | Embeddable visual authoring for Serverless Workflow with source round-trip, insertion UX, and live diagnostics |
| `002-nested-tasks-ux` | Visual authoring support for nested task structures with expanded default rendering |
| `003-branching-control-flow` | Panel-driven authoring for transition, if, switch, fork, and try-catch behavior with route projection |
| `004-extensibility-customization` | Plugin architecture for custom rendering, validation, commands, and slot-based UI extensions |

## Rendering Strategy Note

Specs 001 and 003 explicitly target two renderer backends (`rete-lit` and `react-flow`) with parity and comparison criteria to support evidence-based renderer selection.

## Platform Constraints (from constitution)

- Primary deliverable is an embeddable web component.
- Core logic remains headless and separate from rendering concerns.
- Security model for initial extensibility release: first-party plugins only.
- Performance budgets enforced for validation and plugin callbacks.
- Contract and event versioning must be explicit and forward-compatible.
