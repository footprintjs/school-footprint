import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  createApprovalStage,
  resumeApproval,
} from "../../pause/approvalWorkflow.js";
import type {
  ApprovalDecision,
  ApprovalStageConfig,
} from "../../pause/approvalWorkflow.js";

// ---------------------------------------------------------------------------
// Helpers — mock executor that mimics footprintjs 4.12.2 pause/resume
// ---------------------------------------------------------------------------

function createMockScope(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    getValue: (key: string) => store.get(key),
    setValue: (key: string, value: unknown) => store.set(key, value),
    _store: store,
  };
}

type MockScope = ReturnType<typeof createMockScope>;

function createMockExecutor(opts: { paused?: boolean } = {}) {
  let _paused = opts.paused ?? false;
  let _lastResumeInput: unknown = undefined;
  let _lastCheckpoint: unknown = undefined;
  return {
    isPaused: () => _paused,
    resume: async (checkpoint: unknown, input: unknown) => {
      _paused = false;
      _lastResumeInput = input;
      _lastCheckpoint = checkpoint;
      return { resumed: true };
    },
    setPaused: (v: boolean) => { _paused = v; },
    getLastResumeInput: () => _lastResumeInput,
    getLastCheckpoint: () => _lastCheckpoint,
  };
}

// =========================================================================
// 1. UNIT TESTS (5)
// =========================================================================

describe("Unit: createApprovalStage", () => {
  const baseConfig: ApprovalStageConfig<MockScope> = {
    name: "Admin-Review",
    stageId: "admin-review",
    description: "Principal reviews the enrollment request",
    buildReviewPayload: (scope) => ({
      studentName: scope.getValue("studentName"),
    }),
    applyDecision: (scope, decision) => {
      scope.setValue("approved", decision.approved);
      scope.setValue("reviewNotes", decision.notes);
    },
  };

  it("returns a 4-element tuple with correct shape", () => {
    const tuple = createApprovalStage(baseConfig);

    expect(tuple).toHaveLength(4);
    const [name, handler, stageId, description] = tuple;
    expect(name).toBe("Admin-Review");
    expect(stageId).toBe("admin-review");
    expect(description).toBe("Principal reviews the enrollment request");
    expect(typeof handler.execute).toBe("function");
    expect(typeof handler.resume).toBe("function");
  });

  it("execute calls buildReviewPayload with the scope", () => {
    const [, handler] = createApprovalStage(baseConfig);
    const scope = createMockScope({ studentName: "Alice" });
    const payload = handler.execute(scope);
    expect(payload).toEqual({ studentName: "Alice" });
  });

  it("resume calls applyDecision with scope and decision", () => {
    const [, handler] = createApprovalStage(baseConfig);
    const scope = createMockScope();
    handler.resume(scope, { approved: true, notes: "Looks good" });
    expect(scope.getValue("approved")).toBe(true);
    expect(scope.getValue("reviewNotes")).toBe("Looks good");
  });

  it("description is undefined when not provided", () => {
    const { description, ...rest } = baseConfig;
    const tuple = createApprovalStage(rest as ApprovalStageConfig<MockScope>);
    expect(tuple[3]).toBeUndefined();
  });

  it("execute returns undefined when buildReviewPayload returns undefined (conditional skip)", () => {
    const config: ApprovalStageConfig<MockScope> = {
      ...baseConfig,
      buildReviewPayload: () => undefined,
    };
    const [, handler] = createApprovalStage(config);
    const scope = createMockScope();
    expect(handler.execute(scope)).toBeUndefined();
  });
});

