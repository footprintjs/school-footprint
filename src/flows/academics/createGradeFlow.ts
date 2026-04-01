import { flowChart } from "footprintjs";
import type { SchoolRepository, Grade } from "../../types.js";

/**
 * Create grade flow — creates a grade/level/age group.
 */
export function createGradeFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any>(
    "Validate-Input",
    async (scope) => {
      const input = scope.input as { name?: string; code?: string; sortOrder?: number } | undefined;
      if (!input?.name || typeof input.name !== "string") {
        throw new Error(`${term("grade")} name is required`);
      }
      scope.gradeName = input.name;
      scope.gradeCode = input.code ?? null;
      scope.sortOrder = input.sortOrder ?? null;
    },
    "validate-input",
    undefined,
    `Validate that required ${term("grade")} fields are present`,
  )
    .addFunction(
      "Create-Grade",
      async (scope) => {
        const grade = await repo.createGrade({
          name: scope.gradeName as string,
          code: (scope.gradeCode as string | null) ?? undefined,
          sortOrder: (scope.sortOrder as number | null) ?? undefined,
        }) as Grade;
        scope.createdGrade = grade;
      },
      "create-grade",
      `Create the ${term("grade")} record in the repository`,
    )

    .build();
}
