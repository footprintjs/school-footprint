import { describe, it, expect } from "vitest";
import {
  SCHOOL_TYPES_LIST,
  getAllSchoolTypeConfigs,
  getSchoolTypeConfig,
  resolveSchoolTerminology,
  getAllSchoolProfiles,
  createConfigPlatform,
  createPlatformForRequest,
  createStubRepository,
  pluralize,
} from "../../helpers.js";

describe("performance: config operations", () => {
  it("getAllSchoolTypeConfigs 1000x in < 100ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) getAllSchoolTypeConfigs();
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("getSchoolTypeConfig 5000x in < 50ms", () => {
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      getSchoolTypeConfig(SCHOOL_TYPES_LIST[i % 5]);
    }
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("resolveSchoolTerminology 1000x in < 100ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      resolveSchoolTerminology(SCHOOL_TYPES_LIST[i % 5]);
    }
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("getAllSchoolProfiles 1000x in < 50ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) getAllSchoolProfiles();
    expect(performance.now() - start).toBeLessThan(50);
  });
});

describe("performance: pluralize", () => {
  it("10000 pluralizations in < 20ms", () => {
    const words = ["Student", "Child", "Class", "Campus", "Staff", "Category", "Teacher", "Day"];
    const start = performance.now();
    for (let i = 0; i < 10000; i++) pluralize(words[i % words.length]);
    expect(performance.now() - start).toBeLessThan(20);
  });
});

describe("performance: platform creation", () => {
  it("createConfigPlatform 100x in < 500ms", () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      createConfigPlatform(SCHOOL_TYPES_LIST[i % 5], `unit-${i}`);
    }
    expect(performance.now() - start).toBeLessThan(500);
  });

  it("createPlatformForRequest 100x in < 500ms", () => {
    const repo = createStubRepository();
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      createPlatformForRequest({
        schoolType: SCHOOL_TYPES_LIST[i % 5],
        scope: { tenantId: 1, campusId: 1, schoolId: i },
        repository: repo,
      });
    }
    expect(performance.now() - start).toBeLessThan(500);
  });
});
