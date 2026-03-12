import { defineModule } from "@footprint/features";

export const fees = defineModule({
  id: "fees",
  name: "Fee Management",
  description: "Fee structures, invoicing, payment tracking per student",
  domain: "finance",
  requires: ["students"],
  terminology: {
    invoice: { default: "Invoice" },
    payment: { default: "Payment" },
    feeStructure: { default: "Fee Structure", dance: "Pricing Plan", music: "Lesson Rate" },
  },
  roles: {
    canManageFees: ["Admin", "Owner", "Accountant"],
    canViewFees: ["Parent", "Guardian"],
  },
  seed: {
    k12: { model: "per-term", billingCycle: "quarterly" },
    dance: { model: "per-class", billingCycle: "monthly" },
    music: { model: "per-lesson", billingCycle: "monthly" },
    kindergarten: { model: "per-month", billingCycle: "monthly" },
    tutoring: { model: "per-session", billingCycle: "weekly" },
  },
});