describe("Unit: resumeApproval", () => {
  it("throws if executor is not paused", async () => {
    const executor = createMockExecutor({ paused: false });
    await expect(
      resumeApproval(executor, {}, { approved: true })
    ).rejects.toThrow("Cannot resume: executor is not paused");
  });

  it("calls executor.resume with checkpoint and decision", async () => {
    const executor = createMockExecutor({ paused: true });
    const checkpoint = { stageId: "review", data: {} };
    const decision: ApprovalDecision = { approved: false, notes: "Denied" };
    await resumeApproval(executor, checkpoint, decision);
    expect(executor.getLastCheckpoint()).toBe(checkpoint);
    expect(executor.getLastResumeInput()).toBe(decision);
  });

  it("ApprovalDecision types accept extra fields", async () => {
    const executor = createMockExecutor({ paused: true });
    const decision: ApprovalDecision<{ reassignTo: string }> = {
      approved: true,
      extra: { reassignTo: "teacher-5" },
    };
    const result = await resumeApproval(executor, {}, decision);
    expect(result).toEqual({ resumed: true });
    expect(executor.getLastResumeInput()).toEqual(decision);
  });
});

// =========================================================================
// 2. SCENARIO TESTS (5)
// =========================================================================

describe("Scenario: Approval workflow end-to-end", () => {
  it("full enrollment approval flow: pause -> checkpoint -> resume approved -> verify", () => {
    const scope = createMockScope({ studentName: "Alice", gpa: 3.8 });

    const config: ApprovalStageConfig<MockScope> = {
      name: "Enrollment-Review",
      stageId: "enrollment-review",
      description: "Review enrollment application",
      buildReviewPayload: (s) => ({
        studentName: s.getValue("studentName"),
        gpa: s.getValue("gpa"),
      }),
      applyDecision: (s, d) => {
        s.setValue("approved", d.approved);
        s.setValue("status", d.approved ? "enrolled" : "rejected");
        if (d.notes) s.setValue("reviewNotes", d.notes);
      },
    };

    const [, handler] = createApprovalStage(config);

    // Execute phase: build review payload (simulates pause)
    const payload = handler.execute(scope);
    expect(payload).toEqual({ studentName: "Alice", gpa: 3.8 });

    // Resume phase: apply approval decision
    handler.resume(scope, { approved: true, notes: "Welcome!" });
    expect(scope.getValue("approved")).toBe(true);
    expect(scope.getValue("status")).toBe("enrolled");
    expect(scope.getValue("reviewNotes")).toBe("Welcome!");
  });

  it("rejection flow", () => {
    const scope = createMockScope({ studentName: "Bob" });
    const config: ApprovalStageConfig<MockScope> = {
      name: "Review",
      stageId: "review",
      buildReviewPayload: (s) => ({ studentName: s.getValue("studentName") }),
      applyDecision: (s, d) => {
        s.setValue("approved", d.approved);
        s.setValue("status", d.approved ? "enrolled" : "rejected");
      },
    };
    const [, handler] = createApprovalStage(config);
    handler.execute(scope);
    handler.resume(scope, { approved: false, notes: "Insufficient credits" });
    expect(scope.getValue("approved")).toBe(false);
    expect(scope.getValue("status")).toBe("rejected");
  });

  it("checkpoint round-trip: JSON.stringify/parse preserves decision payload", async () => {
    const decision: ApprovalDecision<{ priority: number }> = {
      approved: true,
      notes: "Approved with priority",
      extra: { priority: 1 },
    };

    const serialized = JSON.stringify(decision);
    const deserialized = JSON.parse(serialized) as ApprovalDecision<{ priority: number }>;

    expect(deserialized.approved).toBe(true);
    expect(deserialized.notes).toBe("Approved with priority");
    expect(deserialized.extra?.priority).toBe(1);

    // Use deserialized decision in resumeApproval
    const executor = createMockExecutor({ paused: true });
    await resumeApproval(executor, { stageId: "review" }, deserialized);
    expect(executor.getLastResumeInput()).toEqual(decision);
  });

  it("multi-stage flow with approval in the middle", () => {
    // Simulates: Validate -> Approval -> Finalize
    const scope = createMockScope();

    // Stage 1: Validate (regular function)
    scope.setValue("studentName", "Carol");
    scope.setValue("valid", true);

    // Stage 2: Approval (pausable)
    const config: ApprovalStageConfig<MockScope> = {
      name: "Mid-Review",
      stageId: "mid-review",
      buildReviewPayload: (s) => {
        if (!s.getValue("valid")) return undefined; // skip if invalid
        return { studentName: s.getValue("studentName") };
      },
      applyDecision: (s, d) => {
        s.setValue("approved", d.approved);
      },
    };
    const [, handler] = createApprovalStage(config);
    const payload = handler.execute(scope);
    expect(payload).toEqual({ studentName: "Carol" });
    handler.resume(scope, { approved: true });

    // Stage 3: Finalize (regular function)
    const approved = scope.getValue("approved");
    scope.setValue("finalStatus", approved ? "complete" : "cancelled");
    expect(scope.getValue("finalStatus")).toBe("complete");
  });

  it("approval with extra fields are forwarded correctly", () => {
    const scope = createMockScope({ studentName: "Diane" });

    const config: ApprovalStageConfig<MockScope, { studentName: unknown }, { reassignTo: string; level: number }> = {
      name: "Advanced-Review",
      stageId: "advanced-review",
      buildReviewPayload: (s) => ({ studentName: s.getValue("studentName") }),
      applyDecision: (s, d) => {
        s.setValue("approved", d.approved);
        if (d.extra) {
          s.setValue("reassignTo", d.extra.reassignTo);
          s.setValue("level", d.extra.level);
        }
      },
    };
    const [, handler] = createApprovalStage(config);
    handler.execute(scope);
    handler.resume(scope, {
      approved: true,
      extra: { reassignTo: "teacher-5", level: 3 },
    });
    expect(scope.getValue("reassignTo")).toBe("teacher-5");
    expect(scope.getValue("level")).toBe(3);
  });
});

