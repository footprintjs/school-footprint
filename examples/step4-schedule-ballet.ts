/**
 * Step 4: The Instructor Schedules a Class
 *
 * Instructor T1 says: "Put Ballet Basics on Monday, Time Slot P1."
 *
 * The system:
 *   1. Finds the dance school's scheduling strategy (time-slots)
 *   2. Builds a flow: Validate → Check-Conflicts → Decide → Create/Report
 *   3. Runs it with full tracing
 *
 * Run: npx tsx examples/step4-schedule-ballet.ts
 */
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  schoolStrategyMappings,
  type SchoolRepository,
} from "school-footprint";

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║          Step 4: Schedule Ballet Basics                         ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

// --- Step 4a: Show strategy selection ---
console.log("Step 4a: Find the right strategy\n");
console.log('  School type = "dance"');
console.log('  Capability  = "schedule-class"\n');

const schedMapping = schoolStrategyMappings.find((m) => m.capabilityId === "schedule-class");
if (schedMapping) {
  for (const [type, strategy] of Object.entries(schedMapping.profileAdapters)) {
    const marker = type === "dance" ? " ← THIS" : "";
    console.log(`  ${type.padEnd(14)} → ${strategy}${marker}`);
  }
}

console.log("\n  The time-slots strategy handles:");
console.log("    flexible start/end times per slot");
console.log("    drop-in class support");
console.log("    no fixed weekly grid required\n");

// --- Create platform with a repo that tracks calls ---
const repo: SchoolRepository = {
  async createStudent(i) { return { id: 1, firstName: String(i.firstName), lastName: "", schoolId: 1, isActive: true }; },
  async findStudents() { return []; },
  async createAttendanceSession() { return { id: 1, classId: "", date: "", records: [] }; },
  async markAttendance() { return { studentId: "", status: "present", markedAt: "" }; },
  async createScheduleEntry(input) {
    console.log(`    → repo.createScheduleEntry() called`);
    console.log(`      teacherId: ${input.teacherId}, classId: ${input.classId}`);
    console.log(`      slot: ${JSON.stringify(input.slot)}`);
    return { id: 99, teacherId: input.teacherId, classId: input.classId, slot: input.slot };
  },
  async findConflicts() {
    console.log("    → repo.findConflicts() called → [] (no conflicts)");
    return []; // No conflicts for this demo
  },
  async createGrade() { return { id: 1, name: "", schoolId: 1 }; },
  async createSection() { return { id: 1, gradeId: 1, name: "", schoolId: 1 }; },
  async checkAvailability() { return { available: true, slot: {} }; },
  async calculateFee() { return { studentId: "", amount: 0, currency: "USD", breakdown: [] }; },
};

const platform = createSchoolPlatform({
  profileStore: createMemoryProfileStore([
    { unitId: "studio-1", profileType: "dance", createdAt: "2024-01-01" },
  ]),
  repository: repo,
});

const ctx = { tenantId: "t1", campusId: "c1", unitId: "studio-1" };

(async () => {
  // --- Step 4b: Show flow structure ---
  console.log("Step 4b: Build the scheduling flow\n");
  const desc = platform.describeService(ctx, "schedule-class", "dance");
  if (desc) {
    for (const stage of desc.stages) {
      console.log(`  ${stage.name.padEnd(22)} ← "${stage.description ?? ""}"`);
    }
  }

  // --- Step 4c: Run and show what footprintjs records ---
  console.log("\nStep 4c: Run it\n");
  const result = await platform.executeServiceFlow(ctx, "schedule-class", {
    teacherId: "T1",
    classId: "ballet-basics",
    dayOfWeek: 1,
    periodId: "P1",
  });

  console.log(`\n  Status: ${result.status}\n`);

  console.log("  Narrative (what footprintjs recorded):");
  for (const line of result.narrative) {
    console.log(`    ${line}`);
  }

  console.log('\n✓ Ballet Basics scheduled for Instructor T1, Monday P1.');
  console.log('  With NarrativeRenderer: "Instructor" not "Teacher", "Time Slot" not "Period".');
})();
