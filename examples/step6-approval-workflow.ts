/**
 * Step 6: Approval Needed — Pause/Resume
 *
 * A new dancer wants to join Level 3, but the class is at capacity.
 * The enrollment flow PAUSES for principal approval.
 *
 *   Intake → Validate → ⏸ Principal-Review → Finalize
 *
 * The checkpoint is saved to the database (JSON-serializable).
 * Hours later, the principal approves and the flow resumes.
 *
 * Run: npx tsx examples/step6-approval-workflow.ts
 */
import { flowChart, FlowChartExecutor } from "footprintjs";
import {
  createApprovalStage,
  resumeApproval,
  type ApprovalDecision,
} from "school-footprint";

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║          Step 6: Approval Workflow                              ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

(async () => {
  // --- Build the flow ---
  const chart = flowChart("Intake", async (scope) => {
    scope.setValue("studentName", "Alice Smith");
    scope.setValue("requestedLevel", "Level 3");
    scope.setValue("capacityStatus", "at-limit");
    console.log("  Stage 1: Intake              ✓ completed");
    console.log("    → studentName: Alice Smith");
    console.log("    → requestedLevel: Level 3");
    console.log("    → capacityStatus: at-limit");
  }, "intake", undefined, "Collect enrollment request data")

  .addFunction("Validate", async (scope) => {
    const name = scope.getValue("studentName");
    if (!name) throw new Error("Name required");
    scope.setValue("validated", true);
    console.log("  Stage 2: Validate            ✓ completed");
  }, "validate", "Check required fields and capacity")

  .addPausableFunction(
    ...createApprovalStage({
      name: "Principal-Review",
      stageId: "principal-review",
      description: "Principal reviews enrollment when capacity is at limit",
      buildReviewPayload: (scope) => {
        if (scope.getValue("capacityStatus") !== "at-limit") return undefined;
        return {
          studentName: scope.getValue("studentName"),
          requestedLevel: scope.getValue("requestedLevel"),
          reason: "Class is at capacity — principal override required",
        };
      },
      applyDecision: (scope, decision: ApprovalDecision) => {
        scope.setValue("approved", decision.approved);
        scope.setValue("reviewNotes", decision.notes ?? "");
        console.log(`  Stage 3: Principal-Review    ▶ RESUMED`);
        console.log(`    → approved: ${decision.approved}`);
        console.log(`    → notes: "${decision.notes}"`);
      },
    })
  )

  .addFunction("Finalize", async (scope) => {
    const approved = scope.getValue("approved");
    const status = approved ? "enrolled" : "rejected";
    scope.setValue("enrollmentStatus", status);
    console.log(`  Stage 4: Finalize            ✓ completed`);
    console.log(`    → enrollmentStatus: ${status}`);
  }, "finalize", "Complete enrollment based on approval decision")

  .build();

  // --- Run until pause ---
  const executor = new FlowChartExecutor(chart);
  await executor.run();

  console.log(`  Stage 3: Principal-Review    ⏸ PAUSED\n`);
  console.log(`  Review payload sent to principal:`);
  console.log(`    studentName: "Alice Smith"`);
  console.log(`    requestedLevel: "Level 3"`);
  console.log(`    reason: "Class is at capacity"\n`);

  if (executor.isPaused()) {
    // --- Save checkpoint ---
    const checkpoint = executor.getCheckpoint();
    const serialized = JSON.stringify(checkpoint);
    console.log(`  Checkpoint saved (${serialized.length} bytes, JSON-serializable)`);
    console.log(`  ── TIME PASSES (hours/days) ──\n`);

    // --- Simulate: principal approves ---
    console.log(`  Principal clicks "Approve":`);
    console.log(`    approved: true`);
    console.log(`    notes: "Override granted — exceptional talent"\n`);

    const restored = JSON.parse(serialized);
    await resumeApproval(executor, restored, {
      approved: true,
      notes: "Override granted — exceptional talent",
    });

    console.log("\n  ✅ Done — Alice is enrolled in Level 3");
    console.log("\n✓ The flow paused, checkpoint was stored, and resumed later.");
    console.log("  Narrative continues across pause/resume — one continuous trace.");
  }
})();
