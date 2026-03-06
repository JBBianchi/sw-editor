/**
 * Unit tests for `src/export.ts`.
 *
 * The module uses module-level mutable state (`_currentSource`). Each test
 * resets that state via `setCurrentSource(null)` in `beforeEach` to ensure
 * full isolation.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  exportWorkflowSource,
  getCurrentSource,
  setCurrentSource,
} from "../src/export.js";
import type { WorkflowSource } from "../src/contracts/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_JSON_CONTENT = JSON.stringify({
  document: {
    dsl: "1.0.0",
    namespace: "default",
    name: "test-workflow",
    version: "1.0.0",
  },
  do: [{ step1: { set: { greeting: "hello" } } }],
});

const VALID_YAML_CONTENT = `\
document:
  dsl: 1.0.0
  namespace: default
  name: test-workflow
  version: 1.0.0
do:
  - step1:
      set:
        greeting: hello
`;

/** Source with content that will fail SDK schema validation. */
const INVALID_SOURCE: WorkflowSource = {
  format: "json",
  content: JSON.stringify({ document: { dsl: "1.0.0" } }),
};

const JSON_SOURCE: WorkflowSource = {
  format: "json",
  content: VALID_JSON_CONTENT,
};

const YAML_SOURCE: WorkflowSource = {
  format: "yaml",
  content: VALID_YAML_CONTENT,
};

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

describe("setCurrentSource / getCurrentSource", () => {
  beforeEach(() => {
    setCurrentSource(null);
  });

  it("returns null before any source is set", () => {
    expect(getCurrentSource()).toBeNull();
  });

  it("stores and returns the provided source", () => {
    setCurrentSource(JSON_SOURCE);
    expect(getCurrentSource()).toBe(JSON_SOURCE);
  });

  it("resets to null when called with null", () => {
    setCurrentSource(JSON_SOURCE);
    setCurrentSource(null);
    expect(getCurrentSource()).toBeNull();
  });

  it("overwrites a previously set source", () => {
    setCurrentSource(JSON_SOURCE);
    setCurrentSource(YAML_SOURCE);
    expect(getCurrentSource()).toBe(YAML_SOURCE);
  });
});

// ---------------------------------------------------------------------------
// exportWorkflowSource
// ---------------------------------------------------------------------------

describe("exportWorkflowSource", () => {
  beforeEach(() => {
    setCurrentSource(null);
  });

  describe("no source loaded (new workflow mode)", () => {
    it("resolves with a WorkflowSource object", async () => {
      const result = await exportWorkflowSource();
      expect(result).toHaveProperty("source");
      expect(result.source).toHaveProperty("format");
      expect(result.source).toHaveProperty("content");
    });

    it("defaults to JSON format", async () => {
      const result = await exportWorkflowSource();
      expect(result.source.format).toBe("json");
    });

    it("returns non-empty content", async () => {
      const result = await exportWorkflowSource();
      expect(result.source.content.length).toBeGreaterThan(0);
    });

    it("returns valid JSON content", async () => {
      const result = await exportWorkflowSource();
      expect(() => JSON.parse(result.source.content)).not.toThrow();
    });
  });

  describe("JSON source loaded", () => {
    beforeEach(() => {
      setCurrentSource(JSON_SOURCE);
    });

    it("resolves with JSON format when no override is given", async () => {
      const result = await exportWorkflowSource();
      expect(result.source.format).toBe("json");
    });

    it("returns non-empty content", async () => {
      const result = await exportWorkflowSource();
      expect(result.source.content.length).toBeGreaterThan(0);
    });

    it("returns parseable JSON content", async () => {
      const result = await exportWorkflowSource();
      expect(() => JSON.parse(result.source.content)).not.toThrow();
    });
  });

  describe("YAML source loaded", () => {
    beforeEach(() => {
      setCurrentSource(YAML_SOURCE);
    });

    it("resolves with YAML format when no override is given", async () => {
      const result = await exportWorkflowSource();
      expect(result.source.format).toBe("yaml");
    });

    it("returns non-empty content", async () => {
      const result = await exportWorkflowSource();
      expect(result.source.content.length).toBeGreaterThan(0);
    });
  });

  describe("explicit format override", () => {
    it("uses yaml override even when no source is loaded", async () => {
      const result = await exportWorkflowSource({ format: "yaml" });
      expect(result.source.format).toBe("yaml");
    });

    it("uses yaml override when a JSON source is loaded", async () => {
      setCurrentSource(JSON_SOURCE);
      const result = await exportWorkflowSource({ format: "yaml" });
      expect(result.source.format).toBe("yaml");
      expect(result.source.content.length).toBeGreaterThan(0);
    });

    it("uses json override when a YAML source is loaded", async () => {
      setCurrentSource(YAML_SOURCE);
      const result = await exportWorkflowSource({ format: "json" });
      expect(result.source.format).toBe("json");
      expect(() => JSON.parse(result.source.content)).not.toThrow();
    });
  });

  describe("structurally invalid source", () => {
    beforeEach(() => {
      setCurrentSource(INVALID_SOURCE);
    });

    it("rejects with an Error", async () => {
      await expect(exportWorkflowSource()).rejects.toBeInstanceOf(Error);
    });

    it("error message contains 'Export failed'", async () => {
      await expect(exportWorkflowSource()).rejects.toThrow(/Export failed/);
    });
  });

  describe("module-level state isolation", () => {
    it("state is null at the start of each test (beforeEach resets it)", () => {
      expect(getCurrentSource()).toBeNull();
    });

    it("setting source in one test does not bleed into the next", async () => {
      // Set a source and verify it is active for this test only.
      setCurrentSource(JSON_SOURCE);
      const result = await exportWorkflowSource();
      expect(result.source.format).toBe("json");
      // The next test's beforeEach will call setCurrentSource(null).
    });

    it("source is null after beforeEach reset even if a prior test set one", () => {
      expect(getCurrentSource()).toBeNull();
    });
  });
});
