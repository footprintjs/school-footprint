/**
 * Quick Start — Create a school platform in 10 lines
 *
 * This is the simplest possible school-footprint setup.
 * One profile store, one stub repository, one platform.
 *
 * Run: npx tsx examples/01-quick-start.ts
 */
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  createStubRepository,
} from "school-footprint";

const platform = createSchoolPlatform({
  profileStore: createMemoryProfileStore([
    { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
    { unitId: "k12-1", profileType: "k12", createdAt: "2024-01-01" },
  ]),
  repository: createStubRepository("quick-start"),
});

// Describe what the platform can do for a dance school
const ctx = { tenantId: "t1", campusId: "c1", unitId: "dance-1" };
const description = platform.describeAllServices(ctx, "dance");

console.log("=== Quick Start: Dance School Services ===\n");
for (const svc of description) {
  console.log(`  ${svc.actionId}`);
  console.log(`    ${svc.description}`);
  for (const stage of svc.stages) {
    console.log(`      → ${stage.name}: ${stage.description ?? "(no description)"}`);
  }
  console.log();
}

console.log(`Total services available: ${description.length}`);
