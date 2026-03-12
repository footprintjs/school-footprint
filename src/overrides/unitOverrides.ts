import type { UnitOverrides, UnitOverrideStore } from "../types.js";

/**
 * Create an in-memory unit override store for testing.
 */
export function createMemoryOverrideStore(
  overrides: Record<string, UnitOverrides> = {},
): UnitOverrideStore {
  const store = new Map(Object.entries(overrides));
  return {
    async getOverrides(unitId) {
      return store.get(unitId);
    },
  };
}
