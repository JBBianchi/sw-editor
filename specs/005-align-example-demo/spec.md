# Feature Specification: Align Example and Demo Directories

**Feature Branch**: `005-align-example-demo`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Feature: align-example-demo. Merge the two illustrative directories (demo/ and example/) into one unified structure. Keep example/ as the top-level directory. The demo harness (currently demo/) becomes example/e2e-harness/ with package name @sw-editor/example-e2e-harness. The existing example/vanilla-js/ and example/host-events/ sub-packages stay in place with no code changes. Update pnpm-workspace.yaml, root playwright.config.ts, and docs accordingly."

## Terminology Decision

**Chosen convention**: Keep `example/` as the top-level directory for all illustrative sub-packages.

| Sub-package | Before | After |
|-------------|--------|-------|
| E2E test harness | `demo/` (`@sw-editor/demo`) | `example/e2e-harness/` (`@sw-editor/example-e2e-harness`) |
| Vanilla-JS integration demo | `example/vanilla-js/` (`@sw-editor/example-vanilla-js`) | unchanged |
| Host-events integration demo | `example/host-events/` (`@sw-editor/example-host-events`) | unchanged |

**Rationale**: The `example/` prefix is already established and consumer-facing. The `demo/` label gives no hint about purpose; renaming it `e2e-harness` under `example/` makes the directory tree self-documenting and groups all illustrative content in one place.

## Scope

### Directories that change

| Path | Change |
|------|--------|
| `demo/` | Moved to `example/e2e-harness/`; package name updated from `@sw-editor/demo` to `@sw-editor/example-e2e-harness` |
| `pnpm-workspace.yaml` | Replace `"demo"` workspace glob with `"example/e2e-harness"` |
| `playwright.config.ts` (root) | Replace all references to `@sw-editor/demo` with `@sw-editor/example-e2e-harness` |
| `specs/README.md` | Register this feature package |
| Root `README.md` | Update any references to `demo/` |
| `example/README.md` | Document the new `e2e-harness/` sub-package |

### Directories that stay the same

| Path | Reason |
|------|--------|
| `example/vanilla-js/` | No code changes; path and package name unchanged |
| `example/host-events/` | No code changes; path and package name unchanged |
| `example/playwright.config.ts` | Covers only `vanilla-js` and `host-events` suites; unaffected |
| `packages/*/` | Library packages; no dependency on `demo/` path |

### Audit items (implementor must verify)

- Any `.github/workflows/` CI YAML that references `demo` or `@sw-editor/demo` must also be updated.
- `vite.config.ts` inside `demo/` may reference relative paths that need adjustment after the directory move.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - E2E Suite Continues to Pass After Rename (Priority: P1)

A contributor runs the repository's Playwright end-to-end suite from the repo root and all scenarios pass, even though the test harness has been moved and renamed.

**Why this priority**: The E2E suite is the primary regression gate. If it breaks, no other work can merge safely.

**Independent Test**: Run `pnpm exec playwright test` from the repo root after the rename and verify all scenarios pass.

**Acceptance Scenarios**:

1. **Given** the repository has been updated with `example/e2e-harness/` in place of `demo/`, **When** a contributor runs the root Playwright suite, **Then** all existing Scenarios 1–5 pass without modification to the test code.
2. **Given** `pnpm-workspace.yaml` references `example/e2e-harness`, **When** `pnpm install` is run, **Then** the workspace resolves `@sw-editor/example-e2e-harness` without errors.

---

### User Story 2 - Example Sub-packages Remain Unaffected (Priority: P2)

A library consumer browsing the `example/` directory finds the `vanilla-js` and `host-events` demos exactly as before, with no changes to their code, configuration, or README content.

**Why this priority**: Breaking consumer-facing demos would undermine confidence in the library and produce misleading documentation.

**Independent Test**: Run `pnpm exec playwright test --config example/playwright.config.ts` and verify both demo suites pass unchanged.

**Acceptance Scenarios**:

1. **Given** the rename is applied, **When** a contributor runs the example Playwright suite, **Then** all vanilla-js and host-events scenarios pass.
2. **Given** no code changes were made to `example/vanilla-js/` or `example/host-events/`, **When** their package contents are diffed against the base branch, **Then** zero code file changes are reported.

---

### User Story 3 - Documentation Reflects the New Structure (Priority: P3)

A new contributor reads `example/README.md` and the repo root `README.md` and finds accurate, up-to-date paths and package names with no references to the old `demo/` directory.

**Why this priority**: Stale documentation is a persistent source of contributor confusion; it should be updated in the same change as the rename.

**Independent Test**: Grep the repository for references to `@sw-editor/demo` and `demo/` and confirm zero matches outside of git history.

**Acceptance Scenarios**:

1. **Given** the rename is complete, **When** a contributor searches the working tree for `@sw-editor/demo`, **Then** no matches are found.
2. **Given** `example/README.md` is updated, **When** a contributor reads it, **Then** it documents `example/e2e-harness/` as the E2E test harness sub-package with its new package name.

---

### Edge Cases

- What happens if a CI workflow YAML references `demo` by path or package name? — All such references must be updated in the same change.
- What happens if `vite.config.ts` inside the moved directory uses paths relative to the old location? — Paths must be verified and adjusted so `pnpm --filter @sw-editor/example-e2e-harness build` succeeds.
- What happens if a contributor has a local `demo/` directory from a stale checkout? — `pnpm install` after pulling will warn about an unrecognised workspace package; documented in the quickstart.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain `example/e2e-harness/` as the E2E test harness directory in place of `demo/`.
- **FR-002**: The package at `example/e2e-harness/` MUST be named `@sw-editor/example-e2e-harness`.
- **FR-003**: `pnpm-workspace.yaml` MUST list `example/e2e-harness` (or an equivalent glob) instead of `demo`.
- **FR-004**: The root `playwright.config.ts` MUST reference `@sw-editor/example-e2e-harness` wherever it previously referenced `@sw-editor/demo`.
- **FR-005**: `example/vanilla-js/` and `example/host-events/` MUST remain unchanged in path, package name, and source code.
- **FR-006**: All documentation files that reference `demo/` or `@sw-editor/demo` MUST be updated to reflect the new path and package name.
- **FR-007**: The root Playwright E2E suite (Scenarios 1–5) MUST pass after the rename with no changes to test source code.
- **FR-008**: The example Playwright suite (`example/playwright.config.ts`) MUST continue to pass after the rename.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After applying the change, zero references to `@sw-editor/demo` or to `demo/` as a workspace directory exist in the working tree (excluding git history and generated lock-file content that was not regenerated).
- **SC-002**: Running the workspace install command from the repo root completes without errors or unresolved workspace package warnings.
- **SC-003**: All five root-level E2E scenarios pass without modifying any test source file.
- **SC-004**: All example-suite E2E scenarios pass without modifying any file under `example/vanilla-js/` or `example/host-events/`.
- **SC-005**: A contributor new to the repository can locate and understand the E2E harness from `example/README.md` without consulting git history.

## Assumptions

- The `demo/` directory at the repo root contains only the E2E test harness; no other product or consumer-facing content lives there.
- No published npm packages depend on `@sw-editor/demo` (it is `private: true`), so there is no semver or registry impact.
- CI workflow YAML files may reference `demo`; the implementor is responsible for auditing and updating those files in the same change.
- The `vite.config.ts` inside `demo/` uses only relative paths that will continue to resolve correctly after the move, or will require minor path adjustments.
