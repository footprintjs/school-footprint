import { describe, it, expect } from "vitest";
import { FlowChartExecutor } from "footprintjs";
import { createGradeFlow } from "../../flows/academics/createGradeFlow.js";
import { createSectionFlow } from "../../flows/academics/createSectionFlow.js";
import { createCheckAvailabilityFlow } from "../../flows/scheduling/checkAvailabilityFlow.js";
import { createCalculateFeesFlow } from "../../flows/fees/calculateFeesFlow.js";
import { createMockRepository } from "../helpers.js";

const repo = createMockRepository();

describe("create grade flow", () => {
  it("creates a grade with required fields", async () => {
    const flow = createGradeFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { name: "Grade 1", code: "G1", sortOrder: 1 },
    });
    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.createdGrade).toBeDefined();
    expect((state.createdGrade as Record<string, unknown>).name).toBe("Grade 1");
  });

  it("rejects without name", async () => {
    const flow = createGradeFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: {},
    });
    await expect(executor.run()).rejects.toThrow("name is required");
  });

  it("uses terminology for dance school", async () => {
    const flow = createGradeFlow(repo, (k) => (k === "grade" ? "Level" : k));
    expect(flow.description).toContain("Level");
  });
});

describe("create section flow", () => {
  it("creates a section with required fields", async () => {
    const flow = createSectionFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { gradeId: "grade-1", name: "Section A", capacity: 30 },
    });
    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.createdSection).toBeDefined();
    expect((state.createdSection as Record<string, unknown>).name).toBe("Section A");
  });

  it("rejects without grade ID", async () => {
    const flow = createSectionFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { name: "Section A" },
    });
    await expect(executor.run()).rejects.toThrow("ID is required");
  });
});

describe("check availability flow", () => {
  it("checks availability successfully", async () => {
    const flow = createCheckAvailabilityFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { teacherId: "t1", slot: { dayOfWeek: 1, periodId: "P1" } },
    });
    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.available).toBe(true);
    expect(state.conflicts).toEqual([]);
  });

  it("rejects without slot", async () => {
    const flow = createCheckAvailabilityFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { teacherId: "t1" },
    });
    await expect(executor.run()).rejects.toThrow("is required");
  });
});

describe("calculate fees flow", () => {
  it("calculates fees for a student", async () => {
    const flow = createCalculateFeesFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: { studentId: "s1", periodId: "term-1" },
    });
    await executor.run();
    const state = executor.getSnapshot().sharedState as Record<string, unknown>;

    expect(state.feeCalculation).toBeDefined();
    expect((state.feeCalculation as Record<string, unknown>).calculated).toBe(true);
  });

  it("rejects without student ID", async () => {
    const flow = createCalculateFeesFlow(repo);
    const executor = new FlowChartExecutor(flow, undefined, undefined, {
      input: {},
    });
    await expect(executor.run()).rejects.toThrow("ID is required");
  });
});
