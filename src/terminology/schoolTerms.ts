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
 * Full terminology map with singular/plural — bridges to SIS Platform's TerminologyLabel format.
 * Keyed by school type, each value is a complete TerminologyMap.
 */
export const schoolTerminologyFull: Record<string, Record<SchoolTermKey, { singular: string; plural: string }>> = {
  k12: {
    student: { singular: "Student", plural: "Students" },
    teacher: { singular: "Teacher", plural: "Teachers" },
    employee: { singular: "Staff", plural: "Staff" },
    grade: { singular: "Grade", plural: "Grades" },
    section: { singular: "Section", plural: "Sections" },
    subject: { singular: "Subject", plural: "Subjects" },
    course: { singular: "Course", plural: "Courses" },
    courseGroup: { singular: "Class", plural: "Classes" },
    term: { singular: "Term", plural: "Terms" },
    period: { singular: "Period", plural: "Periods" },
    stream: { singular: "Stream", plural: "Streams" },
    department: { singular: "Department", plural: "Departments" },
    family: { singular: "Family", plural: "Families" },
    parent: { singular: "Parent", plural: "Parents" },
    academicYear: { singular: "Academic Year", plural: "Academic Years" },
    attendance: { singular: "Attendance", plural: "Attendance" },
  },
  dance: {
    student: { singular: "Dancer", plural: "Dancers" },
    teacher: { singular: "Instructor", plural: "Instructors" },
    employee: { singular: "Staff", plural: "Staff" },
    grade: { singular: "Level", plural: "Levels" },
    section: { singular: "Style", plural: "Styles" },
    subject: { singular: "Dance Form", plural: "Dance Forms" },
    course: { singular: "Program", plural: "Programs" },
    courseGroup: { singular: "Class", plural: "Classes" },
    term: { singular: "Season", plural: "Seasons" },
    period: { singular: "Time Slot", plural: "Time Slots" },
    stream: { singular: "Track", plural: "Tracks" },
    department: { singular: "Division", plural: "Divisions" },
    family: { singular: "Family", plural: "Families" },
    parent: { singular: "Guardian", plural: "Guardians" },
    academicYear: { singular: "Year", plural: "Years" },
    attendance: { singular: "Attendance", plural: "Attendance" },
  },
  music: {
    student: { singular: "Student", plural: "Students" },
    teacher: { singular: "Instructor", plural: "Instructors" },
    employee: { singular: "Staff", plural: "Staff" },
    grade: { singular: "Level", plural: "Levels" },
    section: { singular: "Instrument", plural: "Instruments" },
    subject: { singular: "Discipline", plural: "Disciplines" },
    course: { singular: "Course", plural: "Courses" },
    courseGroup: { singular: "Class", plural: "Classes" },
    term: { singular: "Quarter", plural: "Quarters" },
    period: { singular: "Lesson Slot", plural: "Lesson Slots" },
    stream: { singular: "Track", plural: "Tracks" },
    department: { singular: "Division", plural: "Divisions" },
    family: { singular: "Family", plural: "Families" },
    parent: { singular: "Parent", plural: "Parents" },
    academicYear: { singular: "Year", plural: "Years" },
    attendance: { singular: "Attendance", plural: "Attendance" },
  },
  kindergarten: {
    student: { singular: "Child", plural: "Children" },
    teacher: { singular: "Teacher", plural: "Teachers" },
    employee: { singular: "Staff", plural: "Staff" },
    grade: { singular: "Age Group", plural: "Age Groups" },
    section: { singular: "Classroom", plural: "Classrooms" },
    subject: { singular: "Activity", plural: "Activities" },
    course: { singular: "Program", plural: "Programs" },
    courseGroup: { singular: "Group", plural: "Groups" },
    term: { singular: "Month", plural: "Months" },
    period: { singular: "Activity Block", plural: "Activity Blocks" },
    stream: { singular: "Track", plural: "Tracks" },
    department: { singular: "Wing", plural: "Wings" },
    family: { singular: "Family", plural: "Families" },
    parent: { singular: "Parent", plural: "Parents" },
    academicYear: { singular: "Year", plural: "Years" },
    attendance: { singular: "Attendance", plural: "Attendance" },
  },
  tutoring: {
    student: { singular: "Student", plural: "Students" },
    teacher: { singular: "Tutor", plural: "Tutors" },
    employee: { singular: "Staff", plural: "Staff" },
    grade: { singular: "Level", plural: "Levels" },
    section: { singular: "Group", plural: "Groups" },
    subject: { singular: "Subject", plural: "Subjects" },
    course: { singular: "Course", plural: "Courses" },
    courseGroup: { singular: "Class", plural: "Classes" },
    term: { singular: "Term", plural: "Terms" },
    period: { singular: "Slot", plural: "Slots" },
    stream: { singular: "Track", plural: "Tracks" },
    department: { singular: "Area", plural: "Areas" },
    family: { singular: "Family", plural: "Families" },
    parent: { singular: "Parent", plural: "Parents" },
    academicYear: { singular: "Year", plural: "Years" },
    attendance: { singular: "Attendance", plural: "Attendance" },
  },
};

/**
 * Resolve a full terminology label (singular + plural) for a given key and school type.
 */
export function resolveTerminologyLabel(
  key: SchoolTermKey,
  schoolType: string,
): { singular: string; plural: string } {
  const typeTerms = schoolTerminologyFull[schoolType];
  if (typeTerms?.[key]) return typeTerms[key];
  return schoolTerminologyFull.k12[key] ?? { singular: key, plural: key };
}

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
