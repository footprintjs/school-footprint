import type { SchoolRepository } from "../types.js";

/**
 * Create a mock repository for testing.
 * All operations succeed with predictable results.
 */
export function createMockRepository(): SchoolRepository {
  let studentIdCounter = 0;
  let sessionIdCounter = 0;
  let entryIdCounter = 0;

  return {
    async createStudent(input) {
      studentIdCounter++;
      return { id: `student-${studentIdCounter}`, ...input, createdAt: new Date().toISOString() };
    },
    async findStudents(query) {
      return [];
    },
    async createAttendanceSession(input) {
      sessionIdCounter++;
      return { id: `session-${sessionIdCounter}`, ...input, createdAt: new Date().toISOString() };
    },
    async markAttendance(input) {
      return { ...input, marked: true, markedAt: new Date().toISOString() };
    },
    async createScheduleEntry(input) {
      entryIdCounter++;
      return { id: `entry-${entryIdCounter}`, ...input, createdAt: new Date().toISOString() };
    },
    async findConflicts(input) {
      return [];
    },
  };
}

/**
 * Create a mock repository that simulates scheduling conflicts.
 */
export function createConflictingRepository(): SchoolRepository {
  const base = createMockRepository();
  return {
    ...base,
    async findConflicts(input) {
      return [{ type: "TEACHER_CONFLICT", teacherId: input.teacherId, slot: input.slot }];
    },
  };
}
