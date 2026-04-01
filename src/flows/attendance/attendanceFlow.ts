import { flowChart, decide } from "footprintjs";
import type { SchoolRepository, AttendanceSession, AttendanceMark, AttendanceRecord } from "../../types.js";

/**
 * Attendance service flow — creates a session and optionally marks attendance.
 * Uses decide() for the "has records?" decision with auto-captured evidence.
 */
export function createAttendanceFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  // Mark-attendance subflow — receives mapped input from parent
  const markAttendanceSubflow = flowChart<any>(
    "Validate-Records",
    async (scope) => {
      const records = scope.records as readonly Record<string, unknown>[];
      if (!records || !Array.isArray(records) || records.length === 0) {
        throw new Error("Attendance records are required");
      }
      scope.recordCount = records.length;
    },
    "validate-records",
    undefined,
    "Validate attendance records before marking",
  )
    .addFunction(
      "Mark-Students",
      async (scope) => {
        const result = await repo.markAttendance({
          sessionId: scope.sessionId as string,
          records: scope.records as readonly AttendanceRecord[],
        }) as AttendanceMark;
        scope.markResult = result;
      },
      "mark-students",
      "Mark attendance for each student in the session",
    )
    .build();

  return flowChart<any>(
    "Validate-Session",
    async (scope) => {
      const input = scope.input as { classId?: string; date?: string; teacherId?: string; records?: AttendanceRecord[] } | undefined;
      if (!input?.classId) throw new Error("Class ID is required");
      if (!input?.date) throw new Error("Date is required");
      scope.classId = input.classId;
      scope.sessionDate = input.date;
      scope.teacherId = input.teacherId ?? null;
      scope.records = input.records ?? [];
    },
    "validate-session",
    undefined,
    "Validate session input — class, date, and teacher",
  )
    .addFunction(
      "Create-Session",
      async (scope) => {
        const session = await repo.createAttendanceSession({
          classId: scope.classId as string,
          date: scope.sessionDate as string,
          teacherId: (scope.teacherId as string | null) ?? undefined,
        }) as AttendanceSession;
        scope.sessionId = session.id;
        scope.session = session;
      },
      "create-session",
      "Create the attendance session record",
    )
    .addDeciderFunction(
      "Has-Records",
      async (scope) => {
        const result = decide({ records: scope.records } as Record<string, unknown>, [
          {
            when: (s: any) => Array.isArray(s.records) && s.records.length > 0,
            then: "mark",
            label: "Attendance records provided",
          },
        ], "session-only");
        return result.branch;
      },
      "has-records",
      "Check if attendance records were provided to mark immediately",
    )
      .addSubFlowChartBranch("mark", markAttendanceSubflow, "Mark-Attendance", {
        inputMapper: (parentScope: unknown) => {
          const s = parentScope as any;
          return { records: s.records, sessionId: s.sessionId };
        },
        outputMapper: (subOutput: unknown) => {
          const output = subOutput as Record<string, unknown>;
          return { markResult: output.markResult };
        },
      })
      .addFunctionBranch(
        "session-only",
        "Session-Created",
        async (scope) => {
          scope.markResult = null;
        },
        "Session created without immediate attendance marking",
      )
      .end()

    .build();
}
