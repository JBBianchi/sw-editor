# Spec Kit Features

This repository now uses GitHub Spec Kit feature packages under `specs/`.

## Feature Set

| Feature | One-Line Summary |
|---------|-----------------|
| [`001-visual-authoring-mvp`](001-visual-authoring-mvp/) | Embeddable visual authoring for Serverless Workflow with source round-trip, insertion UX, and live diagnostics. |
| [`002-nested-tasks-ux`](002-nested-tasks-ux/) | Visual authoring support for nested task structures with expanded default rendering. |
| [`003-branching-control-flow`](003-branching-control-flow/) | Panel-driven authoring for transition, if, switch, fork, and try-catch behavior with route projection. |
| [`004-extensibility-customization`](004-extensibility-customization/) | Plugin architecture for custom rendering, validation, commands, and slot-based UI extensions. |

Each feature package contains:

- `spec.md`
- `plan.md`
- `research.md`
- `data-model.md`
- `contracts/`
- `quickstart.md`
- `tasks.md`

Rendering strategy note:
- Visual authoring specs now target two renderer backends (`rete-lit` and `react-flow`) with parity and comparison criteria to support evidence-based renderer selection.
