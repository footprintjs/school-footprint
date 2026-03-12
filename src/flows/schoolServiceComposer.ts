import { flowChart, FlowChartExecutor, ManifestFlowRecorder, ScopeFacade } from "footprintjs";
import type { FlowChart } from "footprintjs";
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
  /** Describe a service flow (build-time stage descriptions) */
  describeService(actionId: string, schoolType?: SchoolType): ServiceDescription | undefined;
  /** Describe all registered services */
  describeAllServices(schoolType?: SchoolType): readonly ServiceDescription[];
};

export type SchoolServiceResult = {
  readonly status: "success" | "error";
  readonly result?: Record<string, unknown>;
  readonly error?: string;
  readonly manifest: readonly ManifestEntry[];
  readonly narrative: readonly string[];
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

type FlowBuilder = (repo: SchoolRepository, t?: (key: string) => string) => FlowChart;

/** All action-to-flow-builder mappings */
const FLOW_BUILDERS: Record<string, FlowBuilder> = {
  "enroll-student": createEnrollmentFlow,
  "create-attendance-session": createAttendanceFlow,
  "mark-attendance": createAttendanceFlow,
  "schedule-class": createSchedulingFlow,
  "check-availability": createCheckAvailabilityFlow,
  "create-grade": createGradeFlow,
  "create-section": createSectionFlow,
  "calculate-fees": createCalculateFeesFlow,
};

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

      const manifest = new ManifestFlowRecorder();
      const executor = new FlowChartExecutor(
        flow,
        undefined,
        undefined,
        { input, schoolType: context.schoolType, unitId: context.unitId },
      );
      executor.enableNarrative();
      executor.attachFlowRecorder(manifest);

      try {
        await executor.run();
        const snapshot = executor.getSnapshot();

        return {
          status: "success",
          result: snapshot.sharedState as Record<string, unknown>,
          manifest: manifest.getManifest(),
          narrative: executor.getNarrative(),
        };
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          manifest: manifest.getManifest(),
          narrative: executor.getNarrative(),
        };
      }
    },
  };
}

/**
 * Create a composed "school operations" flow that orchestrates multiple services.
 */
export function createSchoolOperationsFlow(repo: SchoolRepository) {
  const enrollmentFlow = createEnrollmentFlow(repo);
  const attendanceFlow = createAttendanceFlow(repo);
  const schedulingFlow = createSchedulingFlow(repo);

  return flowChart<any, ScopeFacade>(
    "Route-Operation",
    async (scope: ScopeFacade) => {
      const operation = scope.getValue("operation") as string;
      if (!operation) throw new Error("Operation is required");
      scope.setValue("operation", operation, false, `Routing to ${operation} service`);
    },
    "route-operation",
    undefined,
    "Route an incoming request to the appropriate school service",
  )
    .addSelectorFunction(
      "Select-Service",
      async (scope: ScopeFacade) => {
        const operation = scope.getValue("operation") as string;
        const serviceMap: Record<string, string> = {
          enroll: "enrollment",
          attendance: "attendance",
          schedule: "scheduling",
        };
        return serviceMap[operation] ?? "unknown";
      },
      "select-service",
      "Select which school service to invoke based on the operation type",
    )
      .addSubFlowChartBranch("enrollment", enrollmentFlow, "Enrollment-Service", {
        inputMapper: (parentScope: unknown) => {
          const scope = parentScope as Record<string, unknown>;
          return { input: scope.input };
        },
      })
      .addSubFlowChartBranch("attendance", attendanceFlow, "Attendance-Service", {
        inputMapper: (parentScope: unknown) => {
          const scope = parentScope as Record<string, unknown>;
          return { input: scope.input };
        },
      })
      .addSubFlowChartBranch("scheduling", schedulingFlow, "Scheduling-Service", {
        inputMapper: (parentScope: unknown) => {
          const scope = parentScope as Record<string, unknown>;
          return { input: scope.input };
        },
      })
      .addFunctionBranch(
        "unknown",
        "Unknown-Operation",
        async (scope: ScopeFacade) => {
          throw new Error(`Unknown operation: ${scope.getValue("operation")}`);
        },
        "Unknown operation — raise error",
      )
      .end()
    .build();
}
