import { describe, it, expect } from "vitest";
import {
  getActionFlowEntry,
  getRegisteredActionIds,
} from "../../flows/schoolServiceComposer.js";
import { createSchoolServiceRegistry } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";

describe("ActionFlowRegistry — performance & boundary tests", () => {
  const repo = createMockRepository();

  describe("flow build cost", () => {
    it("building a single flow completes under 10ms", () => {
      const entry = getActionFlowEntry("create-grade")!;
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        entry.default(repo);
      }
      const elapsed = performance.now() - start;
      const perBuild = elapsed / 100;
      expect(perBuild).toBeLessThan(10);
    });

    it("building all 8 flows completes under 50ms", () => {
      const ids = getRegisteredActionIds();
      const start = performance.now();
      for (const id of ids) {
        const entry = getActionFlowEntry(id)!;
        entry.default(repo);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe("registry creation cost", () => {
    it("createSchoolServiceRegistry completes under 100ms", () => {
      const start = performance.now();
      createSchoolServiceRegistry(repo);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe("boundary conditions", () => {
    it("getActionFlowEntry handles empty string", () => {
      expect(getActionFlowEntry("")).toBeUndefined();
    });

    it("getRegisteredActionIds returns consistent results across calls", () => {
      const ids1 = getRegisteredActionIds();
      const ids2 = getRegisteredActionIds();
      expect(ids1).toEqual(ids2);
    });

    it("flow builders are idempotent — same repo produces equivalent flows", () => {
      const entry = getActionFlowEntry("schedule-class")!;
      const flow1 = entry.default(repo);
      const flow2 = entry.default(repo);
      // Same structure, different instances
      expect(flow1.root.name).toBe(flow2.root.name);
      expect(flow1.root.id).toBe(flow2.root.id);
      expect(flow1.stageMap.size).toBe(flow2.stageMap.size);
      expect(flow1.description).toBe(flow2.description);
    });
  });
});
