import { defineModule } from "@footprint/features";
import { getTermsForDomain } from "../terminology/schoolTerms.js";

export const academics = defineModule({
  id: "academics",
  name: "Academic Structure",
  description: "Grades, sections, subjects, courses, terms — the academic backbone",
  domain: "academics",
  requires: ["students"],
  terminology: getTermsForDomain("academics"),
  roles: {
    canManageAcademics: ["Admin", "Principal", "Coordinator"],
  },
  seed: {
    k12: { grades: 12, sectionsPerGrade: 3, termsPerYear: 4 },
    dance: { grades: 3, sectionsPerGrade: 2, termsPerYear: 3 },
    music: { grades: 5, sectionsPerGrade: 1, termsPerYear: 4 },
    kindergarten: { grades: 3, sectionsPerGrade: 2, termsPerYear: 12 },
    tutoring: { grades: 0, sectionsPerGrade: 0, termsPerYear: 4 },
  },
});
