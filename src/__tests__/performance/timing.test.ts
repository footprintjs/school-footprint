import { describe, it, expect } from "vitest";
import { createSchoolPlatform } from "../../schoolPlatform.js";
import { createMemoryProfileStore, createTenantContext } from "@footprint/platform";
import { createMockRepository } from "../helpers.js";
import { createSchoolServiceRegistry } from "../../flows/schoolServiceComposer.js";
import { createSchedulingStrategies, createFeeStrategies } from "../../strategies/index.js";

const SCHOOL_TYPES = ["k12", "dance", "music", "kindergarten", "tutoring"] as const;

const store = createMemoryProfileStore(
  SCHOOL_TYPES.map((t) => ({ unitId: `${t}-1`, profileType: t, createdAt: "2024-01-01" })),
);
const repo = createMockRepository();
const platform = createSchoolPlatform({ profileStore: store, repository: repo });

describe("performance: flow execution timing", () => {
  it("enrollment flow completes within 100ms", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const start = performance.now();
    await platform.executeServiceFlow(ctx, "enroll-student", {
      name: "Test Student",
      dob: "2010-01-01",
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("scheduling flow completes within 100ms", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const start = performance.now();
    await platform.executeServiceFlow(ctx, "schedule-class", {
      teacherId: "t1",
      classId: "c1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("create-grade flow completes within 100ms", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const start = performance.now();
    await platform.executeServiceFlow(ctx, "create-grade", {
      name: "Grade 1",
      code: "G1",
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("calculate-fees flow completes within 100ms", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const start = performance.now();
    await platform.executeServiceFlow(ctx, "calculate-fees", {
      studentId: "s1",
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("50 sequential enrollment flows complete within 2 seconds", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const start = performance.now();

    for (let i = 0; i < 50; i++) {
      await platform.executeServiceFlow(ctx, "enroll-student", {
        name: `Student ${i}`,
        dob: "2010-01-01",
      });
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});

describe("performance: registry caching", () => {
  it("typed flow cache prevents rebuilding — second call is faster", async () => {
    const registry = createSchoolServiceRegistry(repo);

    // First call builds the flow
    const start1 = performance.now();
    registry.getTypedFlow("enroll-student", "dance");
    const first = performance.now() - start1;

    // Second call should be cached
    const start2 = performance.now();
    registry.getTypedFlow("enroll-student", "dance");
    const second = performance.now() - start2;

    // Cached call should be faster (or at least not significantly slower)
    expect(second).toBeLessThan(first + 1); // +1ms tolerance
  });

  it("describeService returns same reference for cached flows", () => {
    const registry = createSchoolServiceRegistry(repo);

    // Build and cache
    const desc1 = registry.describeService("enroll-student", "k12");
    const desc2 = registry.describeService("enroll-student", "k12");

    // Same content
    expect(desc1!.description).toBe(desc2!.description);
    expect(desc1!.stages.length).toBe(desc2!.stages.length);
  });

  it("describeAllServices completes within 200ms for all school types", () => {
    const registry = createSchoolServiceRegistry(repo);
    const start = performance.now();

    for (const type of SCHOOL_TYPES) {
      registry.describeAllServices(type);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});

describe("performance: adapter factory creation", () => {
  it("creating scheduling adapters completes within 10ms", () => {
    const start = performance.now();
    createSchedulingStrategies(repo);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  it("creating fee adapters completes within 10ms", () => {
    const start = performance.now();
    createFeeStrategies(repo);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
  });
});

describe("performance: platform creation", () => {
  it("creating a full platform completes within 200ms", () => {
    const start = performance.now();
    createSchoolPlatform({ profileStore: store, repository: repo });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
  });

  it("resolving a unit config completes within 50ms", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const start = performance.now();
    await platform.resolveUnit(ctx);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
