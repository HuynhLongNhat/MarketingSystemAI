import { apiFetch } from "./api-client";
export type BusinessProfile = { organizationId: string; marketingBudgetVnd: number | null; paidAdsBudgetVnd: number | null; budgetPeriodDays: number | null; teamSize: number | null; availableHoursPerWeek: number | null; availableTools: string[]; availableChannels: string[]; riskTolerance: "conservative" | "balanced" | "aggressive"; constraintsNote: string | null; updatedAt: string; };
export type BusinessProfileInput = Omit<BusinessProfile, "organizationId" | "updatedAt">;
export const businessProfileApi = { get: () => apiFetch<BusinessProfile | null>("/business-profile"), update: (input: BusinessProfileInput) => apiFetch<BusinessProfile>("/business-profile", { method: "PUT", body: JSON.stringify(input) }) };
