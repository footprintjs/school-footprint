import { describe, it, expect } from "vitest";
import { schoolTerminology, getTermsForDomain } from "../../terminology/schoolTerms.js";
import { createModuleRegistry, resolveProfileConfig, createTermResolver } from "@footprint/features";
import { allSchoolModules } from "../../modules/index.js";
import { allSchoolProfiles } from "../../profiles/index.js";

describe("school terminology", () => {
  it("defines 16 term keys", () => {
    expect(Object.keys(schoolTerminology)).toHaveLength(16);
  });

  it("student varies by school type", () => {
    expect(schoolTerminology.student.default).toBe("Student");
    expect(schoolTerminology.student.dance).toBe("Dancer");
    expect(schoolTerminology.student.kindergarten).toBe("Child");
  });

  it("teacher varies by school type", () => {
    expect(schoolTerminology.teacher.default).toBe("Teacher");
    expect(schoolTerminology.teacher.dance).toBe("Instructor");
    expect(schoolTerminology.teacher.tutoring).toBe("Tutor");
  });

  it("grade varies by school type", () => {
    expect(schoolTerminology.grade.default).toBe("Grade");
    expect(schoolTerminology.grade.dance).toBe("Level");
    expect(schoolTerminology.grade.kindergarten).toBe("Age Group");
  });

  it("getTermsForDomain returns correct terms for people", () => {
    const terms = getTermsForDomain("people");
    expect(terms).toHaveProperty("student");
    expect(terms).toHaveProperty("teacher");
    expect(terms).toHaveProperty("family");
    expect(terms).not.toHaveProperty("grade");
  });

  it("getTermsForDomain returns correct terms for academics", () => {
    const terms = getTermsForDomain("academics");
    expect(terms).toHaveProperty("grade");
    expect(terms).toHaveProperty("section");
    expect(terms).toHaveProperty("subject");
    expect(terms).not.toHaveProperty("student");
  });

  it("resolves terminology through blueprint for dance", () => {
    const registry = createModuleRegistry({
      modules: [...allSchoolModules],
      profileTypes: [...allSchoolProfiles],
    });
    const config = resolveProfileConfig(registry, "dance");
    const t = createTermResolver(config.terminology);

    expect(t("student")).toBe("Dancer");
    expect(t("teacher")).toBe("Instructor");
    expect(t("grade")).toBe("Level");
    expect(t("section")).toBe("Style");
    expect(t("term")).toBe("Season");
    expect(t("period")).toBe("Time Slot");
    expect(t("parent")).toBe("Guardian");
  });

  it("resolves terminology through blueprint for K-12", () => {
    const registry = createModuleRegistry({
      modules: [...allSchoolModules],
      profileTypes: [...allSchoolProfiles],
    });
    const config = resolveProfileConfig(registry, "k12");
    const t = createTermResolver(config.terminology);

    expect(t("student")).toBe("Student");
    expect(t("teacher")).toBe("Teacher");
    expect(t("grade")).toBe("Grade");
    expect(t("section")).toBe("Section");
    expect(t("term")).toBe("Term");
    expect(t("period")).toBe("Period");
  });

  it("resolves terminology through blueprint for kindergarten", () => {
    const registry = createModuleRegistry({
      modules: [...allSchoolModules],
      profileTypes: [...allSchoolProfiles],
    });
    const config = resolveProfileConfig(registry, "kindergarten");
    const t = createTermResolver(config.terminology);

    expect(t("student")).toBe("Child");
    expect(t("grade")).toBe("Age Group");
    expect(t("section")).toBe("Classroom");
    expect(t("subject")).toBe("Activity");
  });
});
