import type { AdapterMapping } from "@footprint/adapters";

/**
 * Maps capabilities to strategies per school type.
 * This is where "Shopify for Schools" configurability lives —
 * the same operation routes to a different strategy per school type.
 */
export const schoolStrategyMappings: readonly AdapterMapping[] = [
  {
    capabilityId: "schedule-class",
    profileAdapters: {
      k12: "fixed-timetable",
      dance: "time-slots",
      music: "appointments",
      kindergarten: "activity-blocks",
      tutoring: "flexible-slots",
    },
  },
  {
    capabilityId: "calculate-fees",
    profileAdapters: {
      k12: "per-term-fees",
      dance: "per-class-fees",
      music: "per-lesson-fees",
      kindergarten: "per-month-fees",
      tutoring: "per-session-fees",
    },
  },
];
