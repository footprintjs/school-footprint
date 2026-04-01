/**
 * Shared helper functions for consuming SchoolFootprint in SIS services.
 *
 * These eliminate duplication across org-service, BFF gateway, and future consumers.
 * All config/terminology getters return deep copies to prevent mutation of source data.
 */
import { schoolTypeConfigs, allSchoolProfiles } from "./profiles/index.js";
import { allSchoolModules } from "./modules/index.js";
import { schoolTerminologyFull } from "./terminology/schoolTerms.js";
import {
  createSchoolPlatform,
  type SchoolPlatform,
} from "./schoolPlatform.js";
import { createMemoryProfileStore, createTenantContext, createModuleRegistry } from "@footprint/platform";
import type { TenantContext, ModuleRegistry } from "@footprint/platform";
import type {
  SchoolType,
  SchoolTypeConfig,
  TerminologyLabel,
  SchoolRepository,
  TenantScope,
} from "./types.js";
import type { SchoolServiceResult } from "./flows/schoolServiceComposer.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All valid school type IDs as a frozen tuple */
export const SCHOOL_TYPES_LIST = Object.freeze(
  ["k12", "dance", "music", "kindergarten", "tutoring"] as const,
);

// ---------------------------------------------------------------------------
// Module registry singleton
// ---------------------------------------------------------------------------

let _schoolModuleRegistry: ModuleRegistry | null = null;

/**
 * Get the school module registry (lazy singleton).
 * Pre-built with all 7 school modules and 5 school profiles.
 * Used by org-service for profile resolution without needing @footprint/platform directly.
 */
