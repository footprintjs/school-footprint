/**
 * School-domain types that extend the generic blueprint types.
 */

/**
 * The five supported school types.
 */
export type SchoolType = "k12" | "dance" | "music" | "kindergarten" | "tutoring";

/**
 * Service enablement per school type.
 */
export type SchoolServices = {
  readonly org: boolean;
  readonly people: boolean;
  readonly academics: boolean;
  readonly workflow: boolean;
  readonly scheduling: boolean;
};

/**
 * Module enablement flags beyond what blueprint profiles track.
 */
export type SchoolModuleFlags = {
  readonly grades: boolean;
  readonly sections: boolean;
  readonly streams: boolean;
  readonly departments: boolean;
  readonly attendance: boolean;
};

/**
 * Scheduling pattern for a school type.
 */
export type SchedulingPattern =
  | "fixed-timetable"
  | "time-slots"
  | "appointments"
  | "activity-blocks"
  | "flexible-slots";

/**
 * School type metadata — enriches the generic ProfileDefinition.
 */
export type SchoolTypeConfig = {
  readonly type: SchoolType;
  readonly displayName: string;
  readonly services: SchoolServices;
  readonly moduleFlags: SchoolModuleFlags;
  readonly schedulingPattern: SchedulingPattern;
  readonly theme: {
    readonly accent: string;
    readonly label: string;
  };
};

/**
 * The 16 configurable terminology keys for school entities.
 */
export type SchoolTermKey =
  | "student"
  | "teacher"
  | "employee"
  | "grade"
  | "section"
  | "subject"
  | "course"
  | "courseGroup"
  | "term"
  | "period"
  | "stream"
  | "department"
  | "family"
  | "parent"
  | "academicYear"
  | "attendance";

// ---------------------------------------------------------------------------
// Domain entities — concrete types for repository operations
// ---------------------------------------------------------------------------

export type Student = {
  readonly id: string;
  readonly name: string;
  readonly dob: string;
  readonly contact?: string;
  readonly familyId?: string;
  readonly gradeId?: string;
  readonly enrollmentDate?: string;
  readonly createdAt: string;
};

export type CreateStudentInput = {
  readonly name: string;
  readonly dob: string;
  readonly contact?: string;
  readonly familyId?: string;
  readonly gradeId?: string;
};

export type FindStudentsQuery = {
  readonly gradeId?: string;
  readonly familyId?: string;
  readonly name?: string;
};

export type ScheduleEntry = {
  readonly id: string;
  readonly teacherId: string;
  readonly classId: string;
  readonly slot: Record<string, unknown>;
  readonly createdAt: string;
};

export type CreateScheduleEntryInput = {
  readonly teacherId: string;
  readonly classId: string;
  readonly slot: Record<string, unknown>;
};

export type Conflict = {
  readonly type: "TEACHER_CONFLICT" | "ROOM_CONFLICT" | "STUDENT_CONFLICT";
  readonly entityId?: string;
  readonly slot?: Record<string, unknown>;
  readonly reason?: string;
};

export type FindConflictsInput = {
  readonly teacherId: string;
  readonly classId: string;
  readonly slot: Record<string, unknown>;
};

export type AttendanceSession = {
  readonly id: string;
  readonly classId: string;
  readonly date: string;
  readonly teacherId?: string;
  readonly status?: "open" | "closed";
  readonly createdAt: string;
};

export type CreateSessionInput = {
  readonly classId: string;
  readonly date: string;
  readonly teacherId?: string;
};

export type AttendanceRecord = {
  readonly studentId: string;
  readonly status: "present" | "absent" | "late" | "excused";
};

export type AttendanceMark = {
  readonly sessionId: string;
  readonly records: readonly AttendanceRecord[];
  readonly marked: boolean;
  readonly markedAt: string;
};

export type MarkAttendanceInput = {
  readonly sessionId: string;
  readonly records: readonly AttendanceRecord[];
};

export type Grade = {
  readonly id: string;
  readonly name: string;
  readonly code?: string;
  readonly sortOrder?: number;
  readonly createdAt: string;
};

export type CreateGradeInput = {
  readonly name: string;
  readonly code?: string;
  readonly sortOrder?: number;
};

export type Section = {
  readonly id: string;
  readonly gradeId: string;
  readonly name: string;
  readonly capacity?: number;
  readonly createdAt: string;
};

export type CreateSectionInput = {
  readonly gradeId: string;
  readonly name: string;
  readonly capacity?: number;
};

export type AvailabilityResult = {
  readonly available: boolean;
  readonly conflicts: readonly Conflict[];
};

export type CheckAvailabilityInput = {
  readonly teacherId?: string;
  readonly roomId?: string;
  readonly slot: Record<string, unknown>;
};

export type FeeCalculation = {
  readonly model: string;
  readonly studentId: string;
  readonly amount?: number;
  readonly lineItems?: readonly { label: string; amount: number }[];
  readonly calculated: boolean;
};

export type CalculateFeeInput = {
  readonly studentId: string;
  readonly periodId?: string;
  readonly classCount?: number;
  readonly lessonCount?: number;
  readonly sessionCount?: number;
  readonly monthId?: string;
  readonly termId?: string;
  readonly gradeId?: string;
  readonly instrument?: string;
};

// ---------------------------------------------------------------------------
// Repository interface — port for data operations
// ---------------------------------------------------------------------------

/**
 * Repository interface for school-specific data operations.
 * Consumers implement this to connect to their storage layer.
 */
export type SchoolRepository = {
  readonly createStudent: (input: CreateStudentInput) => Promise<Student>;
  readonly findStudents: (query: FindStudentsQuery) => Promise<readonly Student[]>;
  readonly createAttendanceSession: (input: CreateSessionInput) => Promise<AttendanceSession>;
  readonly markAttendance: (input: MarkAttendanceInput) => Promise<AttendanceMark>;
  readonly createScheduleEntry: (input: CreateScheduleEntryInput) => Promise<ScheduleEntry>;
  readonly findConflicts: (input: FindConflictsInput) => Promise<readonly Conflict[]>;
  readonly createGrade: (input: CreateGradeInput) => Promise<Grade>;
  readonly createSection: (input: CreateSectionInput) => Promise<Section>;
  readonly checkAvailability: (input: CheckAvailabilityInput) => Promise<AvailabilityResult>;
  readonly calculateFee: (input: CalculateFeeInput) => Promise<FeeCalculation>;
};

// ---------------------------------------------------------------------------
// Per-unit overrides
// ---------------------------------------------------------------------------

/**
 * Per-unit configuration overrides — the "Shopify" layer.
 * Individual school units can override terminology, module toggles, and theme.
 */
export type UnitOverrides = {
  readonly terminologyOverrides?: Readonly<Record<string, string>>;
  readonly moduleToggles?: Readonly<Record<string, boolean>>;
  readonly themeOverrides?: {
    readonly accent?: string;
    readonly label?: string;
  };
};

export type UnitOverrideStore = {
  readonly getOverrides: (unitId: string) => Promise<UnitOverrides | undefined>;
};

/**
 * Context passed through school flows.
 */
export type SchoolFlowContext = {
  readonly schoolType: SchoolType;
  readonly unitId: string;
  readonly userId?: string;
  readonly repository: SchoolRepository;
};
