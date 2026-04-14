/**
 * School-aware NarrativeRenderer for footprintjs.
 *
 * Transforms generic flow narrative text into school-specific language
 * using the terminology system. A dance school sees "Enrolled Dancer Alice"
 * instead of "Enrolled Student Alice".
 *
 * @example
 * ```ts
 * import { createSchoolNarrativeRenderer } from "school-footprint";
 * import { FlowChartExecutor } from "footprintjs";
 * import { narrative } from "footprintjs/recorders";
 *
 * const renderer = createSchoolNarrativeRenderer("dance");
 * const executor = new FlowChartExecutor(chart);
 * executor.attachFlowRecorder(narrative({ renderer }));
 * await executor.run();
 * // Narrative: "Step 1: Enroll-Dancer — Register a new Dancer in the system"
 * ```
 *
 * @module
 */
import type { SchoolType, SchoolTermKey } from "../types.js";
import { resolveTerminologyLabel } from "../terminology/schoolTerms.js";

/**
 * NarrativeRenderer interface (matches footprintjs/recorders).
 * Defined locally to avoid runtime import of footprintjs types.
 */
export interface SchoolNarrativeRenderer {
  renderStage?(ctx: { stageName: string; stageNumber: number; isFirst: boolean; description?: string; loopIteration?: number }): string;
  renderOp?(ctx: { type: "read" | "write"; key: string; rawValue: unknown; valueSummary: string; operation?: string; stepNumber: number }): string | null;
  renderDecision?(ctx: { decider: string; chosen: string; description?: string; rationale?: string; evidence?: unknown }): string;
  renderSubflow?(ctx: { name: string; direction: "entry" | "exit"; description?: string }): string;
  renderError?(ctx: { stageName: string; message: string }): string;
}

/** Term keys that may appear in narrative text as capitalised words. */
const NARRATIVE_TERM_KEYS: SchoolTermKey[] = [
  "student", "teacher", "grade", "section", "subject",
  "course", "period", "department", "attendance",
];

/**
 * Build a regex-based replacer that swaps default terms for school-specific ones.
 *
 * @internal Exported for testing only.
 */
export function buildTermReplacer(
  schoolType: SchoolType
): (text: string) => string {
  const pairs: Array<[RegExp, string]> = [];

  for (const key of NARRATIVE_TERM_KEYS) {
    const { singular: replacement } = resolveTerminologyLabel(key, schoolType);
    const { singular: defaultLabel } = resolveTerminologyLabel(key, "k12");

    if (replacement === defaultLabel) continue;

    // Match the default term as a whole word, case-insensitive
    pairs.push([new RegExp(`\\b${defaultLabel}\\b`, "gi"), replacement]);
  }

  if (pairs.length === 0) return (t) => t;

  return (text: string): string => {
    let result = text;
    for (const [pattern, replacement] of pairs) {
      result = result.replace(pattern, replacement);
    }
    return result;
  };
}

/**
 * Create a NarrativeRenderer that uses school-specific terminology.
 *
 * Wraps stage descriptions and data operation summaries with term replacement,
 * so a dance school sees "Level" instead of "Grade" and "Dancer" instead of "Student"
 * throughout the narrative output.
 *
 * @param schoolType - The school type to use for terminology lookup
 * @returns A NarrativeRenderer compatible with `narrative({ renderer })` from footprintjs/recorders
 *
 * @example
 * ```ts
 * const renderer = createSchoolNarrativeRenderer("dance");
 * // renderer.renderStage({ stageName: "Enroll-Student", stageNumber: 1, isFirst: true })
 * // => "Step 1: Enroll-Dancer"
 * ```
 */
export function createSchoolNarrativeRenderer(
  schoolType: SchoolType
): SchoolNarrativeRenderer {
  const replace = buildTermReplacer(schoolType);

  return {
    renderStage(ctx) {
      const prefix = ctx.loopIteration
        ? `Step ${ctx.stageNumber} (iteration ${ctx.loopIteration})`
        : `Step ${ctx.stageNumber}`;
      const name = replace(ctx.stageName);
      const desc = ctx.description ? ` \u2014 ${replace(ctx.description)}` : "";
      return `${prefix}: ${name}${desc}`;
    },

    renderOp(ctx) {
      const verb = ctx.type === "read" ? "Read" : "Wrote";
      return `  ${verb} ${replace(ctx.key)}: ${replace(ctx.valueSummary)}`;
    },

    renderDecision(ctx) {
      const desc = ctx.description ? ` (${replace(ctx.description)})` : "";
      return `Decision ${replace(ctx.decider)}${desc}: chose "${replace(ctx.chosen)}"`;
    },

    renderSubflow(ctx) {
      const arrow = ctx.direction === "entry" ? "\u2192" : "\u2190";
      const desc = ctx.description ? ` \u2014 ${replace(ctx.description)}` : "";
      return `${arrow} Subflow ${replace(ctx.name)}${desc}`;
    },

    renderError(ctx) {
      return `Error in ${replace(ctx.stageName)}: ${replace(ctx.message)}`;
    },
  };
}
