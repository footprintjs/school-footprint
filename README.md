# SchoolFootprint

School-domain configuration layer for building any type of school management system.

SchoolFootprint sits on top of two libraries:
- **[footprint-blueprint](https://github.com/footprintjs/footprint-blueprint)** — domain-agnostic platform framework (features, tenancy, adapters, actions)
- **[footprintjs](https://www.npmjs.com/package/footprintjs)** — execution engine with flowchart-based service orchestration

Together they give you a configurable SIS engine where every school type (K-12, dance studio, music school, kindergarten, tutoring center) gets its own feature set, terminology, scheduling pattern, fee model, and UI theme — all from configuration, not custom code.

## Why

Every school is different. A dance studio tracks "Dancers" and "Instructors" in time-slot schedules. A K-12 school tracks "Students" and "Teachers" in fixed timetables with departments and academic workflows. A tutoring center runs appointment-based sessions with per-session fees.

SchoolFootprint encodes these differences as structured configuration so a single codebase can serve any school type. An AI agent (or human developer) can inspect the configuration tree to understand what a school supports and why.

## The Stack

```
footprintjs          → Execution engine (flowcharts, subflows, narrative, manifests)
footprint-blueprint  → Domain-agnostic platform framework (6 layers)
SchoolFootprint      → School-domain configuration + service flows  ← you are here
sis-platform         → Deployed SIS application (consumes SchoolFootprint)
```

## Architecture

### 7 Modules

Each module declares features, terminology, and seed data appropriate for the school domain:

| Module | K-12 | Dance | Music | Kindergarten | Tutoring |
|--------|------|-------|-------|--------------|----------|
| Students | yes | yes | yes | yes | yes |
| Academics | yes | no | no | yes | no |
| Attendance | yes | yes | yes | yes | yes |
| Scheduling | yes | yes | yes | yes | yes |
| Fees | yes | yes | yes | yes | yes |
| Departments | yes | no | no | no | no |
| Workflow | yes | no | no | no | no |

### 5 School Profiles (Unified Metadata)

Each profile carries modules, roles, scheduling pattern, services, module flags, and theme in a single `defineProfile()` call — no split metadata:

| Profile | Scheduling Pattern | Theme Accent | Example Terms |
|---------|-------------------|--------------|---------------|
| K-12 | `fixed-timetable` | Teal `#007f7a` | Student, Teacher, Period |
| Dance | `time-slots` | Rose `#c0506a` | Dancer, Instructor, Time Slot |
| Music | `appointments` | Indigo `#5b4fc7` | Student, Instructor, Lesson Slot |
| Kindergarten | `activity-blocks` | Green `#2e944e` | Child, Caregiver, Activity Block |
| Tutoring | `flexible-slots` | Slate `#3d6b8e` | Learner, Tutor, Session Slot |

### 16 Terminology Keys

Every user-facing label is configurable per school type **and per unit**:

```
student, teacher, employee, grade, section, subject, course, courseGroup,
term, period, stream, department, family, parent, academicYear, attendance
```

### 10 Adapters (with Real Logic)

Adapters are factory functions that receive the `SchoolRepository` — they check for conflicts, create entries, and calculate fees through the repository.

**5 Scheduling adapters** — one per scheduling pattern:
- `fixed-timetable` (K-12) — weekly grid with periods
- `time-slots` (Dance) — flexible time blocks
- `appointments` (Music) — one-on-one lesson slots
- `activity-blocks` (Kindergarten) — themed activity periods
- `flexible-slots` (Tutoring) — on-demand booking

**5 Fee adapters** — one per billing model:
- `per-term` (K-12) — semester/term-based fees
- `per-class` (Dance) — pay per class attended
- `per-lesson` (Music) — per-lesson billing
- `per-month` (Kindergarten) — monthly flat rate
- `per-session` (Tutoring) — per-session billing

### 8 Service Flows (footprintjs)

All 8 actions have flowchart-based service flows with dynamic terminology per school type:

**Enrollment Flow** — linear pipeline:
```
Validate-Input → Prepare-Context → Enroll-Student → Link-Grade
```

**Scheduling Flow** — conditional branching:
```
Validate-Assignment → Check-Conflicts → Conflict-Decision
                                          ├─ no-conflict → Create-Entry
                                          └─ has-conflict → Report-Conflict
```

**Attendance Flow** — subflow composition:
```
Validate-Session → Create-Session → Has-Records?
                                      ├─ yes → Mark-Attendance (subflow)
                                      └─ no  → Session-Created
```

**Plus:** Create-Grade, Create-Section, Check-Availability, Calculate-Fees flows.

Every flow stage produces narrative entries explaining what happened and why — making the system AI-explainable.

### Per-Unit Overrides

Individual school units can override terminology, module toggles, and theme without changing the school type configuration:

```typescript
const overrideStore = createMemoryOverrideStore({
  "dance-1": {
    terminologyOverrides: { student: "Performer", teacher: "Coach" },
    themeOverrides: { accent: "#ff0000" },
  },
});

const platform = createSchoolPlatform({
  profileStore: store,
  repository: myRepo,
  overrideStore,
});

const t = await platform.getTermResolverWithOverrides(ctx);
t("student");  // → "Performer" (overridden from "Dancer")
t("grade");    // → "Level" (falls back to dance school default)
```

### AI Planning API

The `describeService` API exposes build-time stage descriptions for AI agents to reason about flows before execution:

```typescript
const desc = platform.describeService("enroll-student", "dance");
// → {
//     actionId: "enroll-student",
//     description: "...",
//     stages: [
//       { id: "validate-input", description: "Validate that required enrollment fields are present" },
//       { id: "prepare-context", description: "Resolve Family linkage based on provided familyId" },
//       { id: "enroll-student", description: "Create the Dancer record in the repository" },
//       { id: "link-grade", description: "Assign the Dancer to a Level if specified" },
//     ]
//   }

const all = platform.describeAllServices("k12"); // describe all 8 services for K-12
```

## Quick Start

```typescript
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  createTenantContext,
} from "school-footprint";

// 1. Define which units exist and their school types
const store = createMemoryProfileStore([
  { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
  { unitId: "k12-1",   profileType: "k12",   createdAt: "2024-01-01" },
]);

// 2. Create the platform with a repository adapter
const platform = createSchoolPlatform({
  profileStore: store,
  repository: mySchoolRepository, // implements SchoolRepository interface
});

// 3. Resolve what a unit can do
const ctx = createTenantContext({ tenantId: "t1", unitId: "dance-1" });
const unit = await platform.resolveUnit(ctx);
// → { profileType: "dance", config: { enabledModules: Set(5), ... } }

// 4. Get terminology for this school type
const t = await platform.getTermResolver(ctx);
t("student");  // → "Dancer"
t("teacher");  // → "Instructor"
t("period");   // → "Time Slot"

// 5. Check if modules are enabled
const gate = await platform.gateCheck(ctx, ["students", "attendance"]);
// → { allowed: true }

// 6. Get available actions as MCP tool definitions
const tools = await platform.getAvailableActions(ctx);
// → [{ name: "enroll-student", ... }, { name: "schedule-class", ... }, ...]

// 7. Execute a service flow with full tracing
const result = await platform.executeServiceFlow(ctx, "enroll-student", {
  name: "Luna Martinez",
  dob: "2015-03-12",
});
// → { status: "success", result: { enrolledStudent: {...} }, narrative: [...] }

// 8. Describe what a service does (for AI planning)
const desc = platform.describeService("schedule-class", "dance");
// → { stages: [...], description: "..." }
```

## Typed SchoolRepository Interface

Flows and adapters use a strongly-typed port interface:

```typescript
type SchoolRepository = {
  createStudent(input: CreateStudentInput): Promise<Student>;
  findStudents(query: FindStudentsQuery): Promise<readonly Student[]>;
  createScheduleEntry(input: CreateScheduleEntryInput): Promise<ScheduleEntry>;
  findConflicts(input: FindConflictsInput): Promise<readonly Conflict[]>;
  createAttendanceSession(input: CreateSessionInput): Promise<AttendanceSession>;
  markAttendance(input: MarkAttendanceInput): Promise<AttendanceMark>;
  createGrade(input: CreateGradeInput): Promise<Grade>;
  createSection(input: CreateSectionInput): Promise<Section>;
  checkAvailability(input: CheckAvailabilityInput): Promise<AvailabilityResult>;
  calculateFee(input: CalculateFeeInput): Promise<FeeCalculation>;
};
```

## Project Structure

```
src/
  modules/          7 school modules (students, academics, attendance, ...)
  profiles/         5 school type profiles with unified metadata
  terminology/      16 configurable term keys per school type
  capabilities/     5 capability definitions
  adapters/         10 adapter factories (5 scheduling + 5 fee) with mappings
  actions/          8 action definitions for MCP tool generation
  flows/
    enrollment/     Enrollment service flow
    scheduling/     Scheduling + check-availability flows
    attendance/     Attendance service flow with subflow composition
    academics/      Create-grade + create-section flows
    fees/           Calculate-fees flow
    schoolServiceComposer.ts   Service registry with lazy per-type flow building
  overrides/        Per-unit override store
  schoolPlatform.ts Platform entry point wiring everything together
  types.ts          Domain entities + repository interface
  index.ts          Public API
```

## Tests

```bash
npm test        # 108 tests across 12 test files
```

Test coverage includes:
- **Unit tests** — modules, profiles, terminology, adapter routing, adapter factories
- **Scenario tests** — all 7 service flows, service composition, full platform integration, per-unit overrides, describeService API

## License

MIT
