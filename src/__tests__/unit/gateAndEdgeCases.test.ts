import { describe, it, expect } from "vitest";
import { createSchoolPlatform } from "../../schoolPlatform.js";
import { createMemoryProfileStore, createTenantContext } from "@footprint/platform";
import { createMockRepository } from "../helpers.js";
import { createMemoryOverrideStore } from "../../overrides/unitOverrides.js";

const store = createMemoryProfileStore([
  { unitId: "k12-1", profileType: "k12", createdAt: "2024-01-01" },
  { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
  { unitId: "music-1", profileType: "music", createdAt: "2024-01-01" },
  { unitId: "kinder-1", profileType: "kindergarten", createdAt: "2024-01-01" },
  { unitId: "tutor-1", profileType: "tutoring", createdAt: "2024-01-01" },
]);

const repo = createMockRepository();

describe("gate check denials for school-type specific actions", () => {
  const platform = createSchoolPlatform({ profileStore: store, repository: repo });

  // Note: create-grade requires "academics", but tutoring has it transitively
  // (attendance → academics). So we test departments/workflow denial instead.

  // departments is only on K-12 — dance should be denied
  it("denies gate check for departments on dance school", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const result = await platform.gateCheck(ctx, ["departments"]);

    expect(result.allowed).toBe(false);
  });

  // workflow is only on K-12 — tutoring should be denied
  it("denies gate check for workflow on tutoring school", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "tutor-1" });
    const result = await platform.gateCheck(ctx, ["workflow"]);

    expect(result.allowed).toBe(false);
  });

  // schedule-class requires "scheduling" — kindergarten doesn't have it
  it("denies schedule-class for kindergarten (no scheduling module)", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "kinder-1" });
    const result = await platform.executeServiceFlow(ctx, "schedule-class", {
      teacherId: "t1",
      classId: "c1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("scheduling");
  });

  // check-availability requires "scheduling" — tutoring doesn't have it
  it("denies check-availability for tutoring (no scheduling module)", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "tutor-1" });
    const result = await platform.executeServiceFlow(ctx, "check-availability", {
      teacherId: "t1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("scheduling");
  });

  // K-12 has all modules — everything should be allowed
  it("allows create-grade for K-12 school", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "create-grade", {
      name: "Grade 5",
      code: "G5",
    });

    expect(result.status).toBe("success");
  });

  it("allows schedule-class for K-12 school", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "schedule-class", {
      teacherId: "t1",
      classId: "c1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    });

    expect(result.status).toBe("success");
  });

  // Enrollment requires "students" — all school types have it
  it("allows enroll-student for all school types", async () => {
    for (const unitId of ["k12-1", "dance-1", "music-1", "kinder-1", "tutor-1"]) {
      const ctx = createTenantContext({ tenantId: "t1", unitId });
      const result = await platform.executeServiceFlow(ctx, "enroll-student", {
        name: "Test Student",
        dob: "2010-01-01",
      });

      expect(result.status).toBe("success");
    }
  });
});

describe("per-unit override edge cases", () => {
  it("empty overrides store returns undefined for all units", async () => {
    const emptyStore = createMemoryOverrideStore({});
    const platform = createSchoolPlatform({
      profileStore: store,
      repository: repo,
      overrideStore: emptyStore,
    });

    const overrides = await platform.getUnitOverrides("dance-1");
    expect(overrides).toBeUndefined();
  });

  it("term resolver works with empty override store (falls back to school type)", async () => {
    const emptyStore = createMemoryOverrideStore({});
    const platform = createSchoolPlatform({
      profileStore: store,
      repository: repo,
      overrideStore: emptyStore,
    });

    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const t = await platform.getTermResolverWithOverrides(ctx);

    expect(t("student")).toBe("Dancer");
    expect(t("teacher")).toBe("Instructor");
  });

  it("term resolver without override store configured falls back to school type", async () => {
    const platform = createSchoolPlatform({ profileStore: store, repository: repo });
    const ctx = createTenantContext({ tenantId: "t1", unitId: "music-1" });
    const t = await platform.getTermResolverWithOverrides(ctx);

    expect(t("student")).toBe("Student");
    expect(t("teacher")).toBe("Instructor");
  });

  it("override only affects specified unit, not others", async () => {
    const overrideStore = createMemoryOverrideStore({
      "dance-1": { terminologyOverrides: { student: "Artist" } },
    });
    const platform = createSchoolPlatform({
      profileStore: store,
      repository: repo,
      overrideStore,
    });

    const danceT = await platform.getTermResolverWithOverrides(
      createTenantContext({ tenantId: "t1", unitId: "dance-1" }),
    );
    const musicT = await platform.getTermResolverWithOverrides(
      createTenantContext({ tenantId: "t1", unitId: "music-1" }),
    );

    expect(danceT("student")).toBe("Artist"); // overridden
    expect(musicT("student")).toBe("Student"); // untouched
  });

  it("unknown terminology key returns the key itself", async () => {
    const platform = createSchoolPlatform({ profileStore: store, repository: repo });
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const t = await platform.getTermResolverWithOverrides(ctx);

    expect(t("nonexistent_key")).toBe("nonexistent_key");
  });
});

describe("describeService edge cases", () => {
  const platform = createSchoolPlatform({ profileStore: store, repository: repo });

  it("returns undefined for unknown action ID", () => {
    const desc = platform.describeService("totally-fake-action");
    expect(desc).toBeUndefined();
  });

  it("returns undefined for unknown action with school type", () => {
    const desc = platform.describeService("totally-fake-action", "k12");
    expect(desc).toBeUndefined();
  });

  it("describe all services returns at least 8 entries", () => {
    const all = platform.describeAllServices();
    expect(all.length).toBeGreaterThanOrEqual(8);
  });

  it("describe service with different school types produces different descriptions", () => {
    const k12Desc = platform.describeService("enroll-student", "k12")!;
    const danceDesc = platform.describeService("enroll-student", "dance")!;

    const k12Text = k12Desc.stages.map((s) => s.description).join(" ");
    const danceText = danceDesc.stages.map((s) => s.description).join(" ");

    // K-12 uses "Student", dance uses "Dancer"
    expect(k12Text).toContain("Student");
    expect(danceText).toContain("Dancer");
    expect(k12Text).not.toEqual(danceText);
  });
});

describe("school type config edge cases", () => {
  const platform = createSchoolPlatform({ profileStore: store, repository: repo });

  it("returns undefined for unknown school type config", () => {
    const config = platform.getSchoolTypeConfig("nonexistent" as any);
    expect(config).toBeUndefined();
  });

  it("all 5 school types have valid configs", () => {
    for (const type of ["k12", "dance", "music", "kindergarten", "tutoring"] as const) {
      const config = platform.getSchoolTypeConfig(type);
      expect(config).toBeDefined();
      expect(config!.type).toBe(type);
      expect(config!.theme.accent).toBeTruthy();
      expect(config!.schedulingPattern).toBeTruthy();
    }
  });
});
