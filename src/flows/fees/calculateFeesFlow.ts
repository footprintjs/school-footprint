import { flowChart, ScopeFacade } from "footprintjs";
import type { SchoolRepository } from "../../types.js";

/**
 * Calculate fees flow — calculates fees for a student based on the billing model.
 */
export function createCalculateFeesFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any, ScopeFacade>(
    "Validate-Input",
    async (scope: ScopeFacade) => {
      const input = scope.getValue("input") as Record<string, unknown>;
      if (!input?.studentId || typeof input.studentId !== "string") {
        throw new Error(`${term("student")} ID is required`);
      }
      scope.setGlobal("studentId", input.studentId, `${term("student")} ID validated`);
      scope.setGlobal("periodId", input.periodId ?? null, "Period ID (if provided)");
      scope.setGlobal("feeParams", input, "All fee calculation parameters");
    },
    "validate-input",
    undefined,
    `Validate fee calculation parameters`,
  )
    .addFunction(
      "Calculate-Fees",
      async (scope: ScopeFacade) => {
        const params = scope.getGlobal("feeParams") as Record<string, unknown>;
        const result = await repo.calculateFee({
          studentId: scope.getGlobal("studentId"),
          periodId: (params.periodId as string) ?? undefined,
          classCount: params.classCount as number | undefined,
          lessonCount: params.lessonCount as number | undefined,
          sessionCount: params.sessionCount as number | undefined,
          monthId: params.monthId as string | undefined,
          termId: params.termId as string | undefined,
          gradeId: params.gradeId as string | undefined,
          instrument: params.instrument as string | undefined,
        });
        scope.setGlobal("feeCalculation", result,
          result.amount != null
            ? `Fee calculated: ${result.model} — ${result.amount}`
            : `Fee calculated using ${result.model} model`,
        );
      },
      "calculate-fees",
      `Calculate fees for ${term("student")} based on billing model`,
    )
    .build();
}
