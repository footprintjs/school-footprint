import { describe, it, expect } from "vitest";
import { FlowChartExecutor } from "footprintjs";
import { createSchedulingFlow } from "../../flows/scheduling/schedulingFlow.js";
import { createMockRepository, createConflictingRepository } from "../helpers.js";

describe("scheduling flow", () => {
  it("creates schedule entry when no conflicts", async () => {
    const repo = createMockRepository();
    const flow = createSchedulingFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: {
        teacherId: "teacher-1",
        classId: "class-1",
        slot: { dayOfWeek: 1, periodId: "P1" },
      },
    });

    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.status).toBe("scheduled");
    expect(state.scheduleEntry).toBeDefined();
    expect((state.scheduleEntry as Record<string, unknown>).teacherId).toBe("teacher-1");
  });

  it("reports conflict when teacher already assigned", async () => {
    const repo = createConflictingRepository();
    const flow = createSchedulingFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: {
        teacherId: "teacher-1",
        classId: "class-2",
        slot: { dayOfWeek: 1, periodId: "P1" },
      },
    });

    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.status).toBe("conflict");
    expect(state.scheduleEntry).toBeUndefined();
  });

  it("rejects without teacher ID", async () => {
    const repo = createMockRepository();
    const flow = createSchedulingFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { classId: "class-1", slot: {} },
    });

    await expect(executor.run()).rejects.toThrow("Teacher ID is required");
  });

  it("rejects without class ID", async () => {
    const repo = createMockRepository();
    const flow = createSchedulingFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { teacherId: "t1", slot: {} },
    });

    await expect(executor.run()).rejects.toThrow("Class ID is required");
  });

  it("rejects without slot", async () => {
    const repo = createMockRepository();
    const flow = createSchedulingFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { teacherId: "t1", classId: "c1" },
    });

    await expect(executor.run()).rejects.toThrow("Time slot is required");
  });
});
