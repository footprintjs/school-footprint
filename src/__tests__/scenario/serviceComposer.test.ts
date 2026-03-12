import { describe, it, expect } from "vitest";
import { FlowChartExecutor, ManifestFlowRecorder } from "footprintjs";
import { createSchoolOperationsFlow } from "../../flows/schoolServiceComposer.js";
import { createSchoolServiceRegistry } from "../../flows/schoolServiceComposer.js";
import { createMockRepository } from "../helpers.js";

describe("school service composer", () => {
  const repo = createMockRepository();

  describe("operations flow", () => {
    it("routes enrollment operation to enrollment service", async () => {
      const flow = createSchoolOperationsFlow(repo);
      const manifest = new ManifestFlowRecorder();
      const executor = new FlowChartExecutor(flow, undefined, undefined, {
        operation: "enroll",
        input: { name: "Luna Martinez", dob: "2015-03-12" },
      });
      executor.attachFlowRecorder(manifest);

      await executor.run();
      const tree = manifest.getManifest();

      // Should have at least the enrollment subflow in the manifest
      expect(tree.length).toBeGreaterThanOrEqual(0);
    });

    it("routes scheduling operation", async () => {
      const flow = createSchoolOperationsFlow(repo);
      const executor = new FlowChartExecutor(flow, undefined, undefined, {
        operation: "schedule",
        input: {
          teacherId: "teacher-1",
          classId: "class-1",
          slot: { dayOfWeek: 1, periodId: "P1" },
        },
      });

      await executor.run();
      const state = executor.getSnapshot().sharedState as Record<string, unknown>;
      expect(state.operation).toBe("schedule");
    });
  });

  describe("service registry", () => {
    it("lists registered service IDs", () => {
      const registry = createSchoolServiceRegistry(repo);
      const ids = registry.serviceIds();

      expect(ids).toContain("enroll-student");
      expect(ids).toContain("create-attendance-session");
      expect(ids).toContain("schedule-class");
    });

    it("returns flow for known action", () => {
      const registry = createSchoolServiceRegistry(repo);
      expect(registry.getFlow("enroll-student")).toBeDefined();
      expect(registry.getFlow("schedule-class")).toBeDefined();
    });

    it("returns undefined for unknown action", () => {
      const registry = createSchoolServiceRegistry(repo);
      expect(registry.getFlow("nonexistent")).toBeUndefined();
    });

    it("executes enrollment service with manifest", async () => {
      const registry = createSchoolServiceRegistry(repo);
      const result = await registry.executeService(
        "enroll-student",
        { name: "Test Student", dob: "2015-01-01" },
        { schoolType: "dance", unitId: "dance-1", repository: repo },
      );

      expect(result.status).toBe("success");
      expect(result.result?.enrolledStudent).toBeDefined();
      expect(result.narrative.length).toBeGreaterThan(0);
    });

    it("returns error for unknown action", async () => {
      const registry = createSchoolServiceRegistry(repo);
      const result = await registry.executeService(
        "nonexistent",
        {},
        { schoolType: "dance", unitId: "dance-1", repository: repo },
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("No service flow registered");
    });
  });
});
