/**
 * Tests that ActionDispatch integrates correctly with footprintjs's
 * addDeciderFunction + addLazySubFlowChartBranch — the native builder API
 * that replaces the Phase 4 StageNode hack.
 *
 * These tests simulate what buildDispatchOrchestratorFlow does in requestFootprint.ts
 * but without Fastify dependencies — pure footprintjs builder + executor.
 */
import { describe, it, expect } from "vitest";
import { flowChart, FlowChartBuilder, FlowChartExecutor } from "footprintjs";
import { buildActionDispatch, getRegisteredActionIds } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

/**
 * Build an orchestrator flow using the same pattern as buildDispatchOrchestratorFlow
 * but without Fastify-specific REQUEST_START/CONTEXT/INPUT stages.
 * Tests the core: decider + lazy branches.
 */
interface TestOrchestratorState {
  [key: string]: unknown;
  schoolType: string;
  requestInput: Record<string, unknown>;
}

function buildTestOrchestratorFlow(dispatch: NonNullable<ReturnType<typeof buildActionDispatch>>) {
  const builder = flowChart<any, TestOrchestratorState>(
    "PREPARE",
    async (scope) => {
      scope.schoolType = dispatch.meta.resolvedSchoolType;
      scope.requestInput = dispatch.input;
    },
    "PREPARE",
    undefined,
    "Seed scope with school type and input",
  );

  const deciderList = builder.addDeciderFunction(
    "FLOW_SELECTOR",
    async (scope) => {
      return dispatch.deciderFn(scope);
    },
    "FLOW_SELECTOR",
    dispatch.meta.description,
  );

  for (const [branchId, branch] of dispatch.branches) {
    deciderList.addLazySubFlowChartBranch(
      branchId,
      branch.resolver,
      branchId,
      branch.mountOptions as any,
    );
  }

  return deciderList.end().build();
}

describe("Dispatch orchestrator — scenario tests", () => {
  const repo = createMockRepository();

  describe("native decider + lazy branch execution", () => {
    it("executes create-grade flow via FLOW_SELECTOR", async () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const fullDispatch = {
        ...dispatch,
        input: { ...dispatch.input, name: "Grade 5", code: "G5" },
      };

      const flow = buildTestOrchestratorFlow(fullDispatch);
      const executor = new FlowChartExecutor(flow, { initialContext: {
        input: fullDispatch.input,
      }});
      executor.enableNarrative();

      await executor.run();
      const snapshot = executor.getSnapshot();

      // Verify the flow executed (sharedState has data)
      expect(snapshot.sharedState).toBeDefined();
      // Verify subflow was executed
      const subflowResults = executor.getSubflowResults();
      expect(subflowResults.size).toBeGreaterThan(0);
    });

    it("executes enroll-student flow and produces result", async () => {
      const dispatch = buildActionDispatch("enroll-student", "dance", repo)!;
      const fullDispatch = {
        ...dispatch,
        input: { ...dispatch.input, name: "Luna Martinez", dob: "2015-03-12" },
      };

      const flow = buildTestOrchestratorFlow(fullDispatch);
      const executor = new FlowChartExecutor(flow, { initialContext: {
        input: fullDispatch.input,
      }});
      executor.enableNarrative();

      await executor.run();

      const subflowResults = executor.getSubflowResults();
      expect(subflowResults.size).toBeGreaterThan(0);

      // The subflow's globalContext should have enrolledStudent
      const sfResult = subflowResults.values().next().value;
      const globalCtx = (sfResult?.treeContext as any)?.globalContext;
      expect(globalCtx?.enrolledStudent).toBeDefined();
    });

    it("build-time structure shows FLOW_SELECTOR with branches", () => {
      const dispatch = buildActionDispatch("schedule-class", "k12", repo)!;
      const flow = buildTestOrchestratorFlow(dispatch);
      const structure = flow.buildTimeStructure;

      // Navigate: PREPARE → next → FLOW_SELECTOR
      expect(structure.name).toBe("PREPARE");
      const selectorNode = structure.next;
      expect(selectorNode).toBeDefined();
      expect(selectorNode!.name).toBe("FLOW_SELECTOR");
      expect(selectorNode!.hasDecider).toBe(true);
      // Should have children (branches)
      expect(selectorNode!.children).toBeDefined();
      expect(selectorNode!.children!.length).toBeGreaterThanOrEqual(1);
    });

    it("lazy branch is marked with isLazy in build-time structure", () => {
      const dispatch = buildActionDispatch("create-grade", "k12", repo)!;
      const flow = buildTestOrchestratorFlow(dispatch);
      const selectorNode = flow.buildTimeStructure.next;
      const branches = selectorNode?.children ?? [];

      // At least one branch should be lazy
      const lazyBranches = branches.filter((b: any) => b.isLazy === true);
      expect(lazyBranches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("all registered actions work through dispatch orchestrator", () => {
    const schoolTypes: SchoolType[] = ["k12", "dance"];

    for (const actionId of getRegisteredActionIds()) {
      for (const schoolType of schoolTypes) {
        it(`${actionId} / ${schoolType}`, async () => {
          const dispatch = buildActionDispatch(actionId, schoolType, repo)!;
          // Provide minimal valid input for each action
          const input = getMinimalInput(actionId, dispatch.input);
          const fullDispatch = { ...dispatch, input };

          const flow = buildTestOrchestratorFlow(fullDispatch);
          const executor = new FlowChartExecutor(flow, { initialContext: {
            input: fullDispatch.input,
          }});
          executor.enableNarrative();

          await executor.run();
          const subflowResults = executor.getSubflowResults();
          expect(subflowResults.size).toBeGreaterThan(0);
        });
      }
    }
  });
});

/** Provide minimal valid input for each action to avoid validation errors */
function getMinimalInput(actionId: string, base: Record<string, unknown>): Record<string, unknown> {
  const inputs: Record<string, Record<string, unknown>> = {
    "enroll-student": { name: "Test Student", dob: "2015-01-01" },
    "create-attendance-session": { classId: "class-1", date: "2025-01-01" },
    "mark-attendance": { classId: "class-1", date: "2025-01-01" },
    "schedule-class": {
      teacherId: "teacher-1",
      classId: "class-1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    },
    "check-availability": {
      teacherId: "teacher-1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    },
    "create-grade": { name: "Grade 5", code: "G5" },
    "create-section": { gradeId: "grade-1", name: "Section A" },
    "calculate-fees": { studentId: "student-1" },
  };
  return { ...base, ...inputs[actionId] };
}
