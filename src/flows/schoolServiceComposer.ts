import { flowChart, FlowChartExecutor, ManifestFlowRecorder, ScopeFacade } from "footprintjs";
import type { FlowChart } from "footprintjs";
import type { SchoolRepository, SchoolFlowContext } from "../types.js";
import { createEnrollmentFlow } from "./enrollment/enrollmentFlow.js";
import { createAttendanceFlow } from "./attendance/attendanceFlow.js";
import { createSchedulingFlow } from "./scheduling/schedulingFlow.js";

/**
 * Service flow registry — maps action IDs to their flowchart builders.
 * Each service is a footprintjs flowchart that can be composed as a subflow.
 */
export type SchoolServiceRegistry = {
  /** Get the flow for a specific action */
  getFlow(actionId: string): FlowChart | undefined;
  /** List all registered service IDs */
  serviceIds(): readonly string[];
  /** Execute a service flow with manifest tracking */
  executeService(
    actionId: string,
    input: Record<string, unknown>,
    context: SchoolFlowContext,
  ): Promise<SchoolServiceResult>;
};

export type SchoolServiceResult = {
  readonly status: "success" | "error";
  readonly result?: Record<string, unknown>;
  readonly error?: string;
  readonly manifest: readonly ManifestEntry[];
  readonly narrative: readonly string[];
};

type ManifestEntry = {
  subflowId: string;
  name: string;
  description?: string;
  children: ManifestEntry[];
};

/**
 * Create the school service registry — wires repository to flows.
 *
 * Each service is a footprintjs flowchart. When composed together (e.g., enrollment
 * triggers attendance setup), they form a tree of services tracked by ManifestFlowRecorder.
 */
export function createSchoolServiceRegistry(repo: SchoolRepository): SchoolServiceRegistry {
  const enrollmentFlow = createEnrollmentFlow(repo);
  const attendanceFlow = createAttendanceFlow(repo);
  const schedulingFlow = createSchedulingFlow(repo);

  const flows = new Map<string, FlowChart>([
    ["enroll-student", enrollmentFlow],
    ["create-attendance-session", attendanceFlow],
    ["mark-attendance", attendanceFlow],
    ["schedule-class", schedulingFlow],
  ]);

  return {
    getFlow(actionId) {
      return flows.get(actionId);
    },

    serviceIds() {
      return Object.freeze(Array.from(flows.keys()));
    },

    async executeService(actionId, input, context) {
      const flow = flows.get(actionId);
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
 *
 * This demonstrates footprintjs v0.9.0's subflow composition — the school platform
 * is a tree of services, each service is a flowchart, and the manifest tracks
 * which services ran and what happened.
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
