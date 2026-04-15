import { describe, it, expect } from "vitest";
import { createSchedulingStrategies } from "../../strategies/schedulingStrategies.js";
import { createFeeStrategies } from "../../strategies/feeStrategies.js";
import { createMockRepository, createConflictingRepository } from "../helpers.js";

describe("scheduling adapter factories", () => {
  const repo = createMockRepository();
  const adapters = createSchedulingStrategies(repo);

  it("creates 5 scheduling adapters", () => {
    expect(adapters).toHaveLength(5);
  });

  // --- fixed-timetable (K-12) ---
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
    const conflictAdapters = createSchedulingStrategies(createConflictingRepository());
    const adapter = conflictAdapters.find((a) => a.id === "fixed-timetable")!;
    const result = (await adapter.execute(
      { teacherId: "t1", classId: "c1", dayOfWeek: 1, periodId: "P1" },
      { profileType: "k12", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(false);
    expect((result.conflicts as unknown[]).length).toBe(1);
  });

  // --- time-slots (Dance) ---
  it("time-slots creates entry when no conflicts", async () => {
    const adapter = adapters.find((a) => a.id === "time-slots")!;
    const result = (await adapter.execute(
      { teacherId: "t1", classId: "c1", startTime: "10:00", duration: 60, date: "2025-03-12" },
      { profileType: "dance", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(true);
    expect(result.pattern).toBe("time-slots");
  });

  it("time-slots returns conflicts when teacher busy", async () => {
    const conflictAdapters = createSchedulingStrategies(createConflictingRepository());
    const adapter = conflictAdapters.find((a) => a.id === "time-slots")!;
    const result = (await adapter.execute(
      { teacherId: "t1", classId: "c1", startTime: "10:00", duration: 60, date: "2025-03-12" },
      { profileType: "dance", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(false);
    expect((result.conflicts as unknown[]).length).toBe(1);
  });

  // --- appointments (Music) ---
  it("appointments creates entry when no conflicts", async () => {
    const adapter = adapters.find((a) => a.id === "appointments")!;
    const result = (await adapter.execute(
      { teacherId: "t1", studentId: "s1", startTime: "14:00", duration: 30, instrument: "piano" },
      { profileType: "music", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(true);
    expect(result.pattern).toBe("appointments");
  });

  it("appointments returns conflicts when teacher busy", async () => {
    const conflictAdapters = createSchedulingStrategies(createConflictingRepository());
    const adapter = conflictAdapters.find((a) => a.id === "appointments")!;
    const result = (await adapter.execute(
      { teacherId: "t1", studentId: "s1", startTime: "14:00", duration: 30, instrument: "violin" },
      { profileType: "music", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(false);
    expect((result.conflicts as unknown[]).length).toBe(1);
  });

  // --- activity-blocks (Kindergarten) ---
  it("activity-blocks creates entry when no conflicts", async () => {
    const adapter = adapters.find((a) => a.id === "activity-blocks")!;
    const result = (await adapter.execute(
      { teacherId: "t1", ageGroupId: "ag1", activityId: "art", blockIndex: 2, dayOfWeek: 3 },
      { profileType: "kindergarten", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(true);
    expect(result.pattern).toBe("activity-blocks");
  });

  it("activity-blocks returns conflicts when teacher busy", async () => {
    const conflictAdapters = createSchedulingStrategies(createConflictingRepository());
    const adapter = conflictAdapters.find((a) => a.id === "activity-blocks")!;
    const result = (await adapter.execute(
      { teacherId: "t1", ageGroupId: "ag1", activityId: "art", blockIndex: 2, dayOfWeek: 3 },
      { profileType: "kindergarten", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(false);
    expect((result.conflicts as unknown[]).length).toBe(1);
  });

  // --- flexible-slots (Tutoring) ---
  it("flexible-slots creates entry when no conflicts", async () => {
    const adapter = adapters.find((a) => a.id === "flexible-slots")!;
    const result = (await adapter.execute(
      { tutorId: "t1", studentId: "s1", requestedTime: "15:00", duration: 45, subject: "math" },
      { profileType: "tutoring", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(true);
    expect(result.pattern).toBe("flexible-slots");
  });

  it("flexible-slots returns conflicts when tutor busy", async () => {
    const conflictAdapters = createSchedulingStrategies(createConflictingRepository());
    const adapter = conflictAdapters.find((a) => a.id === "flexible-slots")!;
    const result = (await adapter.execute(
      { tutorId: "t1", studentId: "s1", requestedTime: "15:00", duration: 45, subject: "math" },
      { profileType: "tutoring", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.scheduled).toBe(false);
    expect((result.conflicts as unknown[]).length).toBe(1);
  });
});

describe("fee adapter factories", () => {
  const repo = createMockRepository();
  const adapters = createFeeStrategies(repo);

  it("creates 5 fee adapters", () => {
    expect(adapters).toHaveLength(5);
  });

  it("per-term-fees calculates via repo", async () => {
    const adapter = adapters.find((a) => a.id === "per-term-fees")!;
    const result = (await adapter.execute(
      { studentId: "s1", termId: "t1", gradeId: "g1" },
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

  it("per-lesson-fees calculates via repo", async () => {
    const adapter = adapters.find((a) => a.id === "per-lesson-fees")!;
    const result = (await adapter.execute(
      { studentId: "s1", lessonCount: 4, instrument: "violin" },
      { profileType: "music", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.model).toBe("per-lesson");
    expect(result.calculated).toBe(true);
  });

  it("per-month-fees calculates via repo", async () => {
    const adapter = adapters.find((a) => a.id === "per-month-fees")!;
    const result = (await adapter.execute(
      { studentId: "s1", monthId: "2025-03" },
      { profileType: "kindergarten", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.model).toBe("per-month");
    expect(result.calculated).toBe(true);
  });

  it("per-session-fees calculates via repo", async () => {
    const adapter = adapters.find((a) => a.id === "per-session-fees")!;
    const result = (await adapter.execute(
      { studentId: "s1", sessionCount: 8 },
      { profileType: "tutoring", unitId: "u1" },
    )) as Record<string, unknown>;

    expect(result.model).toBe("per-session");
    expect(result.calculated).toBe(true);
  });
});
