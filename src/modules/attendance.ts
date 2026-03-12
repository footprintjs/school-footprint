import { defineModule } from "@footprint/features";

export const attendance = defineModule({
  id: "attendance",
  name: "Attendance Tracking",
  description: "Session creation, marking, status tracking per student per class",
  domain: "academics",
  requires: ["students", "academics"],
  terminology: {
    session: { default: "Session", dance: "Check-in", kindergarten: "Roll Call" },
    status: { default: "Status" },
  },
  roles: {
    canMarkAttendance: ["Teacher", "Instructor", "Tutor"],
    canViewAttendance: ["Admin", "Principal", "Parent"],
  },
  seed: {
    default: { statuses: ["present", "absent", "late", "excused"] },
  },
});
