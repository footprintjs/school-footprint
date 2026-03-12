/**
 * School terminology definitions — the 16 configurable entity labels
 * per school type, derived from the SIS platform domain.
 */
import type { SchoolTermKey } from "../types.js";

/**
 * Complete terminology map: term key → { default, per-school-type overrides }.
 * This is consumed by defineModule() in each school module.
 */
export const schoolTerminology: Record<SchoolTermKey, Record<string, string>> = {
  student: {
    default: "Student",
    dance: "Dancer",
    kindergarten: "Child",
  },
  teacher: {
    default: "Teacher",
    dance: "Instructor",
    music: "Instructor",
    tutoring: "Tutor",
  },
  employee: {
    default: "Staff",
  },
  grade: {
    default: "Grade",
    dance: "Level",
    music: "Level",
    kindergarten: "Age Group",
    tutoring: "Level",
  },
  section: {
    default: "Section",
    dance: "Style",
    music: "Instrument",
    kindergarten: "Classroom",
    tutoring: "Group",
  },
  subject: {
    default: "Subject",
    dance: "Dance Form",
    music: "Discipline",
    kindergarten: "Activity",
  },
  course: {
    default: "Course",
  },
  courseGroup: {
    default: "Class",
    kindergarten: "Group",
    tutoring: "Group",
  },
  term: {
    default: "Term",
    dance: "Season",
    music: "Quarter",
    kindergarten: "Month",
  },
  period: {
    default: "Period",
    dance: "Time Slot",
    music: "Lesson Slot",
    kindergarten: "Activity Block",
    tutoring: "Slot",
  },
  stream: {
    default: "Stream",
    dance: "Track",
  },
  department: {
    default: "Department",
    dance: "Division",
    music: "Division",
    kindergarten: "Division",
    tutoring: "Area",
  },
  family: {
    default: "Family",
  },
  parent: {
    default: "Parent",
    dance: "Guardian",
  },
  academicYear: {
    default: "Academic Year",
    dance: "Year",
    music: "Year",
    kindergarten: "Year",
    tutoring: "Year",
  },
  attendance: {
    default: "Attendance",
  },
};

/**
 * Get terminology for a specific domain (e.g., "people" modules get student/teacher/family terms).
 */
export function getTermsForDomain(domain: string): Record<string, Record<string, string>> {
  const domainTermMap: Record<string, SchoolTermKey[]> = {
    people: ["student", "teacher", "employee", "family", "parent"],
    academics: ["grade", "section", "subject", "course", "courseGroup", "term", "stream", "attendance"],
    scheduling: ["period"],
    org: ["department", "academicYear"],
  };

  const keys = domainTermMap[domain];
  if (!keys) return {};

  const result: Record<string, Record<string, string>> = {};
  for (const key of keys) {
    result[key] = schoolTerminology[key];
  }
  return result;
}
