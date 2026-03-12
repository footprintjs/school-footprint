import { describe, it, expect } from "vitest";
import { createSchoolPlatform } from "../../schoolPlatform.js";
import { createMemoryProfileStore, createTenantContext } from "@footprint/platform";
import { createMockRepository } from "../helpers.js";
import { createSchoolServiceRegistry } from "../../flows/schoolServiceComposer.js";
import { createSchedulingAdapters } from "../../adapters/index.js";
import { createMemoryOverrideStore } from "../../overrides/unitOverrides.js";

const SCHOOL_TYPES = ["k12", "dance", "music", "kindergarten", "tutoring"] as const;

const store = createMemoryProfileStore(
  SCHOOL_TYPES.map((t) => ({ unitId: `${t}-1`, profileType: t, createdAt: "2024-01-01" })),
);
const repo = createMockRepository();
const platform = createSchoolPlatform({ profileStore: store, repository: repo });

describe("security: input validation in flows", () => {
  it("enrollment rejects empty name", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "enroll-student", {
      name: "",
      dob: "2010-01-01",
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("name");
  });

  it("enrollment rejects missing name", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "enroll-student", {
      dob: "2010-01-01",
    });

    expect(result.status).toBe("error");
  });

  it("create-grade rejects missing name", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "create-grade", {});

    expect(result.status).toBe("error");
    expect(result.error).toContain("name");
  });

  it("create-section rejects missing gradeId", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "create-section", {
      name: "Section A",
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("ID");
  });

  it("check-availability rejects missing slot", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "check-availability", {
      teacherId: "t1",
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("required");
  });

  it("calculate-fees rejects missing studentId", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "calculate-fees", {});

    expect(result.status).toBe("error");
    expect(result.error).toContain("ID");
  });

  it("attendance rejects missing classId", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "create-attendance-session", {
      date: "2025-03-12",
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Class ID");
  });

  it("scheduling rejects missing teacherId", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "schedule-class", {
      classId: "c1",
      slot: { dayOfWeek: 1, periodId: "P1" },
    });

    expect(result.status).toBe("error");
  });
});

describe("security: injection-like inputs don't break flows", () => {
  const maliciousStrings = [
    "<script>alert('xss')</script>",
    "'; DROP TABLE students; --",
    "{{constructor.constructor('return this')()}}",
    "../../../etc/passwd",
    "${7*7}",
    "\\x00\\x01\\x02",
    "a".repeat(10000),
  ];

  it("enrollment handles malicious name strings without crashing", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });

    for (const name of maliciousStrings) {
      const result = await platform.executeServiceFlow(ctx, "enroll-student", {
        name,
        dob: "2010-01-01",
      });

      // Should succeed (mock repo) — the point is it doesn't crash or throw unexpectedly
      expect(result.status).toBe("success");
      expect((result.result as any).enrolledStudent.name).toBe(name);
    }
  });

  it("create-grade handles malicious name strings without crashing", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });

    for (const name of maliciousStrings) {
      const result = await platform.executeServiceFlow(ctx, "create-grade", { name });

      expect(result.status).toBe("success");
      expect((result.result as any).createdGrade.name).toBe(name);
    }
  });
});

describe("security: boundary checks on action routing", () => {
  it("unknown action ID returns error, not crash", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "drop-database", {});

    expect(result.status).toBe("error");
    expect(result.error).toContain("No service flow registered");
  });

  it("empty action ID returns error", async () => {
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    const result = await platform.executeServiceFlow(ctx, "", {});

    expect(result.status).toBe("error");
  });

  it("service registry handles unknown action gracefully", async () => {
    const registry = createSchoolServiceRegistry(repo);
    const result = await registry.executeService(
      "nonexistent",
      {},
      { schoolType: "k12", unitId: "k12-1", repository: repo },
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("No service flow registered");
  });
});

describe("security: override store isolation", () => {
  it("override values cannot leak between units", async () => {
    const overrideStore = createMemoryOverrideStore({
      "k12-1": { terminologyOverrides: { student: "SECRET_K12_LABEL" } },
      "dance-1": { terminologyOverrides: { student: "SECRET_DANCE_LABEL" } },
    });
    const p = createSchoolPlatform({ profileStore: store, repository: repo, overrideStore });

    const k12T = await p.getTermResolverWithOverrides(
      createTenantContext({ tenantId: "t1", unitId: "k12-1" }),
    );
    const danceT = await p.getTermResolverWithOverrides(
      createTenantContext({ tenantId: "t1", unitId: "dance-1" }),
    );
    const musicT = await p.getTermResolverWithOverrides(
      createTenantContext({ tenantId: "t1", unitId: "music-1" }),
    );

    expect(k12T("student")).toBe("SECRET_K12_LABEL");
    expect(danceT("student")).toBe("SECRET_DANCE_LABEL");
    // Music should NOT see either override
    expect(musicT("student")).not.toContain("SECRET");
  });

  it("theme overrides don't bleed into terminology", async () => {
    const overrideStore = createMemoryOverrideStore({
      "k12-1": {
        themeOverrides: { accent: "#ff0000" },
        terminologyOverrides: { student: "Learner" },
      },
    });
    const p = createSchoolPlatform({ profileStore: store, repository: repo, overrideStore });

    const overrides = await p.getUnitOverrides("k12-1");
    expect(overrides!.themeOverrides!.accent).toBe("#ff0000");
    expect(overrides!.terminologyOverrides!.student).toBe("Learner");

    // Theme and terminology are separate concerns
    const t = await p.getTermResolverWithOverrides(
      createTenantContext({ tenantId: "t1", unitId: "k12-1" }),
    );
    expect(t("student")).toBe("Learner");
  });
});

describe("security: adapter execution boundaries", () => {
  it("scheduling adapter does not expose internal repo state", async () => {
    const adapters = createSchedulingAdapters(repo);
    const adapter = adapters.find((a) => a.id === "fixed-timetable")!;

    const result = (await adapter.execute(
      { teacherId: "t1", classId: "c1", dayOfWeek: 1, periodId: "P1" },
      { profileType: "k12", unitId: "u1" },
    )) as Record<string, unknown>;

    // Result should only contain expected fields
    const keys = Object.keys(result);
    expect(keys).toContain("scheduled");
    expect(keys).toContain("pattern");
    expect(keys).toContain("entry");
    // Should not contain internal repo methods or raw data
    expect(keys).not.toContain("repository");
    expect(keys).not.toContain("repo");
  });
});
