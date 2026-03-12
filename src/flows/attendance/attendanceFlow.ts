import { flowChart, ScopeFacade } from "footprintjs";
import type { SchoolRepository } from "../../types.js";

/**
 * Attendance service flow — creates a session and marks attendance.
 *
 * Stages:
 * 1. VALIDATE_SESSION — check class and date
 * 2. CREATE_SESSION — create the attendance session record
 * 3. MARK_RECORDS — bulk mark student attendance (subflow)
 */
export function createAttendanceFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);
  const markAttendanceSubflow = flowChart<any, ScopeFacade>(
    "Validate-Records",
    async (scope: ScopeFacade) => {
      const records = scope.getValue("records") as readonly Record<string, unknown>[];
      if (!records || !Array.isArray(records) || records.length === 0) {
        throw new Error("Attendance records are required");
      }
      scope.setGlobal("recordCount", records.length, `${records.length} attendance records to process`);
    },
    "validate-records",
    undefined,
    "Validate attendance records before marking",
  )
    .addFunction(
      "Mark-Students",
      async (scope: ScopeFacade) => {
        const sessionId = scope.getValue("sessionId") as string;
        const records = scope.getValue("records") as readonly Record<string, unknown>[];
        const result = await repo.markAttendance({ sessionId, records });
        scope.setGlobal("markResult", result, "Attendance marked for all students");
      },
      "mark-students",
      "Mark attendance for each student in the session",
    )
    .build();

  return flowChart<any, ScopeFacade>(
    "Validate-Session",
    async (scope: ScopeFacade) => {
      const input = scope.getValue("input") as Record<string, unknown>;
      if (!input?.classId) throw new Error("Class ID is required");
      if (!input?.date) throw new Error("Date is required");
      scope.setGlobal("classId", input.classId, "Class validated");
      scope.setGlobal("sessionDate", input.date, "Session date validated");
      scope.setGlobal("teacherId", input.teacherId ?? null, "Teacher ID (optional)");
      scope.setGlobal("records", input.records ?? [], "Attendance records to mark");
    },
    "validate-session",
    undefined,
    "Validate session input — class, date, and teacher",
  )
    .addFunction(
      "Create-Session",
      async (scope: ScopeFacade) => {
        const session = await repo.createAttendanceSession({
          classId: scope.getGlobal("classId"),
          date: scope.getGlobal("sessionDate"),
          teacherId: scope.getGlobal("teacherId"),
        });
        scope.setGlobal("sessionId", session.id, `${term("attendance")} session created`);
        scope.setGlobal("session", session, "Full session record");
      },
      "create-session",
      "Create the attendance session record",
    )
    .addDeciderFunction(
      "Has-Records",
      async (scope: ScopeFacade) => {
        const records = scope.getGlobal("records") as readonly unknown[];
        return records && records.length > 0 ? "mark" : "session-only";
      },
      "has-records",
      "Check if attendance records were provided to mark immediately",
    )
      .addSubFlowChartBranch("mark", markAttendanceSubflow, "Mark-Attendance", {
        inputMapper: (parentScope: unknown) => {
          const scope = parentScope as Record<string, unknown>;
          return { records: scope.records, sessionId: scope.sessionId };
        },
        outputMapper: (subOutput: unknown) => {
          const output = subOutput as Record<string, unknown>;
          return { markResult: output.markResult };
        },
      })
      .addFunctionBranch(
        "session-only",
        "Session-Created",
        async (scope: ScopeFacade) => {
          scope.setGlobal("markResult", null, "No records to mark — session created only");
        },
        "Session created without immediate attendance marking",
      )
      .end()
    .build();
}
