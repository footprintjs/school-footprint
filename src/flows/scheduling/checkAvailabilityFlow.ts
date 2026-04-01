import { flowChart } from "footprintjs";
import type { SchoolRepository, Conflict, AvailabilityResult } from "../../types.js";

/**
 * Check availability flow — checks if a teacher or room is available.
 */
export function createCheckAvailabilityFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any>(
    "Validate-Input",
    async (scope) => {
      const input = scope.input as { teacherId?: string; roomId?: string; slot?: Record<string, unknown> } | undefined;
      if (!input?.slot) {
        throw new Error(`${term("period")} is required`);
      }
      scope.teacherId = input.teacherId ?? null;
      scope.roomId = input.roomId ?? null;
      scope.slot = { ...input.slot };
    },
    "validate-input",
    undefined,
    `Validate availability check parameters`,
  )
    .addFunction(
      "Check-Availability",
      async (scope) => {
        const result = await repo.checkAvailability({
          teacherId: (scope.teacherId as string | null) ?? undefined,
          roomId: (scope.roomId as string | null) ?? undefined,
          slot: scope.slot as Record<string, unknown>,
        }) as AvailabilityResult;
        scope.available = result.available;
        scope.conflicts = [...result.conflicts] as Conflict[];
      },
      "check-availability",
      `Check if the requested ${term("period")} is available`,
    )

    .build();
}
