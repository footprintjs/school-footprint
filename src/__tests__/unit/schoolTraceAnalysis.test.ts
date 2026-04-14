/**
 * schoolTraceAnalysis — 5-pattern test suite.
 *
 * 1. Unit (5): explainResult basics, createSchoolQualityScorer basics
 * 2. Scenario (4): Enrollment flow trace, scheduling conflict trace, scorer on real snapshot, unknown key
 * 3. Property (3): Causal chain depth, scorer range [0,1], idempotency
 * 4. Performance (2): Large commit log trace, scorer on many stages
 * 5. Security (3): Special characters, malformed entries, prototype pollution
 */
import { describe, it, expect } from "vitest";
import {
  explainResult,
  createSchoolQualityScorer,
  type TraceExplanation,
} from "../../trace/schoolTraceAnalysis.js";

// ---------------------------------------------------------------------------
// Helpers: mock executor factory
// ---------------------------------------------------------------------------

type CommitBundle = {
  stageId?: string;
  runtimeStageId?: string;
  overwrite?: string[];
  updates?: string[];
  trace?: Array<{ type: "read" | "write"; key: string }>;
};

function mockExecutor(commitLog: CommitBundle[]) {
  return {
    getSnapshot() {
      return { commitLog };
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Unit Tests
// ---------------------------------------------------------------------------
describe("Unit: explainResult", () => {
  it("returns null for empty commitLog", () => {
    const executor = mockExecutor([]);
    expect(explainResult(executor, "anything")).toBeNull();
  });

  it("returns null when commitLog is undefined", () => {
    const executor = { getSnapshot: () => ({}) };
    expect(explainResult(executor, "anything")).toBeNull();
  });

  it("finds a single writer stage", () => {
    const executor = mockExecutor([
      {
        stageId: "create-record",
        runtimeStageId: "create-record#0",
        overwrite: ["enrollmentStatus"],
        trace: [{ type: "write", key: "enrollmentStatus" }],
      },
    ]);
    const result = explainResult(executor, "enrollmentStatus");
    expect(result).not.toBeNull();
    expect(result!.key).toBe("enrollmentStatus");
    expect(result!.stages).toHaveLength(1);
    expect(result!.stages[0].runtimeStageId).toBe("create-record#0");
    expect(result!.depth).toBe(1);
  });

  it("traces a multi-stage causal chain", () => {
    const executor = mockExecutor([
      {
        stageId: "load-data",
        runtimeStageId: "load-data#0",
        overwrite: ["rawInput"],
        trace: [{ type: "write", key: "rawInput" }],
      },
      {
        stageId: "validate",
        runtimeStageId: "validate#1",
        overwrite: ["validatedInput"],
        trace: [
          { type: "read", key: "rawInput" },
          { type: "write", key: "validatedInput" },
        ],
      },
      {
        stageId: "create",
        runtimeStageId: "create#2",
        overwrite: ["result"],
        trace: [
          { type: "read", key: "validatedInput" },
          { type: "write", key: "result" },
        ],
      },
    ]);
    const result = explainResult(executor, "result");
    expect(result).not.toBeNull();
    expect(result!.depth).toBe(3);
    expect(result!.stages.map((s) => s.runtimeStageId)).toEqual([
      "create#2",
      "validate#1",
      "load-data#0",
    ]);
  });

  it("returns null for a key that was never written", () => {
    const executor = mockExecutor([
      {
        stageId: "some-stage",
        runtimeStageId: "some-stage#0",
        overwrite: ["otherKey"],
        trace: [],
      },
    ]);
    expect(explainResult(executor, "nonexistent")).toBeNull();
  });
});

describe("Unit: createSchoolQualityScorer", () => {
  const scorer = createSchoolQualityScorer();

  it("scores a clean stage at 1.0", () => {
    const score = scorer("create-record", ["name", "grade"], {
      name: "Alice",
      grade: "5th",
    });
    expect(score).toBe(1.0);
  });

  it("penalizes error keys by -0.3", () => {
    const score = scorer("validate", ["validationError"], {
      validationError: "Name is required",
    });
    expect(score).toBeCloseTo(0.7, 5);
  });

  it("penalizes error status by -0.2", () => {
    const score = scorer("process", ["output"], {
      output: "done",
      status: "error",
    });
    expect(score).toBeCloseTo(0.8, 5);
  });

  it("penalizes null writes proportionally", () => {
    // 2 of 4 keys are null => -0.1 * (2/4) = -0.05
    const score = scorer("load", ["a", "b", "c", "d"], {
      a: 1,
      b: null,
      c: 2,
      d: null,
    });
    expect(score).toBeCloseTo(0.95, 5);
  });

  it("combines multiple penalties without going below 0", () => {
    const score = scorer(
      "bad-stage",
      ["conflictError", "validationError"],
      { conflictError: null, validationError: null, status: "rejected" }
    );
    // -0.3 (error keys) + -0.2 (rejected status) + -0.1*(2/2) null writes = -0.6
    // clamped to max(0, 0.4) = 0.4
    expect(score).toBeCloseTo(0.4, 5);
  });
});

// ---------------------------------------------------------------------------
// 2. Scenario Tests
// ---------------------------------------------------------------------------
describe("Scenario: enrollment flow trace", () => {
  it("traces seed -> validate -> create -> result chain", () => {
    const executor = mockExecutor([
      {
        stageId: "seed-enrollment",
        runtimeStageId: "seed-enrollment#0",
        overwrite: ["studentData", "gradeSelection"],
        trace: [
          { type: "write", key: "studentData" },
          { type: "write", key: "gradeSelection" },
        ],
      },
      {
        stageId: "validate-enrollment",
        runtimeStageId: "validate-enrollment#1",
        overwrite: ["validationResult"],
        trace: [
          { type: "read", key: "studentData" },
          { type: "read", key: "gradeSelection" },
          { type: "write", key: "validationResult" },
        ],
      },
      {
        stageId: "check-capacity",
        runtimeStageId: "check-capacity#2",
        overwrite: ["capacityOk"],
        trace: [
          { type: "read", key: "gradeSelection" },
          { type: "write", key: "capacityOk" },
        ],
      },
      {
        stageId: "create-enrollment",
        runtimeStageId: "create-enrollment#3",
        overwrite: ["enrollmentRecord"],
        trace: [
          { type: "read", key: "validationResult" },
          { type: "read", key: "capacityOk" },
          { type: "write", key: "enrollmentRecord" },
        ],
      },
    ]);

    const result = explainResult(executor, "enrollmentRecord")!;
    expect(result).not.toBeNull();
    expect(result.key).toBe("enrollmentRecord");
    // create-enrollment reads validationResult (from validate-enrollment)
    // and capacityOk (from check-capacity), which reads gradeSelection (from seed)
    // validate-enrollment reads studentData and gradeSelection (from seed)
    expect(result.depth).toBeGreaterThanOrEqual(3);
    expect(result.stages[0].runtimeStageId).toBe("create-enrollment#3");
    expect(result.summary).toContain("enrollmentRecord");
    expect(result.summary).toContain("seed-enrollment#0");
  });
});

describe("Scenario: scheduling conflict trace", () => {
  it("traces load-periods -> assign-room -> detect-conflict", () => {
    const executor = mockExecutor([
      {
        stageId: "load-periods",
        runtimeStageId: "load-periods#0",
        overwrite: ["periods", "roomList"],
        trace: [
          { type: "write", key: "periods" },
          { type: "write", key: "roomList" },
        ],
      },
      {
        stageId: "assign-room",
        runtimeStageId: "assign-room#1",
        overwrite: ["roomAssignment"],
        trace: [
          { type: "read", key: "periods" },
          { type: "read", key: "roomList" },
          { type: "write", key: "roomAssignment" },
        ],
      },
      {
        stageId: "detect-conflict",
        runtimeStageId: "detect-conflict#2",
        overwrite: ["conflictDetected"],
        trace: [
          { type: "read", key: "roomAssignment" },
          { type: "write", key: "conflictDetected" },
        ],
      },
    ]);

    const result = explainResult(executor, "conflictDetected")!;
    expect(result).not.toBeNull();
    expect(result.stages.map((s) => s.runtimeStageId)).toEqual([
      "detect-conflict#2",
      "assign-room#1",
      "load-periods#0",
    ]);
    expect(result.depth).toBe(3);
  });
});

describe("Scenario: quality scorer on real flow snapshot", () => {
  it("scores a multi-stage enrollment flow", () => {
    const scorer = createSchoolQualityScorer();

    const stages = [
      { id: "seed", keys: ["studentData"], snapshot: { studentData: { name: "Alice" } } },
      { id: "validate", keys: ["isValid"], snapshot: { isValid: true } },
      { id: "create", keys: ["enrollmentId"], snapshot: { enrollmentId: "ENR-001" } },
    ];

    const scores = stages.map((s) => scorer(s.id, s.keys, s.snapshot));
    // All clean stages should score 1.0
    expect(scores.every((s) => s === 1.0)).toBe(true);
  });
});

describe("Scenario: explainResult with unknown key", () => {
  it("returns null when key was never written in a populated log", () => {
    const executor = mockExecutor([
      {
        stageId: "stage-a",
        runtimeStageId: "stage-a#0",
        overwrite: ["keyA"],
        trace: [{ type: "write", key: "keyA" }],
      },
      {
        stageId: "stage-b",
        runtimeStageId: "stage-b#1",
        updates: ["keyB"],
        trace: [{ type: "write", key: "keyB" }],
      },
    ]);
    expect(explainResult(executor, "neverWritten")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Property Tests
// ---------------------------------------------------------------------------
describe("Property: causal chain depth", () => {
  it("depth equals number of unique stages in the chain", () => {
    // Build a linear chain: stage0 -> stage1 -> stage2 -> stage3
    const commitLog: CommitBundle[] = [];
    for (let i = 0; i < 4; i++) {
      commitLog.push({
        stageId: `stage-${i}`,
        runtimeStageId: `stage-${i}#${i}`,
        overwrite: [`key-${i}`],
        trace: [
          ...(i > 0 ? [{ type: "read" as const, key: `key-${i - 1}` }] : []),
          { type: "write" as const, key: `key-${i}` },
        ],
      });
    }
    const result = explainResult(mockExecutor(commitLog), "key-3")!;
    expect(result).not.toBeNull();
    expect(result.depth).toBe(4);
    expect(result.stages).toHaveLength(4);
  });
});

describe("Property: scorer always returns [0, 1]", () => {
  it("never exceeds 1 or drops below 0 across edge cases", () => {
    const scorer = createSchoolQualityScorer();
    const cases: Array<[string, string[], Record<string, unknown>]> = [
      ["clean", ["a"], { a: 1 }],
      ["all-errors", ["error", "conflictError", "fatalError"], { error: null, conflictError: null, fatalError: null, status: "error" }],
      ["empty-keys", [], {}],
      ["null-status", ["x"], { x: null, status: "rejected" }],
      ["mixed", ["error", "name"], { error: "oops", name: "Alice", status: "error" }],
    ];

    for (const [label, keys, snap] of cases) {
      const score = scorer(label, keys, snap);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe("Property: idempotent calls", () => {
  it("explainResult returns identical results on repeated calls", () => {
    const executor = mockExecutor([
      {
        stageId: "a",
        runtimeStageId: "a#0",
        overwrite: ["x"],
        trace: [{ type: "write", key: "x" }],
      },
    ]);

    const r1 = explainResult(executor, "x");
    const r2 = explainResult(executor, "x");
    expect(r1).toEqual(r2);
  });

  it("scorer returns same value on repeated calls with same input", () => {
    const scorer = createSchoolQualityScorer();
    const args: [string, string[], Record<string, unknown>] = [
      "stage",
      ["enrollmentError"],
      { enrollmentError: "fail", status: "rejected" },
    ];
    const s1 = scorer(...args);
    const s2 = scorer(...args);
    expect(s1).toBe(s2);
  });
});

// ---------------------------------------------------------------------------
// 4. Performance Tests
// ---------------------------------------------------------------------------
describe("Performance: explainResult on large commit log", () => {
  it("traces through 1000 commits in < 100ms", () => {
    // Build a linear chain of 1000 stages
    const commitLog: CommitBundle[] = [];
    for (let i = 0; i < 1000; i++) {
      commitLog.push({
        stageId: `stage-${i}`,
        runtimeStageId: `stage-${i}#${i}`,
        overwrite: [`key-${i}`],
        trace: [
          ...(i > 0 ? [{ type: "read" as const, key: `key-${i - 1}` }] : []),
          { type: "write" as const, key: `key-${i}` },
        ],
      });
    }

    const executor = mockExecutor(commitLog);
    const start = performance.now();
    const result = explainResult(executor, "key-999");
    const elapsed = performance.now() - start;

    expect(result).not.toBeNull();
    expect(result!.depth).toBe(1000);
    expect(elapsed).toBeLessThan(100);
  });
});

describe("Performance: scorer on 500 stages", () => {
  it("scores 500 stages in < 50ms", () => {
    const scorer = createSchoolQualityScorer();
    const stages = Array.from({ length: 500 }, (_, i) => ({
      id: `stage-${i}`,
      keys: [`key-${i}`, `data-${i}`],
      snapshot: { [`key-${i}`]: i, [`data-${i}`]: `val-${i}`, status: i % 10 === 0 ? "error" : "ok" } as Record<string, unknown>,
    }));

    const start = performance.now();
    for (const s of stages) {
      scorer(s.id, s.keys, s.snapshot);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// 5. Security Tests
// ---------------------------------------------------------------------------
describe("Security: keys with special characters", () => {
  it("handles keys containing dots, brackets, and unicode", () => {
    const executor = mockExecutor([
      {
        stageId: "stage-special",
        runtimeStageId: "stage-special#0",
        overwrite: ["enrollment.status", "data[0]", "\u00fcber-key"],
        trace: [
          { type: "write", key: "enrollment.status" },
          { type: "write", key: "data[0]" },
          { type: "write", key: "\u00fcber-key" },
        ],
      },
    ]);
    const result = explainResult(executor, "enrollment.status");
    expect(result).not.toBeNull();
    expect(result!.stages[0].writtenKeys).toContain("enrollment.status");

    const result2 = explainResult(executor, "\u00fcber-key");
    expect(result2).not.toBeNull();
  });
});

describe("Security: malformed commitLog entries", () => {
  it("handles entries with missing fields gracefully", () => {
    const executor = mockExecutor([
      {} as CommitBundle, // no stageId, no runtimeStageId, no overwrite, no trace
      {
        stageId: "real-stage",
        runtimeStageId: "real-stage#1",
        overwrite: ["result"],
        trace: [{ type: "write", key: "result" }],
      },
    ]);
    // Should not throw
    const result = explainResult(executor, "result");
    expect(result).not.toBeNull();
    expect(result!.stages[0].runtimeStageId).toBe("real-stage#1");
  });

  it("handles null/undefined in overwrite arrays", () => {
    const executor = mockExecutor([
      {
        stageId: "s",
        runtimeStageId: "s#0",
        overwrite: [null as unknown as string, "valid-key", undefined as unknown as string],
        trace: [],
      },
    ]);
    // Should not throw
    const result = explainResult(executor, "valid-key");
    expect(result).not.toBeNull();
  });
});

describe("Security: prototype pollution in snapshot", () => {
  it("scorer does not modify or leak via __proto__", () => {
    const scorer = createSchoolQualityScorer();
    const malicious = JSON.parse(
      '{"__proto__": {"polluted": true}, "status": "error"}'
    );
    const score = scorer("bad", ["__proto__"], malicious);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    // Verify no pollution on Object prototype
    expect(({} as any).polluted).toBeUndefined();
  });

  it("explainResult handles constructor-hijacking keys", () => {
    const executor = mockExecutor([
      {
        stageId: "constructor",
        runtimeStageId: "constructor#0",
        overwrite: ["constructor", "toString", "__proto__"],
        trace: [{ type: "write", key: "constructor" }],
      },
    ]);
    const result = explainResult(executor, "constructor");
    expect(result).not.toBeNull();
    expect(result!.stages[0].stageId).toBe("constructor");
  });
});
