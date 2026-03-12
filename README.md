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

### 5 School Profiles

Each profile selects which modules are enabled and configures extended metadata:

| Profile | Scheduling Pattern | Theme Accent | Example Terms |
|---------|-------------------|--------------|---------------|
| K-12 | `fixed-timetable` | Teal `#0d9488` | Student, Teacher, Period |
| Dance | `time-slots` | Rose `#c0506a` | Dancer, Instructor, Time Slot |
| Music | `appointments` | Indigo `#6366f1` | Student (Music), Instructor, Lesson Slot |
| Kindergarten | `activity-blocks` | Green `#22c55e` | Child, Caregiver, Activity Block |
| Tutoring | `flexible-slots` | Slate `#64748b` | Learner, Tutor, Session Slot |

### 16 Terminology Keys

Every user-facing label is configurable per school type:

```
student, teacher, employee, grade, section, subject, course, courseGroup,
term, period, stream, department, family, parent, academicYear, attendance
```

### 10 Adapters

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

The adapter registry routes capability calls (like `schedule-class` or `calculate-fees`) to the correct adapter based on the school's profile type.

### Service Flows (footprintjs)

Three flowchart-based service flows with full narrative tracing:

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

Every flow stage produces narrative entries explaining what happened and why — making the system AI-explainable.

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
```

## SchoolRepository Interface

Flows use a port interface — swap in any backend (Prisma, in-memory, external API):

```typescript
interface SchoolRepository {
  createStudent(data: { name: string; dob: string; familyId?: string }): Promise<Record<string, unknown>>;
  createScheduleEntry(data: { teacherId: string; classId: string; slot: unknown }): Promise<Record<string, unknown>>;
  findConflicts(query: { teacherId: string; classId: string; slot: unknown }): Promise<readonly Record<string, unknown>[]>;
  createAttendanceSession(data: { classId: string; date: string; teacherId?: string }): Promise<Record<string, unknown>>;
  markAttendance(sessionId: string, records: readonly Record<string, unknown>[]): Promise<Record<string, unknown>>;
}
```

## Project Structure

```
src/
  modules/          7 school modules (students, academics, attendance, ...)
  profiles/         5 school type profiles with extended config
  terminology/      16 configurable term keys per school type
  capabilities/     5 capability definitions
  adapters/         10 adapters (5 scheduling + 5 fee) with mappings
  actions/          8 action definitions for MCP tool generation
  flows/
    enrollment/     Enrollment service flow
    scheduling/     Scheduling service flow with conflict detection
    attendance/     Attendance service flow with subflow composition
    schoolServiceComposer.ts   Service registry + composed operations flow
  schoolPlatform.ts Platform entry point wiring everything together
  types.ts          Core type definitions
  index.ts          Public API
```

## Tests

```bash
npm test        # 77 tests across 9 test files
```

Test coverage includes:
- **Unit tests** — modules, profiles, terminology, adapter routing
- **Scenario tests** — enrollment/scheduling/attendance flows, service composition, full platform integration

## License

MIT
