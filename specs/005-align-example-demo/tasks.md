# Tasks: Align Example and Demo Directories

**Input**: Design documents from `specs/005-align-example-demo/`
**Prerequisites**: spec.md

## Phase 1: Setup

- [x] T001 Move `demo/` directory to `example/e2e-harness/`
- [x] T002 Update `package.json` `name` field to `@sw-editor/example-e2e-harness` inside `example/e2e-harness/`
- [x] T003 Update `pnpm-workspace.yaml` to include `example/e2e-harness` and remove the old `demo` entry

## Phase 2: Reference Updates

- [x] T004 Update all internal import paths and `vite.config.ts` references inside `example/e2e-harness/` to reflect new location
- [x] T005 Update `pnpm-lock.yaml` to reflect the renamed workspace package
- [x] T006 Search and replace stale `@sw-editor/demo` package references across the repository with `@sw-editor/example-e2e-harness`
- [x] T007 Update any `README.md` or documentation files that reference `demo/` to reference `example/e2e-harness/`
- [x] T008 Update `specs/README.md` to register feature `005-align-example-demo`

## Phase 3: Verification

- [x] T009 Verify `pnpm install` resolves `@sw-editor/example-e2e-harness` without errors
- [x] T010 Verify Playwright example test suite passes after the rename
- [x] T011 Verify `example/e2e-harness/` Vite app builds and serves without errors

## Phase 7: Finalize Spec Artifacts

- [x] T012 Update `spec.md` **Status** to `done`
- [x] T013 Mark all tasks in `tasks.md` as `- [x]` (this file)
