# school-footprint

**Shopify for Schools** — configurable SIS engine for any school type.

One codebase. Five school types. Zero code changes to switch.

[![Tests](https://img.shields.io/badge/tests-428%20passing-brightgreen)]()
[![footprintjs](https://img.shields.io/badge/footprintjs-4.12.2-blue)](https://www.npmjs.com/package/footprintjs)

## Documentation

| | |
|---|---|
| **Getting Started** | [Why school-footprint?](https://footprintjs.github.io/school-footprint/getting-started/why/) · [Quick Start](https://footprintjs.github.io/school-footprint/getting-started/quick-start/) · [Key Concepts](https://footprintjs.github.io/school-footprint/getting-started/key-concepts/) |
| **Architecture** | [4-Layer Overview](https://footprintjs.github.io/school-footprint/architecture/overview/) · [Profile-Derived Context](https://footprintjs.github.io/school-footprint/architecture/pdc/) · [Strategies](https://footprintjs.github.io/school-footprint/architecture/strategies/) · [Flows](https://footprintjs.github.io/school-footprint/architecture/flows/) · [Observability](https://footprintjs.github.io/school-footprint/architecture/observability/) |
| **Examples** | [7 runnable examples](examples/) — quick-start, enrollment, school comparison, strategies, narrative, approval, trace analysis |

## Quick Start

```typescript
import {
  createSchoolPlatform,
  createMemoryProfileStore,
  createStubRepository,
} from "school-footprint";

const platform = createSchoolPlatform({
  profileStore: createMemoryProfileStore([
    { unitId: "dance-1", profileType: "dance", createdAt: "2024-01-01" },
  ]),
  repository: createStubRepository("my-app"),
});

// Execute a flow with full tracing
const ctx = { tenantId: "t1", campusId: "c1", unitId: "dance-1" };
const result = await platform.executeServiceFlow(ctx, "enroll-student", {
  firstName: "Alice",
  lastName: "Smith",
});

console.log(result.status);     // "ok"
console.log(result.narrative);  // step-by-step trace
```

## How It Works

```
"I'm a dance school"
        │
        ▼
   danceProfile
        │
        ├── Modules:     students, academics, attendance, scheduling, fees
        ├── Terminology:  Student → Dancer, Grade → Level, Section → Style
        ├── Scheduling:   time-slots strategy (not fixed-timetable)
        ├── Fee model:    per-class strategy (not per-term)
        └── Theme:        rose (#c0506a)
```

Change `"dance"` to `"k12"` → modules change, terminology changes, strategies change, theme changes. **Zero code changes.**

## Architecture

```
Layer 4: sis-platform        → Fastify + Prisma + React (framework coupling here only)
Layer 3: school-footprint    → Pure domain (this package — zero framework imports)
Layer 2: @footprint/*        → Pure registries (profiles, capabilities, tenancy)
Layer 1: footprintjs         → Flow execution engine (zero dependencies)
```

See [Architecture Overview](https://footprintjs.github.io/school-footprint/architecture/overview/) for the full step-by-step explanation.

## School Types

| Type | Scheduling | Theme | Terminology |
|---|---|---|---|
| **k12** | Fixed Timetable | Teal | Student, Teacher, Grade, Section, Period |
| **dance** | Time Slots | Rose | Dancer, Instructor, Level, Style, Time Slot |
| **music** | Appointments | Indigo | Student, Instructor, Level, Instrument, Lesson Slot |
| **kindergarten** | Activity Blocks | Green | Child, Teacher, Age Group, Classroom, Activity Block |
| **tutoring** | Flexible Slots | Slate | Student, Tutor, Level, Group, Slot |

## 10 Strategies

Same capability, different business logic per school type:

**Scheduling**: fixed-timetable · time-slots · appointments · activity-blocks · flexible-slots

**Fees**: per-term · per-class · per-lesson · per-month · per-session

## 8 Service Flows

All traced with footprintjs (narrative + metrics + causal chain):

| Flow | Pattern | Stages |
|---|---|---|
| Enrollment | Linear | Validate → Prepare → Enroll → Link |
| Scheduling | Decider | Validate → Check → Decide → Create/Conflict |
| Attendance | Subflow | Validate → Create → Decide → Mark/Skip |
| Grade/Section/Fees/Availability | Linear | Validate → Create/Calculate |

## New in 4.12.2

- **NarrativeRenderer** — school-specific terminology in flow output
- **Pause/Resume** — approval workflows with serializable checkpoints
- **Causal Chain** — `explainResult(executor, "conflict")` traces root cause
- **Quality Scoring** — per-stage data quality monitoring

## Project Structure

```
src/
├── modules/       → 7 module definitions
├── profiles/      → 5 school type profiles
├── strategies/    → 10 behavior strategies (5 scheduling + 5 fee)
├── flows/         → 8 footprintjs flows + ActionFlowRegistry
├── terminology/   → 16 configurable terms
├── narrative/     → School-specific narrative rendering
├── pause/         → Approval workflow (Pause/Resume)
├── trace/         → Causal chain + quality scoring
├── types.ts       → SchoolRepository (10-method port interface)
└── index.ts       → Public API (40+ exports)
```

## Tests

```bash
npm test   # 428 tests, zero database required
```

5 categories: unit · scenario · property · performance · security

## The Stack

```
footprintjs             → Execution engine (flowcharts, narrative, trace)
footprint-blueprint     → Domain-agnostic framework (6 packages)
school-footprint        → School domain configuration ← you are here
sis-platform            → Deployed SIS application (Fastify + Prisma)
```

## License

MIT
