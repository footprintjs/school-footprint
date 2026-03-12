import { flowChart, ScopeFacade } from "footprintjs";
import type { SchoolRepository } from "../../types.js";

/**
 * Check availability flow — checks if a teacher or room is available.
 */
export function createCheckAvailabilityFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any, ScopeFacade>(
    "Validate-Input",
    async (scope: ScopeFacade) => {
      const input = scope.getValue("input") as Record<string, unknown>;
      if (!input?.slot) {
        throw new Error(`${term("period")} is required`);
      }
      scope.setGlobal("teacherId", input.teacherId ?? null, `${term("teacher")} to check (if provided)`);
      scope.setGlobal("roomId", input.roomId ?? null, "Room to check (if provided)");
      scope.setGlobal("slot", input.slot, `${term("period")} to check`);
    },
    "validate-input",
    undefined,
    `Validate availability check parameters`,
  )
    .addFunction(
      "Check-Availability",
      async (scope: ScopeFacade) => {
        const result = await repo.checkAvailability({
          teacherId: scope.getGlobal("teacherId") ?? undefined,
          roomId: scope.getGlobal("roomId") ?? undefined,
          slot: scope.getGlobal("slot"),
        });
        scope.setGlobal("available", result.available,
          result.available
            ? `${term("period")} is available`
            : `${term("period")} is not available — ${result.conflicts.length} conflict(s)`,
        );
        scope.setGlobal("conflicts", result.conflicts, "Conflicts found (if any)");
      },
      "check-availability",
      `Check if the requested ${term("period")} is available`,
    )
    .build();
}
