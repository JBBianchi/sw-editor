# Feature Specification: Align Example and Demo Directories

**Feature Branch**: `005-align-example-demo`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Align example and demo directories. The repo has two directories illustrating library usage: `demo/` (package `@sw-editor/demo`, a Vite app with the custom sw-editor element and e2e harness) and `example/` (contains `vanilla-js/`, `host-events/` sub-apps and Playwright tests in `tests/`). The decision is: keep `example/` as the top-level directory name; rename `demo/` to `example/e2e-harness/` with package name `@sw-editor/example-e2e-harness`. Feature number is 005."

---

## Terminology Decision

**Decision**: Adopt `example/` as the single top-level directory for all illustrative and e2e-harness code.

| Directory (before) | Package name (before) | Directory (after) | Package name (after) |
|--------------------|-----------------------|-------------------|----------------------|
| `demo/` | `@sw-editor/demo` | `example/e2e-harness/` | `@sw-editor/example-e2e-harness` |
| `example/vanilla-js/` | `@sw-editor/example-vanilla-js` | `example/vanilla-js/` | `@sw-editor/example-vanilla-js` *(unchanged)* |
| `example/host-events/` | `@sw-editor/example-host-events` | `example/host-events/` | `@sw-editor/example-host-events` *(unchanged)* |
| `example/tests/` | *(no package)* | `example/tests/` | *(no package, unchanged)* |
| `example/playwright.config.ts` | *(root config)* | `example/playwright.config.ts` | *(unchanged)* |

**Rationale**: The `example/` namespace is already used for the library-consumer sub-apps and their Playwright suite. Placing the e2e harness under `example/e2e-harness/` collocates all demonstration and integration-test material in one tree, removes ambiguity about the purpose of `demo/`, and aligns package naming to the `@sw-editor/example-*` convention.

---

## Scope

### Directories that change

- **`demo/` → `example/e2e-harness/`** — The directory is physically moved. The `package.json` `name` field changes from `@sw-editor/demo` to `@sw-editor/example-e2e-harness`. All internal import paths, `vite.config.ts` references, and `pnpm-workspace.yaml` globs are updated accordingly.

### Directories that stay the same

- **`example/vanilla-js/`** — No changes to location, package name, or content.
- **`example/host-events/`** — No changes to location, package name, or content.
- **`example/tests/`** — No changes to test files; Playwright config paths may be updated if they reference `demo/` directly.
- **`example/playwright.config.ts`** — May need a path update if it references the old `demo/` location; otherwise unchanged.

### Other files that require updates

- **`pnpm-workspace.yaml`** — Must include the new `example/e2e-harness` path and remove the old `demo` path.
- **`specs/README.md`** — Must register the new feature package `005-align-example-demo`.
- **`README.md`** (repo root) — Any references to `demo/` must be updated to `example/e2e-harness/`.
- **CI/CD configuration** (if present) — Any workflow steps that reference `demo/` must be updated.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Contributor Navigates Example Code (Priority: P1)

A new contributor opens the repository and can immediately locate all illustrative apps and the e2e harness under a single `example/` directory without confusion about two separate top-level directories.

**Why this priority**: Discoverability is the primary motivation for this change. The single directory removes the ambiguity that currently exists.

**Independent Test**: Clone the repository after the change; verify that `demo/` is absent and `example/e2e-harness/` exists with the expected Vite app content.

**Acceptance Scenarios**:

1. **Given** the refactored repository, **When** a contributor lists top-level directories, **Then** there is no `demo/` directory and `example/e2e-harness/` exists inside `example/`.
2. **Given** `example/e2e-harness/`, **When** a contributor reads its `package.json`, **Then** the `name` field is `@sw-editor/example-e2e-harness`.

---

### User Story 2 — Developer Runs the E2E Harness (Priority: P2)

A developer runs the e2e harness Vite app from its new location using the same commands that previously worked from `demo/`.

**Why this priority**: The rename must not break any existing developer workflow; all run/build/preview commands must continue to work.

**Independent Test**: Run `pnpm dev` (or equivalent) inside `example/e2e-harness/`; verify the Vite app starts without errors and the `sw-editor` custom element renders.

**Acceptance Scenarios**:

1. **Given** the renamed directory, **When** `pnpm dev` is executed inside `example/e2e-harness/`, **Then** the Vite dev server starts and serves the e2e harness application.
2. **Given** the renamed directory, **When** `pnpm build` is executed, **Then** the build completes without errors.

---

### User Story 3 — CI Passes After Rename (Priority: P3)

All existing Playwright and unit test suites continue to pass after the rename without modification to test logic.

**Why this priority**: No regression must be introduced; test infrastructure must track the new path.

**Independent Test**: Run the full test suite from the repository root; all tests that previously passed must still pass.

**Acceptance Scenarios**:

1. **Given** the refactored workspace, **When** the Playwright example suite is executed, **Then** all tests pass with the same assertions as before.
2. **Given** the refactored workspace, **When** `pnpm install` is run from the repo root, **Then** all workspace packages resolve without errors.

---

### Edge Cases

- A `pnpm-workspace.yaml` glob that matches `demo` but not `example/e2e-harness` would silently exclude the package; the glob must be verified after the rename.
- Any script or CI step that hard-codes `./demo` or `cd demo` would break; a search-and-replace pass across all YAML/JSON/shell files is required.
- If `example/playwright.config.ts` uses a relative path to `demo/`, it must be updated to `e2e-harness/`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST NOT contain a top-level `demo/` directory after this change.
- **FR-002**: The directory `example/e2e-harness/` MUST contain all files previously under `demo/` with no content changes beyond updated internal path references.
- **FR-003**: The `package.json` inside `example/e2e-harness/` MUST declare `"name": "@sw-editor/example-e2e-harness"`.
- **FR-004**: `pnpm-workspace.yaml` MUST include `example/e2e-harness` in its workspace packages list and MUST NOT list the old `demo` path.
- **FR-005**: All existing `example/vanilla-js/`, `example/host-events/`, and `example/tests/` files MUST remain unmodified.
- **FR-006**: All Playwright test suites that previously passed MUST continue to pass after the rename.
- **FR-007**: Any documentation file that references `demo/` (including `README.md` and `specs/README.md`) MUST be updated to reference `example/e2e-harness/`.

### Key Entities

- **`example/e2e-harness/`**: The renamed package directory; a Vite application providing the custom `sw-editor` element and integration scenarios for Playwright.
- **`@sw-editor/example-e2e-harness`**: The new npm package name for the e2e harness package.
- **`pnpm-workspace.yaml`**: Workspace manifest that must register all example sub-packages including the renamed harness.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the change, `demo/` is absent from the repository root and `example/e2e-harness/` is present with identical file content (except updated name/path references).
- **SC-002**: `pnpm install` completes without errors from the repository root, resolving `@sw-editor/example-e2e-harness` as a workspace package.
- **SC-003**: One hundred percent of Playwright example tests that passed before the rename continue to pass after the rename without modifying test assertions.
- **SC-004**: All documentation references to `demo/` are replaced with `example/e2e-harness/` with no broken links.
- **SC-005**: A new contributor can identify the purpose of `example/e2e-harness/` from the directory name alone without reading additional documentation.

---

## Assumptions

- No external consumers depend on the `@sw-editor/demo` package name (it is `private: true`).
- The `demo/` directory contains no files other than the Vite app already reviewed (`index.html`, `main.ts`, `package.json`, `vite.config.ts`).
- The Playwright config at `example/playwright.config.ts` does not hard-code the string `demo`; if it does, updating the path string is in scope.
