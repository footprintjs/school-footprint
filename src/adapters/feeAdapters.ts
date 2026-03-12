import type { Adapter } from "@footprint/adapters";
import type { SchoolRepository } from "../types.js";

/**
 * Create all 5 fee adapters with repository access.
 * Each adapter delegates fee calculation to the repository with model-specific parameters.
 */
export function createFeeAdapters(repo: SchoolRepository): readonly Adapter[] {
  const perTerm: Adapter = {
    id: "per-term-fees",
    name: "Per-Term Fee Calculator",
    capabilityId: "calculate-fees",
    async execute(input, _context) {
      const { studentId, termId, gradeId } = input as Record<string, unknown>;
      const result = await repo.calculateFee({
        studentId: studentId as string,
        termId: termId as string | undefined,
        gradeId: gradeId as string | undefined,
      });
      return { ...result, model: "per-term" };
    },
  };

  const perClass: Adapter = {
    id: "per-class-fees",
    name: "Per-Class Fee Calculator",
    capabilityId: "calculate-fees",
    async execute(input, _context) {
      const { studentId, classCount } = input as Record<string, unknown>;
      const result = await repo.calculateFee({
        studentId: studentId as string,
        classCount: classCount as number | undefined,
      });
      return { ...result, model: "per-class" };
    },
  };

  const perLesson: Adapter = {
    id: "per-lesson-fees",
    name: "Per-Lesson Fee Calculator",
    capabilityId: "calculate-fees",
    async execute(input, _context) {
      const { studentId, lessonCount, instrument } = input as Record<string, unknown>;
      const result = await repo.calculateFee({
        studentId: studentId as string,
        lessonCount: lessonCount as number | undefined,
        instrument: instrument as string | undefined,
      });
      return { ...result, model: "per-lesson" };
    },
  };

  const perMonth: Adapter = {
    id: "per-month-fees",
    name: "Per-Month Fee Calculator",
    capabilityId: "calculate-fees",
    async execute(input, _context) {
      const { studentId, monthId } = input as Record<string, unknown>;
      const result = await repo.calculateFee({
        studentId: studentId as string,
        monthId: monthId as string | undefined,
      });
      return { ...result, model: "per-month" };
    },
  };

  const perSession: Adapter = {
    id: "per-session-fees",
    name: "Per-Session Fee Calculator",
    capabilityId: "calculate-fees",
    async execute(input, _context) {
      const { studentId, sessionCount } = input as Record<string, unknown>;
      const result = await repo.calculateFee({
        studentId: studentId as string,
        sessionCount: sessionCount as number | undefined,
      });
      return { ...result, model: "per-session" };
    },
  };

  return [perTerm, perClass, perLesson, perMonth, perSession];
}

// Static references for adapter registry bootstrapping
export const perTermFeeAdapter: Adapter = {
  id: "per-term-fees", name: "Per-Term Fee Calculator", capabilityId: "calculate-fees",
  async execute(input) { return { model: "per-term", ...(input as Record<string, unknown>), calculated: true }; },
};
export const perClassFeeAdapter: Adapter = {
  id: "per-class-fees", name: "Per-Class Fee Calculator", capabilityId: "calculate-fees",
  async execute(input) { return { model: "per-class", ...(input as Record<string, unknown>), calculated: true }; },
};
export const perLessonFeeAdapter: Adapter = {
  id: "per-lesson-fees", name: "Per-Lesson Fee Calculator", capabilityId: "calculate-fees",
  async execute(input) { return { model: "per-lesson", ...(input as Record<string, unknown>), calculated: true }; },
};
export const perMonthFeeAdapter: Adapter = {
  id: "per-month-fees", name: "Per-Month Fee Calculator", capabilityId: "calculate-fees",
  async execute(input) { return { model: "per-month", ...(input as Record<string, unknown>), calculated: true }; },
};
export const perSessionFeeAdapter: Adapter = {
  id: "per-session-fees", name: "Per-Session Fee Calculator", capabilityId: "calculate-fees",
  async execute(input) { return { model: "per-session", ...(input as Record<string, unknown>), calculated: true }; },
};

export const allFeeAdapters: readonly Adapter[] = [
  perTermFeeAdapter, perClassFeeAdapter, perLessonFeeAdapter, perMonthFeeAdapter, perSessionFeeAdapter,
];
