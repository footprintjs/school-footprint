/**
 * Step 3: A Parent Enrolls Their Child
 *
 * The parent fills out a form: "Enroll Alice in Ballet."
 * The enrollment flow runs:
 *   Validate-Input → Prepare-Context → Enroll-Student → Link-Grade
 *
 * Every stage is traced with reads, writes, and narrative output.
 *
 * Run: npx tsx examples/step3-enroll-alice.ts
 */
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  type SchoolRepository,
  type Student,
} from "school-footprint";

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║          Step 3: Enroll Alice in Ballet                         ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

// --- In-memory repository (replace with Prisma in production) ---
let nextId = 1;
const students: Student[] = [];

const repo: SchoolRepository = {
  async createStudent(input) {
    const student: Student = {
      id: nextId++,
      firstName: input.firstName,
      lastName: input.lastName,
      schoolId: 1,
      isActive: true,
    };
    students.push(student);
    return student;
  },
  async findStudents() { return students; },
  async createAttendanceSession() { return { id: 1, classId: "c1", date: "2024-01-15", records: [] }; },
  async markAttendance() { return { studentId: "s1", status: "present", markedAt: new Date().toISOString() }; },
  async createScheduleEntry() { return { id: 1, teacherId: "T1", classId: "ballet-basics", slot: {} }; },
  async findConflicts() { return []; },
  async createGrade() { return { id: 1, name: "Level 3", schoolId: 1 }; },
  async createSection() { return { id: 1, gradeId: 1, name: "Ballet", schoolId: 1 }; },
  async checkAvailability() { return { available: true, slot: {} }; },
  async calculateFee() { return { studentId: "s1", amount: 150, currency: "USD", breakdown: [] }; },
};

// --- Create platform ---
const platform = createSchoolPlatform({
  profileStore: createMemoryProfileStore([
    { unitId: "studio-1", profileType: "dance", createdAt: "2024-01-01" },
  ]),
  repository: repo,
});

const ctx = { tenantId: "t1", campusId: "c1", unitId: "studio-1" };

(async () => {
  // --- Step 3a: The system finds the enrollment flow ---
  console.log("Step 3a: Find the right flow\n");
  console.log('  ActionFlowRegistry looks up "enroll-student"');
  console.log("  → default: createEnrollmentFlow (no dance-specific variant)");
  console.log("  → Result: use the default enrollment flow\n");

  // --- Step 3b: Show the flow structure before running ---
  console.log("Step 3b: Build the flow\n");
  const desc = platform.describeService(ctx, "enroll-student", "dance");
  if (desc) {
    for (const stage of desc.stages) {
      console.log(`  ${stage.name.padEnd(20)} ← "${stage.description ?? ""}"`);
    }
  }

  // --- Step 3c: Run it ---
  console.log("\nStep 3c: Run it\n");
  const result = await platform.executeServiceFlow(ctx, "enroll-student", {
    firstName: "Alice",
    lastName: "Smith",
  });

  console.log(`  Status: ${result.status}`);
  console.log(`  Created: ${JSON.stringify(result.result)}\n`);

  console.log("  Narrative (what footprintjs recorded):");
  for (const line of result.narrative) {
    console.log(`    ${line}`);
  }

  console.log("\n✓ Alice is enrolled as a Dancer (not Student — dance terminology!)");
})();
