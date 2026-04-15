/**
 * Enroll a Student — Full flow execution with tracing
 *
 * Shows the complete enrollment flow:
 *   Validate → Prepare → Enroll → Link-Grade
 *
 * The flow uses footprintjs under the hood, so every stage is traced
 * with reads, writes, and narrative output.
 *
 * Run: npx tsx examples/02-enroll-student.ts
 */
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  type SchoolRepository,
  type Student,
} from "school-footprint";

// --- Fake in-memory repository (replace with Prisma in production) ---
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
  // Stubs for unused methods
  async createAttendanceSession() { return { id: 1, classId: "c1", date: "2024-01-01", records: [] }; },
  async markAttendance() { return { studentId: "s1", status: "present", markedAt: new Date().toISOString() }; },
  async createScheduleEntry() { return { id: 1, teacherId: "t1", classId: "c1", slot: {} }; },
  async findConflicts() { return []; },
  async createGrade() { return { id: 1, name: "Grade 1", schoolId: 1 }; },
  async createSection() { return { id: 1, gradeId: 1, name: "A", schoolId: 1 }; },
  async checkAvailability() { return { available: true, slot: {} }; },
  async calculateFee() { return { studentId: "s1", amount: 0, currency: "USD", breakdown: [] }; },
};

// --- Create platform and run the enrollment flow ---
const platform = createSchoolPlatform({
  profileStore: createMemoryProfileStore([
    { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
  ]),
  repository: repo,
});

const ctx = { tenantId: "t1", campusId: "c1", unitId: "dance-1" };

(async () => {
  console.log("=== Enrolling a Dancer (dance school) ===\n");

  const result = await platform.executeServiceFlow(ctx, "enroll-student", {
    firstName: "Alice",
    lastName: "Smith",
  });

  console.log("Status:", result.status);
  console.log("Result:", JSON.stringify(result.result, null, 2));
  console.log("\n--- Narrative (what happened step by step) ---");
  console.log(result.narrative.join("\n"));
  console.log("\n--- Flow Structure ---");
  console.log(JSON.stringify(result.flowMeta, null, 2));
})();
