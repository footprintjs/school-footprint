import { describe, it, expect } from "vitest";
import {
  students, academics, attendance, scheduling, fees, departments, workflow,
  allSchoolModules,
} from "../../modules/index.js";

describe("school modules", () => {
  it("defines 7 school modules", () => {
    expect(allSchoolModules).toHaveLength(7);
  });

  it("all modules have valid IDs", () => {
    for (const mod of allSchoolModules) {
      expect(mod.id).toBeTruthy();
      expect(mod.name).toBeTruthy();
      expect(mod.domain).toBeTruthy();
    }
  });

  it("students module has no dependencies", () => {
    expect(students.requires).toEqual([]);
  });

  it("academics depends on students", () => {
    expect(academics.requires).toContain("students");
  });

  it("attendance depends on students and academics", () => {
    expect(attendance.requires).toContain("students");
    expect(attendance.requires).toContain("academics");
  });

  it("scheduling depends on students and academics", () => {
    expect(scheduling.requires).toContain("students");
    expect(scheduling.requires).toContain("academics");
  });

  it("fees depends on students", () => {
    expect(fees.requires).toContain("students");
  });

  it("departments has no dependencies", () => {
    expect(departments.requires).toEqual([]);
  });

  it("workflow depends on students", () => {
    expect(workflow.requires).toContain("students");
  });

  it("all modules are frozen", () => {
    for (const mod of allSchoolModules) {
      expect(Object.isFrozen(mod)).toBe(true);
    }
  });

  it("students has people-domain terminology", () => {
    expect(students.terminology).toHaveProperty("student");
    expect(students.terminology).toHaveProperty("teacher");
    expect(students.terminology).toHaveProperty("family");
  });

  it("academics has school-type-specific seed data", () => {
    expect(academics.seed).toHaveProperty("k12");
    expect(academics.seed).toHaveProperty("dance");
    expect(academics.seed).toHaveProperty("music");
  });

  it("scheduling declares capabilities", () => {
    expect(scheduling.capabilities).toContain("schedule-class");
    expect(scheduling.capabilities).toContain("check-availability");
  });

  it("scheduling has per-school-type seed patterns", () => {
    expect((scheduling.seed as Record<string, Record<string, unknown>>).k12?.pattern).toBe("fixed-timetable");
    expect((scheduling.seed as Record<string, Record<string, unknown>>).dance?.pattern).toBe("time-slots");
    expect((scheduling.seed as Record<string, Record<string, unknown>>).music?.pattern).toBe("appointments");
  });
});
