import { defineModule } from "@footprint/features";

export const departments = defineModule({
  id: "departments",
  name: "Department Management",
  description: "Organizational grouping of staff and subjects",
  domain: "org",
  terminology: {
    department: { default: "Department", dance: "Division", music: "Division", kindergarten: "Division", tutoring: "Area" },
    academicYear: { default: "Academic Year", dance: "Year", music: "Year", kindergarten: "Year", tutoring: "Year" },
  },
  roles: {
    canManageDepartments: ["Admin", "Principal"],
  },
});
