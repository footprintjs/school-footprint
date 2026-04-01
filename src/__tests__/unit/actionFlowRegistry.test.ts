import { describe, it, expect } from "vitest";
import {
  resolveActionBranchId,
  getRegisteredActionIds,
  getActionFlowEntry,
} from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

describe("ActionFlowRegistry — unit tests", () => {
  describe("getRegisteredActionIds", () => {
    it("returns all 8 registered action IDs", () => {
      const ids = getRegisteredActionIds();
      expect(ids).toContain("enroll-student");
      expect(ids).toContain("create-attendance-session");
      expect(ids).toContain("mark-attendance");
      expect(ids).toContain("schedule-class");
      expect(ids).toContain("check-availability");
      expect(ids).toContain("create-grade");
      expect(ids).toContain("create-section");
      expect(ids).toContain("calculate-fees");
      expect(ids).toHaveLength(8);
    });

    it("returns a frozen array", () => {
      const ids = getRegisteredActionIds();
      expect(Object.isFrozen(ids)).toBe(true);
    });
  });

  describe("getActionFlowEntry", () => {
    it("returns entry with default builder for known action", () => {
      const entry = getActionFlowEntry("create-grade");
      expect(entry).toBeDefined();
      expect(typeof entry!.default).toBe("function");
    });

    it("returns undefined for unknown action", () => {
      expect(getActionFlowEntry("nonexistent")).toBeUndefined();
    });

    it("every registered action has a default builder", () => {
      for (const id of getRegisteredActionIds()) {
        const entry = getActionFlowEntry(id);
        expect(entry).toBeDefined();
        expect(typeof entry!.default).toBe("function");
      }
    });

    it("default builder produces a FlowChart with root and stageMap", () => {
      const repo = createMockRepository();
      for (const id of getRegisteredActionIds()) {
        const entry = getActionFlowEntry(id)!;
        const flow = entry.default(repo);
        expect(flow.root).toBeDefined();
        expect(flow.stageMap).toBeInstanceOf(Map);
      }
    });
  });

  describe("resolveActionBranchId", () => {
    it("returns action ID when no school type given", () => {
      expect(resolveActionBranchId("create-grade")).toBe("create-grade");
    });

    it("returns action ID when school type has no variant", () => {
      expect(resolveActionBranchId("create-grade", "dance")).toBe("create-grade");
    });

    it("returns action ID for unknown action", () => {
      expect(resolveActionBranchId("nonexistent", "k12")).toBe("nonexistent");
    });

    it("returns action ID for all school types (no variants registered yet)", () => {
      const schoolTypes: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];
      for (const id of getRegisteredActionIds()) {
        for (const type of schoolTypes) {
          // No variants registered yet → always returns base action ID
          expect(resolveActionBranchId(id, type)).toBe(id);
        }
      }
    });
  });
});
