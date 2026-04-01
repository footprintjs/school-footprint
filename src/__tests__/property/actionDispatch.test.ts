import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildActionDispatch, getRegisteredActionIds } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

const SCHOOL_TYPES: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];
const schoolTypeArb = fc.constantFrom(...SCHOOL_TYPES);
const actionIdArb = fc.constantFrom(...getRegisteredActionIds());
const repo = createMockRepository();

describe("ActionDispatch — property tests", () => {
  describe("dispatch invariants", () => {
    it("every dispatch has actionId matching the requested action", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const dispatch = buildActionDispatch(actionId, schoolType, repo);
          expect(dispatch).toBeDefined();
          expect(dispatch!.actionId).toBe(actionId);
        }),
      );
    });

    it("every dispatch has at least one branch (the default)", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const dispatch = buildActionDispatch(actionId, schoolType, repo)!;
          expect(dispatch.branches.size).toBeGreaterThanOrEqual(1);
          expect(dispatch.branches.has(actionId)).toBe(true);
        }),
      );
    });

    it("selectedBranch is always present in the branches map", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const dispatch = buildActionDispatch(actionId, schoolType, repo)!;
          expect(dispatch.branches.has(dispatch.meta.selectedBranch)).toBe(true);
        }),
      );
    });

    it("availableVariants exactly matches branches keys", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const dispatch = buildActionDispatch(actionId, schoolType, repo)!;
          const branchKeys = [...dispatch.branches.keys()].sort();
          const variants = [...dispatch.meta.availableVariants].sort();
          expect(variants).toEqual(branchKeys);
        }),
      );
    });

    it("deciderFn always returns a string that exists in branches", async () => {
      await fc.assert(
        fc.asyncProperty(actionIdArb, schoolTypeArb, async (actionId, schoolType) => {
          const dispatch = buildActionDispatch(actionId, schoolType, repo)!;
          const scope = { getValue: (key: string) => key === "schoolType" ? schoolType : undefined };
          const selected = await dispatch.deciderFn(scope);
          expect(dispatch.branches.has(selected)).toBe(true);
        }),
      );
    });
  });

  describe("resolver produces valid FlowCharts", () => {
    it("every branch resolver returns a flow with root and stageMap", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const dispatch = buildActionDispatch(actionId, schoolType, repo)!;
          for (const [, branch] of dispatch.branches) {
            const flow = branch.resolver();
            expect(flow.root).toBeDefined();
            expect(flow.stageMap).toBeInstanceOf(Map);
            expect(typeof flow.root.name).toBe("string");
          }
        }),
      );
    });
  });
});
