import { describe, it, expect } from "vitest";
import { buildActionDispatch, getRegisteredActionIds } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

describe("ActionDispatch — unit tests", () => {
  const repo = createMockRepository();
  const SCHOOL_TYPES: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];

  describe("buildActionDispatch", () => {
    it("returns undefined for unknown action", () => {
      expect(buildActionDispatch("nonexistent", "k12", repo)).toBeUndefined();
    });

    it("returns ActionDispatch for known action", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo);
      expect(dispatch).toBeDefined();
      expect(dispatch!.actionId).toBe("create-grade");
    });

    it("has a deciderFn that is a function", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      expect(typeof dispatch.deciderFn).toBe("function");
    });

    it("has at least a default branch", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      expect(dispatch.branches.size).toBeGreaterThanOrEqual(1);
      expect(dispatch.branches.has("create-grade")).toBe(true);
    });

    it("branch resolver is a function that produces a FlowChart", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const branch = dispatch.branches.get("create-grade")!;
      expect(typeof branch.resolver).toBe("function");
      const flow = branch.resolver();
      expect(flow.root).toBeDefined();
      expect(flow.stageMap).toBeInstanceOf(Map);
    });

    it("meta contains resolvedSchoolType", () => {
      const dispatch = buildActionDispatch("create-grade", "dance", repo)!;
      expect(dispatch.meta.resolvedSchoolType).toBe("dance");
    });

    it("meta.availableVariants includes the default action ID", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      expect(dispatch.meta.availableVariants).toContain("create-grade");
    });

    it("meta.selectedBranch is the default when no variant exists", () => {
      const dispatch = buildActionDispatch("create-grade", "dance", repo)!;
      // No dance variant registered → selectedBranch = default action ID
      expect(dispatch.meta.selectedBranch).toBe("create-grade");
    });

    it("works for all registered actions and school types", () => {
      for (const actionId of getRegisteredActionIds()) {
        for (const schoolType of SCHOOL_TYPES) {
          const dispatch = buildActionDispatch(actionId, schoolType, repo);
          expect(dispatch).toBeDefined();
          expect(dispatch!.actionId).toBe(actionId);
          expect(dispatch!.branches.size).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe("deciderFn behavior", () => {
    it("returns default action ID when scope has matching school type but no variant", async () => {
      const dispatch = buildActionDispatch("create-grade", "dance", repo)!;
      // Mock a ScopeFacade-like object
      const scope = { getValue: (key: string) => key === "schoolType" ? "dance" : undefined };
      const result = await dispatch.deciderFn(scope);
      // No dance variant → falls back to default
      expect(result).toBe("create-grade");
    });

    it("returns default action ID when scope has no schoolType", async () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const scope = { getValue: () => undefined };
      const result = await dispatch.deciderFn(scope);
      expect(result).toBe("create-grade");
    });

    it("returns default action ID for null scope", async () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const result = await dispatch.deciderFn(null);
      expect(result).toBe("create-grade");
    });
  });

  describe("branch mountOptions", () => {
    it("default branch has inputMapper", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const branch = dispatch.branches.get("create-grade")!;
      expect(branch.mountOptions?.inputMapper).toBeDefined();
      expect(typeof branch.mountOptions!.inputMapper).toBe("function");
    });

    it("inputMapper extracts requestInput from parent scope", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const branch = dispatch.branches.get("create-grade")!;
      const parentScope = { requestInput: { name: "Grade 5", code: "G5" } };
      const result = branch.mountOptions!.inputMapper!(parentScope);
      expect(result).toEqual({ input: { name: "Grade 5", code: "G5" } });
    });

    it("inputMapper falls back to input key", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const branch = dispatch.branches.get("create-grade")!;
      const parentScope = { input: { name: "Grade 5" } };
      const result = branch.mountOptions!.inputMapper!(parentScope);
      expect(result).toEqual({ input: { name: "Grade 5" } });
    });
  });
});
