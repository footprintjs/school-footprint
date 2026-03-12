import { describe, it, expect } from "vitest";
import { FlowChartExecutor, ManifestFlowRecorder } from "footprintjs";
import { createEnrollmentFlow } from "../../flows/enrollment/enrollmentFlow.js";
import { createMockRepository } from "../helpers.js";

describe("enrollment flow", () => {
  const repo = createMockRepository();

  it("enrolls a student with required fields", async () => {
    const flow = createEnrollmentFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { name: "Luna Martinez", dob: "2015-03-12" },
    });
    executor.enableNarrative();

    await executor.run();
    const snapshot = executor.getSnapshot();
    const state = snapshot.sharedState as Record<string, unknown>;

    expect(state.enrolledStudent).toBeDefined();
    expect((state.enrolledStudent as Record<string, unknown>).name).toBe("Luna Martinez");
    expect(state.familyLinked).toBe(false);
    expect(state.gradeAssigned).toBe(false);
  });

  it("enrolls a student with family linkage", async () => {
    const flow = createEnrollmentFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { name: "Max Chen", dob: "2014-07-22", familyId: "fam-1" },
    });

    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.familyLinked).toBe(true);
    expect((state.enrolledStudent as Record<string, unknown>).familyId).toBe("fam-1");
  });

  it("enrolls a student with grade assignment", async () => {
    const flow = createEnrollmentFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { name: "Aria Lee", dob: "2016-01-15", gradeId: "grade-3" },
    });

    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.gradeAssigned).toBe(true);
  });

  it("rejects enrollment without name", async () => {
    const flow = createEnrollmentFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { dob: "2015-03-12" },
    });

    await expect(executor.run()).rejects.toThrow("Student name is required");
  });

  it("rejects enrollment without dob", async () => {
    const flow = createEnrollmentFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { name: "Test" },
    });

    await expect(executor.run()).rejects.toThrow("Date of birth is required");
  });

  it("produces narrative entries", async () => {
    const flow = createEnrollmentFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { name: "Luna Martinez", dob: "2015-03-12" },
    });
    executor.enableNarrative();

    await executor.run();
    const narrative = executor.getNarrative();

    expect(narrative.length).toBeGreaterThan(0);
  });

  it("has build-time description", () => {
    const flow = createEnrollmentFlow(repo);
    expect(flow.description).toBeTruthy();
    expect(flow.stageDescriptions.size).toBeGreaterThan(0);
  });
});
