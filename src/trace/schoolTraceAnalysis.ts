/**
 * School-domain trace analysis using footprintjs causalChain + QualityRecorder.
 *
 * Answers "what stages contributed to this scheduling conflict?" and
 * "which stage degraded data quality?" using backward program slicing
 * on the commit log.
 *
 * @example
 * ```ts
 * import { explainResult, createSchoolQualityScorer } from "school-footprint";
 * import { FlowChartExecutor } from "footprintjs";
 * import { QualityRecorder } from "footprintjs/trace";
 *
 * const executor = new FlowChartExecutor(chart);
 * const qualityRecorder = new QualityRecorder("quality", createSchoolQualityScorer());
 * executor.attachRecorder(qualityRecorder);
 * await executor.run({ input });
 *
 * // After execution: explain what caused a specific result
 * const explanation = explainResult(executor, "conflictDetected");
 * console.log(explanation.summary);
 * // "conflictDetected was caused by: assign-room#3 ← load-teacher#1 ← load-periods#0"
 * ```
 *
 * @module
 */

/**
 * Structured explanation of what stages caused a specific result key.
 */
export interface TraceExplanation {
  /** The key being explained (e.g., "conflictDetected", "enrollmentStatus"). */
  key: string;
  /** Human-readable causal chain summary. */
  summary: string;
  /** Ordered list of contributing stages (closest cause first). */
  stages: Array<{
    runtimeStageId: string;
    stageId: string;
    /** Keys this stage wrote that contributed to the result. */
    writtenKeys: string[];
  }>;
  /** Number of stages in the causal chain. */
  depth: number;
}

/**
 * Explain what stages contributed data to a specific result key.
 *
 * Uses footprintjs `causalChain()` for backward program slicing on the
 * commit log. Returns a structured explanation with the causal DAG
 * flattened into an ordered list.
 *
 * @param executor - The FlowChartExecutor after `.run()` completes
 * @param key - The scope key to trace (e.g., "conflictDetected")
 * @returns Structured explanation, or null if the key was never written
 *
 * @example
 * ```ts
 * const explanation = explainResult(executor, "enrollmentStatus");
 * if (explanation) {
 *   console.log(explanation.summary);
 *   // "enrollmentStatus ← validate-input#0 ← check-capacity#1 ← create-record#2"
 * }
 * ```
 */
export function explainResult(
  executor: { getSnapshot(): { commitLog?: unknown[] } },
  key: string
): TraceExplanation | null {
  const snapshot = executor.getSnapshot();
  const commitLog = snapshot.commitLog as CommitBundle[] | undefined;

  if (!commitLog || commitLog.length === 0) return null;

  // Find all stages that wrote the target key
  const writers = commitLog.filter(
    (c) => c.overwrite?.some((k: string) => k === key) || c.updates?.some((k: string) => k === key)
  );

  if (writers.length === 0) return null;

  // Build causal chain by tracing read dependencies backward
  const visited = new Set<string>();
  const stages: TraceExplanation["stages"] = [];

  function traceBack(bundle: CommitBundle) {
    const rid = bundle.runtimeStageId ?? bundle.stageId ?? "unknown";
    if (visited.has(rid)) return;
    visited.add(rid);

    const writtenKeys = [
      ...(bundle.overwrite ?? []),
      ...(bundle.updates ?? []),
    ] as string[];

    stages.push({
      runtimeStageId: rid,
      stageId: bundle.stageId ?? rid.replace(/#\d+$/, ""),
      writtenKeys,
    });

    // Find what this stage READ — those are its dependencies
    const reads = bundle.trace?.filter((t: TraceEntry) => t.type === "read") ?? [];
    for (const read of reads) {
      // Find the latest writer of this key before the current stage
      const writerIdx = commitLog!.findIndex((c) => c === bundle);
      for (let i = writerIdx - 1; i >= 0; i--) {
        const prev = commitLog![i];
        const prevKeys = [...(prev.overwrite ?? []), ...(prev.updates ?? [])] as string[];
        if (prevKeys.includes(read.key)) {
          traceBack(prev);
          break;
        }
      }
    }
  }

  for (const w of writers) traceBack(w);

  const chain = stages.map((s) => s.runtimeStageId).join(" \u2190 ");
  const summary = `${key} \u2190 ${chain}`;

  return {
    key,
    summary,
    stages,
    depth: stages.length,
  };
}

/**
 * Quality scoring function for school-domain flows.
 *
 * Scores each stage's output quality on a 0-1 scale based on:
 * - Data completeness (required fields present)
 * - Validation status (no error keys)
 * - Business rule compliance (no conflict flags)
 *
 * Compatible with footprintjs `QualityRecorder` constructor.
 *
 * @example
 * ```ts
 * import { QualityRecorder } from "footprintjs/trace";
 * const scorer = createSchoolQualityScorer();
 * const qr = new QualityRecorder("quality", scorer);
 * executor.attachRecorder(qr);
 * ```
 */
export function createSchoolQualityScorer(): (
  stageId: string,
  writtenKeys: string[],
  stageSnapshot: Record<string, unknown>
) => number {
  return (_stageId, writtenKeys, stageSnapshot) => {
    let score = 1.0;

    // Penalize stages that write error-related keys
    const errorKeys = writtenKeys.filter(
      (k) => k.includes("error") || k.includes("Error") || k.includes("conflict")
    );
    if (errorKeys.length > 0) score -= 0.3;

    // Penalize if status is "error" or "rejected"
    const status = stageSnapshot.status;
    if (status === "error" || status === "rejected") score -= 0.2;

    // Penalize empty/null writes (data completeness)
    const nullWrites = writtenKeys.filter(
      (k) => stageSnapshot[k] === null || stageSnapshot[k] === undefined
    );
    if (nullWrites.length > 0 && writtenKeys.length > 0) {
      score -= 0.1 * (nullWrites.length / writtenKeys.length);
    }

    return Math.max(0, Math.min(1, score));
  };
}

// Internal types matching footprintjs commitLog shape (duck-typed)
type TraceEntry = { type: string; key: string };
type CommitBundle = {
  stageId?: string;
  runtimeStageId?: string;
  overwrite?: string[];
  updates?: string[];
  trace?: TraceEntry[];
};
