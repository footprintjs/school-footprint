import { describe, it, expect } from "vitest";
import { FlowChartExecutor } from "footprintjs";
import { createAttendanceFlow } from "../../flows/attendance/attendanceFlow.js";
import { createMockRepository } from "../helpers.js";

describe("attendance flow", () => {
  const repo = createMockRepository();

  it("creates session without marking", async () => {
    const flow = createAttendanceFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { classId: "class-1", date: "2025-03-12" },
    });

    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.sessionId).toBeDefined();
    expect(state.markResult).toBeNull();
  });

  it("creates session with teacher", async () => {
    const flow = createAttendanceFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { classId: "class-1", date: "2025-03-12", teacherId: "teacher-1" },
    });

    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.sessionId).toBeDefined();
    expect(state.teacherId).toBe("teacher-1");
  });

  it("rejects without class ID", async () => {
    const flow = createAttendanceFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { date: "2025-03-12" },
    });

    await expect(executor.run()).rejects.toThrow("Class ID is required");
  });

  it("rejects without date", async () => {
    const flow = createAttendanceFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { classId: "class-1" },
    });

    await expect(executor.run()).rejects.toThrow("Date is required");
  });
});
