import { defineModule } from "@footprint/features";

export const workflow = defineModule({
  id: "workflow",
  name: "Workflow Engine",
  description: "State machine templates, workflow instances, automated transitions",
  domain: "workflow",
  requires: ["students"],
  terminology: {
    workflowTemplate: { default: "Workflow Template" },
    workflowInstance: { default: "Workflow Instance" },
  },
  roles: {
    canDesignWorkflows: ["Admin", "Principal"],
    canTriggerWorkflows: ["Admin", "Teacher", "Front Desk"],
  },
});
