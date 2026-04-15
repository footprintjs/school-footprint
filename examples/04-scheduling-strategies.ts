/**
 * Scheduling Strategies — Same action, different behavior per school type
 *
 * "schedule-class" routes to a different strategy depending on school type:
 *   k12         → fixed-timetable (rigid weekly grid)
 *   dance       → time-slots (flexible start/end)
 *   music       → appointments (1-on-1 lessons)
 *   kindergarten → activity-blocks (morning/afternoon)
 *   tutoring    → flexible-slots (any available window)
 *
 * Run: npx tsx examples/04-scheduling-strategies.ts
 */
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  schoolStrategyMappings,
  type SchoolRepository,
} from "school-footprint";

// Minimal repo that tracks what was called
const calls: string[] = [];
const repo: SchoolRepository = {
  async createStudent(i) { return { id: 1, firstName: String(i.firstName), lastName: "", schoolId: 1, isActive: true }; },
  async findStudents() { return []; },
  async createAttendanceSession() { return { id: 1, classId: "", date: "", records: [] }; },
  async markAttendance() { return { studentId: "", status: "present", markedAt: "" }; },
  async createScheduleEntry(input) {
    calls.push(`createScheduleEntry(${JSON.stringify(input.slot)})`);
    return { id: 1, teacherId: input.teacherId, classId: input.classId, slot: input.slot };
  },
  async findConflicts() { return []; }, // No conflicts for demo
  async createGrade() { return { id: 1, name: "", schoolId: 1 }; },
  async createSection() { return { id: 1, gradeId: 1, name: "", schoolId: 1 }; },
  async checkAvailability() { return { available: true, slot: {} }; },
  async calculateFee() { return { studentId: "", amount: 0, currency: "USD", breakdown: [] }; },
};

console.log("=== Scheduling Strategy Mappings ===\n");

for (const mapping of schoolStrategyMappings) {
  console.log(`Capability: ${mapping.capabilityId}`);
  for (const [schoolType, strategyId] of Object.entries(mapping.profileAdapters)) {
    console.log(`  ${schoolType.padEnd(14)} → ${strategyId}`);
  }
  console.log();
}

console.log("Key insight: same 'schedule-class' action, 5 different behaviors.");
console.log("Zero if/switch statements — the profile drives the strategy selection.\n");
