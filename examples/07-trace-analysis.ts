/**
 * Trace Analysis — Explain what caused a result
 *
 * After a flow runs, ask: "What stages caused this conflict?"
 * Uses backward program slicing (causal chain) on the commit log.
 *
 * Run: npx tsx examples/07-trace-analysis.ts
 */
import { explainResult, createSchoolQualityScorer } from "school-footprint";

console.log("=== Trace Analysis: Causal Chain ===\n");

// Simulate a post-execution snapshot with commit log
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

// Explain: what caused the conflict?
const explanation = explainResult(mockExecutor, "conflictDetected");

if (explanation) {
  console.log("Question: What caused 'conflictDetected'?\n");
  console.log(`Answer: ${explanation.summary}\n`);
  console.log(`Causal depth: ${explanation.depth} stages\n`);
  console.log("Contributing stages:");
  for (const stage of explanation.stages) {
    console.log(`  ${stage.runtimeStageId}`);
    console.log(`    wrote: ${stage.writtenKeys.join(", ")}`);
  }
}

// --- Quality Scoring ---
console.log("\n=== Quality Scoring ===\n");

const scorer = createSchoolQualityScorer();

const testCases = [
  { label: "Clean stage", stageId: "enroll", keys: ["student"], snapshot: { student: { id: 1 }, status: "ok" } },
  { label: "Error stage", stageId: "validate", keys: ["validationError"], snapshot: { validationError: "Name required", status: "error" } },
  { label: "Conflict stage", stageId: "schedule", keys: ["conflict"], snapshot: { conflict: true, status: "ok" } },
  { label: "Null writes", stageId: "link", keys: ["gradeId", "sectionId"], snapshot: { gradeId: null, sectionId: null } },
];

for (const tc of testCases) {
  const score = scorer(tc.stageId, tc.keys, tc.snapshot);
  const bar = "█".repeat(Math.round(score * 20)) + "░".repeat(20 - Math.round(score * 20));
  console.log(`  ${tc.label.padEnd(18)} ${bar} ${(score * 100).toFixed(0)}%`);
}
