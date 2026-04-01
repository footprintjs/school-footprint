import { describe, it, expect } from "vitest";
import {
  SCHOOL_TYPES_LIST,
  isValidSchoolType,
  getSchoolTypeConfig,
  getAllSchoolProfiles,
  resolveSchoolTerminology,
  createConfigPlatform,
  createPlatformForRequest,
  checkFlowError,
  createStubRepository,
} from "../../helpers.js";
import { createTenantContext } from "@footprint/platform";
import type { SchoolServiceResult } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";

describe("scenario: config discovery → terminology → gate check", () => {
  it("full discovery flow: list types → pick → config → terms → gates", async () => {
    // Step 1: List all valid types
    const types = SCHOOL_TYPES_LIST.filter(isValidSchoolType);
    expect(types).toHaveLength(5);

    // Step 2: Pick a type and get its config
    const picked = "dance";
    const config = getSchoolTypeConfig(picked);
    expect(config).toBeDefined();
    expect(config!.displayName).toBe("Dance School");

    // Step 3: Get terminology
    const terms = resolveSchoolTerminology(picked);
    expect(terms.student.singular).toBe("Dancer");

    // Step 4: Create platform and run gate check
    const platform = createConfigPlatform(picked, "dance-1");
    const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });

    const studentsGate = await platform.gateCheck(ctx, ["students"]);
    expect(studentsGate.allowed).toBe(true);

    const deptsGate = await platform.gateCheck(ctx, ["departments"]);
    expect(deptsGate.allowed).toBe(false);
  });
});

describe("scenario: platform-per-request lifecycle", () => {
  it("creates platform, executes flow, checks error", async () => {
    const repo = createMockRepository();
    const { platform, ctx } = createPlatformForRequest({
      schoolType: "k12",
      scope: { tenantId: 1, campusId: 2, schoolId: 3 },
      repository: repo,
      userId: 42,
    });

    const result = await platform.executeServiceFlow(ctx, "enroll-student", {
      name: "John Doe",
      dob: "2010-01-01",
    });

    const error = checkFlowError(result, "Enrollment");
    expect(error).toBeNull();
    expect(result.status).toBe("success");
  });

  it("checkFlowError captures flow errors", async () => {
    const { platform, ctx } = createPlatformForRequest({
      schoolType: "k12",
      scope: { tenantId: 1, campusId: 1, schoolId: 1 },
      repository: createStubRepository(), // stub will throw in flow
    });

    const result = await platform.executeServiceFlow(ctx, "enroll-student", {
      name: "John Doe",
    });

    const error = checkFlowError(result, "Enrollment");
    expect(error).not.toBeNull();
    expect(error!.title).toBe("Enrollment Failed");
    expect(error!.status).toBe(400);
  });
});

describe("scenario: profiles match configs", () => {
  it("every profile type has a matching config", () => {
    const profiles = getAllSchoolProfiles();
    for (const profile of profiles) {
      const config = getSchoolTypeConfig(profile.type);
      expect(config).toBeDefined();
      expect(config!.displayName).toBe(profile.displayName);
    }
  });
});

describe("scenario: terminology consistency across types", () => {
  it("all types produce the same set of term keys", () => {
    const k12Keys = Object.keys(resolveSchoolTerminology("k12")).sort();
    for (const type of SCHOOL_TYPES_LIST) {
      const keys = Object.keys(resolveSchoolTerminology(type)).sort();
      expect(keys).toEqual(k12Keys);
    }
  });
});

describe("scenario: cross-type service descriptions", () => {
  it("all platforms describe the same services", () => {
    const k12Platform = createConfigPlatform("k12", "k12-1");
    const k12Services = k12Platform.describeAllServices("k12");
    expect(k12Services.length).toBeGreaterThan(0);

    for (const type of SCHOOL_TYPES_LIST) {
      const platform = createConfigPlatform(type, `${type}-1`);
      const services = platform.describeAllServices(type);
      expect(services.length).toBe(k12Services.length);
    }
  });
});
