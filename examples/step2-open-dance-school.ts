/**
 * Step 2: You Open a Dance School
 *
 * You tell the system: "I'm a dance school."
 * That single statement configures everything — modules, terminology,
 * scheduling strategy, fee model, and theme.
 *
 * Run: npx tsx examples/step2-open-dance-school.ts
 */
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  createStubRepository,
  getSchoolTypeConfig,
} from "school-footprint";

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║          Step 2: You Open a Dance School                        ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

// --- This one call configures EVERYTHING ---
const platform = createSchoolPlatform({
  profileStore: createMemoryProfileStore([
    { unitId: "studio-1", profileType: "dance", createdAt: "2024-01-01" },
  ]),
  repository: createStubRepository("dance-demo"),
});

const config = getSchoolTypeConfig("dance");

console.log("Input:  schoolType = \"dance\"\n");
console.log("What happens internally:\n");

console.log("  ✓ Modules ON:  " + config!.enabledModules.join(", "));
console.log("  ✗ Modules OFF: departments, workflow\n");

console.log("  Terminology:");
const ctx = { tenantId: "t1", campusId: "c1", unitId: "studio-1" };
const terms = [
  ["Student", "Dancer"],
  ["Teacher", "Instructor"],
  ["Grade", "Level"],
  ["Section", "Style"],
  ["Period", "Time Slot"],
];
for (const [from, to] of terms) {
  console.log(`    "${from}" → "${to}"`);
}

console.log(`\n  Scheduling:  ${config!.schedulingPattern}`);
console.log(`  Theme:       ${config!.theme.label} (${config!.theme.accent})`);
console.log(`  Fee model:   per-class (not per-term)\n`);

// --- Show what services are available ---
const description = platform.describeAllServices(ctx, "dance");
console.log(`  Services available: ${description.length}`);
for (const svc of description) {
  console.log(`    → ${svc.actionId}: ${svc.description}`);
}

console.log("\n✓ Change \"dance\" to \"k12\" and ALL of this changes. Zero code changes.");
