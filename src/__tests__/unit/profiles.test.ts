import { describe, it, expect } from "vitest";
import {
  k12Profile, danceProfile, musicProfile, kindergartenProfile, tutoringProfile,
  allSchoolProfiles, schoolTypeConfigs,
} from "../../profiles/index.js";

describe("school profiles", () => {
  it("defines 5 school profiles", () => {
    expect(allSchoolProfiles).toHaveLength(5);
  });

  it("K-12 has all modules", () => {
    expect(k12Profile.modules).toContain("students");
    expect(k12Profile.modules).toContain("academics");
    expect(k12Profile.modules).toContain("attendance");
    expect(k12Profile.modules).toContain("scheduling");
    expect(k12Profile.modules).toContain("fees");
    expect(k12Profile.modules).toContain("departments");
    expect(k12Profile.modules).toContain("workflow");
  });

  it("dance school excludes departments and workflow", () => {
    expect(danceProfile.modules).not.toContain("departments");
    expect(danceProfile.modules).not.toContain("workflow");
  });

  it("tutoring has minimal modules", () => {
    expect(tutoringProfile.modules).toContain("students");
    expect(tutoringProfile.modules).toContain("attendance");
    expect(tutoringProfile.modules).toContain("fees");
    expect(tutoringProfile.modules).not.toContain("academics");
    expect(tutoringProfile.modules).not.toContain("scheduling");
  });

  it("kindergarten excludes scheduling", () => {
    expect(kindergartenProfile.modules).not.toContain("scheduling");
  });

  it("all profiles are frozen", () => {
    for (const profile of allSchoolProfiles) {
      expect(Object.isFrozen(profile)).toBe(true);
    }
  });

  it("school type configs have themes", () => {
    expect(schoolTypeConfigs.k12.theme.accent).toBe("#007f7a");
    expect(schoolTypeConfigs.dance.theme.accent).toBe("#c0506a");
    expect(schoolTypeConfigs.music.theme.accent).toBe("#5b4fc7");
  });

  it("school type configs have scheduling patterns", () => {
    expect(schoolTypeConfigs.k12.schedulingPattern).toBe("fixed-timetable");
    expect(schoolTypeConfigs.dance.schedulingPattern).toBe("time-slots");
    expect(schoolTypeConfigs.music.schedulingPattern).toBe("appointments");
    expect(schoolTypeConfigs.kindergarten.schedulingPattern).toBe("activity-blocks");
    expect(schoolTypeConfigs.tutoring.schedulingPattern).toBe("flexible-slots");
  });

  it("school type configs have service enablement", () => {
    expect(schoolTypeConfigs.k12.services.workflow).toBe(true);
    expect(schoolTypeConfigs.dance.services.workflow).toBe(false);
    expect(schoolTypeConfigs.kindergarten.services.scheduling).toBe(false);
  });
});
