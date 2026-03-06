# sw-editor

Serverless Workflow visual editor — a monorepo providing an embeddable, headless-core editor for authoring [CNCF Serverless Workflow](https://serverlessworkflow.io/) definitions in JSON or YAML.

The editor is delivered as a web component so it can be embedded in any host application. Rendering is pluggable: two renderer adapters (React Flow and Rete + Lit) are provided, and a typed contract allows additional renderers to be developed independently.

---

## Key Principles

The following five principles govern all design and implementation decisions. They are ratified in [`.specify/memory/constitution.md`](.specify/memory/constitution.md) (v1.0.0, 2026-03-02).

| # | Principle | Summary |
|---|-----------|---------|
| I | **Source-first contract** | JSON and YAML workflow source is the canonical host exchange format. Host integrations use source input/output APIs; direct model-object exchange is not part of the baseline contract. |
| II | **No runtime network calls from editor core** | The editor runtime must not initiate network calls. All network behavior is host-owned and explicit. |
| III | **Editor owns validation and diagnostics** | The editor performs schema and semantic validation and emits structured diagnostics to hosts. Hosts may consume diagnostics but are not required to supply validation callbacks for core correctness. |
| IV | **Accessibility baseline mandatory for core flows** | Create/load workflow, insert tasks, edit key properties, validate, and export must be fully keyboard-operable and screen-reader understandable. Pointer-only blockers on MVP flows must not ship. |
| V | **Compatibility and extensibility boundaries explicit** | Each release targets a declared Serverless Workflow version range. Extensibility points are typed, bounded, and error-isolated so plugin failures cannot crash the editor. |

---

## Architecture Overview

The repository is a pnpm monorepo. Each package has a single responsibility.

| Package | Description |
|---------|-------------|
| `@sw-editor/editor-core` | Headless editor core: source parsing, validation, state management, and event bridge. Contains no rendering code and makes no network calls. |
| `@sw-editor/editor-web-component` | Embeddable web component that integrates `editor-core` with the active renderer. The primary host-facing deliverable. |
| `@sw-editor/editor-renderer-contract` | Shared renderer adapter contract defining the `mount`, `update`, `dispose`, and event-bridge types that all renderer adapters must implement. |
| `@sw-editor/editor-renderer-react-flow` | React Flow renderer adapter implementing the shared renderer contract. |
| `@sw-editor/editor-renderer-rete-lit` | Rete.js + Lit renderer adapter implementing the shared renderer contract. |
| `@sw-editor/editor-host-client` | Thin host client providing the host-editor contract surface and export utilities for embedding applications. |

---

## Feature Packages

Planned and in-progress feature work is tracked as Spec Kit feature packages under [`specs/`](specs/).

| Feature | One-Line Summary |
|---------|-----------------|
| [`001-visual-authoring-mvp`](specs/001-visual-authoring-mvp/) | Embeddable visual authoring for Serverless Workflow with source round-trip, insertion UX, and live diagnostics. |
| [`002-nested-tasks-ux`](specs/002-nested-tasks-ux/) | Visual authoring support for nested task structures with expanded default rendering. |
| [`003-branching-control-flow`](specs/003-branching-control-flow/) | Panel-driven authoring for transition, if, switch, fork, and try-catch behavior with route projection. |
| [`004-extensibility-customization`](specs/004-extensibility-customization/) | Plugin architecture for custom rendering, validation, commands, and slot-based UI extensions. |

---

## Prerequisites and Quick Start

**Requirements**

- Node.js >= 24.0.0
- pnpm >= 10.30.3

**Setup**

```bash
# Install all workspace dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test
```

Additional scripts available at the root:

| Script | Command | Purpose |
|--------|---------|---------|
| `lint` | `pnpm lint` | Run Biome linter across the workspace |
| `format` | `pnpm format` | Apply Biome auto-formatting |
| `storybook` | `pnpm storybook` | Start Storybook dev server at http://localhost:6006 |
| `build-storybook` | `pnpm build-storybook` | Build a static Storybook site |

See [`docs/storybook.md`](docs/storybook.md) for how to run Storybook, build it, and add new stories for React and web-component packages.

---

## Spec Kit Workflow

This repository uses the Spec Kit feature package workflow to keep requirements, technical plans, and implementation tasks synchronized.

All feature work follows a structured lifecycle:

1. **Specify** — requirements and user stories are captured in `specs/<feature>/spec.md`.
2. **Plan** — technical decisions, tradeoffs, data models, and contracts are produced in `plan.md`, `research.md`, `data-model.md`, and `contracts/`.
3. **Task** — a dependency-ordered `tasks.md` is generated before implementation begins.
4. **Implement** — tasks are executed in order; `tasks.md` is kept current as the execution ledger.

Agent instructions and workflow commands are defined in [`AGENTS.MD`](AGENTS.MD). Feature packages live under [`specs/`](specs/).

---

## Contributing

Contribution guidelines will be published in `CONTRIBUTING.md`. In the meantime, refer to [`AGENTS.MD`](AGENTS.MD) for branch naming conventions, the required Spec Kit workflow, and the constitution quality gates that all changes must satisfy.

---

## License

This project is licensed under the [Apache License, Version 2.0](LICENSE).
