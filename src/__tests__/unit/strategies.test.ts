import { describe, it, expect } from "vitest";
import { createAdapterRegistry, createServiceBridge } from "@footprint/adapters";
import { allSchoolCapabilities } from "../../capabilities/index.js";
import { allSchedulingStrategies, allFeeStrategies, schoolStrategyMappings } from "../../strategies/index.js";

describe("school adapters", () => {
  const registry = createAdapterRegistry({
    capabilities: [...allSchoolCapabilities],
    adapters: [...allSchedulingStrategies, ...allFeeStrategies],
    mappings: [...schoolStrategyMappings],
  });

  it("resolves fixed-timetable adapter for K-12 scheduling", () => {
    const adapter = registry.resolve("schedule-class", "k12");
    expect(adapter?.id).toBe("fixed-timetable");
  });

  it("resolves time-slots adapter for dance scheduling", () => {
    const adapter = registry.resolve("schedule-class", "dance");
    expect(adapter?.id).toBe("time-slots");
  });

  it("resolves appointments adapter for music scheduling", () => {
    const adapter = registry.resolve("schedule-class", "music");
    expect(adapter?.id).toBe("appointments");
  });

  it("resolves per-term fees for K-12", () => {
    const adapter = registry.resolve("calculate-fees", "k12");
    expect(adapter?.id).toBe("per-term-fees");
  });

  it("resolves per-class fees for dance", () => {
    const adapter = registry.resolve("calculate-fees", "dance");
    expect(adapter?.id).toBe("per-class-fees");
  });

  it("resolves per-lesson fees for music", () => {
    const adapter = registry.resolve("calculate-fees", "music");
    expect(adapter?.id).toBe("per-lesson-fees");
  });

  it("service bridge routes scheduling to correct adapter", async () => {
    const bridge = createServiceBridge(registry);
    const result = await bridge.execute(
      "schedule-class",
      { teacherId: "t1", classId: "c1", dayOfWeek: 1, periodId: "P1" },
      { profileType: "k12", unitId: "school-1" },
    );
    expect(result.status).toBe("success");
    expect((result.result as Record<string, unknown>).pattern).toBe("fixed-timetable");
  });

  it("service bridge routes fees to correct adapter", async () => {
    const bridge = createServiceBridge(registry);
    const result = await bridge.execute(
      "calculate-fees",
      { studentId: "s1", classCount: 10 },
      { profileType: "dance", unitId: "studio-1" },
    );
    expect(result.status).toBe("success");
    expect((result.result as Record<string, unknown>).model).toBe("per-class");
  });

  it("5 scheduling adapters cover all school types", () => {
    expect(allSchedulingStrategies).toHaveLength(5);
  });

  it("5 fee adapters cover all school types", () => {
    expect(allFeeStrategies).toHaveLength(5);
  });
});
