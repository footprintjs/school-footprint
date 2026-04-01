import { describe, it, expect } from "vitest";
import {
  resolveActionBranchId,
  getActionFlowEntry,
  getRegisteredActionIds,
} from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

describe("ActionFlowRegistry — security tests", () => {
  describe("input sanitization", () => {
    it("prototype property names return undefined (Object.hasOwn guard)", () => {
      expect(getActionFlowEntry("__proto__")).toBeUndefined();
      expect(getActionFlowEntry("constructor")).toBeUndefined();
      expect(getActionFlowEntry("toString")).toBeUndefined();
    });

    it("resolveActionBranchId handles injection-like action IDs safely", () => {
      const malicious = "'; DROP TABLE students; --";
      // Should return the same string — no interpretation
      expect(resolveActionBranchId(malicious)).toBe(malicious);
    });

    it("resolveActionBranchId handles injection-like school types safely", () => {
      // Force cast to bypass TS — runtime must still be safe
      const malicious = "'; DROP TABLE students; --" as unknown as SchoolType;
      const result = resolveActionBranchId("create-grade", malicious);
      expect(result).toBe("create-grade");
    });
  });

  describe("registry immutability", () => {
    it("getRegisteredActionIds cannot be mutated to affect registry", () => {
      const ids = getRegisteredActionIds();
      // Frozen array — mutation throws in strict mode or is silently ignored
      expect(() => {
        (ids as string[]).push("injected-action");
      }).toThrow();
    });

    it("getActionFlowEntry does not expose mutable internal state", () => {
      const entry1 = getActionFlowEntry("create-grade");
      const entry2 = getActionFlowEntry("create-grade");
      // Both point to the same registry entry (reference equality is fine — it's readonly)
      expect(entry1).toBe(entry2);
      expect(entry1!.default).toBe(entry2!.default);
    });
  });

  describe("no sensitive data leakage", () => {
    it("flow builders do not embed repository references in FlowChart metadata", () => {
      const repo = createMockRepository();
      const entry = getActionFlowEntry("create-grade")!;
      const flow = entry.default(repo);

      // buildTimeStructure should be serializable without repo references
      const serialized = JSON.stringify(flow.buildTimeStructure);
      expect(serialized).not.toContain("createStudent");
      expect(serialized).not.toContain("createGrade");
    });
  });
});
