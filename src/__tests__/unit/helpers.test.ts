import { describe, it, expect } from "vitest";
import {
  SCHOOL_TYPES_LIST,
  isValidSchoolType,
  getAllSchoolTypeConfigs,
  getSchoolTypeConfig,
  getAllSchoolProfiles,
  resolveSchoolTerminology,
  pluralize,
  createStubRepository,
  createConfigPlatform,
  createPlatformForRequest,
  checkFlowError,
} from "../../helpers.js";
import type { SchoolServiceResult } from "../../flows/schoolServiceComposer.js";

describe("SCHOOL_TYPES_LIST", () => {
  it("contains exactly 5 types", () => {
    expect(SCHOOL_TYPES_LIST).toHaveLength(5);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(SCHOOL_TYPES_LIST)).toBe(true);
  });

  it("contains the expected types", () => {
    expect([...SCHOOL_TYPES_LIST]).toEqual(["k12", "dance", "music", "kindergarten", "tutoring"]);
  });
});

describe("isValidSchoolType", () => {
  it("accepts all 5 valid types", () => {
    for (const type of SCHOOL_TYPES_LIST) {
      expect(isValidSchoolType(type)).toBe(true);
    }
  });

  it("rejects invalid strings", () => {
    expect(isValidSchoolType("invalid")).toBe(false);
    expect(isValidSchoolType("")).toBe(false);
    expect(isValidSchoolType("K12")).toBe(false);
  });
});

describe("getAllSchoolTypeConfigs", () => {
  it("returns configs for all 5 types", () => {
    const configs = getAllSchoolTypeConfigs();
    expect(Object.keys(configs)).toHaveLength(5);
    for (const type of SCHOOL_TYPES_LIST) {
      expect(configs[type]).toBeDefined();
      expect(configs[type].type).toBe(type);
    }
  });

  it("each config has required fields", () => {
    const configs = getAllSchoolTypeConfigs();
    for (const config of Object.values(configs)) {
      expect(config.displayName).toBeTruthy();
      expect(config.theme).toBeDefined();
      expect(config.theme.accent).toBeTruthy();
    }
  });
});

describe("getSchoolTypeConfig", () => {
  it("returns config for valid type", () => {
    const config = getSchoolTypeConfig("k12");
    expect(config).toBeDefined();
    expect(config!.type).toBe("k12");
  });

  it("returns undefined for invalid type", () => {
    expect(getSchoolTypeConfig("invalid")).toBeUndefined();
  });

  it("returns undefined for prototype keys", () => {
    expect(getSchoolTypeConfig("toString")).toBeUndefined();
    expect(getSchoolTypeConfig("constructor")).toBeUndefined();
    expect(getSchoolTypeConfig("__proto__")).toBeUndefined();
    expect(getSchoolTypeConfig("hasOwnProperty")).toBeUndefined();
  });

  it("returns deep copies (mutation safe)", () => {
    const config1 = getSchoolTypeConfig("k12")!;
    const originalName = config1.displayName;
    (config1 as any).displayName = "MUTATED";
    expect(getSchoolTypeConfig("k12")!.displayName).toBe(originalName);
  });
});

describe("getAllSchoolProfiles", () => {
  it("returns 5 profiles", () => {
    expect(getAllSchoolProfiles()).toHaveLength(5);
  });

  it("every profile has type, modules, and roles", () => {
    for (const profile of getAllSchoolProfiles()) {
      expect(profile.type).toBeTruthy();
      expect(Array.isArray(profile.modules)).toBe(true);
      expect(Array.isArray(profile.roles)).toBe(true);
    }
  });
});

describe("resolveSchoolTerminology", () => {
  it("returns terminology with singular and plural for valid type", () => {
    const terms = resolveSchoolTerminology("k12");
    expect(Object.keys(terms).length).toBeGreaterThan(0);
    for (const label of Object.values(terms)) {
      expect(label.singular).toBeTruthy();
      expect(label.plural).toBeTruthy();
    }
  });

  it("returns dance-specific terms", () => {
    const terms = resolveSchoolTerminology("dance");
    expect(terms.student.singular).toBe("Dancer");
  });

  it("falls back to k12 for unknown types", () => {
    const k12 = resolveSchoolTerminology("k12");
    const unknown = resolveSchoolTerminology("unknown-type");
    expect(unknown).toEqual(k12);
  });

  it("returns deep copies", () => {
    const terms = resolveSchoolTerminology("k12");
    const original = terms.student.singular;
    (terms.student as any).singular = "MUTATED";
    expect(resolveSchoolTerminology("k12").student.singular).toBe(original);
  });
});

