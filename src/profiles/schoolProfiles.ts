import { defineProfile } from "@footprint/features";
import type { SchoolTypeConfig } from "../types.js";

/**
 * K-12 school profile — traditional school with full feature set.
 */
export const k12Profile = defineProfile({
  type: "k12",
  displayName: "K-12 School",
  modules: ["students", "academics", "attendance", "scheduling", "fees", "departments", "workflow"],
  roles: ["Principal", "Vice Principal", "Teacher", "Admin", "Coordinator", "Counselor"],
  schedulingPattern: "fixed-timetable",
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
 * Extended metadata for each school type (services, module flags, themes).
 * This goes beyond what blueprint profiles carry — school-specific enrichment.
 */
export const schoolTypeConfigs: Record<string, SchoolTypeConfig> = {
  k12: {
    type: "k12",
    displayName: "K-12 School",
    services: { org: true, people: true, academics: true, workflow: true, scheduling: true },
    moduleFlags: { grades: true, sections: true, streams: true, departments: true, attendance: true },
    schedulingPattern: "fixed-timetable",
    theme: { accent: "#007f7a", label: "Teal" },
  },
  dance: {
    type: "dance",
    displayName: "Dance School",
    services: { org: true, people: true, academics: true, workflow: false, scheduling: true },
    moduleFlags: { grades: true, sections: true, streams: false, departments: false, attendance: true },
    schedulingPattern: "time-slots",
    theme: { accent: "#c0506a", label: "Rose" },
  },
  music: {
    type: "music",
    displayName: "Music School",
    services: { org: true, people: true, academics: true, workflow: false, scheduling: true },
    moduleFlags: { grades: true, sections: true, streams: false, departments: false, attendance: true },
    schedulingPattern: "appointments",
    theme: { accent: "#5b4fc7", label: "Indigo" },
  },
  kindergarten: {
    type: "kindergarten",
    displayName: "Kindergarten / Preschool",
    services: { org: true, people: true, academics: true, workflow: false, scheduling: false },
    moduleFlags: { grades: true, sections: true, streams: false, departments: false, attendance: true },
    schedulingPattern: "activity-blocks",
    theme: { accent: "#2e944e", label: "Green" },
  },
  tutoring: {
    type: "tutoring",
    displayName: "Tutoring Center",
    services: { org: true, people: true, academics: true, workflow: false, scheduling: false },
    moduleFlags: { grades: false, sections: false, streams: false, departments: false, attendance: true },
    schedulingPattern: "flexible-slots",
    theme: { accent: "#3d6b8e", label: "Slate" },
  },
};
