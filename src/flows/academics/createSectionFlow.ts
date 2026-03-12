import { flowChart, ScopeFacade } from "footprintjs";
import type { SchoolRepository } from "../../types.js";

/**
 * Create section flow — creates a section/style/instrument group within a grade.
 */
export function createSectionFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any, ScopeFacade>(
    "Validate-Input",
    async (scope: ScopeFacade) => {
      const input = scope.getValue("input") as Record<string, unknown>;
      if (!input?.gradeId || typeof input.gradeId !== "string") {
        throw new Error(`${term("grade")} ID is required`);
      }
      if (!input?.name || typeof input.name !== "string") {
        throw new Error(`${term("section")} name is required`);
      }
      scope.setGlobal("gradeId", input.gradeId, `Parent ${term("grade")} validated`);
      scope.setGlobal("sectionName", input.name, `${term("section")} name validated`);
      scope.setGlobal("capacity", input.capacity ?? null, "Capacity (if provided)");
    },
    "validate-input",
    undefined,
    `Validate that required ${term("section")} fields are present`,
  )
    .addFunction(
      "Create-Section",
      async (scope: ScopeFacade) => {
        const section = await repo.createSection({
          gradeId: scope.getGlobal("gradeId"),
          name: scope.getGlobal("sectionName"),
          capacity: scope.getGlobal("capacity") ?? undefined,
        });
        scope.setGlobal("createdSection", section, `${term("section")} record created`);
      },
      "create-section",
      `Create the ${term("section")} record in the repository`,
    )
    .build();
}
