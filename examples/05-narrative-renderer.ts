/**
 * Narrative Renderer — School-specific terminology in flow output
 *
 * A dance school sees "Enrolled Dancer Alice" instead of "Enrolled Student Alice".
 * The NarrativeRenderer replaces default K-12 terms with school-specific ones.
 *
 * Run: npx tsx examples/05-narrative-renderer.ts
 */
import {
  createSchoolNarrativeRenderer,
  buildTermReplacer,
  type SchoolType,
} from "school-footprint";

console.log("=== Narrative Renderer: Term Replacement ===\n");

const types: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];
const sampleText = "Student enrolled in Grade 5, Section A. Teacher assigned to Period P1.";

for (const type of types) {
  const replace = buildTermReplacer(type);
  console.log(`[${type.padEnd(12)}] ${replace(sampleText)}`);
}

console.log("\n--- Full Renderer (stage + ops + decisions) ---\n");

const danceRenderer = createSchoolNarrativeRenderer("dance");

console.log(
  danceRenderer.renderStage!({
    stageName: "Enroll-Student",
    stageNumber: 1,
    isFirst: true,
    description: "Register a new Student in the system",
  })
);

console.log(
  danceRenderer.renderOp!({
    type: "write",
    key: "studentName",
    rawValue: "Alice",
    valueSummary: '"Alice"',
    stepNumber: 1,
  })
);

console.log(
  danceRenderer.renderDecision!({
    decider: "Grade-Assignment",
    chosen: "Level-3",
    description: "Assign Student to appropriate Grade",
  })
);

console.log(
  danceRenderer.renderError!({
    stageName: "Create-Section",
    message: "Section capacity exceeded for Grade 5",
  })
);
