import type { Capability } from "@footprint/adapters";

/**
 * School-domain capability contracts.
 * Each capability defines WHAT needs to be done — adapters define HOW.
 */

export const scheduleClass: Capability = {
  id: "schedule-class",
  name: "Schedule Class",
  domain: "scheduling",
  description: "Assign a teacher to a class for a specific time slot with conflict detection",
};

export const checkAvailability: Capability = {
  id: "check-availability",
  name: "Check Availability",
  domain: "scheduling",
  description: "Check whether a teacher or room is available for a given time slot",
};

export const suggestSlots: Capability = {
  id: "suggest-slots",
  name: "Suggest Available Slots",
  domain: "scheduling",
  description: "Find available time slots for a teacher-class combination",
};

export const calculateFees: Capability = {
  id: "calculate-fees",
  name: "Calculate Fees",
  domain: "finance",
  description: "Calculate fees for a student based on the school's billing model",
};

export const markAttendance: Capability = {
  id: "mark-attendance",
  name: "Mark Attendance",
  domain: "academics",
  description: "Record attendance for students in a session",
};

export const allSchoolCapabilities: readonly Capability[] = [
  scheduleClass,
  checkAvailability,
  suggestSlots,
  calculateFees,
  markAttendance,
];
