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

/**
 * Repository interface for school-specific data operations.
 * Consumers implement this to connect to their storage layer.
 */
export type SchoolRepository = {
  readonly createStudent: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly findStudents: (query: Record<string, unknown>) => Promise<readonly Record<string, unknown>[]>;
  readonly createAttendanceSession: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly markAttendance: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly createScheduleEntry: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  readonly findConflicts: (input: Record<string, unknown>) => Promise<readonly Record<string, unknown>[]>;
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
