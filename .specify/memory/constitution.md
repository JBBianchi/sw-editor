<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles: replaced placeholder principles with project-specific principles
- Added sections: Platform Constraints, Delivery Workflow
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/spec-template.md (pending)
  - .specify/templates/plan-template.md (pending)
  - .specify/templates/tasks-template.md (pending)
- Deferred items: none
-->
# Serverless Workflow Editor Constitution

## Core Principles

### I. Source-First Authoring Contract
The editor MUST treat JSON and YAML workflow source as the canonical host exchange format. Host integrations MUST use source input and source output APIs, and MUST NOT require direct model-object exchange for the baseline contract.

### II. Privacy and Network Isolation
The editor runtime MUST NOT initiate network calls. Workflow data handling MUST stay within the host environment, and any network behavior MUST be host-owned and explicit.

### III. Validation and Diagnostics Ownership
The editor MUST own schema and semantic validation and MUST emit structured diagnostics to hosts. Hosts MAY consume diagnostics but MUST NOT be required to provide validation callbacks for core correctness.

### IV. Accessibility and Usability Baseline
Core authoring workflows (create/load workflow, insert tasks, edit key properties, validate/export) MUST be keyboard operable and screen-reader understandable. Releases MUST not ship pointer-only blockers on MVP flows.

### V. Compatibility and Extensibility Discipline
Each release MUST target a declared Serverless Workflow version range and keep backward compatibility expectations explicit. Extensibility points MUST be typed, bounded, and error-isolated so plugin failures do not crash the editor.

## Platform Constraints

- Primary deliverable is an embeddable web component.
- Core logic should remain headless and separate from rendering concerns.
- Security model for the initial extensibility release is first-party plugins only.
- Performance budgets MUST be enforced for validation and plugin callbacks.
- Contract and event versioning MUST be explicit and forward-compatible.

## Delivery Workflow

- Requirements MUST be captured as independently testable user stories in `specs/<feature>/spec.md`.
- Technical decisions and tradeoffs MUST be captured in `specs/<feature>/research.md` and reflected in `plan.md`.
- Contracts, data models, and quickstart validation scenarios MUST be produced before implementation tasks.
- Task lists MUST be dependency-ordered and grouped by user story so MVP delivery can be incremental.

## Governance

This constitution overrides ad-hoc specification practices for this repository.

Amendment rules:
- Any principle change requires an explicit rationale and compatibility impact statement.
- Principle additions or removals require team review.
- Related planning/templates must be updated when principles materially change.

Versioning policy:
- MAJOR: backward-incompatible principle changes or removals.
- MINOR: new principle or mandatory section additions.
- PATCH: clarifications and wording improvements without semantic change.

Compliance checks:
- Every implementation plan MUST include a constitution check gate before work breakdown.
- Every feature task plan MUST demonstrate traceability to user stories and contracts.

**Version**: 1.0.0 | **Ratified**: 2026-03-02 | **Last Amended**: 2026-03-02