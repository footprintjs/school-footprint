import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  resolveActionBranchId,
  getActionFlowEntry,
  getRegisteredActionIds,
} from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

const SCHOOL_TYPES: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];
const schoolTypeArb = fc.constantFrom(...SCHOOL_TYPES);
const actionIdArb = fc.constantFrom(...getRegisteredActionIds());

describe("ActionFlowRegistry — property tests", () => {
  describe("resolveActionBranchId invariants", () => {
    it("always returns a non-empty string for registered actions", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const branchId = resolveActionBranchId(actionId, schoolType);
          expect(branchId.length).toBeGreaterThan(0);
        }),
      );
    });

    it("branch ID always starts with the action ID", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const branchId = resolveActionBranchId(actionId, schoolType);
          expect(branchId.startsWith(actionId)).toBe(true);
        }),
      );
    });

    it("without school type, returns exactly the action ID", () => {
      fc.assert(
        fc.property(actionIdArb, (actionId) => {
          expect(resolveActionBranchId(actionId)).toBe(actionId);
        }),
      );
    });

    it("branch ID is either actionId or actionId:schoolType", () => {
      fc.assert(
        fc.property(actionIdArb, schoolTypeArb, (actionId, schoolType) => {
          const branchId = resolveActionBranchId(actionId, schoolType);
          expect(
            branchId === actionId || branchId === `${actionId}:${schoolType}`,
          ).toBe(true);
        }),
      );
    });
  });

  describe("registry completeness invariants", () => {
    it("every registered action has a getActionFlowEntry result", () => {
      fc.assert(
        fc.property(actionIdArb, (actionId) => {
          expect(getActionFlowEntry(actionId)).toBeDefined();
        }),
      );
    });

    it("arbitrary strings outside the registry return undefined", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter((s) => !getRegisteredActionIds().includes(s)),
          (randomId) => {
            expect(getActionFlowEntry(randomId)).toBeUndefined();
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe("flow builder determinism", () => {
    it("same action + same repo always produces flows with same root name", () => {
      const repo = createMockRepository();

      fc.assert(
        fc.property(actionIdArb, (actionId) => {
          const entry = getActionFlowEntry(actionId)!;
          const flow1 = entry.default(repo);
          const flow2 = entry.default(repo);
          expect(flow1.root.name).toBe(flow2.root.name);
          expect(flow1.root.id).toBe(flow2.root.id);
        }),
      );
    });
  });
});