// =========================================================================
// 3. PROPERTY TESTS (3)
// =========================================================================

describe("Property: ApprovalDecision", () => {
  it("approval decision with arbitrary extra fields round-trips through JSON", () => {
    fc.assert(
      fc.property(
        fc.record({
          approved: fc.boolean(),
          notes: fc.option(fc.string(), { nil: undefined }),
          extra: fc.option(
            fc.dictionary(fc.string().filter(s => s.length > 0), fc.jsonValue()),
            { nil: undefined }
          ),
        }),
        (decision) => {
          const roundTripped = JSON.parse(JSON.stringify(decision));
          expect(roundTripped.approved).toBe(decision.approved);
          if (decision.notes !== undefined) {
            expect(roundTripped.notes).toBe(decision.notes);
          }
          if (decision.extra !== undefined) {
            expect(roundTripped.extra).toEqual(decision.extra);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty notes are preserved (not coerced to undefined)", () => {
    fc.assert(
      fc.property(fc.boolean(), (approved) => {
        const decision: ApprovalDecision = { approved, notes: "" };
        const scope = createMockScope();
        const config: ApprovalStageConfig<MockScope> = {
          name: "PropTest",
          stageId: "prop-test",
          buildReviewPayload: () => ({}),
          applyDecision: (s, d) => {
            s.setValue("notes", d.notes);
            s.setValue("approved", d.approved);
          },
        };
        const [, handler] = createApprovalStage(config);
        handler.resume(scope, decision);
        expect(scope.getValue("notes")).toBe("");
        expect(scope.getValue("approved")).toBe(approved);
      }),
      { numRuns: 50 }
    );
  });

  it("multiple sequential approvals each apply independently", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 2, maxLength: 10 }),
        (decisions) => {
          const scope = createMockScope();
          const config: ApprovalStageConfig<MockScope> = {
            name: "Sequential",
            stageId: "seq",
            buildReviewPayload: () => ({}),
            applyDecision: (s, d) => {
              const count = (s.getValue("count") as number ?? 0) + 1;
              s.setValue("count", count);
              s.setValue("lastApproved", d.approved);
            },
          };
          const [, handler] = createApprovalStage(config);
          for (const approved of decisions) {
            handler.resume(scope, { approved });
          }
          expect(scope.getValue("count")).toBe(decisions.length);
          expect(scope.getValue("lastApproved")).toBe(decisions[decisions.length - 1]);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =========================================================================
// 4. PERFORMANCE TESTS (2)
// =========================================================================

describe("Performance: Approval workflow", () => {
  it("100 pause/resume cycles complete in < 500ms", async () => {
    const config: ApprovalStageConfig<MockScope> = {
      name: "PerfTest",
      stageId: "perf",
      buildReviewPayload: (s) => ({ value: s.getValue("counter") }),
      applyDecision: (s, d) => {
        s.setValue("counter", ((s.getValue("counter") as number) ?? 0) + 1);
        s.setValue("approved", d.approved);
      },
    };

    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      const scope = createMockScope({ counter: i });
      const [, handler] = createApprovalStage(config);
      handler.execute(scope);

      const executor = createMockExecutor({ paused: true });
      await resumeApproval(executor, { cycle: i }, { approved: true });
      handler.resume(scope, { approved: true });
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it("checkpoint serialization size is reasonable (< 1KB for typical approval)", () => {
    const checkpoint = {
      stageId: "enrollment-review",
      flowName: "Enrollment-Flow",
      scopeSnapshot: {
        studentName: "Alice Johnson",
        gpa: 3.85,
        conflicts: [{ id: "c1", type: "schedule", desc: "Conflict with PE" }],
        requestedCourses: ["Math-101", "Eng-201", "Sci-301"],
      },
      timestamp: new Date().toISOString(),
    };
    const serialized = JSON.stringify(checkpoint);
    expect(serialized.length).toBeLessThan(1024);
  });
});

// =========================================================================
// 5. SECURITY TESTS (3)
// =========================================================================

describe("Security: Approval workflow", () => {
  it("XSS in review payload is preserved safely (not executed, just data)", () => {
    const scope = createMockScope({
      studentName: '<script>alert("xss")</script>',
    });
    const config: ApprovalStageConfig<MockScope> = {
      name: "XSS-Test",
      stageId: "xss",
      buildReviewPayload: (s) => ({ studentName: s.getValue("studentName") }),
      applyDecision: (s, d) => {
        s.setValue("approved", d.approved);
      },
    };
    const [, handler] = createApprovalStage(config);
    const payload = handler.execute(scope);

    // Payload preserves the raw string — no sanitization at this layer
    // (it's up to the UI layer to escape for rendering)
    expect(payload).toEqual({ studentName: '<script>alert("xss")</script>' });

    // Serialization round-trip also preserves it
    const roundTripped = JSON.parse(JSON.stringify(payload));
    expect(roundTripped.studentName).toBe('<script>alert("xss")</script>');
  });

  it("approval decision with prototype pollution keys does not pollute", () => {
    const scope = createMockScope();
    const config: ApprovalStageConfig<MockScope> = {
      name: "Proto-Test",
      stageId: "proto",
      buildReviewPayload: () => ({}),
      applyDecision: (s, d) => {
        s.setValue("approved", d.approved);
        if (d.extra) {
          // Store extra fields individually
          for (const [key, value] of Object.entries(d.extra)) {
            s.setValue(`extra_${key}`, value);
          }
        }
      },
    };
    const [, handler] = createApprovalStage(config);
    const maliciousDecision: ApprovalDecision = {
      approved: true,
      extra: {
        __proto__: { isAdmin: true } as any,
        constructor: { prototype: { isAdmin: true } } as any,
        toString: "hacked" as any,
      },
    };
    handler.resume(scope, maliciousDecision);

    // Verify no prototype pollution occurred on plain objects
    const plainObj: any = {};
    expect(plainObj.isAdmin).toBeUndefined();
    expect(({} as any).isAdmin).toBeUndefined();
  });

  it("checkpoint tampering: modified checkpoint is still passed through (validation is executor's job)", async () => {
    const executor = createMockExecutor({ paused: true });
    const originalCheckpoint = { stageId: "review", scope: { studentName: "Alice" } };
    const tamperedCheckpoint = { stageId: "review", scope: { studentName: "Eve" }, injected: true };

    // resumeApproval only validates paused state, not checkpoint integrity
    // (checkpoint validation is the executor's responsibility)
    await resumeApproval(executor, tamperedCheckpoint, { approved: true });
    expect(executor.getLastCheckpoint()).toEqual(tamperedCheckpoint);

    // The tampered field is passed through — executor would need to validate
    expect((executor.getLastCheckpoint() as any).injected).toBe(true);
  });
});
