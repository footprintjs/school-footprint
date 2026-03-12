import type {
  SchoolRepository,
  Student,
  AttendanceSession,
  AttendanceMark,
  ScheduleEntry,
  Conflict,
  Grade,
  Section,
  AvailabilityResult,
  FeeCalculation,
} from "../types.js";

/**
 * Create a mock repository for testing.
 * All operations succeed with predictable results.
 */
export function createMockRepository(): SchoolRepository {
  let studentIdCounter = 0;
  let sessionIdCounter = 0;
  let entryIdCounter = 0;
  let gradeIdCounter = 0;
  let sectionIdCounter = 0;

  return {
    async createStudent(input): Promise<Student> {
      studentIdCounter++;
      return {
        id: `student-${studentIdCounter}`,
        name: input.name,
        dob: input.dob,
        contact: input.contact,
        familyId: input.familyId,
        gradeId: input.gradeId,
        createdAt: new Date().toISOString(),
      };
    },
    async findStudents() {
      return [];
    },
    async createAttendanceSession(input): Promise<AttendanceSession> {
      sessionIdCounter++;
      return {
        id: `session-${sessionIdCounter}`,
        classId: input.classId,
        date: input.date,
        teacherId: input.teacherId,
        status: "open",
        createdAt: new Date().toISOString(),
      };
    },
    async markAttendance(input): Promise<AttendanceMark> {
      return {
        sessionId: input.sessionId,
        records: input.records,
        marked: true,
        markedAt: new Date().toISOString(),
      };
    },
    async createScheduleEntry(input): Promise<ScheduleEntry> {
      entryIdCounter++;
      return {
        id: `entry-${entryIdCounter}`,
        teacherId: input.teacherId,
        classId: input.classId,
        slot: input.slot,
        createdAt: new Date().toISOString(),
      };
    },
    async findConflicts(): Promise<readonly Conflict[]> {
      return [];
    },
    async createGrade(input): Promise<Grade> {
      gradeIdCounter++;
      return {
        id: `grade-${gradeIdCounter}`,
        name: input.name,
        code: input.code,
        sortOrder: input.sortOrder,
        createdAt: new Date().toISOString(),
      };
    },
    async createSection(input): Promise<Section> {
      sectionIdCounter++;
      return {
        id: `section-${sectionIdCounter}`,
        gradeId: input.gradeId,
        name: input.name,
        capacity: input.capacity,
        createdAt: new Date().toISOString(),
      };
    },
    async checkAvailability(input): Promise<AvailabilityResult> {
      return { available: true, conflicts: [] };
    },
    async calculateFee(input): Promise<FeeCalculation> {
      return {
        model: "default",
        studentId: input.studentId,
        amount: 100,
        calculated: true,
      };
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
    async findConflicts(input): Promise<readonly Conflict[]> {
      return [{ type: "TEACHER_CONFLICT", entityId: input.teacherId, slot: input.slot }];
    },
  };
}
