import { defineModule } from "@footprint/features";

export const scheduling = defineModule({
  id: "scheduling",
  name: "Scheduling",
  description: "Period management, teacher-class assignment, conflict detection",
  domain: "scheduling",
  requires: ["students", "academics"],
  capabilities: ["schedule-class", "check-availability", "suggest-slots"],
  terminology: {
    period: { default: "Period", dance: "Time Slot", music: "Lesson Slot", kindergarten: "Activity Block", tutoring: "Slot" },
    scheduleEntry: { default: "Schedule Entry", dance: "Booking", music: "Lesson Assignment" },
  },
  roles: {
    canSchedule: ["Admin", "Coordinator", "Principal"],
    canViewSchedule: ["Teacher", "Instructor", "Tutor"],
  },
  seed: {
    k12: { pattern: "fixed-timetable", periodsPerDay: 8, daysPerWeek: 5 },
    dance: { pattern: "time-slots", slotDuration: 60, slotsPerDay: 8 },
    music: { pattern: "appointments", slotDuration: 30, slotsPerDay: 12 },
    kindergarten: { pattern: "activity-blocks", blocksPerDay: 4, daysPerWeek: 5 },
    tutoring: { pattern: "flexible-slots", slotDuration: 45, slotsPerDay: 6 },
  },
});
