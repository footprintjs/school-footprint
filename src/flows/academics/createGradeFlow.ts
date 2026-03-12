import { flowChart, ScopeFacade } from "footprintjs";
import type { SchoolRepository } from "../../types.js";

/**
 * Create grade flow — creates a grade/level/age group.
 */
export function createGradeFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any, ScopeFacade>(
    "Validate-Input",
    async (scope: ScopeFacade) => {
      const input = scope.getValue("input") as Record<string, unknown>;
      if (!input?.name || typeof input.name !== "string") {
        throw new Error(`${term("grade")} name is required`);
      }
      scope.setGlobal("gradeName", input.name, `${term("grade")} name validated`);
      scope.setGlobal("gradeCode", input.code ?? null, `${term("grade")} code (if provided)`);
      scope.setGlobal("sortOrder", input.sortOrder ?? null, "Sort order (if provided)");
    },
    "validate-input",
    undefined,
    `Validate that required ${term("grade")} fields are present`,
  )
    .addFunction(
      "Create-Grade",
      async (scope: ScopeFacade) => {
        const grade = await repo.createGrade({
          name: scope.getGlobal("gradeName"),
          code: scope.getGlobal("gradeCode") ?? undefined,
          sortOrder: scope.getGlobal("sortOrder") ?? undefined,
        });
        scope.setGlobal("createdGrade", grade, `${term("grade")} record created`);
      },
      "create-grade",
      `Create the ${term("grade")} record in the repository`,
    )
    .build();
}
