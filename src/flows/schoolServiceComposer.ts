import { flowChart, FlowChartExecutor, ManifestFlowRecorder } from "footprintjs";
import type { FlowChart } from "footprintjs";
// RunnableFlowChart extends FlowChart — widen FlowBuilder to accept both

import type { SchoolRepository, SchoolFlowContext, SchoolType } from "../types.js";
import { schoolTerminology } from "../terminology/schoolTerms.js";
import { createEnrollmentFlow } from "./enrollment/enrollmentFlow.js";
import { createAttendanceFlow } from "./attendance/attendanceFlow.js";
import { createSchedulingFlow } from "./scheduling/schedulingFlow.js";
import { createCheckAvailabilityFlow } from "./scheduling/checkAvailabilityFlow.js";
import { createGradeFlow } from "./academics/createGradeFlow.js";
import { createSectionFlow } from "./academics/createSectionFlow.js";
import { createCalculateFeesFlow } from "./fees/calculateFeesFlow.js";

/**
 * Service flow registry — maps action IDs to their flowchart builders.
 * Each service is a footprintjs flowchart that can be composed as a subflow.
 */
export type SchoolServiceRegistry = {
  /** Get the flow for a specific action (generic, no terminology) */
  getFlow(actionId: string): FlowChart | undefined;
  /** Get the flow for a specific action + school type (with terminology) */
  getTypedFlow(actionId: string, schoolType: SchoolType): FlowChart | undefined;
  /** List all registered service IDs */
  serviceIds(): readonly string[];
  /** Execute a service flow with manifest tracking */
  executeService(
    actionId: string,
    input: Record<string, unknown>,
    context: SchoolFlowContext,
  ): Promise<SchoolServiceResult>;
  /**
   * Build a fresh service flow for orchestrator use.
   * Returns a NEW FlowChart each call (safe for concurrent requests —
   * Phase 4 mutates StageNode objects, so cached charts are unsafe).
   */
  buildServiceFlow(
    actionId: string,
    context: SchoolFlowContext,
  ): BuiltServiceFlow | undefined;
  /** Describe a service flow (build-time stage descriptions) */
  describeService(actionId: string, schoolType?: SchoolType): ServiceDescription | undefined;
  /** Describe all registered services */
  describeAllServices(schoolType?: SchoolType): readonly ServiceDescription[];
};

export type BuiltServiceFlow = {
  /** Fresh FlowChart — safe for single-request use (not cached) */
  readonly flow: FlowChart;
  readonly flowMeta: {
    readonly flowId: string;
    readonly description?: string;
    readonly stageDescriptions: Record<string, string>;
    readonly buildTimeStructure: unknown;
  };
};

export type SchoolServiceResult = {
  readonly status: "success" | "error";
  readonly result?: Record<string, unknown>;
  readonly error?: string;
  readonly manifest: readonly ManifestEntry[];
  readonly narrative: readonly string[];
  /** Flow metadata for Trace Studio drill-down */
  readonly flowMeta?: {
    readonly flowId: string;
    readonly description?: string;
    readonly stageDescriptions?: Record<string, string>;
    readonly snapshot?: Record<string, unknown>;
    /** Full hierarchical spec from FlowChartBuilder.build() — used by Trace Studio for subflow drill-down */
    readonly buildTimeStructure?: unknown;
  };
};

export type ServiceDescription = {
  readonly actionId: string;
  readonly description: string;
  readonly stages: readonly { name: string; id: string; description: string }[];
};

type ManifestEntry = {
  subflowId: string;
  name: string;
  description?: string;
  children: ManifestEntry[];
};

/** Term resolver for a school type — uses schoolTerminology with fallback to default */
function createTermResolver(schoolType: SchoolType): (key: string) => string {
  return (key: string) => {
    const entry = schoolTerminology[key as keyof typeof schoolTerminology];
    if (!entry) return key;
    return entry[schoolType] ?? entry.default ?? key;
  };
}

// ---------------------------------------------------------------------------
// ActionFlowRegistry — variant-aware flow builder registration
// ---------------------------------------------------------------------------

/**
 * A function that builds a FlowChart given a repository and optional term resolver.
 * Returns FlowChart or RunnableFlowChart (which extends FlowChart in 3.x).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FlowBuilder = (repo: SchoolRepository, t?: (key: string) => string) => any;

/**
 * A single action's flow registration.
 *
 * - `default` is always present — every action has a base flow.
 * - `variants` maps school types to alternative builders.
 *   Only school types that genuinely differ need an entry.
 *   The selector falls back to `default` when no variant matches.
 */
export type ActionFlowEntry = {
  readonly default: FlowBuilder;
  readonly variants?: Partial<Readonly<Record<SchoolType, FlowBuilder>>>;
};

