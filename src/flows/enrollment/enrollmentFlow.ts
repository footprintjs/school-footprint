import { flowChart, ScopeFacade } from "footprintjs";
import type { SchoolRepository } from "../../types.js";

/**
 * Enrollment service flow — enrolls a student with validation and family linkage.
 *
 * Stages:
 * 1. VALIDATE_INPUT — check required fields
 * 2. PREPARE_CONTEXT — resolve family linkage
 * 3. ENROLL_STUDENT — create the student record
 * 4. LINK_GRADE — assign to grade/level if specified
 */
export function createEnrollmentFlow(repo: SchoolRepository) {
  return flowChart<any, ScopeFacade>(
    "Validate-Input",
    async (scope: ScopeFacade) => {
      const input = scope.getValue("input") as Record<string, unknown>;
      if (!input?.name || typeof input.name !== "string") {
        throw new Error("Student name is required");
      }
      if (!input?.dob || typeof input.dob !== "string") {
        throw new Error("Date of birth is required");
      }
      scope.setGlobal("studentName", input.name, "Student name validated");
      scope.setGlobal("studentDob", input.dob, "Date of birth validated");
      scope.setGlobal("familyId", input.familyId ?? null, "Family ID (if provided)");
      scope.setGlobal("gradeId", input.gradeId ?? null, "Grade ID (if provided)");
    },
    "validate-input",
    undefined,
    "Validate that required enrollment fields are present",
  )
    .addFunction(
      "Prepare-Context",
      async (scope: ScopeFacade) => {
        const familyId = scope.getGlobal("familyId");
        scope.setGlobal("familyLinked", !!familyId,
          familyId ? "Student will be linked to existing family" : "No family linkage requested",
        );
      },
      "prepare-context",
      "Resolve family linkage based on provided familyId",
    )
    .addFunction(
      "Enroll-Student",
      async (scope: ScopeFacade) => {
        const student = await repo.createStudent({
          name: scope.getGlobal("studentName"),
          dob: scope.getGlobal("studentDob"),
          familyId: scope.getGlobal("familyLinked") ? scope.getGlobal("familyId") : undefined,
        });
        scope.setGlobal("enrolledStudent", student, "Student record created");
      },
      "enroll-student",
      "Create the student record in the repository",
    )
    .addFunction(
      "Link-Grade",
      async (scope: ScopeFacade) => {
        const gradeId = scope.getGlobal("gradeId");
        if (gradeId) {
          scope.setGlobal("gradeAssigned", true, `Student assigned to grade ${gradeId}`);
        } else {
          scope.setGlobal("gradeAssigned", false, "No grade assignment requested");
        }
      },
      "link-grade",
      "Assign the student to a grade/level if specified",
    )
    .build();
}
