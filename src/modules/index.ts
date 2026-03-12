export { students } from "./students.js";
export { academics } from "./academics.js";
export { attendance } from "./attendance.js";
export { scheduling } from "./scheduling.js";
export { fees } from "./fees.js";
export { departments } from "./departments.js";
export { workflow } from "./workflow.js";

import { students } from "./students.js";
import { academics } from "./academics.js";
import { attendance } from "./attendance.js";
import { scheduling } from "./scheduling.js";
import { fees } from "./fees.js";
import { departments } from "./departments.js";
import { workflow } from "./workflow.js";

/**
 * All school modules in dependency order.
 */
export const allSchoolModules = [
  students,
  academics,
  attendance,
  scheduling,
  fees,
  departments,
  workflow,
] as const;