/**
 * The full registry: action ID → flow entry with default + optional variants.
 *
 * This is the "Shopify plugin registry" for school flows — adding a new
 * school-type variant is one line, zero route changes.
 */
export type ActionFlowRegistry = Readonly<Record<string, ActionFlowEntry>>;

/** All action-to-flow-builder mappings */
const ACTION_FLOW_REGISTRY: ActionFlowRegistry = {
  "enroll-student": { default: createEnrollmentFlow },
  "create-attendance-session": { default: createAttendanceFlow },
  "mark-attendance": { default: createAttendanceFlow },
  "schedule-class": { default: createSchedulingFlow },
  "check-availability": { default: createCheckAvailabilityFlow },
  "create-grade": { default: createGradeFlow },
  "create-section": { default: createSectionFlow },
  "calculate-fees": { default: createCalculateFeesFlow },
};

/**
 * Resolve the correct FlowBuilder for an action + school type combination.
 * Returns the variant if registered, otherwise the default.
 */
export function resolveFlowBuilder(actionId: string, schoolType?: SchoolType): FlowBuilder | undefined {
  const entry = ACTION_FLOW_REGISTRY[actionId];
  if (!entry) return undefined;
  if (schoolType && entry.variants?.[schoolType]) {
    return entry.variants[schoolType]!;
  }
  return entry.default;
}

/**
 * Resolve the branch ID the decider will return for a given action + school type.
 * If a variant exists for the school type, returns "actionId:schoolType", else "actionId".
 */
export function resolveActionBranchId(actionId: string, schoolType?: SchoolType): string {
  const entry = ACTION_FLOW_REGISTRY[actionId];
  if (!entry) return actionId;
  if (schoolType && entry.variants?.[schoolType]) {
    return `${actionId}:${schoolType}`;
  }
  return actionId;
}

/**
 * Get all registered action IDs.
 */
export function getRegisteredActionIds(): readonly string[] {
  return Object.freeze(Object.keys(ACTION_FLOW_REGISTRY));
}

/**
 * Get the ActionFlowEntry for an action, or undefined if not registered.
 * Uses Object.hasOwn to prevent prototype property lookups.
 */
export function getActionFlowEntry(actionId: string): ActionFlowEntry | undefined {
  if (!Object.hasOwn(ACTION_FLOW_REGISTRY, actionId)) return undefined;
  return ACTION_FLOW_REGISTRY[actionId];
}

// ---------------------------------------------------------------------------
// ActionDispatch — framework-agnostic dispatch descriptor
// ---------------------------------------------------------------------------

/** A lazy branch resolver for the decider. Only called when the branch is selected. */
export type ActionBranch = {
  /** Lazy resolver — produces a FlowChart on demand (called at most once per execution). */
  readonly resolver: () => FlowChart;
  /** SubflowMountOptions for input/output mapping between parent scope and subflow. */
  readonly mountOptions?: {
    readonly inputMapper?: (parentScope: unknown) => unknown;
    readonly outputMapper?: (subflowOutput: unknown, parentScope: unknown) => Record<string, unknown>;
  };
};

/**
 * ActionDispatch — the output of school-footprint's dispatch resolution.
 *
 * Contains everything the orchestrator layer needs to build a flow with
 * `addDeciderFunction` + `addLazySubFlowChartBranch` — no Phase 4 hacks.
 *
 * Framework-agnostic: no Fastify, no Express, no HTTP concepts.
 */
export type ActionDispatch = {
  /** The resolved action ID (e.g., "create-grade"). */
  readonly actionId: string;
  /** Decider function: reads schoolType from scope → returns the branch ID to execute. */
  readonly deciderFn: (scope: any) => string | Promise<string>;
  /** Map of branchId → lazy resolver. Only the selected branch's resolver fires. */
  readonly branches: ReadonlyMap<string, ActionBranch>;
  /** Pre-built input (includes schoolType, unitId from resolution). */
  readonly input: Record<string, unknown>;
  /** Metadata for tracing and visualization. */
  readonly meta: {
    readonly resolvedSchoolType: SchoolType;
    readonly availableVariants: readonly string[];
    readonly selectedBranch: string;
    readonly description: string;
  };
};

/**
 * Build an ActionDispatch for an action + school type + repository.
 *
 * This is the core dispatch resolution:
 * 1. Looks up the action in ACTION_FLOW_REGISTRY
 * 2. Builds lazy branch resolvers for default + any matching variants
 * 3. Returns a decider function that selects the right branch at runtime
 *
 * The caller (orchestrator layer) wires this into native builder API:
 * `addDeciderFunction("FLOW_SELECTOR", dispatch.deciderFn)`
 * `addLazySubFlowChartBranch(branchId, branch.resolver, ...)`
 */
