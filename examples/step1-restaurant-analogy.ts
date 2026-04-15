/**
 * Step 1: The Restaurant Analogy
 *
 * Before building anything — see how 5 school types compare.
 * Same platform, different configurations. Like McDonald's vs Sushi Bar vs Pizza Shop.
 *
 * Run: npx tsx examples/step1-restaurant-analogy.ts
 */
import {
  getAllSchoolTypeConfigs,
  resolveSchoolTerminology,
  type SchoolType,
} from "school-footprint";

const types: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];
const configs = getAllSchoolTypeConfigs();

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║          Step 1: The Restaurant Analogy                         ║");
console.log("║          Same platform, different configurations                ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

// --- Like comparing restaurant menus ---
console.log("Each school type is like a different restaurant franchise:\n");
console.log("  McDonald's  = K-12          (fixed menu, shifts, drive-thru)");
console.log("  Sushi Bar   = Dance Studio  (flexible seating, time-slots)");
console.log("  Pizza Shop  = Music School  (appointments, per-lesson billing)");
console.log("  Cafe        = Kindergarten  (activity blocks, monthly rate)");
console.log("  Food Truck  = Tutoring      (flexible slots, per-session)\n");

// --- The configuration differences ---
console.log("── Scheduling Strategy (like kitchen equipment) ──\n");
for (const t of types) {
  console.log(`  ${t.padEnd(14)} → ${configs[t].schedulingPattern}`);
}

console.log("\n── Terminology (like menu language) ──\n");
const terms = ["student", "teacher", "grade", "section", "period"] as const;
for (const t of types) {
  const resolved = resolveSchoolTerminology(t);
  const labels = terms.map((k) => resolved[k]?.singular ?? k).join(", ");
  console.log(`  ${t.padEnd(14)} → ${labels}`);
}

console.log("\n── Modules (like restaurant features) ──\n");
for (const t of types) {
  const mods = configs[t].enabledModules.join(", ");
  console.log(`  ${t.padEnd(14)} → ${mods}`);
}

console.log("\n── Theme (like branding) ──\n");
for (const t of types) {
  console.log(`  ${t.padEnd(14)} → ${configs[t].theme.label} (${configs[t].theme.accent})`);
}

console.log("\n✓ All from configuration. Zero code differences between school types.");
