import { flowChart } from "footprintjs";
import type { SchoolRepository, Section } from "../../types.js";

/**
 * Create section flow — creates a section/style/instrument group within a grade.
 */
export function createSectionFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any>(
    "Validate-Input",
    async (scope) => {
      const input = scope.input as { gradeId?: string; name?: string; capacity?: number } | undefined;
      if (!input?.gradeId || typeof input.gradeId !== "string") {
        throw new Error(`${term("grade")} ID is required`);
      }
      if (!input?.name || typeof input.name !== "string") {
        throw new Error(`${term("section")} name is required`);
      }
      scope.gradeId = input.gradeId;
      scope.sectionName = input.name;
      scope.capacity = input.capacity ?? null;
    },
    "validate-input",
    undefined,
    `Validate that required ${term("section")} fields are present`,
  )
    .addFunction(
      "Create-Section",
      async (scope) => {
        const section = await repo.createSection({
          gradeId: scope.gradeId as string,
          name: scope.sectionName as string,
          capacity: (scope.capacity as number | null) ?? undefined,
        }) as Section;
        scope.createdSection = section;
      },
      "create-section",
      `Create the ${term("section")} record in the repository`,
    )

    .build();
}
