import { describe, expect, it } from "vitest";
import { RevisionCounter } from "../src/state/revision.js";
import type { Revision, RevisionedPayload } from "../src/state/types.js";

describe("RevisionCounter — initial state", () => {
  it("starts at revision 0 before any mutation", () => {
    const counter = new RevisionCounter();
    expect(counter.currentRevision).toBe(0);
  });
});

describe("RevisionCounter — increment", () => {
  it("increments to 1 after the first mutation", () => {
    const counter = new RevisionCounter();
    counter.increment();
    expect(counter.currentRevision).toBe(1);
  });

  it("returns the new revision value from increment()", () => {
    const counter = new RevisionCounter();
    expect(counter.increment()).toBe(1);
    expect(counter.increment()).toBe(2);
  });

  it("increments exactly once per call (monotonicity)", () => {
    const counter = new RevisionCounter();
    const revisions: Revision[] = [];

    for (let i = 0; i < 10; i++) {
      revisions.push(counter.increment());
    }

    // Each revision must be exactly one greater than the previous.
    for (let i = 1; i < revisions.length; i++) {
      expect(revisions[i]).toBe((revisions[i - 1] as number) + 1);
    }
  });

  it("never decreases across multiple operations", () => {
    const counter = new RevisionCounter();
    let previous = counter.currentRevision;

    for (let i = 0; i < 20; i++) {
      counter.increment();
      expect(counter.currentRevision).toBeGreaterThan(previous);
      previous = counter.currentRevision;
    }
  });
});

describe("RevisionCounter — per-instance isolation", () => {
  it("two instances maintain independent revision sequences", () => {
    const a = new RevisionCounter();
    const b = new RevisionCounter();

    a.increment();
    a.increment();
    b.increment();

    expect(a.currentRevision).toBe(2);
    expect(b.currentRevision).toBe(1);
  });

  it("incrementing one instance does not affect another", () => {
    const a = new RevisionCounter();
    const b = new RevisionCounter();

    for (let i = 0; i < 5; i++) {
      a.increment();
    }

    expect(b.currentRevision).toBe(0);
  });
});

describe("RevisionedPayload — type usage", () => {
  it("accepts a plain object with a revision field", () => {
    const payload: RevisionedPayload = { revision: 3 };
    expect(payload.revision).toBe(3);
  });

  it("revision from counter can be embedded in a payload", () => {
    const counter = new RevisionCounter();
    counter.increment();
    counter.increment();

    const payload: RevisionedPayload = {
      revision: counter.currentRevision,
    };

    expect(payload.revision).toBe(2);
  });
});
