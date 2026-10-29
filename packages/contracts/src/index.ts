import { z } from "zod";

export const tenantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  status: z.enum(["active", "suspended"]),
});

export const websiteConnectionSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  baseUrl: z.string().url().max(500),
  status: z.enum(["pending", "active", "blocked", "disabled"]),
});

export const workflowStatusSchema = z.enum([
  "draft",
  "proposed",
  "approved",
  "rejected",
  "degraded",
]);

export const riskSchema = z.enum([
  "read_only",
  "reversible_write",
  "high_impact",
  "destructive",
]);

export type Tenant = z.infer<typeof tenantSchema>;
export type WebsiteConnection = z.infer<typeof websiteConnectionSchema>;
