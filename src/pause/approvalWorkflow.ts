/**
 * Approval workflow support using footprintjs Pause/Resume (v4.3.0+).
 *
 * Wraps `addPausableFunction` into a school-domain-specific API that
 * handles enrollment approvals, schedule change requests, and other
 * workflows requiring human review before proceeding.
 *
 * @example
 * ```ts
 * import { createApprovalStage, resumeApproval } from "school-footprint";
 * import { flowChart, FlowChartExecutor } from "footprintjs";
 *
 * const chart = flowChart("Intake", seedFn, "intake")
 *   .addPausableFunction(...createApprovalStage({
 *     name: "Admin-Review",
 *     stageId: "admin-review",
 *     description: "Principal reviews the enrollment request",
 *     buildReviewPayload: (scope) => ({
 *       studentName: scope.getValue("studentName"),
 *       conflicts: scope.getValue("conflicts"),
 *     }),
 *     applyDecision: (scope, decision) => {
 *       scope.setValue("approved", decision.approved);
 *       scope.setValue("reviewNotes", decision.notes);
 *     },
 *   }))
 *   .addFunction("Finalize", finalizeFn, "finalize")
 *   .build();
 *
 * const executor = new FlowChartExecutor(chart);
 * await executor.run({ input: { studentId: "123" } });
 *
 * if (executor.isPaused()) {
 *   const checkpoint = executor.getCheckpoint(); // store in DB
 *   // Later, after admin decision:
 *   await resumeApproval(executor, checkpoint, { approved: true, notes: "OK" });
 * }
 * ```
 *
 * @module
 */

/**
 * Decision payload that an approver submits to resume a paused workflow.
 * Generic over `TExtra` for domain-specific fields beyond approved/notes.
 */
export interface ApprovalDecision<TExtra = Record<string, unknown>> {
  approved: boolean;
  notes?: string;
  /** Domain-specific fields (e.g., { reassignTo: "teacher-5" }). */
  extra?: TExtra;
}

/**
 * Configuration for a pausable approval stage.
 *
 * @typeParam TScope - The flow's scope type (ScopeFacade or TypedScope)
 * @typeParam TPayload - Data shown to the reviewer while paused
 * @typeParam TExtra - Extra fields on the approval decision
 */
export interface ApprovalStageConfig<
  TScope = any,
  TPayload = Record<string, unknown>,
  TExtra = Record<string, unknown>,
> {
  /** Stage display name in the flow (e.g., "Admin-Review"). */
  name: string;
  /** Unique stage identifier for the flow graph. */
  stageId: string;
  /** Human-readable description for narrative output. */
  description?: string;
  /**
   * Extract data from the scope to present to the reviewer.
   * Returning `undefined` skips the pause (conditional approval).
   */
  buildReviewPayload: (scope: TScope) => TPayload | undefined;
  /**
   * Apply the reviewer's decision back to the scope.
   * Called when the workflow resumes after approval.
   */
  applyDecision: (scope: TScope, decision: ApprovalDecision<TExtra>) => void;
}

/**
 * Create arguments for `addPausableFunction()` from an approval config.
 *
 * Returns a tuple `[name, handler, stageId, description]` that can be
 * spread into the builder's `addPausableFunction(...)`.
 *
 * @example
 * ```ts
 * const chart = flowChart("Start", startFn, "start")
 *   .addPausableFunction(...createApprovalStage({
 *     name: "Review",
 *     stageId: "review",
 *     buildReviewPayload: (scope) => ({ amount: scope.getValue("amount") }),
 *     applyDecision: (scope, d) => scope.setValue("approved", d.approved),
 *   }))
 *   .build();
 * ```
 */
export function createApprovalStage<TScope = any, TPayload = Record<string, unknown>, TExtra = Record<string, unknown>>(
  config: ApprovalStageConfig<TScope, TPayload, TExtra>
): [
  name: string,
  handler: { execute: (scope: TScope) => TPayload | undefined; resume: (scope: TScope, input: ApprovalDecision<TExtra>) => void },
  stageId: string,
  description?: string,
] {
  return [
    config.name,
    {
      execute: (scope: TScope) => config.buildReviewPayload(scope),
      resume: (scope: TScope, input: ApprovalDecision<TExtra>) =>
        config.applyDecision(scope, input),
    },
    config.stageId,
    config.description,
  ];
}

/**
 * Resume a paused approval workflow with the reviewer's decision.
 *
 * Convenience wrapper around `executor.resume(checkpoint, decision)`.
 * Validates that the executor is actually paused before resuming.
 *
 * @param executor - The FlowChartExecutor instance
 * @param checkpoint - The serialized checkpoint from `executor.getCheckpoint()`
 * @param decision - The reviewer's approval decision
 * @throws {Error} If the executor is not in a paused state
 */
export async function resumeApproval<TExtra = Record<string, unknown>>(
  executor: { isPaused(): boolean; resume(checkpoint: unknown, input: unknown): Promise<unknown> },
  checkpoint: unknown,
  decision: ApprovalDecision<TExtra>
): Promise<unknown> {
  if (!executor.isPaused()) {
    throw new Error("Cannot resume: executor is not paused. Was the flow already completed or resumed?");
  }
  return executor.resume(checkpoint, decision);
}
