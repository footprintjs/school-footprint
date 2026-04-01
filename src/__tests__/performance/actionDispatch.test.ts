import { describe, it, expect } from "vitest";
import { buildActionDispatch, getRegisteredActionIds } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

describe("ActionDispatch — performance & boundary tests", () => {
  const repo = createMockRepository();
  const SCHOOL_TYPES: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];

  describe("dispatch creation cost", () => {
    it("buildActionDispatch completes under 1ms per call", () => {
      const start = performance.now();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        buildActionDispatch("create-grade", "k12", repo);
      }
      const elapsed = performance.now() - start;
      expect(elapsed / iterations).toBeLessThan(1);
    });

    it("building dispatch for all actions × all school types completes under 50ms", () => {
      const ids = getRegisteredActionIds();
      const start = performance.now();
      for (const id of ids) {
        for (const type of SCHOOL_TYPES) {
          buildActionDispatch(id, type, repo);
        }
      }
      const elapsed = performance.now() - start;
      // 8 actions × 5 types = 40 dispatches
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe("resolver cost (lazy branch)", () => {
    it("resolver builds a FlowChart under 5ms", () => {
      const dispatch = buildActionDispatch("schedule-class", "k12", repo)!;
      const branch = dispatch.branches.get("schedule-class")!;

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        branch.resolver();
      }
      const elapsed = performance.now() - start;
      expect(elapsed / 100).toBeLessThan(5);
    });
  });

  describe("boundary conditions", () => {
    it("dispatch with empty input object", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo);
      expect(dispatch).toBeDefined();
      expect(dispatch!.input).toEqual({ schoolType: "k12" });
    });

    it("branches map is iterable", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const entries = [...dispatch.branches.entries()];
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it("meta.availableVariants is frozen", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      expect(Object.isFrozen(dispatch.meta.availableVariants)).toBe(true);
    });
  });
});
