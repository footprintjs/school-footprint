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
  TenantScope,
  TerminologyLabel,
  // Domain entities
  Student,
  CreateStudentInput,
  FindStudentsQuery,
  ScheduleEntry,
  CreateScheduleEntryInput,
  Conflict,
  FindConflictsInput,
  AttendanceSession,
  CreateSessionInput,
  AttendanceRecord,
  AttendanceMark,
  MarkAttendanceInput,
  Grade,
  CreateGradeInput,
  Section,
  CreateSectionInput,
  AvailabilityResult,
  CheckAvailabilityInput,
  FeeCalculation,
  CalculateFeeInput,
  // Per-unit overrides
  UnitOverrides,
  UnitOverrideStore,
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
  createSchedulingAdapters,
  createFeeAdapters,
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
  createCheckAvailabilityFlow,
  createGradeFlow,
  createSectionFlow,
  createCalculateFeesFlow,
  createSchoolServiceRegistry,
  createSchoolOperationsFlow,
  resolveFlowBuilder,
  resolveActionBranchId,
  getRegisteredActionIds,
  getActionFlowEntry,
  buildActionDispatch,
} from "./flows/index.js";
export type {
  SchoolServiceRegistry,
  SchoolServiceResult,
  ServiceDescription,
  BuiltServiceFlow,
  FlowBuilder,
  ActionFlowEntry,
  ActionFlowRegistry,
  ActionDispatch,
  ActionBranch,
} from "./flows/index.js";

// Terminology
export {
  schoolTerminology,
  schoolTerminologyFull,
  resolveTerminologyLabel,
  getTermsForDomain,
} from "./terminology/schoolTerms.js";

// Narrative
export {
  createSchoolNarrativeRenderer,
  buildTermReplacer,
} from "./narrative/schoolNarrativeRenderer.js";
export type { SchoolNarrativeRenderer } from "./narrative/schoolNarrativeRenderer.js";

// Pause/Resume (approval workflows)
export {
  createApprovalStage,
  resumeApproval,
} from "./pause/approvalWorkflow.js";
export type {
  ApprovalDecision,
  ApprovalStageConfig,
} from "./pause/approvalWorkflow.js";

// Trace analysis (causal chain + quality scoring)
export {
  explainResult,
  createSchoolQualityScorer,
} from "./trace/schoolTraceAnalysis.js";
export type { TraceExplanation } from "./trace/schoolTraceAnalysis.js";

// Shared helpers (for SIS service consumers)
export {
  SCHOOL_TYPES_LIST,
  isValidSchoolType,
  getAllSchoolTypeConfigs,
  getSchoolTypeConfig,
  getAllSchoolProfiles,
  resolveSchoolTerminology,
  getSchoolModuleRegistry,
  createStubRepository,
  createConfigPlatform,
  createPlatformForRequest,
  checkFlowError,
  pluralize,
} from "./helpers.js";

// Overrides
export { createMemoryOverrideStore } from "./overrides/unitOverrides.js";

// Re-export key blueprint types for convenience
export {
  createMemoryProfileStore,
  createTenantContext,
  createFeatureGate,
  createTermResolver,
  resolveProfileConfig,
  createServiceBridge,
} from "@footprint/platform";
export type {
  TenantContext,
  ProfileStore,
  ProfileBinding,
  ResolvedProfileConfig,
  MCPToolDefinition,
  ActionResult,
} from "@footprint/platform";