export function buildActionDispatch(
  actionId: string,
  schoolType: SchoolType,
  repo: SchoolRepository,
): ActionDispatch | undefined {
  const entry = getActionFlowEntry(actionId);
  if (!entry) return undefined;

  const termResolver = createTermResolver(schoolType);
  const branches = new Map<string, ActionBranch>();

  const extractInput = (parentScope: unknown) => {
    // parentScope may be ScopeFacade or TypedScope — use duck-typing
    const s = parentScope as any;
    const requestInput = typeof s?.getValue === 'function'
      ? s.getValue("requestInput") ?? s.getValue("input")
      : s?.requestInput ?? s?.input;
    return { input: requestInput };
  };

  // Default branch — always present
  branches.set(actionId, {
    resolver: () => entry.default(repo, termResolver),
    mountOptions: { inputMapper: extractInput },
  });

  // Variant branches — one per registered school type override
  if (entry.variants) {
    for (const [type, builder] of Object.entries(entry.variants)) {
      if (!builder) continue;
      const variantId = `${actionId}:${type}`;
      const variantTermResolver = createTermResolver(type as SchoolType);
      branches.set(variantId, {
        resolver: () => builder(repo, variantTermResolver),
        mountOptions: { inputMapper: extractInput },
      });
    }
  }

  // Determine which branch the decider will select
  const selectedBranch = resolveActionBranchId(actionId, schoolType);

  return {
    actionId,
    deciderFn: async (scope: Record<string, unknown>) => {
      // Read school type from scope (direct property access — TypedScope pattern)
      const scopeSchoolType = scope?.schoolType as string | undefined;
      if (scopeSchoolType) {
        const variantKey = `${actionId}:${scopeSchoolType}`;
        if (branches.has(variantKey)) return variantKey;
      }
      return actionId; // fallback to default
    },
    branches,
    input: { schoolType },
    meta: {
      resolvedSchoolType: schoolType,
      availableVariants: Object.freeze([...branches.keys()]),
      selectedBranch,
      description: `Select ${actionId} variant for ${schoolType} school type`,
    },
  };
}

// Backward-compat flat lookup (used internally by existing service registry methods)
const FLOW_BUILDERS: Record<string, FlowBuilder> = Object.fromEntries(
  Object.entries(ACTION_FLOW_REGISTRY).map(([id, entry]) => [id, entry.default]),
);

/**
 * Create the school service registry — wires repository to flows.
 *
 * Flows are built lazily per school type with terminology baked into descriptions.
 * Generic flows (no terminology) are built eagerly for backward compatibility.
 */
