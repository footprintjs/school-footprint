import type { Adapter } from "@footprint/adapters";

/**
 * Fixed timetable scheduling — K-12 pattern.
 * Assigns teachers to fixed day/period slots across the week.
 */
export const fixedTimetableAdapter: Adapter = {
  id: "fixed-timetable",
  name: "Fixed Timetable Scheduler",
  capabilityId: "schedule-class",
  async execute(input, context) {
    const { teacherId, classId, dayOfWeek, periodId, termId } = input as Record<string, unknown>;
    return {
      scheduled: true,
      pattern: "fixed-timetable",
      entry: { teacherId, classId, dayOfWeek, periodId, termId },
    };
  },
};

/**
 * Time slot scheduling — dance school pattern.
 * Books teachers into flexible time slots with duration.
 */
export const timeSlotsAdapter: Adapter = {
  id: "time-slots",
  name: "Time Slot Scheduler",
  capabilityId: "schedule-class",
  async execute(input, context) {
    const { teacherId, classId, startTime, duration, date } = input as Record<string, unknown>;
    return {
      scheduled: true,
      pattern: "time-slots",
      entry: { teacherId, classId, startTime, duration, date },
    };
  },
};

/**
 * Appointment scheduling — music school pattern.
 * Individual lesson appointments between instructor and student.
 */
export const appointmentsAdapter: Adapter = {
  id: "appointments",
  name: "Appointment Scheduler",
  capabilityId: "schedule-class",
  async execute(input, context) {
    const { teacherId, studentId, startTime, duration, instrument } = input as Record<string, unknown>;
    return {
      scheduled: true,
      pattern: "appointments",
      entry: { teacherId, studentId, startTime, duration, instrument },
    };
  },
};

/**
 * Activity block scheduling — kindergarten pattern.
 * Blocks of activities assigned to age groups.
 */
export const activityBlocksAdapter: Adapter = {
  id: "activity-blocks",
  name: "Activity Block Scheduler",
  capabilityId: "schedule-class",
  async execute(input, context) {
    const { teacherId, ageGroupId, activityId, blockIndex, dayOfWeek } = input as Record<string, unknown>;
    return {
      scheduled: true,
      pattern: "activity-blocks",
      entry: { teacherId, ageGroupId, activityId, blockIndex, dayOfWeek },
    };
  },
};

/**
 * Flexible slot scheduling — tutoring pattern.
 * Ad-hoc slots booked per student request.
 */
export const flexibleSlotsAdapter: Adapter = {
  id: "flexible-slots",
  name: "Flexible Slot Scheduler",
  capabilityId: "schedule-class",
  async execute(input, context) {
    const { tutorId, studentId, requestedTime, duration, subject } = input as Record<string, unknown>;
    return {
      scheduled: true,
      pattern: "flexible-slots",
      entry: { tutorId, studentId, requestedTime, duration, subject },
    };
  },
};

export const allSchedulingAdapters: readonly Adapter[] = [
  fixedTimetableAdapter,
  timeSlotsAdapter,
  appointmentsAdapter,
  activityBlocksAdapter,
  flexibleSlotsAdapter,
];
