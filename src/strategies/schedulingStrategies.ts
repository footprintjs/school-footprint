import type { Adapter } from "@footprint/adapters";
import type { SchoolRepository } from "../types.js";

/**
 * Create all 5 scheduling strategies with repository access.
 * Each adapter checks for conflicts, then creates an entry if none found.
 */
export function createSchedulingStrategies(repo: SchoolRepository): readonly Adapter[] {
  const fixedTimetable: Adapter = {
    id: "fixed-timetable",
    name: "Fixed Timetable Scheduler",
    capabilityId: "schedule-class",
    async execute(input, _context) {
      const { teacherId, classId, dayOfWeek, periodId, termId } = input as Record<string, unknown>;
      const conflicts = await repo.findConflicts({
        teacherId: teacherId as string,
        classId: classId as string,
        slot: { dayOfWeek, periodId },
      });
      if (conflicts.length > 0) return { scheduled: false, pattern: "fixed-timetable", conflicts };
      const entry = await repo.createScheduleEntry({
        teacherId: teacherId as string,
        classId: classId as string,
        slot: { dayOfWeek, periodId, termId },
      });
      return { scheduled: true, pattern: "fixed-timetable", entry };
    },
  };

  const timeSlots: Adapter = {
    id: "time-slots",
    name: "Time Slot Scheduler",
    capabilityId: "schedule-class",
    async execute(input, _context) {
      const { teacherId, classId, startTime, duration, date } = input as Record<string, unknown>;
      const conflicts = await repo.findConflicts({
        teacherId: teacherId as string,
        classId: classId as string,
        slot: { startTime, duration, date },
      });
      if (conflicts.length > 0) return { scheduled: false, pattern: "time-slots", conflicts };
      const entry = await repo.createScheduleEntry({
        teacherId: teacherId as string,
        classId: classId as string,
        slot: { startTime, duration, date },
      });
      return { scheduled: true, pattern: "time-slots", entry };
    },
  };

  const appointments: Adapter = {
    id: "appointments",
    name: "Appointment Scheduler",
    capabilityId: "schedule-class",
    async execute(input, _context) {
      const { teacherId, studentId, startTime, duration, instrument } = input as Record<string, unknown>;
      const classId = ((input as Record<string, unknown>).classId ?? `lesson-${studentId}`) as string;
      const conflicts = await repo.findConflicts({
        teacherId: teacherId as string,
        classId,
        slot: { startTime, duration },
      });
      if (conflicts.length > 0) return { scheduled: false, pattern: "appointments", conflicts };
      const entry = await repo.createScheduleEntry({
        teacherId: teacherId as string,
        classId,
        slot: { startTime, duration, studentId, instrument },
      });
      return { scheduled: true, pattern: "appointments", entry };
    },
  };

  const activityBlocks: Adapter = {
    id: "activity-blocks",
    name: "Activity Block Scheduler",
    capabilityId: "schedule-class",
    async execute(input, _context) {
      const { teacherId, ageGroupId, activityId, blockIndex, dayOfWeek } = input as Record<string, unknown>;
      const classId = ((input as Record<string, unknown>).classId ?? `activity-${ageGroupId}`) as string;
      const conflicts = await repo.findConflicts({
        teacherId: teacherId as string,
        classId,
        slot: { blockIndex, dayOfWeek },
      });
      if (conflicts.length > 0) return { scheduled: false, pattern: "activity-blocks", conflicts };
      const entry = await repo.createScheduleEntry({
        teacherId: teacherId as string,
        classId,
        slot: { ageGroupId, activityId, blockIndex, dayOfWeek },
      });
      return { scheduled: true, pattern: "activity-blocks", entry };
    },
  };

  const flexibleSlots: Adapter = {
    id: "flexible-slots",
    name: "Flexible Slot Scheduler",
    capabilityId: "schedule-class",
    async execute(input, _context) {
      const { tutorId, studentId, requestedTime, duration, subject } = input as Record<string, unknown>;
      const teacherId = (tutorId ?? (input as Record<string, unknown>).teacherId) as string;
      const classId = ((input as Record<string, unknown>).classId ?? `session-${studentId}`) as string;
      const conflicts = await repo.findConflicts({ teacherId, classId, slot: { requestedTime, duration } });
      if (conflicts.length > 0) return { scheduled: false, pattern: "flexible-slots", conflicts };
      const entry = await repo.createScheduleEntry({
        teacherId,
        classId,
        slot: { requestedTime, duration, studentId, subject },
      });
      return { scheduled: true, pattern: "flexible-slots", entry };
    },
  };

  return [fixedTimetable, timeSlots, appointments, activityBlocks, flexibleSlots];
}

// Static references for strategy registry bootstrapping (used when no repo needed yet)
export const fixedTimetableStrategy: Adapter = {
  id: "fixed-timetable", name: "Fixed Timetable Scheduler", capabilityId: "schedule-class",
  async execute(input) { return { scheduled: true, pattern: "fixed-timetable", entry: input }; },
};
export const timeSlotsStrategy: Adapter = {
  id: "time-slots", name: "Time Slot Scheduler", capabilityId: "schedule-class",
  async execute(input) { return { scheduled: true, pattern: "time-slots", entry: input }; },
};
export const appointmentsStrategy: Adapter = {
  id: "appointments", name: "Appointment Scheduler", capabilityId: "schedule-class",
  async execute(input) { return { scheduled: true, pattern: "appointments", entry: input }; },
};
export const activityBlocksStrategy: Adapter = {
  id: "activity-blocks", name: "Activity Block Scheduler", capabilityId: "schedule-class",
  async execute(input) { return { scheduled: true, pattern: "activity-blocks", entry: input }; },
};
export const flexibleSlotsStrategy: Adapter = {
  id: "flexible-slots", name: "Flexible Slot Scheduler", capabilityId: "schedule-class",
  async execute(input) { return { scheduled: true, pattern: "flexible-slots", entry: input }; },
};

export const allSchedulingStrategies: readonly Adapter[] = [
  fixedTimetableStrategy, timeSlotsStrategy, appointmentsStrategy, activityBlocksStrategy, flexibleSlotsStrategy,
];
