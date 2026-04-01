import { flowChart } from "footprintjs";
import type { SchoolRepository, FeeCalculation, CalculateFeeInput } from "../../types.js";

/**
 * Calculate fees flow — calculates fees for a student based on the billing model.
 */
export function createCalculateFeesFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any>(
    "Validate-Input",
    async (scope) => {
      const input = scope.input as CalculateFeeInput | undefined;
      if (!input?.studentId || typeof input.studentId !== "string") {
        throw new Error(`${term("student")} ID is required`);
      }
      scope.studentId = input.studentId;
      // Spread to plain object — avoids proxy serialization issues
      scope.feeParams = { ...input };
    },
    "validate-input",
    undefined,
    `Validate fee calculation parameters`,
  )
    .addFunction(
      "Calculate-Fees",
      async (scope) => {
        const params = scope.feeParams as CalculateFeeInput;
        const result = await repo.calculateFee({
          studentId: scope.studentId as string,
          periodId: params.periodId,
          classCount: params.classCount,
          lessonCount: params.lessonCount,
          sessionCount: params.sessionCount,
          monthId: params.monthId,
          termId: params.termId,
          gradeId: params.gradeId,
          instrument: params.instrument,
        }) as FeeCalculation;
        scope.feeCalculation = result;
      },
      "calculate-fees",
      `Calculate fees for ${term("student")} based on billing model`,
    )

    .build();
}
