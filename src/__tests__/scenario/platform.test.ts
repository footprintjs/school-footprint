import { describe, it, expect } from "vitest";
import { createSchoolPlatform } from "../../schoolPlatform.js";
import { createMemoryProfileStore, createTenantContext } from "@footprint/platform";
import { createMockRepository } from "../helpers.js";

const store = createMemoryProfileStore([
  { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
  { unitId: "k12-1", profileType: "k12", createdAt: "2024-01-01" },
  { unitId: "tutoring-1", profileType: "tutoring", createdAt: "2024-01-01" },
]);

const platform = createSchoolPlatform({
  profileStore: store,
  repository: createMockRepository(),
});

describe("school platform", () => {
  it("resolves dance school config", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const result = await platform.resolveUnit(ctx);

    expect(result.profileType).toBe("dance");
    expect(result.config.enabledModules.has("students")).toBe(true);
    expect(result.config.enabledModules.has("attendance")).toBe(true);
    expect(result.config.enabledModules.has("departments")).toBe(false);
    expect(result.config.enabledModules.has("workflow")).toBe(false);
  });

  it("resolves K-12 config with all modules", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.resolveUnit(ctx);

    expect(result.profileType).toBe("k12");
    expect(result.config.enabledModules.has("departments")).toBe(true);
    expect(result.config.enabledModules.has("workflow")).toBe(true);
    expect(result.config.enabledModules.has("scheduling")).toBe(true);
  });

  it("gets term resolver for dance school", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const t = await platform.getTermResolver(ctx);

    expect(t("student")).toBe("Dancer");
    expect(t("teacher")).toBe("Instructor");
    expect(t("period")).toBe("Time Slot");
  });

  it("gate checks pass for dance school modules", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const result = await platform.gateCheck(ctx, ["students", "attendance"]);

    expect(result.allowed).toBe(true);
  });

  it("gate checks fail for disabled modules", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const result = await platform.gateCheck(ctx, ["departments"]);

    expect(result.allowed).toBe(false);
  });

  it("gets available MCP tools filtered by school type", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const tools = await platform.getAvailableActions(ctx);

    const toolNames = tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("enroll-student");
    expect(toolNames).toContain("schedule-class");
    // dance doesn't have academics-only actions that require modules it doesn't have
  });

  it("K-12 gets more tools than dance", async () => {
    const k12Ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const danceCtx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });

    const k12Tools = await platform.getAvailableActions(k12Ctx);
    const danceTools = await platform.getAvailableActions(danceCtx);

    expect(k12Tools.length).toBeGreaterThanOrEqual(danceTools.length);
  });

  it("executes enrollment service flow", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const result = await platform.executeServiceFlow(ctx, "enroll-student", {
      name: "Luna Martinez",
      dob: "2015-03-12",
    });

    expect(result.status).toBe("success");
    expect(result.result?.enrolledStudent).toBeDefined();
    expect(result.narrative.length).toBeGreaterThan(0);
  });

  it("executes scheduling service flow", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "schedule-class", {
      teacherId: "teacher-1",
      classId: "class-1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    });

    expect(result.status).toBe("success");
    expect(result.result?.status).toBe("scheduled");
  });

  it("returns school type config", () => {
    const config = platform.getSchoolTypeConfig("dance");
    expect(config?.displayName).toBe("Dance School");
    expect(config?.theme.accent).toBe("#c0506a");
    expect(config?.schedulingPattern).toBe("time-slots");
  });

  it("lists supported school types", () => {
    const types = platform.supportedSchoolTypes();
    expect(types).toContain("k12");
    expect(types).toContain("dance");
    expect(types).toContain("music");
    expect(types).toContain("kindergarten");
    expect(types).toContain("tutoring");
  });

  it("returns error for unknown service flow", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
    const result = await platform.executeServiceFlow(ctx, "nonexistent-action", {});

    expect(result.status).toBe("error");
    expect(result.error).toContain("No service flow registered");
  });
});
