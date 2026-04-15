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
  createSchedulingStrategies,
  createFeeStrategies,
  schoolStrategyMappings,
} from "./strategies/index.js";
import { allSchoolActions } from "./actions/index.js";
import { createSchoolServiceRegistry, buildActionDispatch } from "./flows/index.js";
import type { SchoolServiceRegistry, SchoolServiceResult, ServiceDescription, BuiltServiceFlow, ActionDispatch } from "./flows/index.js";
import type {
  SchoolType,
  SchoolTypeConfig,
  SchoolRepository,
  UnitOverrideStore,
  UnitOverrides,
} from "./types.js";
import { schoolTerminology, schoolTerminologyFull, resolveTerminologyLabel } from "./terminology/schoolTerms.js";
import { pluralize } from "./helpers.js";

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
  /**
   * Build a fresh service flow for orchestrator use (no execution).
   * Returns a new FlowChart + metadata, or an error if gating fails.
   * The caller (e.g., requestFootprint orchestrator) runs it as a real subflow.
   */
  buildServiceFlow(
    ctx: TenantContext,
    actionId: string,
    input: Record<string, unknown>,
  ): Promise<BuiltServiceFlow & { input: Record<string, unknown> } | { error: string }>;
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
  /** Get full term resolver returning { singular, plural } — bridges to SIS Platform format */
  getFullTermResolver(ctx: TenantContext): Promise<(key: string) => { singular: string; plural: string }>;
  /**
   * Build a dispatch descriptor for the orchestrator.
   * Resolves school type, checks gates, and returns a decider + lazy branch map.
   * The orchestrator wires this into `addDeciderFunction` + `addLazySubFlowChartBranch`.
   */
  getActionDispatch(
    ctx: TenantContext,
    actionId: string,
    input: Record<string, unknown>,
  ): Promise<ActionDispatch & { input: Record<string, unknown> } | { error: string }>;
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
  const liveSchedulingAdapters = createSchedulingStrategies(config.repository);
  const liveFeeAdapters = createFeeStrategies(config.repository);

  const adapterRegistry = createAdapterRegistry({
    capabilities: [...allSchoolCapabilities],
    adapters: [...liveSchedulingAdapters, ...liveFeeAdapters],
    mappings: [...schoolStrategyMappings],
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

    async getFullTermResolver(ctx) {
      const profileConfig = await basePlatform.resolveUnit(ctx);
      const schoolType = profileConfig.profileType as SchoolType;
      const overrides = config.overrideStore
        ? await config.overrideStore.getOverrides(ctx.unitId)
        : undefined;

      return (key: string) => {
        const base = resolveTerminologyLabel(key as any, schoolType);
        if (overrides?.terminologyOverrides?.[key]) {
          const singular = overrides.terminologyOverrides[key];
          return { singular, plural: pluralize(singular) };
        }
        return base;
      };
    },

    async getActionDispatch(ctx, actionId, input) {
      // Gate check — ensure the action's modules are enabled
      const action = actionRegistry.getAction(actionId);
      if (action && action.requiredModules.length > 0) {
        const gateResult = await basePlatform.gateCheck(ctx, action.requiredModules);
        if (!gateResult.allowed) {
          const deniedIds = gateResult.denied.map((d) => d.moduleId);
          return { error: `Action "${actionId}" requires disabled modules: ${deniedIds.join(", ")}` };
        }
      }

      const profileConfig = await basePlatform.resolveUnit(ctx);
      const schoolType = profileConfig.profileType as SchoolType;

      const dispatch = buildActionDispatch(actionId, schoolType, config.repository);
      if (!dispatch) {
        return { error: `No service flow registered for action: ${actionId}` };
      }

      return {
        ...dispatch,
        input: { ...input, schoolType, unitId: ctx.unitId },
      };
    },

    async buildServiceFlow(ctx, actionId, input) {
      // Gate check — ensure the action's modules are enabled
      const action = actionRegistry.getAction(actionId);
      if (action && action.requiredModules.length > 0) {
        const gateResult = await basePlatform.gateCheck(ctx, action.requiredModules);
        if (!gateResult.allowed) {
          const deniedIds = gateResult.denied.map((d) => d.moduleId);
          return { error: `Action "${actionId}" requires disabled modules: ${deniedIds.join(", ")}` };
        }
      }

      const profileConfig = await basePlatform.resolveUnit(ctx);
      const built = serviceRegistry.buildServiceFlow(actionId, {
        schoolType: profileConfig.profileType as SchoolType,
        unitId: ctx.unitId,
        userId: ctx.userId,
        repository: config.repository,
      });

      if (!built) {
        return { error: `No service flow registered for action: ${actionId}` };
      }

      return {
        ...built,
        input: { ...input, schoolType: profileConfig.profileType, unitId: ctx.unitId },
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