export function createSchoolServiceRegistry(repo: SchoolRepository): SchoolServiceRegistry {
  // Eager generic flows (no terminology) for backward compat
  const genericFlows = new Map<string, FlowChart>();
  for (const [actionId, builder] of Object.entries(FLOW_BUILDERS)) {
    genericFlows.set(actionId, builder(repo));
  }

  // Lazy per-type flow cache: "actionId:schoolType" → FlowChart
  const typedFlowCache = new Map<string, FlowChart>();

  function getTypedFlow(actionId: string, schoolType: SchoolType): FlowChart | undefined {
    const key = `${actionId}:${schoolType}`;
    if (typedFlowCache.has(key)) return typedFlowCache.get(key)!;
    const builder = FLOW_BUILDERS[actionId];
    if (!builder) return undefined;
    const t = createTermResolver(schoolType);
    const flow = builder(repo, t);
    typedFlowCache.set(key, flow);
    return flow;
  }

  function describeFlow(flow: FlowChart, actionId: string): ServiceDescription {
    return {
      actionId,
      description: flow.description ?? actionId,
      stages: Array.from(flow.stageDescriptions?.entries() ?? []).map(([id, desc]) => ({
        name: id,
        id,
        description: desc,
      })),
    };
  }

  return {
    getFlow(actionId) {
      return genericFlows.get(actionId);
    },

    getTypedFlow,

    serviceIds() {
      return Object.freeze(Array.from(genericFlows.keys()));
    },

    describeService(actionId, schoolType) {
      const flow = schoolType ? getTypedFlow(actionId, schoolType) : genericFlows.get(actionId);
      if (!flow) return undefined;
      return describeFlow(flow, actionId);
    },

    describeAllServices(schoolType) {
      return Array.from(genericFlows.keys()).map((actionId) => {
        const flow = schoolType ? getTypedFlow(actionId, schoolType)! : genericFlows.get(actionId)!;
        return describeFlow(flow, actionId);
      });
    },

    buildServiceFlow(actionId, context) {
      const builder = FLOW_BUILDERS[actionId];
      if (!builder) return undefined;

      // Build FRESH flow — never use cached flows for orchestrator.
      // Phase 4 mutates StageNode objects (isSubflowRoot, subflowId),
      // so reusing cached FlowCharts across concurrent requests is unsafe.
      const t = context.schoolType ? createTermResolver(context.schoolType) : undefined;
      const flow = builder(repo, t);

      const rawStageDescs = (flow as any).stageDescriptions as Map<string, string> | undefined;
      const stageDescriptions: Record<string, string> = {};
      if (rawStageDescs) {
        for (const [id, desc] of rawStageDescs.entries()) {
          stageDescriptions[id] = desc;
        }
      }

      return {
        flow,
        flowMeta: {
          flowId: actionId,
          description: (flow as any).description as string | undefined,
          stageDescriptions,
          buildTimeStructure: (flow as any).buildTimeStructure ?? null,
        },
      };
    },

    async executeService(actionId, input, context) {
      // Use typed flow if school type is available, otherwise generic
      const flow = context.schoolType
        ? getTypedFlow(actionId, context.schoolType) ?? genericFlows.get(actionId)
        : genericFlows.get(actionId);

      if (!flow) {
        return {
          status: "error",
          error: `No service flow registered for action: ${actionId}`,
          manifest: [],
          narrative: [],
        };
      }

      // Extract flow metadata for Trace Studio drill-down
      const flowDescription = (flow as any).description as string | undefined;
      const rawStageDescs = (flow as any).stageDescriptions as Map<string, string> | undefined;
      const stageDescriptions: Record<string, string> = {};
      if (rawStageDescs) {
        for (const [id, desc] of rawStageDescs.entries()) {
          stageDescriptions[id] = desc;
        }
      }

      const manifest = new ManifestFlowRecorder();
      const initialState = { input: { ...input, schoolType: context.schoolType, unitId: context.unitId } };
      const executor = new FlowChartExecutor(flow, { initialContext: initialState });
      executor.enableNarrative();
      executor.attachFlowRecorder(manifest);

      const buildTimeStructure = (flow as any).buildTimeStructure ?? null;

      const flowMeta = {
        flowId: actionId,
        description: flowDescription,
        stageDescriptions,
        buildTimeStructure,
      };

      try {
        await executor.run();
        const snapshot = executor.getSnapshot();

        return {
          status: "success",
          result: snapshot.sharedState as Record<string, unknown>,
          manifest: manifest.getManifest(),
          narrative: executor.getNarrative(),
          flowMeta: {
            ...flowMeta,
            snapshot: snapshot.sharedState as Record<string, unknown>,
          },
        };
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          manifest: manifest.getManifest(),
          narrative: executor.getNarrative(),
          flowMeta,
        };
      }
    },
  };
}

/**
 * Create a composed "school operations" flow that orchestrates multiple services.
 */
interface OpsState {
  [key: string]: unknown;
  operation: string;
  input: Record<string, unknown>;
}

export function createSchoolOperationsFlow(repo: SchoolRepository) {
  const enrollmentFlow = createEnrollmentFlow(repo);
  const attendanceFlow = createAttendanceFlow(repo);
  const schedulingFlow = createSchedulingFlow(repo);

  return flowChart<any, OpsState>(
    "Route-Operation",
    async (scope) => {
      if (!scope.operation) throw new Error("Operation is required");
    },
    "route-operation",
    undefined,
    "Route an incoming request to the appropriate school service",
  )
    .addSelectorFunction(
      "Select-Service",
      async (scope) => {
        const serviceMap: Record<string, string> = {
          enroll: "enrollment",
          attendance: "attendance",
          schedule: "scheduling",
        };
        return serviceMap[scope.operation] ?? "unknown";
      },
      "select-service",
      "Select which school service to invoke based on the operation type",
    )
      .addSubFlowChartBranch("enrollment", enrollmentFlow as any, "Enrollment-Service", {
        inputMapper: (parentScope: OpsState) => ({ input: parentScope.input }),
      })
      .addSubFlowChartBranch("attendance", attendanceFlow as any, "Attendance-Service", {
        inputMapper: (parentScope: OpsState) => ({ input: parentScope.input }),
      })
      .addSubFlowChartBranch("scheduling", schedulingFlow as any, "Scheduling-Service", {
        inputMapper: (parentScope: OpsState) => ({ input: parentScope.input }),
      })
      .addFunctionBranch(
        "unknown",
        "Unknown-Operation",
        async (scope) => {
          throw new Error(`Unknown operation: ${scope.operation}`);
        },
        "Unknown operation — raise error",
      )
      .end()

    .build();
}
