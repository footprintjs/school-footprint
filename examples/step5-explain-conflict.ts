/**
 * Step 5: Something Goes Wrong — Explain It
 *
 * The next day, Instructor T1 is double-booked.
 * Admin asks: "Why?"
 *
 * explainResult() traces BACKWARD through the commit log to find
 * which stages contributed data to the conflict.
 *
 * Run: npx tsx examples/step5-explain-conflict.ts
 */
import { explainResult, createSchoolQualityScorer } from "school-footprint";

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║          Step 5: Explain the Conflict                           ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

console.log("  Instructor T1 is double-booked on Monday P1.");
console.log('  Admin asks: "Why?"\n');

// --- Simulate post-execution snapshot ---
// In production this comes from executor.getSnapshot().commitLog
const mockExecutor = {
  getSnapshot: () => ({
    commitLog: [
      {
        stageId: "load-periods",
        runtimeStageId: "load-periods#0",
        overwrite: ["periods", "availableSlots"],
        trace: [],
      },
      {
        stageId: "load-teacher",
        runtimeStageId: "load-teacher#1",
        overwrite: ["teacherSchedule"],
        trace: [{ type: "read", key: "periods" }],
      },
      {
        stageId: "assign-room",
        runtimeStageId: "assign-room#2",
        overwrite: ["roomAssignment"],
        trace: [
          { type: "read", key: "teacherSchedule" },
          { type: "read", key: "availableSlots" },
        ],
      },
      {
        stageId: "detect-conflict",
        runtimeStageId: "detect-conflict#3",
        overwrite: ["conflictDetected"],
        trace: [
          { type: "read", key: "roomAssignment" },
          { type: "read", key: "teacherSchedule" },
        ],
      },
    ],
  }),
};

// --- Trace backward ---
console.log("  explainResult(executor, \"conflictDetected\")\n");
console.log("  Traces BACKWARD through the commit log:\n");

const explanation = explainResult(mockExecutor, "conflictDetected");

if (explanation) {
  // Show the chain visually
  console.log('  "conflictDetected"');
  for (let i = 0; i < explanation.stages.length; i++) {
    const s = explanation.stages[i];
    const indent = "    " + "  ".repeat(i);
    console.log(`${indent}← written by "${s.stageId}" (${s.runtimeStageId})`);
    console.log(`${indent}   wrote: ${s.writtenKeys.join(", ")}`);
  }

  console.log(`\n  Summary: ${explanation.summary}`);
  console.log(`  Causal depth: ${explanation.depth} stages\n`);
  console.log("  Root cause: load-teacher loaded stale schedule data");
  console.log("  before the other booking was committed.\n");
}

// --- Quality scoring ---
console.log("── Quality Scoring ──\n");

const scorer = createSchoolQualityScorer();

const stages = [
  { label: "load-periods (clean)", keys: ["periods"], snapshot: { periods: [1, 2, 3], status: "ok" } },
  { label: "load-teacher (clean)", keys: ["teacherSchedule"], snapshot: { teacherSchedule: {}, status: "ok" } },
  { label: "assign-room (clean)", keys: ["roomAssignment"], snapshot: { roomAssignment: "R1", status: "ok" } },
  { label: "detect-conflict (ERROR)", keys: ["conflictDetected", "conflictError"], snapshot: { conflictDetected: true, conflictError: "Double booking", status: "error" } },
];

for (const s of stages) {
  const score = scorer(s.label, s.keys, s.snapshot);
  const bar = "█".repeat(Math.round(score * 20)) + "░".repeat(20 - Math.round(score * 20));
  console.log(`  ${s.label.padEnd(30)} ${bar} ${(score * 100).toFixed(0)}%`);
}

console.log("\n✓ The conflict stage scored lowest — quality dropped where the error occurred.");
