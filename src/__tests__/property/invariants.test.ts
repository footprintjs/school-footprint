import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createSchoolPlatform } from "../../schoolPlatform.js";
import { createMemoryProfileStore, createTenantContext } from "@footprint/platform";
import { createMockRepository } from "../helpers.js";
import { schoolTerminology } from "../../terminology/schoolTerms.js";
import { allSchoolProfiles, schoolTypeConfigs } from "../../profiles/index.js";
import { createSchedulingStrategies, createFeeStrategies } from "../../strategies/index.js";
import { createMemoryOverrideStore } from "../../overrides/unitOverrides.js";
import type { SchoolType } from "../../types.js";

const SCHOOL_TYPES = ["k12", "dance", "music", "kindergarten", "tutoring"] as const;
const schoolTypeArb = fc.constantFrom(...SCHOOL_TYPES);

const store = createMemoryProfileStore(
  SCHOOL_TYPES.map((t) => ({ unitId: `${t}-1`, profileType: t, createdAt: "2024-01-01" })),
);
const repo = createMockRepository();
const platform = createSchoolPlatform({ profileStore: store, repository: repo });

describe("property: terminology invariants", () => {
  const termKeys = Object.keys(schoolTerminology);

  it("every term key resolves to a non-empty string for every school type", async () => {
    await fc.assert(
      fc.asyncProperty(schoolTypeArb, fc.constantFrom(...termKeys), async (schoolType, key) => {
        const ctx = createTenantContext({ tenantId: "t1", unitId: `${schoolType}-1` });
        const t = await platform.getTermResolver(ctx);
        const resolved = t(key);
        expect(typeof resolved).toBe("string");
        expect(resolved.length).toBeGreaterThan(0);
      }),
    );
  });

  it("term resolver is deterministic — same input always produces same output", async () => {
    await fc.assert(
      fc.asyncProperty(schoolTypeArb, fc.constantFrom(...termKeys), async (schoolType, key) => {
        const ctx = createTenantContext({ tenantId: "t1", unitId: `${schoolType}-1` });
        const t1 = await platform.getTermResolver(ctx);
        const t2 = await platform.getTermResolver(ctx);
        expect(t1(key)).toBe(t2(key));
      }),
    );
  });
});

describe("property: profile invariants", () => {
  it("every profile has at least 'students' module", () => {
    fc.assert(
      fc.property(schoolTypeArb, (schoolType) => {
        const profile = allSchoolProfiles.find((p) => p.type === schoolType)!;
        expect(profile.modules).toContain("students");
      }),
    );
  });

  it("every profile has at least one role", () => {
    fc.assert(
      fc.property(schoolTypeArb, (schoolType) => {
        const profile = allSchoolProfiles.find((p) => p.type === schoolType)!;
        expect(profile.roles.length).toBeGreaterThan(0);
      }),
    );
  });

  it("every school type config has a valid scheduling pattern", () => {
    const validPatterns = ["fixed-timetable", "time-slots", "appointments", "activity-blocks", "flexible-slots"];
    fc.assert(
      fc.property(schoolTypeArb, (schoolType) => {
        const config = schoolTypeConfigs[schoolType];
        expect(validPatterns).toContain(config.schedulingPattern);
      }),
    );
  });

  it("every school type config has a valid hex accent color", () => {
    fc.assert(
      fc.property(schoolTypeArb, (schoolType) => {
        const config = schoolTypeConfigs[schoolType];
        expect(config.theme.accent).toMatch(/^#[0-9a-f]{6}$/i);
      }),
    );
  });
});

describe("property: adapter factory invariants", () => {
  it("scheduling adapters always produces exactly 5 adapters for any repo", () => {
    const adapters = createSchedulingStrategies(repo);
    expect(adapters).toHaveLength(5);
  });

  it("fee adapters always produces exactly 5 adapters for any repo", () => {
    const adapters = createFeeStrategies(repo);
    expect(adapters).toHaveLength(5);
  });

  it("all scheduling adapter IDs are unique", () => {
    const adapters = createSchedulingStrategies(repo);
    const ids = adapters.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all fee adapter IDs are unique", () => {
    const adapters = createFeeStrategies(repo);
    const ids = adapters.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no conflict → scheduling adapters return scheduled=true for arbitrary teacher IDs", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (teacherId) => {
        const adapters = createSchedulingStrategies(createMockRepository());
        const adapter = adapters.find((a) => a.id === "fixed-timetable")!;
        const result = (await adapter.execute(
          { teacherId, classId: "c1", dayOfWeek: 1, periodId: "P1" },
          { profileType: "k12", unitId: "u1" },
        )) as Record<string, unknown>;

        expect(result.scheduled).toBe(true);
      }),
    );
  });
});

describe("property: gate check invariants", () => {
  it("enrolling students is always allowed (all profiles include 'students')", async () => {
    await fc.assert(
      fc.asyncProperty(schoolTypeArb, async (schoolType) => {
        const ctx = createTenantContext({ tenantId: "t1", unitId: `${schoolType}-1` });
        const result = await platform.gateCheck(ctx, ["students"]);
        expect(result.allowed).toBe(true);
      }),
    );
  });

  it("departments module is only enabled for K-12", async () => {
    await fc.assert(
      fc.asyncProperty(schoolTypeArb, async (schoolType) => {
        const ctx = createTenantContext({ tenantId: "t1", unitId: `${schoolType}-1` });
        const result = await platform.gateCheck(ctx, ["departments"]);
        if (schoolType === "k12") {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(false);
        }
      }),
    );
  });
});

describe("property: override invariants", () => {
  it("per-unit override always takes precedence over school-type default", async () => {
    await fc.assert(
      fc.asyncProperty(
        schoolTypeArb,
        fc.string({ minLength: 1, maxLength: 30 }),
        async (schoolType, customLabel) => {
          const overrideStore = createMemoryOverrideStore({
            [`${schoolType}-1`]: { terminologyOverrides: { student: customLabel } },
          });
          const p = createSchoolPlatform({ profileStore: store, repository: repo, overrideStore });
          const ctx = createTenantContext({ tenantId: "t1", unitId: `${schoolType}-1` });
          const t = await p.getTermResolverWithOverrides(ctx);

          expect(t("student")).toBe(customLabel);
        },
      ),
    );
  });
});

describe("property: service description invariants", () => {
  const actionIds = [
    "enroll-student", "create-attendance-session", "mark-attendance", "schedule-class",
    "check-availability", "create-grade", "create-section", "calculate-fees",
  ];

  it("every registered action has a non-empty description", () => {
    fc.assert(
      fc.property(fc.constantFrom(...actionIds), (actionId) => {
        const desc = platform.describeService(actionId);
        expect(desc).toBeDefined();
        expect(desc!.description.length).toBeGreaterThan(0);
      }),
    );
  });

  it("every registered action has at least one stage", () => {
    fc.assert(
      fc.property(fc.constantFrom(...actionIds), (actionId) => {
        const desc = platform.describeService(actionId);
        expect(desc!.stages.length).toBeGreaterThan(0);
      }),
    );
  });

  it("typed flows have same number of stages as generic flows", () => {
    fc.assert(
      fc.property(fc.constantFrom(...actionIds), schoolTypeArb, (actionId, schoolType) => {
        const generic = platform.describeService(actionId)!;
        const typed = platform.describeService(actionId, schoolType)!;
        expect(typed.stages.length).toBe(generic.stages.length);
      }),
    );
  });
});
