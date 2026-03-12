import {
  createModuleRegistry,
  createAdapterRegistry,
  createActionRegistry,
  createPlatform,
  createServiceBridge,
} from "@footprint/platform";
import type {
  Platform,
  ProfileStore,
  TenantContext,
} from "@footprint/platform";
import { allSchoolModules } from "./modules/index.js";
import { allSchoolProfiles, schoolTypeConfigs } from "./profiles/index.js";
import { allSchoolCapabilities } from "./capabilities/index.js";
import {
  createSchedulingAdapters,
  createFeeAdapters,
  schoolAdapterMappings,
} from "./adapters/index.js";
import { allSchoolActions } from "./actions/index.js";
import { createSchoolServiceRegistry } from "./flows/index.js";
import type { SchoolServiceRegistry, SchoolServiceResult, ServiceDescription } from "./flows/index.js";
import type {
  SchoolType,
  SchoolTypeConfig,
  SchoolRepository,
  UnitOverrideStore,
  UnitOverrides,
} from "./types.js";
import { schoolTerminology } from "./terminology/schoolTerms.js";

/**
 * A fully configured school platform.
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
  /** Describe a service flow's stages for AI planning */
  describeService(
    actionId: string,
    schoolType?: SchoolType,
  ): ServiceDescription | undefined;
  /** Describe all service flows */
  describeAllServices(schoolType?: SchoolType): readonly ServiceDescription[];
  /** Get per-unit overrides (if override store is configured) */
  getUnitOverrides(unitId: string): Promise<UnitOverrides | undefined>;
  /** Get term resolver that respects per-unit overrides */
  getTermResolverWithOverrides(ctx: TenantContext): Promise<(key: string) => string>;
  /** Access the underlying service registry */
  serviceRegistry: SchoolServiceRegistry;
};

export type SchoolPlatformConfig = {
  /** Profile store — maps unit IDs to school types */
  profileStore: ProfileStore;
  /** Repository for data operations — injected into flows and adapters */
  repository: SchoolRepository;
  /** Optional per-unit override store */
  overrideStore?: UnitOverrideStore;
};

/**
 * Create a fully configured school platform.
 *
 * This is the main entry point for SchoolFootprint. It:
 * 1. Creates a module registry with all school modules
 * 2. Creates an adapter registry with repo-backed scheduling + fee adapters
 * 3. Creates an action registry with all school actions
 * 4. Wires everything into a Platform via footprint-blueprint
 * 5. Adds school-specific service flows via footprintjs
 * 6. Supports per-unit overrides for terminology, module toggles, and theme
 */
export function createSchoolPlatform(config: SchoolPlatformConfig): SchoolPlatform {
  const registry = createModuleRegistry({
    modules: [...allSchoolModules],
    profileTypes: [...allSchoolProfiles],
  });

  // Create real adapter factories with repo access
  const liveSchedulingAdapters = createSchedulingAdapters(config.repository);
  const liveFeeAdapters = createFeeAdapters(config.repository);

  const adapterRegistry = createAdapterRegistry({
    capabilities: [...allSchoolCapabilities],
    adapters: [...liveSchedulingAdapters, ...liveFeeAdapters],
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

    describeService(actionId, schoolType) {
      return serviceRegistry.describeService(actionId, schoolType);
    },

    describeAllServices(schoolType) {
      return serviceRegistry.describeAllServices(schoolType);
    },

    async getUnitOverrides(unitId) {
      if (!config.overrideStore) return undefined;
      return config.overrideStore.getOverrides(unitId);
    },

    async getTermResolverWithOverrides(ctx) {
      const profileConfig = await basePlatform.resolveUnit(ctx);
      const schoolType = profileConfig.profileType as SchoolType;
      const overrides = config.overrideStore
        ? await config.overrideStore.getOverrides(ctx.unitId)
        : undefined;

      return (key: string) => {
        // Per-unit override takes priority
        if (overrides?.terminologyOverrides?.[key]) {
          return overrides.terminologyOverrides[key];
        }
        // Then school-type default
        const entry = schoolTerminology[key as keyof typeof schoolTerminology];
        if (!entry) return key;
        return entry[schoolType] ?? entry.default ?? key;
      };
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
