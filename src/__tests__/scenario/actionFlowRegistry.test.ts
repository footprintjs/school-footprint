import { describe, it, expect } from "vitest";
import { FlowChartExecutor, ScopeFacade } from "footprintjs";
import {
  getActionFlowEntry,
  getRegisteredActionIds,
} from "../../flows/schoolServiceComposer.js";
import { createSchoolServiceRegistry } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";
import type { SchoolType } from "../../types.js";

describe("ActionFlowRegistry — scenario tests", () => {
  const repo = createMockRepository();

  describe("registry backward compatibility", () => {
    it("existing service registry still works with new ActionFlowRegistry", () => {
      const registry = createSchoolServiceRegistry(repo);

      // All old APIs still function
      expect(registry.serviceIds()).toContain("create-grade");
      expect(registry.getFlow("create-grade")).toBeDefined();
      expect(registry.getTypedFlow("create-grade", "dance")).toBeDefined();
    });

    it("buildServiceFlow still returns fresh FlowCharts", () => {
      const registry = createSchoolServiceRegistry(repo);
      const built1 = registry.buildServiceFlow("create-grade", {
        schoolType: "k12",
        unitId: "k12-1",
        repository: repo,
      });
      const built2 = registry.buildServiceFlow("create-grade", {
        schoolType: "k12",
        unitId: "k12-1",
        repository: repo,
      });

      expect(built1).toBeDefined();
      expect(built2).toBeDefined();
      // Different objects (fresh build each time)
      expect(built1!.flow).not.toBe(built2!.flow);
    });

    it("executeService works through registry for all school types", async () => {
      const registry = createSchoolServiceRegistry(repo);
      const schoolTypes: SchoolType[] = ["k12", "dance", "music", "kindergarten", "tutoring"];

      for (const schoolType of schoolTypes) {
        const result = await registry.executeService(
          "enroll-student",
          { name: "Test Student", dob: "2015-01-01" },
          { schoolType, unitId: `${schoolType}-1`, repository: repo },
        );
        expect(result.status).toBe("success");
      }
    });
  });

  describe("flow builder produces valid FlowCharts", () => {
    it("each action's default builder generates description and stageDescriptions", () => {
      for (const id of getRegisteredActionIds()) {
        const entry = getActionFlowEntry(id)!;
        const flow = entry.default(repo);
        expect(typeof flow.description).toBe("string");
        expect(flow.description!.length).toBeGreaterThan(0);
        expect(flow.stageDescriptions).toBeInstanceOf(Map);
        expect(flow.stageDescriptions!.size).toBeGreaterThan(0);
      }
    });

    it("each action's default builder generates buildTimeStructure", () => {
      for (const id of getRegisteredActionIds()) {
        const entry = getActionFlowEntry(id)!;
        const flow = entry.default(repo);
        expect(flow.buildTimeStructure).toBeDefined();
        expect((flow.buildTimeStructure as any).name).toBeDefined();
      }
    });
  });

  describe("terminology injection via term resolver", () => {
    it("builder accepts term resolver without error", () => {
      for (const id of getRegisteredActionIds()) {
        const entry = getActionFlowEntry(id)!;
        const termResolver = (key: string) => `${key}-custom`;
        const flow = entry.default(repo, termResolver);
        expect(flow.root).toBeDefined();
      }
    });
  });
});
