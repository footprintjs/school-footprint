import { flowChart } from "footprintjs";
import type { SchoolRepository, Student } from "../../types.js";

/**
 * Enrollment service flow — enrolls a student with validation and family linkage.
 */
export function createEnrollmentFlow(repo: SchoolRepository, t?: (key: string) => string) {
  const term = t ?? ((k: string) => k);

  return flowChart<any>(
    "Validate-Input",
    async (scope) => {
      const input = scope.input as { name?: string; dob?: string; familyId?: string; gradeId?: string } | undefined;
      if (!input?.name || typeof input.name !== "string") {
        throw new Error("Student name is required");
      }
      if (!input?.dob || typeof input.dob !== "string") {
        throw new Error("Date of birth is required");
      }
      scope.studentName = input.name;
      scope.studentDob = input.dob;
      scope.familyId = input.familyId ?? null;
      scope.gradeId = input.gradeId ?? null;
    },
    "validate-input",
    undefined,
    `Validate that required enrollment fields are present`,
  )
    .addFunction(
      "Prepare-Context",
      async (scope) => {
        scope.familyLinked = !!scope.familyId;
      },
      "prepare-context",
      `Resolve ${term("family")} linkage based on provided familyId`,
    )
    .addFunction(
      "Enroll-Student",
      async (scope) => {
        const familyLinked = scope.familyLinked as boolean;
        const familyId = scope.familyId as string | null;
        const student = await repo.createStudent({
          name: scope.studentName as string,
          dob: scope.studentDob as string,
          familyId: familyLinked ? (familyId ?? undefined) : undefined,
        }) as Student;
        scope.enrolledStudent = student;
      },
      "enroll-student",
      `Create the ${term("student")} record in the repository`,
    )
    .addFunction(
      "Link-Grade",
      async (scope) => {
        scope.gradeAssigned = !!scope.gradeId;
      },
      "link-grade",
      `Assign the ${term("student")} to a ${term("grade")} if specified`,
    )

    .build();
}
