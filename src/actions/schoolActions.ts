import type { ActionDefinition } from "@footprint/actions";

/**
 * School-domain action definitions.
 * Each action maps to a school operation that can be exported as MCP tools.
 */

export const enrollStudent: ActionDefinition = {
  id: "enroll-student",
  name: "Enroll Student",
  description: "Enroll a new student in the school, linking to family if provided",
  domain: "people",
  category: "crud",
  requiredModules: ["students"],
  parameters: [
    { name: "name", type: "string", required: true, description: "Student full name" },
    { name: "dob", type: "string", required: true, description: "Date of birth (ISO format)" },
    { name: "contact", type: "string", required: false, description: "Contact information" },
    { name: "familyId", type: "string", required: false, description: "Family ID to link student to" },
    { name: "gradeId", type: "string", required: false, description: "Grade/level to enroll into" },
  ],
};

export const createAttendanceSession: ActionDefinition = {
  id: "create-attendance-session",
  name: "Create Attendance Session",
  description: "Create a new attendance session for a class on a specific date",
  domain: "academics",
  category: "crud",
  requiredModules: ["students", "attendance"],
  parameters: [
    { name: "classId", type: "string", required: true, description: "Class/course group ID" },
    { name: "date", type: "string", required: true, description: "Session date (ISO format)" },
    { name: "teacherId", type: "string", required: false, description: "Teacher conducting the session" },
  ],
};

export const markStudentAttendance: ActionDefinition = {
  id: "mark-attendance",
  name: "Mark Attendance",
  description: "Mark attendance for students in an active session",
  domain: "academics",
  category: "workflow",
  requiredModules: ["students", "attendance"],
  capabilityId: "mark-attendance",
  parameters: [
    { name: "sessionId", type: "string", required: true, description: "Attendance session ID" },
    { name: "records", type: "object", required: true, description: "Array of { studentId, status } records" },
  ],
};

export const scheduleClass: ActionDefinition = {
  id: "schedule-class",
  name: "Schedule Class",
  description: "Assign a teacher to a class for a time slot, with conflict detection",
  domain: "scheduling",
  category: "workflow",
  requiredModules: ["scheduling"],
  capabilityId: "schedule-class",
  parameters: [
    { name: "teacherId", type: "string", required: true, description: "Teacher/instructor ID" },
    { name: "classId", type: "string", required: true, description: "Class/course group ID" },
    { name: "slot", type: "object", required: true, description: "Time slot details (varies by school type)" },
  ],
};

export const checkScheduleAvailability: ActionDefinition = {
  id: "check-availability",
  name: "Check Schedule Availability",
  description: "Check if a teacher or room is available for a time slot",
  domain: "scheduling",
  category: "query",
  requiredModules: ["scheduling"],
  capabilityId: "check-availability",
  parameters: [
    { name: "teacherId", type: "string", required: false, description: "Teacher to check" },
    { name: "roomId", type: "string", required: false, description: "Room to check" },
    { name: "slot", type: "object", required: true, description: "Time slot to check" },
  ],
};

export const calculateStudentFees: ActionDefinition = {
  id: "calculate-fees",
  name: "Calculate Fees",
  description: "Calculate fees for a student based on the school's billing model",
  domain: "finance",
  category: "workflow",
  requiredModules: ["students", "fees"],
  capabilityId: "calculate-fees",
  parameters: [
    { name: "studentId", type: "string", required: true, description: "Student ID" },
    { name: "periodId", type: "string", required: false, description: "Term/month/session period" },
  ],
};

export const createGrade: ActionDefinition = {
  id: "create-grade",
  name: "Create Grade",
  description: "Create a new grade/level/age group in the academic structure",
  domain: "academics",
  category: "crud",
  requiredModules: ["academics"],
  parameters: [
    { name: "name", type: "string", required: true, description: "Grade name (e.g., 'Grade 1', 'Level 2')" },
    { name: "code", type: "string", required: false, description: "Short code (e.g., 'G1', 'L2')" },
    { name: "sortOrder", type: "number", required: false, description: "Display order" },
  ],
};

export const createSection: ActionDefinition = {
  id: "create-section",
  name: "Create Section",
  description: "Create a new section/style/instrument group within a grade",
  domain: "academics",
  category: "crud",
  requiredModules: ["academics"],
  parameters: [
    { name: "gradeId", type: "string", required: true, description: "Parent grade ID" },
    { name: "name", type: "string", required: true, description: "Section name" },
    { name: "capacity", type: "number", required: false, description: "Maximum student capacity" },
  ],
};

export const allSchoolActions: readonly ActionDefinition[] = [
  enrollStudent,
  createAttendanceSession,
  markStudentAttendance,
  scheduleClass,
  checkScheduleAvailability,
  calculateStudentFees,
  createGrade,
  createSection,
];
