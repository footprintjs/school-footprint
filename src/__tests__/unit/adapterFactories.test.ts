import { describe, it, expect } from "vitest";
import { createSchedulingAdapters } from "../../adapters/schedulingAdapters.js";
import { createFeeAdapters } from "../../adapters/feeAdapters.js";
import { createMockRepository, createConflictingRepository } from "../helpers.js";

describe("scheduling adapter factories", () => {
  const repo = createMockRepository();
  const adapters = createSchedulingAdapters(repo);

  it("creates 5 scheduling adapters", () => {
    expect(adapters).toHaveLength(5);
  });

  it("fixed-timetable creates entry when no conflicts", async () => {
    const adapter = adapters.find((a) => a.id === "fixed-timetable")!;
    const result = (await adapter.execute(
      { teacherId: "t1", classId: "c1", dayOfWeek: 1, periodId: "P1" },
      { profileType: "k12", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(true);
    expect(result.pattern).toBe("fixed-timetable");
    expect(result.entry).toBeDefined();
  });

  it("fixed-timetable returns conflicts when teacher busy", async () => {
    const conflictRepo = createConflictingRepository();
    const conflictAdapters = createSchedulingAdapters(conflictRepo);
    const adapter = conflictAdapters.find((a) => a.id === "fixed-timetable")!;
    const result = (await adapter.execute(
      { teacherId: "t1", classId: "c1", dayOfWeek: 1, periodId: "P1" },
      { profileType: "k12", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(false);
    expect((result.conflicts as unknown[]).length).toBe(1);
  });

  it("time-slots adapter works for dance", async () => {
    const adapter = adapters.find((a) => a.id === "time-slots")!;
    const result = (await adapter.execute(
      { teacherId: "t1", classId: "c1", startTime: "10:00", duration: 60, date: "2025-03-12" },
      { profileType: "dance", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(true);
    expect(result.pattern).toBe("time-slots");
  });

  it("appointments adapter works for music", async () => {
    const adapter = adapters.find((a) => a.id === "appointments")!;
    const result = (await adapter.execute(
      { teacherId: "t1", studentId: "s1", startTime: "14:00", duration: 30, instrument: "piano" },
      { profileType: "music", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(true);
    expect(result.pattern).toBe("appointments");
  });
});

describe("fee adapter factories", () => {
  const repo = createMockRepository();
  const adapters = createFeeAdapters(repo);

  it("creates 5 fee adapters", () => {
    expect(adapters).toHaveLength(5);
  });

  it("per-term-fees calculates via repo", async () => {
    const adapter = adapters.find((a) => a.id === "per-term-fees")!;
    const result = (await adapter.execute(
      { studentId: "s1", termId: "t1" },
      { profileType: "k12", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.model).toBe("per-term");
    expect(result.calculated).toBe(true);
  });

  it("per-class-fees calculates via repo", async () => {
    const adapter = adapters.find((a) => a.id === "per-class-fees")!;
    const result = (await adapter.execute(
      { studentId: "s1", classCount: 10 },
      { profileType: "dance", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.model).toBe("per-class");
    expect(result.calculated).toBe(true);
  });
});
