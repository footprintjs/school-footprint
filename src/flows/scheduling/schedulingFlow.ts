import { flowChart, decide } from "footprintjs";
import type { SchoolRepository, Conflict, ScheduleEntry } from "../../types.js";

/** Strip proxy wrappers — workaround for scope proxy + structuredClone incompatibility */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Scheduling service flow — assigns a teacher to a class with conflict detection.
 * Uses decide() for auto-captured decision evidence in the conflict routing.
 */
export function createSchedulingFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any>(
    "Validate-Assignment",
    async (scope) => {
      const input = scope.input as { teacherId?: string; classId?: string; slot?: Record<string, unknown> } | undefined;
      if (!input?.teacherId) throw new Error("Teacher ID is required");
      if (!input?.classId) throw new Error("Class ID is required");
      if (!input?.slot) throw new Error("Time slot is required");
      scope.teacherId = String(input.teacherId);
      scope.classId = String(input.classId);
      scope.slot = plain(input.slot);
    },
    "validate-assignment",
    undefined,
    `Validate that ${term("teacher")}, class, and ${term("period")} are provided`,
  )
    .addFunction(
      "Check-Conflicts",
      async (scope) => {
        const conflicts = await repo.findConflicts({
          teacherId: scope.teacherId as string,
          classId: scope.classId as string,
          slot: scope.slot as Record<string, unknown>,
        }) as Conflict[];
        scope.conflicts = plain(conflicts);
      },
      "check-conflicts",
      `Check for ${term("teacher")} and class conflicts in the requested ${term("period")}`,
    )
    .addDeciderFunction(
      "Conflict-Decision",
      async (scope) => {
        const result = decide({ conflicts: scope.conflicts } as Record<string, unknown>, [
          {
            when: (s: any) => Array.isArray(s.conflicts) && s.conflicts.length === 0,
            then: "no-conflict",
            label: "No scheduling conflicts detected",
          },
        ], "has-conflict");
        return result.branch;
      },
      "conflict-decision",
      "Route based on whether conflicts were found",
    )
      .addFunctionBranch(
        "no-conflict",
        "Create-Entry",
        async (scope) => {
          const entry = await repo.createScheduleEntry({
            teacherId: scope.teacherId as string,
            classId: scope.classId as string,
            slot: scope.slot as Record<string, unknown>,
          }) as ScheduleEntry;
          scope.scheduleEntry = plain(entry);
          scope.status = "scheduled";
        },
        "No conflicts — create the schedule entry",
      )
      .addFunctionBranch(
        "has-conflict",
        "Report-Conflict",
        async (scope) => {
          const conflicts = scope.conflicts as Conflict[];
          scope.status = `conflict: ${conflicts.length} conflict(s) found`;
        },
        "Conflicts detected — report them without creating an entry",
      )
      .end()

    .build();
}
