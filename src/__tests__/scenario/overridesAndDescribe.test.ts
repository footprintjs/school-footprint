import { describe, it, expect } from "vitest";
import { createSchoolPlatform } from "../../schoolPlatform.js";
import { createMemoryProfileStore, createTenantContext } from "@footprint/platform";
import { createMockRepository } from "../helpers.js";
import { createMemoryOverrideStore } from "../../overrides/unitOverrides.js";
import { createSchoolServiceRegistry } from "../../flows/schoolServiceComposer.js";

const store = createMemoryProfileStore([
  { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
  { unitId: "k12-1", profileType: "k12", createdAt: "2024-01-01" },
]);

const repo = createMockRepository();

describe("per-unit overrides", () => {
  const overrideStore = createMemoryOverrideStore({
    "dance-1": {
      terminologyOverrides: { student: "Performer", teacher: "Coach" },
      themeOverrides: { accent: "#ff0000" },
    },
  });

  const platform = createSchoolPlatform({
    profileStore: store,
    repository: repo,
    overrideStore,
  });

  it("returns unit overrides", async () => {
    const overrides = await platform.getUnitOverrides("dance-1");
    expect(overrides).toBeDefined();
    expect(overrides!.terminologyOverrides!.student).toBe("Performer");
  });

  it("returns undefined for units without overrides", async () => {
    const overrides = await platform.getUnitOverrides("k12-1");
    expect(overrides).toBeUndefined();
  });

  it("term resolver respects per-unit overrides", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const t = await platform.getTermResolverWithOverrides(ctx);

    expect(t("student")).toBe("Performer"); // overridden
    expect(t("teacher")).toBe("Coach"); // overridden
    expect(t("grade")).toBe("Level"); // falls back to school type default
    expect(t("period")).toBe("Time Slot"); // falls back to school type default
  });

  it("term resolver without overrides uses school type defaults", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const t = await platform.getTermResolverWithOverrides(ctx);

    expect(t("student")).toBe("Student");
    expect(t("teacher")).toBe("Teacher");
  });
});

describe("describeService API", () => {
  it("describes a service flow", () => {
    const platform = createSchoolPlatform({ profileStore: store, repository: repo });
    const desc = platform.describeService("enroll-student");

    expect(desc).toBeDefined();
    expect(desc!.actionId).toBe("enroll-student");
    expect(desc!.description).toBeTruthy();
    expect(desc!.stages.length).toBeGreaterThan(0);
  });

  it("describes service with school-type terminology", () => {
    const platform = createSchoolPlatform({ profileStore: store, repository: repo });
    const desc = platform.describeService("enroll-student", "dance");

    expect(desc).toBeDefined();
    // Dance terminology should be in stage descriptions
    const allDescs = desc!.stages.map((s) => s.description).join(" ");
    expect(allDescs).toContain("Dancer");
  });

  it("describes all services", () => {
    const platform = createSchoolPlatform({ profileStore: store, repository: repo });
    const all = platform.describeAllServices();

    expect(all.length).toBeGreaterThanOrEqual(8);
    const ids = all.map((d) => d.actionId);
    expect(ids).toContain("enroll-student");
    expect(ids).toContain("schedule-class");
    expect(ids).toContain("create-grade");
    expect(ids).toContain("calculate-fees");
  });

  it("returns undefined for unknown service", () => {
    const platform = createSchoolPlatform({ profileStore: store, repository: repo });
    const desc = platform.describeService("nonexistent");
    expect(desc).toBeUndefined();
  });
});

describe("service registry — new flows", () => {
  const registry = createSchoolServiceRegistry(repo);

  it("registers all 8 actions", () => {
    const ids = registry.serviceIds();
    expect(ids).toContain("enroll-student");
    expect(ids).toContain("create-attendance-session");
    expect(ids).toContain("mark-attendance");
    expect(ids).toContain("schedule-class");
    expect(ids).toContain("check-availability");
    expect(ids).toContain("create-grade");
    expect(ids).toContain("create-section");
    expect(ids).toContain("calculate-fees");
  });

  it("executes create-grade flow", async () => {
    const result = await registry.executeService(
      "create-grade",
      { name: "Grade 5", code: "G5" },
      { schoolType: "k12", unitId: "k12-1", repository: repo },
    );

    expect(result.status).toBe("success");
    expect(result.result?.createdGrade).toBeDefined();
  });

  it("executes calculate-fees flow", async () => {
    const result = await registry.executeService(
      "calculate-fees",
      { studentId: "s1" },
      { schoolType: "dance", unitId: "dance-1", repository: repo },
    );

    expect(result.status).toBe("success");
    expect(result.result?.feeCalculation).toBeDefined();
  });

  it("executes check-availability flow", async () => {
    const result = await registry.executeService(
      "check-availability",
      { teacherId: "t1", slot: { dayOfWeek: 1, periodId: "P1" } },
      { schoolType: "k12", unitId: "k12-1", repository: repo },
    );

    expect(result.status).toBe("success");
    expect(result.result?.available).toBe(true);
  });

  it("uses typed flow with dance terminology in stage descriptions", () => {
    const desc = registry.describeService("enroll-student", "dance");
    expect(desc).toBeDefined();
    // Stage descriptions should contain dance terminology
    const allDescs = desc!.stages.map((s) => s.description).join(" ");
    expect(allDescs).toContain("Dancer");
  });
});

describe("unified profile metadata", () => {
  it("schoolTypeConfigs derived from profile meta", () => {
    const platform = createSchoolPlatform({ profileStore: store, repository: repo });
    const config = platform.getSchoolTypeConfig("dance");

    expect(config).toBeDefined();
    expect(config!.theme.accent).toBe("#c0506a");
    expect(config!.schedulingPattern).toBe("time-slots");
    expect(config!.services.workflow).toBe(false);
    expect(config!.moduleFlags.departments).toBe(false);
  });
});
