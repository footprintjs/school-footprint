import { flowChart, ScopeFacade } from "footprintjs";
import type { SchoolRepository } from "../../types.js";

/**
 * Scheduling service flow — assigns a teacher to a class with conflict detection.
 *
 * Stages:
 * 1. VALIDATE_ASSIGNMENT — check required fields
 * 2. CHECK_CONFLICTS — look for teacher and class conflicts
 * 3. CONFLICT_DECISION — route to create or reject
 * 4. CREATE_ENTRY / REPORT_CONFLICT — outcome branches
 */
export function createSchedulingFlow(repo: SchoolRepository) {
  return flowChart<any, ScopeFacade>(
    "Validate-Assignment",
    async (scope: ScopeFacade) => {
      const input = scope.getValue("input") as Record<string, unknown>;
      if (!input?.teacherId) throw new Error("Teacher ID is required");
      if (!input?.classId) throw new Error("Class ID is required");
      if (!input?.slot) throw new Error("Time slot is required");
      scope.setGlobal("teacherId", input.teacherId, "Teacher to assign");
      scope.setGlobal("classId", input.classId, "Class to assign");
      scope.setGlobal("slot", input.slot, "Requested time slot");
    },
    "validate-assignment",
    undefined,
    "Validate that teacher, class, and time slot are provided",
  )
    .addFunction(
      "Check-Conflicts",
      async (scope: ScopeFacade) => {
        const conflicts = await repo.findConflicts({
          teacherId: scope.getGlobal("teacherId"),
          classId: scope.getGlobal("classId"),
          slot: scope.getGlobal("slot"),
        });
        scope.setGlobal("conflicts", conflicts,
          conflicts.length > 0
            ? `Found ${conflicts.length} scheduling conflict(s)`
            : "No scheduling conflicts detected",
        );
      },
      "check-conflicts",
      "Check for teacher and class conflicts in the requested time slot",
    )
    .addDeciderFunction(
      "Conflict-Decision",
      async (scope: ScopeFacade) => {
        const conflicts = scope.getGlobal("conflicts") as readonly unknown[];
        return conflicts.length > 0 ? "has-conflict" : "no-conflict";
      },
      "conflict-decision",
      "Route based on whether conflicts were found",
    )
      .addFunctionBranch(
        "no-conflict",
        "Create-Entry",
        async (scope: ScopeFacade) => {
          const entry = await repo.createScheduleEntry({
            teacherId: scope.getGlobal("teacherId"),
            classId: scope.getGlobal("classId"),
            slot: scope.getGlobal("slot"),
          });
          scope.setGlobal("scheduleEntry", entry, "Schedule entry created successfully");
          scope.setGlobal("status", "scheduled", "Assignment completed");
        },
        "No conflicts — create the schedule entry",
      )
      .addFunctionBranch(
        "has-conflict",
        "Report-Conflict",
        async (scope: ScopeFacade) => {
          const conflicts = scope.getGlobal("conflicts") as readonly Record<string, unknown>[];
          scope.setGlobal("status", "conflict",
            `Cannot schedule — ${conflicts.length} conflict(s) found`,
          );
        },
        "Conflicts detected — report them without creating an entry",
      )
      .end()
    .build();
}
