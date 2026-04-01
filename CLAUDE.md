# school-footprint — AI Coding Instructions

Configurable SIS engine for any school type. "Shopify for Schools" — configuration drives behavior, not code.

## Core Principle

**Profile-Derived Context (PDC):** One profile definition derives modules, adapters, terminology, theme, scheduling pattern, and flow variants. Adding a school type = one profile, zero code changes in routes or services.

## Architecture

```
src/
├── types.ts            → Domain entities + SchoolRepository port (10 async methods)
├── schoolPlatform.ts   → Platform factory (createSchoolPlatform) — main entry point
├── helpers.ts          → Utilities (createPlatformForRequest, createStubRepository, etc.)
├── modules/            → 7 module definitions (students, academics, attendance, scheduling, fees, departments, workflow)
├── profiles/           → 5 school types (k12, dance, music, kindergarten, tutoring)
├── capabilities/       → 5 capability definitions (scheduleClass, checkAvailability, etc.)
├── terminology/        → 16 configurable term keys with per-school-type labels
├── adapters/           → 10 adapters (5 scheduling + 5 fee) with capability mapping
├── actions/            → 8 action definitions for MCP export
├── flows/              → 8 footprintjs service flows + ActionFlowRegistry + ActionDispatch
│   └── schoolServiceComposer.ts  → Core: registry, dispatch, execution (521 lines)
└── overrides/          → Per-unit customization (terminology, module toggles, theme)
```

Depends on: `footprintjs` (flowchart engine), `@footprint/*` (blueprint framework)

## Key API

### Platform Factory

```typescript
import { createSchoolPlatform, createMemoryProfileStore } from "school-footprint";

const platform = createSchoolPlatform({
  profileStore: createMemoryProfileStore([
    { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
  ]),
  repository: myRepo, // implements SchoolRepository (10 methods)
});
```

### ActionDispatch (Lazy Variant System)

```typescript
// Framework-agnostic dispatch — decider + lazy branch resolvers
const dispatch = await platform.getActionDispatch(ctx, "create-grade", { name: "Grade 5" });
// Returns: { actionId, deciderFn, branches (ReadonlyMap), input, meta }

// The deciderFn reads schoolType from scope → returns branch ID
// branches.get(branchId).resolver → lazy FlowChart builder (only called when selected)
// meta.availableVariants → all registered variants for this action
// meta.selectedBranch → which variant the decider will pick
```

### ActionFlowRegistry (Variant Registration)

```typescript
// In schoolServiceComposer.ts — add school-type variants:
const ACTION_FLOW_REGISTRY: ActionFlowRegistry = {
  "schedule-class": {
    default: createSchedulingFlow,           // always present
    variants: {
      dance: createDanceSchedulingFlow,      // one line = new variant
    },
  },
  "create-grade": { default: createGradeFlow },  // no variants yet
};
```

### SchoolRepository (Port Interface)

```typescript
type SchoolRepository = {
  createStudent: (input) => Promise<Student>;
  findStudents: (query) => Promise<Student[]>;
  createAttendanceSession: (input) => Promise<AttendanceSession>;
  markAttendance: (input) => Promise<AttendanceMark>;
  createScheduleEntry: (input) => Promise<ScheduleEntry>;
  findConflicts: (input) => Promise<Conflict[]>;
  createGrade: (input) => Promise<Grade>;
  createSection: (input) => Promise<Section>;
  checkAvailability: (input) => Promise<AvailabilityResult>;
  calculateFee: (input) => Promise<FeeCalculation>;
};
```

### Flow Builders

```typescript
import { flowChart, ScopeFacade } from "footprintjs";

// Every flow builder: (repo: SchoolRepository, t?: TermResolver) => FlowChart
function createGradeFlow(repo: SchoolRepository, t?: (key: string) => string): FlowChart {
  return flowChart("Validate-Input", async (scope: ScopeFacade) => {
    const input = scope.getValue("input");
    // validate...
    scope.setGlobal("gradeName", input.name, "Grade name validated");
  }, "validate-input", undefined, "Validate that required Grade fields are present")
    .addFunction("Create-Grade", async (scope: ScopeFacade) => {
      const grade = await repo.createGrade({ name: scope.getGlobal("gradeName") });
      scope.setGlobal("createdGrade", grade, "Grade record created");
    }, "create-grade", "Create the Grade record in the repository")
    .build();
}
```

### Orchestrator Integration (consumer-side)

```typescript
// In requestFootprint.ts (Fastify integration layer):
// Uses native addDeciderFunction + addLazySubFlowChartBranch — no Phase 4 hacks
const deciderList = builder.addDeciderFunction(
  "FLOW_SELECTOR", dispatch.deciderFn, "FLOW_SELECTOR",
  "Select create-grade variant for school type"
);
for (const [branchId, branch] of dispatch.branches) {
  deciderList.addLazySubFlowChartBranch(branchId, branch.resolver, branchId, branch.mountOptions);
}
```

## School Types & Profiles

| Type | Scheduling | Theme | Key Differences |
|------|-----------|-------|-----------------|
| k12 | fixed-timetable | teal | grades, sections, streams, departments |
| dance | time-slots | rose | levels (not grades), no departments |
| music | appointments | indigo | instruments, lesson types |
| kindergarten | activity-blocks | green | age groups, no formal grading |
| tutoring | flexible-slots | slate | sessions, no sections |

## Terminology System

16 keys configurable per school type: student, teacher, employee, grade, section, subject, course, courseGroup, term, period, stream, department, family, parent, academicYear, attendance.

Per-unit overrides via `UnitOverrides` — individual schools can override terminology, toggle modules, change theme.

## Anti-Patterns

- Never import Prisma in flows — use `SchoolRepository` port interface
- Never hardcode school type checks — use the variant registry
- Never skip descriptions on flow stages — they power narrative + AI explainability
- Never cache FlowCharts across requests — lazy resolvers build fresh per execution
- Never put HTTP/framework concepts in school-footprint — it's framework-agnostic

## Build & Test

```bash
npm run build      # tsc → dist/
npm test           # vitest run (348 tests across unit/scenario/property/security/performance)
npm run typecheck  # tsc --noEmit
```

5 test categories: unit (9 files), scenario (11 files), property (5 files), security (5 files), performance (4 files)
