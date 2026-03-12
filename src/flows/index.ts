export { createEnrollmentFlow } from "./enrollment/enrollmentFlow.js";
export { createAttendanceFlow } from "./attendance/attendanceFlow.js";
export { createSchedulingFlow } from "./scheduling/schedulingFlow.js";
export { createCheckAvailabilityFlow } from "./scheduling/checkAvailabilityFlow.js";
export { createGradeFlow } from "./academics/createGradeFlow.js";
export { createSectionFlow } from "./academics/createSectionFlow.js";
export { createCalculateFeesFlow } from "./fees/calculateFeesFlow.js";
export {
  createSchoolServiceRegistry,
  createSchoolOperationsFlow,
} from "./schoolServiceComposer.js";
export type { SchoolServiceRegistry, SchoolServiceResult } from "./schoolServiceComposer.js";
