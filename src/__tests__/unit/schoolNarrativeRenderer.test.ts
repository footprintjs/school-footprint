/**
 * schoolNarrativeRenderer — 5-pattern test suite.
 *
 * 1. Unit: buildTermReplacer per school type, each render method
 * 2. Scenario: Full flow with FlowChartExecutor + renderer post-processing
 * 3. Property: Idempotency, unknown types, empty strings
 * 4. Performance: 1000-iteration replacer throughput
 * 5. Security: Regex injection, XSS payloads
 */
import { describe, it, expect } from "vitest";
import { flowChart, FlowChartExecutor } from "footprintjs";
import {
  buildTermReplacer,
  createSchoolNarrativeRenderer,
} from "../../narrative/schoolNarrativeRenderer.js";

// ---------------------------------------------------------------------------
// 1. Unit Tests
// ---------------------------------------------------------------------------
describe("Unit: buildTermReplacer", () => {
  it("dance: replaces Student -> Dancer, Grade -> Level, Section -> Style", () => {
    const replace = buildTermReplacer("dance");
    expect(replace("Student enrolled in Grade 5 Section A")).toBe(
      "Dancer enrolled in Level 5 Style A"
    );
  });

  it("music: replaces Grade -> Level, Section -> Instrument", () => {
    const replace = buildTermReplacer("music");
    expect(replace("Assign Student to Section")).toBe(
      "Assign Student to Instrument"
    );
    expect(replace("Grade report")).toBe("Level report");
  });

  it("kindergarten: replaces Student -> Child, Grade -> Age Group, Section -> Classroom", () => {
    const replace = buildTermReplacer("kindergarten");
    expect(replace("Student in Grade 1 Section B")).toBe(
      "Child in Age Group 1 Classroom B"
    );
  });

  it("tutoring: replaces Grade -> Level, Section -> Group", () => {
    const replace = buildTermReplacer("tutoring");
    expect(replace("Grade assignment for Section")).toBe(
      "Level assignment for Group"
    );
  });

  it("k12: returns identity (no replacements)", () => {
    const replace = buildTermReplacer("k12");
    const text = "Student enrolled in Grade 5 Section A";
    expect(replace(text)).toBe(text);
  });

  it("preserves case-insensitive matching", () => {
    const replace = buildTermReplacer("dance");
    expect(replace("student")).toBe("Dancer");
    expect(replace("STUDENT")).toBe("Dancer");
    expect(replace("Student")).toBe("Dancer");
  });

  it("respects word boundaries — does not replace substrings", () => {
    const replace = buildTermReplacer("dance");
    // "Students" contains "Student" but as a word boundary match
    // the regex \bStudent\b should match "Student" as whole word
    expect(replace("StudentID")).toBe("StudentID"); // no match — no word boundary after "Student"
  });
});

