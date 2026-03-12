import type { Adapter } from "@footprint/adapters";

/**
 * Per-term fee calculation — K-12 pattern.
 */
export const perTermFeeAdapter: Adapter = {
  id: "per-term-fees",
  name: "Per-Term Fee Calculator",
  capabilityId: "calculate-fees",
  async execute(input, context) {
    const { studentId, termId, gradeId } = input as Record<string, unknown>;
    return { model: "per-term", studentId, termId, gradeId, calculated: true };
  },
};

/**
 * Per-class fee calculation — dance pattern.
 */
export const perClassFeeAdapter: Adapter = {
  id: "per-class-fees",
  name: "Per-Class Fee Calculator",
  capabilityId: "calculate-fees",
  async execute(input, context) {
    const { studentId, classCount } = input as Record<string, unknown>;
    return { model: "per-class", studentId, classCount, calculated: true };
  },
};

/**
 * Per-lesson fee calculation — music pattern.
 */
export const perLessonFeeAdapter: Adapter = {
  id: "per-lesson-fees",
  name: "Per-Lesson Fee Calculator",
  capabilityId: "calculate-fees",
  async execute(input, context) {
    const { studentId, lessonCount, instrument } = input as Record<string, unknown>;
    return { model: "per-lesson", studentId, lessonCount, instrument, calculated: true };
  },
};

/**
 * Per-month fee calculation — kindergarten pattern.
 */
export const perMonthFeeAdapter: Adapter = {
  id: "per-month-fees",
  name: "Per-Month Fee Calculator",
  capabilityId: "calculate-fees",
  async execute(input, context) {
    const { studentId, monthId } = input as Record<string, unknown>;
    return { model: "per-month", studentId, monthId, calculated: true };
  },
};

/**
 * Per-session fee calculation — tutoring pattern.
 */
export const perSessionFeeAdapter: Adapter = {
  id: "per-session-fees",
  name: "Per-Session Fee Calculator",
  capabilityId: "calculate-fees",
  async execute(input, context) {
    const { studentId, sessionCount } = input as Record<string, unknown>;
    return { model: "per-session", studentId, sessionCount, calculated: true };
  },
};

export const allFeeAdapters: readonly Adapter[] = [
  perTermFeeAdapter,
  perClassFeeAdapter,
  perLessonFeeAdapter,
  perMonthFeeAdapter,
  perSessionFeeAdapter,
];