describe("pluralize", () => {
  it("handles regular plurals", () => {
    expect(pluralize("Student")).toBe("Students");
    expect(pluralize("Teacher")).toBe("Teachers");
  });

  it("handles irregular plurals", () => {
    expect(pluralize("Child")).toBe("Children");
    expect(pluralize("Staff")).toBe("Staff");
    expect(pluralize("Class")).toBe("Classes");
    expect(pluralize("Campus")).toBe("Campuses");
    expect(pluralize("Attendance")).toBe("Attendance");
  });

  it("handles -y suffix", () => {
    expect(pluralize("Category")).toBe("Categories");
  });

  it("handles -sh/-ch suffix", () => {
    expect(pluralize("Brush")).toBe("Brushes");
    expect(pluralize("Match")).toBe("Matches");
  });

  it("handles -s/-x/-z suffix", () => {
    expect(pluralize("Bus")).toBe("Buses");
    expect(pluralize("Box")).toBe("Boxes");
    expect(pluralize("Quiz")).toBe("Quizes");
  });

  it("does not double-pluralize -ay/-oy words", () => {
    expect(pluralize("Day")).toBe("Days");
    expect(pluralize("Boy")).toBe("Boys");
  });
});

describe("createStubRepository", () => {
  it("throws on every method", () => {
    const repo = createStubRepository("test-service");
    expect(() => repo.createStudent({} as any)).toThrow("test-service does not execute data flows");
    expect(() => repo.findStudents({} as any)).toThrow("test-service does not execute data flows");
    expect(() => repo.createAttendanceSession({} as any)).toThrow();
    expect(() => repo.markAttendance({} as any)).toThrow();
    expect(() => repo.createScheduleEntry({} as any)).toThrow();
    expect(() => repo.findConflicts({} as any)).toThrow();
    expect(() => repo.createGrade({} as any)).toThrow();
    expect(() => repo.createSection({} as any)).toThrow();
    expect(() => repo.checkAvailability({} as any)).toThrow();
    expect(() => repo.calculateFee({} as any)).toThrow();
  });

  it("uses default service name when none provided", () => {
    const repo = createStubRepository();
    expect(() => repo.createStudent({} as any)).toThrow("this service does not execute data flows");
  });
});

describe("createConfigPlatform", () => {
  it("creates a platform for any valid school type", () => {
    for (const type of SCHOOL_TYPES_LIST) {
      const platform = createConfigPlatform(type, `${type}-1`);
      expect(platform).toBeDefined();
      expect(typeof platform.gateCheck).toBe("function");
      expect(typeof platform.describeAllServices).toBe("function");
    }
  });
});

describe("createPlatformForRequest", () => {
  it("creates platform and context from request options", () => {
    const { platform, ctx } = createPlatformForRequest({
      schoolType: "k12",
      scope: { tenantId: 1, campusId: 2, schoolId: 3 },
      repository: createStubRepository(),
      userId: 42,
    });
    expect(platform).toBeDefined();
    expect(ctx).toBeDefined();
  });

  it("works without userId", () => {
    const { platform, ctx } = createPlatformForRequest({
      schoolType: "dance",
      scope: { tenantId: 1, campusId: 1, schoolId: 1 },
      repository: createStubRepository(),
    });
    expect(platform).toBeDefined();
    expect(ctx).toBeDefined();
  });
});

describe("checkFlowError", () => {
  it("returns null for successful result", () => {
    const result: SchoolServiceResult = {
      status: "success",
      result: {},
      manifest: [],
      narrative: [],
    };
    expect(checkFlowError(result, "Test")).toBeNull();
  });

  it("returns problem shape for error result", () => {
    const result: SchoolServiceResult = {
      status: "error",
      error: "Something broke",
      manifest: [],
      narrative: [],
    };
    const problem = checkFlowError(result, "Enrollment");
    expect(problem).toEqual({
      title: "Enrollment Failed",
      status: 400,
      detail: "Something broke",
    });
  });

  it("uses 'Unknown error' when error message is missing", () => {
    const result: SchoolServiceResult = {
      status: "error",
      manifest: [],
      narrative: [],
    };
    const problem = checkFlowError(result, "Test");
    expect(problem!.detail).toBe("Unknown error");
  });
});