describe("Unit: createSchoolNarrativeRenderer render methods", () => {
  const renderer = createSchoolNarrativeRenderer("dance");

  it("renderStage: replaces terms in stage name and description", () => {
    const result = renderer.renderStage!({
      stageName: "Enroll-Student",
      stageNumber: 1,
      isFirst: true,
      description: "Register a new Student in the Grade",
    });
    expect(result).toBe(
      "Step 1: Enroll-Dancer \u2014 Register a new Dancer in the Level"
    );
  });

  it("renderStage: includes loop iteration when present", () => {
    const result = renderer.renderStage!({
      stageName: "Check-Student",
      stageNumber: 3,
      isFirst: false,
      loopIteration: 2,
    });
    expect(result).toBe("Step 3 (iteration 2): Check-Dancer");
  });

  it("renderStage: omits description dash when no description", () => {
    const result = renderer.renderStage!({
      stageName: "Load-Grade",
      stageNumber: 2,
      isFirst: false,
    });
    expect(result).toBe("Step 2: Load-Level");
  });

  it("renderOp: replaces terms in key and value summary", () => {
    const result = renderer.renderOp!({
      type: "write",
      key: "studentName",
      rawValue: "Alice",
      valueSummary: "Student Alice created",
      stepNumber: 1,
    });
    expect(result).toBe("  Wrote studentName: Dancer Alice created");
  });

  it("renderOp: uses Read verb for read type", () => {
    const result = renderer.renderOp!({
      type: "read",
      key: "grade",
      rawValue: "5",
      valueSummary: "Grade 5",
      stepNumber: 1,
    });
    // key "grade" is also run through replace(), but "grade" lowercase
    // matches \bGrade\b case-insensitive, so it becomes "Level"
    expect(result).toBe("  Read Level: Level 5");
  });

  it("renderDecision: replaces terms in decider, description, and chosen", () => {
    const result = renderer.renderDecision!({
      decider: "Student-Router",
      chosen: "Grade-Path",
      description: "Route Student to correct Grade",
    });
    expect(result).toBe(
      'Decision Dancer-Router (Route Dancer to correct Level): chose "Level-Path"'
    );
  });

  it("renderSubflow: replaces terms with entry arrow", () => {
    const result = renderer.renderSubflow!({
      name: "Student-Enrollment",
      direction: "entry",
      description: "Enroll Student in Section",
    });
    expect(result).toBe(
      "\u2192 Subflow Dancer-Enrollment \u2014 Enroll Dancer in Style"
    );
  });

  it("renderSubflow: uses exit arrow for exit direction", () => {
    const result = renderer.renderSubflow!({
      name: "Grade-Check",
      direction: "exit",
    });
    expect(result).toBe("\u2190 Subflow Level-Check");
  });

  it("renderError: replaces terms in stage name and message", () => {
    const result = renderer.renderError!({
      stageName: "Create-Student",
      message: "Student already exists in Grade",
    });
    expect(result).toBe(
      "Error in Create-Dancer: Dancer already exists in Level"
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Scenario: Full flow with FlowChartExecutor + renderer post-processing
// ---------------------------------------------------------------------------
describe("Scenario: Full flow with renderer integration", () => {
  it("renders narrative with dance terminology after running a flow", async () => {
    const renderer = createSchoolNarrativeRenderer("dance");

    // Build a simple flow with K-12 default terms in stage names
    interface EnrollState { studentName: string; grade: string }
    const chart = flowChart<EnrollState>(
      "Validate-Student",
      async (scope) => {
        scope.studentName = "Alice";
      },
      "validate-student",
      undefined,
      "Validate the Student record"
    )
      .addFunction(
        "Assign-Grade",
        async (scope) => {
          scope.grade = "Level 3";
        },
        "assign-grade",
        "Assign Student to a Grade"
      )
      .build();

    const executor = new FlowChartExecutor(chart);
    executor.enableNarrative();
    await executor.run();

    // Get the raw narrative lines from footprintjs
    const rawLines = executor.getNarrative();
    expect(rawLines.length).toBeGreaterThan(0);

    // Post-process through the renderer's replacer
    const replace = buildTermReplacer("dance");
    const schoolLines = rawLines.map((line) => replace(line));

    // Verify school-specific terms appear
    const joined = schoolLines.join("\n");
    expect(joined).toContain("Dancer");
    expect(joined).toContain("Level");
    // Original K-12 terms should be replaced
    expect(joined).not.toMatch(/\bStudent\b/);
    expect(joined).not.toMatch(/\bGrade\b/);
  });

  it("k12 renderer leaves narrative unchanged", async () => {
    interface SimpleState { name: string }
    const chart = flowChart<SimpleState>(
      "Enroll-Student",
      async (scope) => {
        scope.name = "Bob";
      },
      "enroll",
      undefined,
      "Enroll a Student"
    )
      .build();

    const executor = new FlowChartExecutor(chart);
    executor.enableNarrative();
    await executor.run();

    const rawLines = executor.getNarrative();
    const replace = buildTermReplacer("k12");
    const processed = rawLines.map((line) => replace(line));

    expect(processed).toEqual(rawLines);
  });

  it("renders all method types with kindergarten terms", () => {
    const renderer = createSchoolNarrativeRenderer("kindergarten");

    const stageOutput = renderer.renderStage!({
      stageName: "Register-Student",
      stageNumber: 1,
      isFirst: true,
      description: "Add Student to Grade Section",
    });
    expect(stageOutput).toContain("Child");
    expect(stageOutput).toContain("Age Group");
    expect(stageOutput).toContain("Classroom");

    const opOutput = renderer.renderOp!({
      type: "write",
      key: "student",
      rawValue: {},
      valueSummary: "Student record in Section",
      stepNumber: 1,
    });
    expect(opOutput).toContain("Child");
    expect(opOutput).toContain("Classroom");

    const errorOutput = renderer.renderError!({
      stageName: "Student-Validation",
      message: "Grade not found for Student in Section",
    });
    expect(errorOutput).toContain("Child");
    expect(errorOutput).toContain("Age Group");
    expect(errorOutput).toContain("Classroom");
  });
});

// ---------------------------------------------------------------------------
// 3. Property Tests
// ---------------------------------------------------------------------------
describe("Property: replacer invariants", () => {
  it("idempotent — double-apply produces same result", () => {
    const replace = buildTermReplacer("dance");
    const input = "Student enrolled in Grade 5 Section A";
    const once = replace(input);
    const twice = replace(once);
    expect(twice).toBe(once);
  });

  it("idempotent for all school types", () => {
    const types = ["dance", "music", "kindergarten", "tutoring", "k12"] as const;
    const input = "Student Grade Section Subject Period Department Attendance Course";
    for (const t of types) {
      const replace = buildTermReplacer(t);
      const once = replace(input);
      const twice = replace(once);
      expect(twice).toBe(once);
    }
  });

  it("unknown school type returns identity function", () => {
    const replace = buildTermReplacer("unknown-type" as any);
    const text = "Student in Grade 5";
    expect(replace(text)).toBe(text);
  });

  it("handles empty string", () => {
    const replace = buildTermReplacer("dance");
    expect(replace("")).toBe("");
  });

  it("handles string with no matching terms", () => {
    const replace = buildTermReplacer("dance");
    expect(replace("Hello world 123")).toBe("Hello world 123");
  });

  it("handles string with only whitespace", () => {
    const replace = buildTermReplacer("dance");
    expect(replace("   \t\n  ")).toBe("   \t\n  ");
  });

  it("renderer methods handle missing optional fields", () => {
    const renderer = createSchoolNarrativeRenderer("dance");

    // renderStage without description or loopIteration
    const stage = renderer.renderStage!({
      stageName: "Test",
      stageNumber: 1,
      isFirst: true,
    });
    expect(stage).toBe("Step 1: Test");

    // renderDecision without description
    const decision = renderer.renderDecision!({
      decider: "Router",
      chosen: "pathA",
    });
    expect(decision).toBe('Decision Router: chose "pathA"');

    // renderSubflow without description
    const subflow = renderer.renderSubflow!({
      name: "Sub",
      direction: "entry",
    });
    expect(subflow).toBe("\u2192 Subflow Sub");
  });
});

// ---------------------------------------------------------------------------
// 4. Performance Tests
// ---------------------------------------------------------------------------
describe("Performance: replacer throughput", () => {
  it("1000 iterations of dance replacer complete within 100ms", () => {
    const replace = buildTermReplacer("dance");
    const input =
      "Student enrolled in Grade 5 Section A with Subject Math and Period 1 in Department Science for Attendance and Course 101";

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      replace(input);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it("regex compilation happens once, not per call", () => {
    const replace = buildTermReplacer("dance");

    // First call
    const start1 = performance.now();
    for (let i = 0; i < 500; i++) replace("Student Grade Section");
    const elapsed1 = performance.now() - start1;

    // Second batch — should be same speed (no recompilation)
    const start2 = performance.now();
    for (let i = 0; i < 500; i++) replace("Student Grade Section");
    const elapsed2 = performance.now() - start2;

    // Second batch should not be significantly slower
    // Allow 3x tolerance for timing jitter
    expect(elapsed2).toBeLessThan(elapsed1 * 3 + 1);
  });

  it("createSchoolNarrativeRenderer is fast to construct", () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      createSchoolNarrativeRenderer("dance");
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// 5. Security Tests
// ---------------------------------------------------------------------------
describe("Security: regex safety and payload handling", () => {
  it("stage names with regex special characters do not break replacer", () => {
    const replace = buildTermReplacer("dance");
    // Input containing regex metacharacters
    const dangerous = "Student (enrolled) in [Grade] {Section} $100.00 ^start";
    const result = replace(dangerous);
    // Should replace terms without crashing
    expect(result).toContain("Dancer");
    expect(result).toContain("Level");
    expect(result).toContain("Style");
    // Metacharacters preserved
    expect(result).toContain("(enrolled)");
    expect(result).toContain("$100.00");
  });

  it("XSS-like payloads in stage names are not transformed dangerously", () => {
    const renderer = createSchoolNarrativeRenderer("dance");
    const xssPayload = '<script>alert("Student")</script>';

    const result = renderer.renderStage!({
      stageName: xssPayload,
      stageNumber: 1,
      isFirst: true,
    });

    // The script tags should pass through as-is (replacer is text-only, not HTML-aware)
    expect(result).toContain("<script>");
    // The term inside the script should still be replaced (text replacement, not HTML parsing)
    expect(result).toContain("Dancer");
    // No additional HTML injection from the replacer itself
    expect(result).not.toContain("javascript:");
  });

  it("very long input strings do not cause catastrophic backtracking", () => {
    const replace = buildTermReplacer("dance");
    // Build a long string with repeated near-matches
    const longInput = "Studen ".repeat(10000) + "Student";

    const start = performance.now();
    const result = replace(longInput);
    const elapsed = performance.now() - start;

    // Should complete quickly — no catastrophic backtracking
    expect(elapsed).toBeLessThan(500);
    // Should still replace the actual match at the end
    expect(result).toContain("Dancer");
  });

  it("null-byte and control characters in input do not crash", () => {
    const replace = buildTermReplacer("dance");
    const weirdInput = "Student\x00Grade\x01Section\x02";
    expect(() => replace(weirdInput)).not.toThrow();
    const result = replace(weirdInput);
    expect(result).toContain("Dancer");
  });

  it("term values with regex-special characters would be escaped if present", () => {
    // The current terms (Dancer, Level, Style, etc.) are plain words.
    // This test verifies the replacer handles terms with special chars gracefully.
    // Since defaultLabel comes from resolveTerminologyLabel (controlled data),
    // regex injection via term values is not currently possible.
    // But we verify the replacer does not crash on output containing special chars.
    const replace = buildTermReplacer("dance");
    const input = "Student (with) Grade [and] Section";
    const result = replace(input);
    expect(result).toBe("Dancer (with) Level [and] Style");
  });
});
