/**
 * SchoolFootprint — School-domain wrapper for footprint-blueprint + footprintjs.
 *
 * Provides pre-configured school modules, profiles, adapters, actions, and
 * footprintjs service flows for building any type of school management system.
 *
 * @example
 * ```ts
 * import { createSchoolPlatform, createMemoryProfileStore } from "school-footprint";
 *
 * const platform = createSchoolPlatform({
 *   profileStore: createMemoryProfileStore([
 *     { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
 *   ]),
 *   repository: myRepo,
 * });
 * ```
 */

// Main entry point
export { createSchoolPlatform } from "./schoolPlatform.js";
export type { SchoolPlatform, SchoolPlatformConfig } from "./schoolPlatform.js";

// School types
export type {
  SchoolType,
  SchoolTypeConfig,
  SchoolServices,
  SchoolModuleFlags,
  SchedulingPattern,
  SchoolTermKey,
  SchoolRepository,
  SchoolFlowContext,
} from "./types.js";

// Modules
export {
  students,
  academics,
  attendance,
  scheduling,
  fees,
  departments,
  workflow,
  allSchoolModules,
} from "./modules/index.js";

// Profiles
export {
  k12Profile,
  danceProfile,
  musicProfile,
  kindergartenProfile,
  tutoringProfile,
  allSchoolProfiles,
  schoolTypeConfigs,
} from "./profiles/index.js";

// Capabilities
export {
  scheduleClass,
  checkAvailability,
  suggestSlots,
  calculateFees,
  markAttendance,
  allSchoolCapabilities,
} from "./capabilities/index.js";

// Adapters
export {
  fixedTimetableAdapter,
  timeSlotsAdapter,
  appointmentsAdapter,
  activityBlocksAdapter,
  flexibleSlotsAdapter,
  allSchedulingAdapters,
  perTermFeeAdapter,
  perClassFeeAdapter,
  perLessonFeeAdapter,
  perMonthFeeAdapter,
  perSessionFeeAdapter,
  allFeeAdapters,
  schoolAdapterMappings,
} from "./adapters/index.js";

// Actions
export {
  enrollStudent,
  createAttendanceSession,
  markStudentAttendance,
  scheduleClass as scheduleClassAction,
  checkScheduleAvailability,
  calculateStudentFees,
  createGrade,
  createSection,
  allSchoolActions,
} from "./actions/index.js";

// Flows
export {
  createEnrollmentFlow,
  createAttendanceFlow,
  createSchedulingFlow,
  createSchoolServiceRegistry,
  createSchoolOperationsFlow,
} from "./flows/index.js";
export type { SchoolServiceRegistry, SchoolServiceResult } from "./flows/index.js";

// Terminology
export { schoolTerminology, getTermsForDomain } from "./terminology/schoolTerms.js";

// Re-export key blueprint types for convenience
export {
  createMemoryProfileStore,
  createTenantContext,
  createFeatureGate,
  createTermResolver,
  resolveProfileConfig,
} from "@footprint/platform";
export type {
  TenantContext,
  ProfileStore,
  ProfileBinding,
  ResolvedProfileConfig,
  MCPToolDefinition,
  ActionResult,
} from "@footprint/platform";
