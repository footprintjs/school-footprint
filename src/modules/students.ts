import { defineModule } from "@footprint/features";
import { getTermsForDomain } from "../terminology/schoolTerms.js";

export const students = defineModule({
  id: "students",
  name: "Student Management",
  description: "Enrollment, student records, family/parent linkage",
  domain: "people",
  terminology: getTermsForDomain("people"),
  roles: {
    canEnroll: ["Admin", "Front Desk", "Owner"],
    canViewStudents: ["Teacher", "Instructor", "Tutor"],
  },
  seed: {
    default: {
      fields: ["name", "dob", "contact", "enrollmentDate"],
    },
  },
});
