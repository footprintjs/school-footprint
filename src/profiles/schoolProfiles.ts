import { defineProfile } from "@footprint/features";
import type { ProfileDefinition } from "@footprint/features";
import type { SchoolType, SchoolTypeConfig, SchoolServices, SchoolModuleFlags, SchedulingPattern } from "../types.js";

/**
 * K-12 school profile — traditional school with full feature set.
 */
export const k12Profile = defineProfile({
  type: "k12",
  displayName: "K-12 School",
  modules: ["students", "academics", "attendance", "scheduling", "fees", "departments", "workflow"],
  roles: ["Principal", "Vice Principal", "Teacher", "Admin", "Coordinator", "Counselor"],
  schedulingPattern: "fixed-timetable",
  meta: {
    services: { org: true, people: true, academics: true, workflow: true, scheduling: true },
    moduleFlags: { grades: true, sections: true, streams: true, departments: true, attendance: true },
    theme: { accent: "#007f7a", label: "Teal" },
  },
});

/**
 * Dance school profile — focused on studios and performance.
 */
export const danceProfile = defineProfile({
  type: "dance",
  displayName: "Dance School",
  modules: ["students", "academics", "attendance", "scheduling", "fees"],
  roles: ["Owner", "Instructor", "Front Desk", "Choreographer"],
  schedulingPattern: "time-slots",
  meta: {
    services: { org: true, people: true, academics: true, workflow: false, scheduling: true },
    moduleFlags: { grades: true, sections: true, streams: false, departments: false, attendance: true },
    theme: { accent: "#c0506a", label: "Rose" },
  },
});

/**
 * Music school profile — individual lessons and recitals.
 */
export const musicProfile = defineProfile({
  type: "music",
  displayName: "Music School",
  modules: ["students", "academics", "attendance", "scheduling", "fees"],
  roles: ["Director", "Instructor", "Admin", "Accompanist"],
  schedulingPattern: "appointments",
  meta: {
    services: { org: true, people: true, academics: true, workflow: false, scheduling: true },
    moduleFlags: { grades: true, sections: true, streams: false, departments: false, attendance: true },
    theme: { accent: "#5b4fc7", label: "Indigo" },
  },
});

/**
 * Kindergarten profile — age-group focused, activity-based.
 */
export const kindergartenProfile = defineProfile({
  type: "kindergarten",
  displayName: "Kindergarten / Preschool",
  modules: ["students", "academics", "attendance", "fees"],
  roles: ["Principal", "Teacher", "Admin", "Aide"],
  schedulingPattern: "activity-blocks",
  meta: {
    services: { org: true, people: true, academics: true, workflow: false, scheduling: false },
    moduleFlags: { grades: true, sections: true, streams: false, departments: false, attendance: true },
    theme: { accent: "#2e944e", label: "Green" },
  },
});

/**
 * Tutoring profile — minimal, session-based.
 */
export const tutoringProfile = defineProfile({
  type: "tutoring",
  displayName: "Tutoring Center",
  modules: ["students", "attendance", "fees"],
  roles: ["Owner", "Tutor", "Admin"],
  schedulingPattern: "flexible-slots",
  meta: {
    services: { org: true, people: true, academics: true, workflow: false, scheduling: false },
    moduleFlags: { grades: false, sections: false, streams: false, departments: false, attendance: true },
    theme: { accent: "#3d6b8e", label: "Slate" },
  },
});

/**
 * All school profiles.
 */
export const allSchoolProfiles = [
  k12Profile,
  danceProfile,
  musicProfile,
  kindergartenProfile,
  tutoringProfile,
] as const;

/**
 * Derive SchoolTypeConfig from a ProfileDefinition that carries school metadata.
 */
function toSchoolTypeConfig(profile: ProfileDefinition): SchoolTypeConfig {
  const meta = profile.meta as {
    services: SchoolServices;
    moduleFlags: SchoolModuleFlags;
    theme: { accent: string; label: string };
  };
  return {
    type: profile.type as SchoolType,
    displayName: profile.displayName,
    services: meta.services,
    moduleFlags: meta.moduleFlags,
    schedulingPattern: profile.schedulingPattern as SchedulingPattern,
    theme: meta.theme,
  };
}

/**
 * Extended metadata for each school type — derived from profile definitions.
 * Single source of truth: profiles carry everything, this is a computed view.
 */
export const schoolTypeConfigs: Record<string, SchoolTypeConfig> = Object.fromEntries(
  allSchoolProfiles.map((p) => [p.type, toSchoolTypeConfig(p)]),
);
