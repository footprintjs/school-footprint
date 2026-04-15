/**
 * School Type Comparison — Same platform, 5 different schools
 *
 * Shows how Profile-Derived Context (PDC) works:
 * one line changes the school type → everything else adapts.
 *
 * Run: npx tsx examples/03-school-type-comparison.ts
 */
import {
  getAllSchoolTypeConfigs,
  resolveSchoolTerminology,
  type SchoolType,
} from "school-footprint";

const configs = getAllSchoolTypeConfigs();

console.log("=== School Type Comparison ===\n");
console.log("Same platform, different configurations:\n");

const types: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];

// Header
console.log(
  "| Feature".padEnd(22) +
  types.map((t) => `| ${t}`.padEnd(16)).join("") +
  "|"
);
console.log(
  "|" + "-".repeat(21) +
  types.map(() => "|" + "-".repeat(15)).join("") +
  "|"
);

// Scheduling pattern
console.log(
  "| Scheduling".padEnd(22) +
  types.map((t) => `| ${configs[t].schedulingPattern}`.padEnd(16)).join("") +
  "|"
);

// Module count
console.log(
  "| Modules".padEnd(22) +
  types.map((t) => `| ${configs[t].enabledModules.length}`.padEnd(16)).join("") +
  "|"
);

// Theme
console.log(
  "| Theme".padEnd(22) +
  types.map((t) => `| ${configs[t].theme.label}`.padEnd(16)).join("") +
  "|"
);

// Key terminology differences
console.log("\n--- Terminology per school type ---\n");

const termKeys = ["student", "teacher", "grade", "section", "period"] as const;

console.log(
  "| Term".padEnd(15) +
  types.map((t) => `| ${t}`.padEnd(16)).join("") +
  "|"
);
console.log(
  "|" + "-".repeat(14) +
  types.map(() => "|" + "-".repeat(15)).join("") +
  "|"
);

for (const key of termKeys) {
  const row = types.map((t) => {
    const terms = resolveSchoolTerminology(t);
    return `| ${terms[key]?.singular ?? key}`.padEnd(16);
  });
  console.log(`| ${key}`.padEnd(15) + row.join("") + "|");
}
