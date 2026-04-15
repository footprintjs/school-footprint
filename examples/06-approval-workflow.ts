/**
 * Approval Workflow — Pause/Resume with human review
 *
 * Shows how enrollment can be paused for principal approval:
 *   Intake → Validate → ⏸ Admin-Review → Finalize
 *
 * The checkpoint is JSON-serializable — store in Postgres, Redis,
 * or even localStorage. Resume hours or days later.
 *
 * Run: npx tsx examples/06-approval-workflow.ts
 */
import { flowChart, FlowChartExecutor } from "footprintjs";
import {
  createApprovalStage,
  resumeApproval,
  type ApprovalDecision,
} from "school-footprint";

(async () => {
  console.log("=== Approval Workflow: Enrollment Review ===\n");

  // Build a flow with a pausable approval stage
  const chart = flowChart("Intake", async (scope) => {
    scope.setValue("studentName", "Alice Smith");
    scope.setValue("requestedGrade", "Level 3");
    scope.setValue("capacityStatus", "at-limit");
  }, "intake", undefined, "Collect enrollment request data")
    .addPausableFunction(
      ...createApprovalStage({
        name: "Principal-Review",
        stageId: "principal-review",
        description: "Principal reviews enrollment when capacity is at limit",
        buildReviewPayload: (scope) => {
          // Only pause if capacity is at limit
          if (scope.getValue("capacityStatus") !== "at-limit") return undefined;
          return {
            studentName: scope.getValue("studentName"),
            requestedGrade: scope.getValue("requestedGrade"),
            reason: "Class is at capacity — principal override required",
          };
        },
        applyDecision: (scope, decision: ApprovalDecision) => {
          scope.setValue("approved", decision.approved);
          scope.setValue("reviewNotes", decision.notes ?? "");
        },
      })
    )
    .addFunction("Finalize", async (scope) => {
      const approved = scope.getValue("approved");
      scope.setValue("enrollmentStatus", approved ? "enrolled" : "rejected");
      scope.setValue("completedAt", new Date().toISOString());
    }, "finalize", "Complete enrollment based on approval decision")
    .build();

  // --- Step 1: Run until pause ---
  const executor = new FlowChartExecutor(chart);
  await executor.run();

  console.log("Step 1: Flow paused?", executor.isPaused());

  if (executor.isPaused()) {
    const checkpoint = executor.getCheckpoint();
    console.log("Step 2: Checkpoint saved (JSON-safe)");
    console.log("  Size:", JSON.stringify(checkpoint).length, "bytes");

    // Simulate: store checkpoint, wait for admin...
    const serialized = JSON.stringify(checkpoint);
    const restored = JSON.parse(serialized);

    // --- Step 2: Admin approves ---
    console.log("\nStep 3: Principal approves...");
    await resumeApproval(executor, restored, {
      approved: true,
      notes: "Override granted — exceptional talent",
    });

    const snapshot = executor.getSnapshot();
    console.log("\nStep 4: Flow completed!");
    console.log("  Status:", (snapshot as any).enrollmentStatus ?? "check scope");
    console.log("  Approved:", (snapshot as any).approved ?? "check scope");
  }
})();