export function getSchoolModuleRegistry(): ModuleRegistry {
  if (!_schoolModuleRegistry) {
    _schoolModuleRegistry = createModuleRegistry({
      modules: [...allSchoolModules],
      profileTypes: [...allSchoolProfiles],
    });
  }
  return _schoolModuleRegistry;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Type guard: is the string a valid SchoolType? */
export function isValidSchoolType(type: string): type is SchoolType {
  return (SCHOOL_TYPES_LIST as readonly string[]).includes(type);
}

// ---------------------------------------------------------------------------
// Config getters (deep copy — safe from mutation)
// ---------------------------------------------------------------------------

/** Get all school type configs (deep copy). */
export function getAllSchoolTypeConfigs(): Record<string, SchoolTypeConfig> {
  const result: Record<string, SchoolTypeConfig> = {};
  for (const [key, config] of Object.entries(schoolTypeConfigs)) {
    result[key] = { ...config, theme: { ...config.theme } };
  }
  return result;
}

/** Get a single school type config (deep copy). Returns undefined for invalid/prototype keys. */
export function getSchoolTypeConfig(schoolType: string): SchoolTypeConfig | undefined {
  if (!Object.hasOwn(schoolTypeConfigs, schoolType)) return undefined;
  const config = schoolTypeConfigs[schoolType as SchoolType];
  return { ...config, theme: { ...config.theme } };
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/** Get all school profiles with modules and roles (array copies). */
export function getAllSchoolProfiles() {
  return allSchoolProfiles.map((p) => ({
    type: p.type,
    displayName: p.displayName,
    modules: [...p.modules],
    roles: [...p.roles],
  }));
}

// ---------------------------------------------------------------------------
// Terminology (deep copy — safe from mutation)
// ---------------------------------------------------------------------------

/** Known irregular plurals for terminology override generation. */
const IRREGULAR_PLURALS: Record<string, string> = {
  Child: "Children",
  Class: "Classes",
  Campus: "Campuses",
  Staff: "Staff",
  Attendance: "Attendance",
};

/** Generate a plural form from a singular, handling known irregulars. */
export function pluralize(singular: string): string {
  if (Object.hasOwn(IRREGULAR_PLURALS, singular)) return IRREGULAR_PLURALS[singular];
  if (singular.endsWith("s") || singular.endsWith("x") || singular.endsWith("z") ||
      singular.endsWith("sh") || singular.endsWith("ch")) {
    return singular + "es";
  }
  if (singular.endsWith("y") && !/[aeiou]y$/i.test(singular)) {
    return singular.slice(0, -1) + "ies";
  }
  return singular + "s";
}

/**
 * Resolve full terminology (singular/plural) for a school type.
 * Returns deep copy. Falls back to K-12 for unknown types.
 * Uses Object.hasOwn to prevent prototype pollution.
 */
export function resolveSchoolTerminology(
  schoolType: string,
): Record<string, TerminologyLabel> {
  const terms = Object.hasOwn(schoolTerminologyFull, schoolType)
    ? schoolTerminologyFull[schoolType]
    : schoolTerminologyFull.k12;
  const copy: Record<string, TerminologyLabel> = {};
  for (const [key, label] of Object.entries(terms)) {
    copy[key] = { singular: label.singular, plural: label.plural };
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Stub repository (for non-data services like org-service, BFF)
// ---------------------------------------------------------------------------

/**
 * Create a stub SchoolRepository that throws on every method.
 * Used by services that don't execute data flows (org-service, BFF gateway).
 */
export function createStubRepository(serviceName: string = "this service"): SchoolRepository {
  const stub = () => {
    throw new Error(`${serviceName} does not execute data flows`);
  };
  return {
    createStudent: stub as any,
    findStudents: stub as any,
    createAttendanceSession: stub as any,
    markAttendance: stub as any,
    createScheduleEntry: stub as any,
    findConflicts: stub as any,
    createGrade: stub as any,
    createSection: stub as any,
    checkAvailability: stub as any,
    calculateFee: stub as any,
  };
}

// ---------------------------------------------------------------------------
// Platform factory (for config-only services)
// ---------------------------------------------------------------------------

/**
 * Create a SchoolPlatform with a stub repository — for config/terminology/gate checks only.
 * Used by org-service, BFF gateway, and any service that needs planning data but not data flows.
 */
export function createConfigPlatform(schoolType: SchoolType, unitId: string): SchoolPlatform {
  const profileStore = createMemoryProfileStore([
    { unitId, profileType: schoolType, createdAt: new Date().toISOString() },
  ]);
  return createSchoolPlatform({
    profileStore,
    repository: createStubRepository(),
  });
}

// ---------------------------------------------------------------------------
// Route helpers (for data-executing services)
// ---------------------------------------------------------------------------

/**
 * Create a SchoolPlatform + TenantContext for a single request.
 * Eliminates the repeated boilerplate in every v2 route handler.
 */
export function createPlatformForRequest(opts: {
  schoolType: SchoolType;
  scope: TenantScope;
  repository: SchoolRepository;
  userId?: string | number;
  profileStore?: import("@footprint/platform").ProfileStore;
}): { platform: SchoolPlatform; ctx: TenantContext } {
  const unitId = `${opts.schoolType}-${opts.scope.schoolId}`;
  const profileStore = opts.profileStore ?? createMemoryProfileStore([
    { unitId, profileType: opts.schoolType, createdAt: new Date().toISOString() },
  ]);
  const platform = createSchoolPlatform({
    profileStore,
    repository: opts.repository,
  });
  const ctx = createTenantContext({
    tenantId: String(opts.scope.tenantId),
    unitId,
    userId: opts.userId != null ? String(opts.userId) : undefined,
  });
  return { platform, ctx };
}

/**
 * Check if a SchoolServiceResult is an error and return a problem response shape.
 * Returns null if successful, or a { title, status, detail } object if error.
 */
export function checkFlowError(
  result: SchoolServiceResult,
  operationTitle: string,
): { title: string; status: number; detail: string } | null {
  if (result.status === "error") {
    return {
      title: `${operationTitle} Failed`,
      status: 400,
      detail: result.error ?? "Unknown error",
    };
  }
  return null;
}
