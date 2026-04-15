# school-footprint — GitHub Copilot Instructions

Configurable SIS engine for any school type. "Shopify for Schools" — configuration drives behavior, not code.

## What this library does

- **5 school types**: k12, dance, music, kindergarten, tutoring — each with its own modules, terminology, adapters, theme
- **10 adapters**: 5 scheduling (fixed-timetable, time-slots, appointments, activity-blocks, flexible-slots) + 5 fee (per-term, per-class, per-lesson, per-month, per-session)
- **8 service flows**: enrollment, attendance (create + mark), scheduling (schedule + availability), academics (grade + section), fees — all built with footprintjs FlowChartBuilder
- **Variant system**: ActionFlowRegistry maps `action x schoolType → flow builder`. FLOW_SELECTOR decider picks the right variant at runtime via lazy resolution.

## Key patterns to follow

### Flow builders always take repository + optional term resolver
```typescript
function createMyFlow(repo: SchoolRepository, t?: (key: string) => string): FlowChart {
  return flowChart("Stage-Name", async (scope: ScopeFacade) => {
    // Use repo for data operations
    // Use t?.("grade") for terminology
    scope.setGlobal("result", data, "Description for narrative");
  }, "stage-id", undefined, "Human-readable description of what this stage does")
  .build();
}
```

### Never import Prisma — use SchoolRepository port
```typescript
// WRONG: import { PrismaClient } from "@prisma/client";
// RIGHT: function myFlow(repo: SchoolRepository) { ... repo.createGrade(...) }
```

### Descriptions on every stage
```typescript
// WRONG: .addFunction("Create", fn, "create")
// RIGHT: .addFunction("Create", fn, "create", "Create the grade record in the repository")
```

### Variant registration
```typescript
// In ACTION_FLOW_REGISTRY:
"schedule-class": {
  default: createSchedulingFlow,
  variants: { dance: createDanceSchedulingFlow },  // one line = new variant
}
```

### Types are always readonly
```typescript
export type Grade = {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
};
```

## Testing patterns

5 test types are used: unit, scenario, property (fast-check), security, performance.
Tests go in `src/__tests__/{type}/filename.test.ts`.
Use `createMockRepository()` from `src/__tests__/helpers.ts` for test repos.
