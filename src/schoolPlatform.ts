import {
  createModuleRegistry,
  createAdapterRegistry,
  createActionRegistry,
  createPlatform,
} from "@footprint/platform";
import type {
  Platform,
  ProfileStore,
  TenantContext,
  ActionResult,
  MCPToolDefinition,
} from "@footprint/platform";
import { allSchoolModules } from "./modules/index.js";
import { allSchoolProfiles, schoolTypeConfigs } from "./profiles/index.js";
import { allSchoolCapabilities } from "./capabilities/index.js";
import { allSchedulingAdapters, allFeeAdapters, schoolAdapterMappings } from "./adapters/index.js";
import { allSchoolActions } from "./actions/index.js";
import { createSchoolServiceRegistry } from "./flows/index.js";
import type { SchoolServiceRegistry, SchoolServiceResult } from "./flows/index.js";
import type { SchoolType, SchoolTypeConfig, SchoolRepository } from "./types.js";

/**
 * A fully configured school platform.
 * Wraps the generic Platform with school-specific features:
 * - School type metadata (themes, service flags, module flags)
 * - Footprintjs service flows (enrollment, attendance, scheduling)
 * - School-specific adapter routing (scheduling patterns, fee models)
 */
export type SchoolPlatform = Platform & {
  /** Get extended metadata for a school type */
  getSchoolTypeConfig(schoolType: SchoolType): SchoolTypeConfig | undefined;
  /** Get all supported school types */
  supportedSchoolTypes(): readonly SchoolType[];
  /** Execute a school service flow with footprintjs tracing */
  executeServiceFlow(
    ctx: TenantContext,
    actionId: string,
    input: Record<string, unknown>,
  ): Promise<SchoolServiceResult>;
  /** Access the underlying service registry */
  serviceRegistry: SchoolServiceRegistry;
};

export type SchoolPlatformConfig = {
  /** Profile store — maps unit IDs to school types */
  profileStore: ProfileStore;
  /** Repository for data operations — injected into flows */
  repository: SchoolRepository;
};

/**
 * Create a fully configured school platform.
 *
 * This is the main entry point for SchoolFootprint. It:
 * 1. Creates a module registry with all school modules
 * 2. Creates an adapter registry with scheduling + fee adapters per school type
 * 3. Creates an action registry with all school actions
 * 4. Wires everything into a Platform via footprint-blueprint
 * 5. Adds school-specific service flows via footprintjs
 *
 * @example
 * ```ts
 * import { createSchoolPlatform, createMemoryProfileStore } from "school-footprint";
 *
 * const store = createMemoryProfileStore([
 *   { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
 *   { unitId: "k12-1", profileType: "k12", createdAt: "2024-01-01" },
 * ]);
 *
 * const platform = createSchoolPlatform({
 *   profileStore: store,
 *   repository: myDatabaseRepo,
 * });
 *
 * // Use generic blueprint features
 * const tools = await platform.getAvailableActions(ctx); // MCP tools
 * const gate = await platform.gateCheck(ctx, ["scheduling"]); // feature gate
 * const t = await platform.getTermResolver(ctx); // "Period" → "Time Slot"
 *
 * // Use school-specific service flows
 * const result = await platform.executeServiceFlow(ctx, "enroll-student", { name: "Luna", dob: "2015-03-12" });
 * // → { status: "success", result: {...}, manifest: [...], narrative: [...] }
 * ```
 */
export function createSchoolPlatform(config: SchoolPlatformConfig): SchoolPlatform {
  const registry = createModuleRegistry({
    modules: [...allSchoolModules],
    profileTypes: [...allSchoolProfiles],
  });

  const adapterRegistry = createAdapterRegistry({
    capabilities: [...allSchoolCapabilities],
    adapters: [...allSchedulingAdapters, ...allFeeAdapters],
    mappings: [...schoolAdapterMappings],
  });

  const actionRegistry = createActionRegistry({
    actions: [...allSchoolActions],
  });

  const basePlatform = createPlatform({
    registry,
    profileStore: config.profileStore,
    adapterRegistry,
    actionRegistry,
  });

  const serviceRegistry = createSchoolServiceRegistry(config.repository);

  return {
    ...basePlatform,

    getSchoolTypeConfig(schoolType: SchoolType) {
      return schoolTypeConfigs[schoolType];
    },

    supportedSchoolTypes() {
      return Object.freeze(["k12", "dance", "music", "kindergarten", "tutoring"] as const);
    },

    async executeServiceFlow(ctx, actionId, input) {
      // Gate check first — ensure the action's modules are enabled for this unit
      const action = actionRegistry.getAction(actionId);
      if (action && action.requiredModules.length > 0) {
        const gateResult = await basePlatform.gateCheck(ctx, action.requiredModules);
        if (!gateResult.allowed) {
          const deniedIds = gateResult.denied.map((d) => d.moduleId);
          return {
            status: "error",
            error: `Action "${actionId}" requires disabled modules: ${deniedIds.join(", ")}`,
            manifest: [],
            narrative: [],
          };
        }
      }

      // Resolve school type for this unit
      const profileConfig = await basePlatform.resolveUnit(ctx);

      return serviceRegistry.executeService(actionId, input, {
        schoolType: profileConfig.profileType as SchoolType,
        unitId: ctx.unitId,
        userId: ctx.userId,
        repository: config.repository,
      });
    },

    serviceRegistry,
  };
}
