import { describe, it, expect } from "vitest";
import {
  isValidSchoolType,
  getSchoolTypeConfig,
  getAllSchoolTypeConfigs,
  resolveSchoolTerminology,
  getAllSchoolProfiles,
  createConfigPlatform,
} from "../../helpers.js";
import { createTenantContext } from "@footprint/platform";

describe("security: injection resistance", () => {
  const INJECTIONS = [
    "'; DROP TABLE schools; --",
    "<script>alert('xss')</script>",
    "../../../etc/passwd",
    "k12\0dance",
    "{{constructor.constructor('return this')()}}",
    "${7*7}",
    "UNION SELECT * FROM users--",
  ];

  it("isValidSchoolType rejects all injection strings", () => {
    for (const input of INJECTIONS) {
      expect(isValidSchoolType(input)).toBe(false);
    }
  });

  it("getSchoolTypeConfig returns undefined for injection strings", () => {
    for (const input of INJECTIONS) {
      expect(getSchoolTypeConfig(input)).toBeUndefined();
    }
  });

  it("resolveSchoolTerminology falls back safely for injection inputs", () => {
    const k12Terms = resolveSchoolTerminology("k12");
    for (const input of INJECTIONS) {
      expect(resolveSchoolTerminology(input)).toEqual(k12Terms);
    }
  });
});

describe("security: prototype pollution protection", () => {
  const PROTO_KEYS = ["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf", "__defineGetter__"];

  it("getSchoolTypeConfig rejects prototype keys", () => {
    for (const key of PROTO_KEYS) {
      expect(getSchoolTypeConfig(key)).toBeUndefined();
    }
  });

  it("resolveSchoolTerminology falls back for prototype keys", () => {
    const k12Terms = resolveSchoolTerminology("k12");
    for (const key of PROTO_KEYS) {
      expect(resolveSchoolTerminology(key)).toEqual(k12Terms);
    }
  });
});

describe("security: immutability", () => {
  it("getAllSchoolTypeConfigs returns independent copies", () => {
    const configs1 = getAllSchoolTypeConfigs();
    const original = configs1.k12.displayName;
    (configs1.k12 as any).displayName = "HACKED";
    expect(getAllSchoolTypeConfigs().k12.displayName).toBe(original);
  });

  it("getSchoolTypeConfig returns independent copies", () => {
    const config1 = getSchoolTypeConfig("k12")!;
    const original = config1.displayName;
    (config1 as any).displayName = "HACKED";
    expect(getSchoolTypeConfig("k12")!.displayName).toBe(original);
  });

  it("theme objects are independent copies", () => {
    const config1 = getSchoolTypeConfig("k12")!;
    const originalAccent = config1.theme.accent;
    (config1.theme as any).accent = "#000";
    expect(getSchoolTypeConfig("k12")!.theme.accent).toBe(originalAccent);
  });

  it("resolveSchoolTerminology returns independent copies", () => {
    const terms1 = resolveSchoolTerminology("k12");
    const original = terms1.student.singular;
    (terms1.student as any).singular = "HACKED";
    expect(resolveSchoolTerminology("k12").student.singular).toBe(original);
  });

  it("getAllSchoolProfiles returns independent copies", () => {
    const profiles1 = getAllSchoolProfiles();
    const original = profiles1[0].displayName;
    (profiles1[0] as any).displayName = "HACKED";
    expect(getAllSchoolProfiles()[0].displayName).toBe(original);
  });
});

describe("security: gate enforcement via helpers", () => {
  it("non-K-12 types cannot access departments", async () => {
    for (const type of ["dance", "music", "kindergarten", "tutoring"] as const) {
      const platform = createConfigPlatform(type, `${type}-1`);
      const ctx = createTenantContext({ tenantId: "t1", unitId: `${type}-1` });
      const result = await platform.gateCheck(ctx, ["departments"]);
      expect(result.allowed).toBe(false);
    }
  });

  it("kindergarten and tutoring cannot access scheduling", async () => {
    for (const type of ["kindergarten", "tutoring"] as const) {
      const platform = createConfigPlatform(type, `${type}-1`);
      const ctx = createTenantContext({ tenantId: "t1", unitId: `${type}-1` });
      const result = await platform.gateCheck(ctx, ["scheduling"]);
      expect(result.allowed).toBe(false);
    }
  });

  it("k12 can access all modules", async () => {
    const platform = createConfigPlatform("k12", "k12-1");
    const ctx = createTenantContext({ tenantId: "t1", unitId: "k12-1" });
    for (const mod of ["students", "scheduling", "academics", "departments"]) {
      const result = await platform.gateCheck(ctx, [mod]);
      expect(result.allowed).toBe(true);
    }
  });
});
