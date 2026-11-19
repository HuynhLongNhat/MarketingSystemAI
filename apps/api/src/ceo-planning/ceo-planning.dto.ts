import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { ceoStructuredPlanSchema } from "./ceo-structured-plan.js";
import { z } from "zod";
import { CEO_PLAN_APPROVAL_STATUSES } from "@workspace/db/node";

export class CreateCeoPlanDto {
  @IsUUID() ceoAgentId!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(12000) objective!: string;
  @IsOptional() @IsString() @MaxLength(4000) additionalContext?: string;
  @IsOptional() @IsIn(["fast", "balanced", "deep"] as const) preset?: "fast" | "balanced" | "deep";
  @IsOptional() @IsInt() @Min(1) @Max(8000) maxOutputTokens?: number;
  @IsOptional() @IsInt() @Min(10) @Max(180) timeoutSeconds?: number;
  @IsOptional() @IsIn(["low", "medium", "high"] as const) reasoningEffort?: "low" | "medium" | "high";
  @IsOptional() @IsIn(["api_provider", "chatgpt_plan"] as const) executionSource?: "api_provider" | "chatgpt_plan";
}
export class DecideCeoPlanDto {
  @IsIn(["approved", "rejected"] as const) decision!: typeof CEO_PLAN_APPROVAL_STATUSES[number];
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
export class CreateStrategicReviewDto {
  /** A Strategic Advisor is an Organization-scoped AI Agent, never a client-supplied runtime. */
  @IsUUID() reviewerAgentId!: string;
}

/** External AI supplies a completed plan; Nova does not generate it again. */
export const importExternalPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(4000),
  source: z.enum(["chatgpt", "gemini", "claude", "other"]),
  structuredPlan: ceoStructuredPlanSchema,
});
export type ImportExternalPlanInput = z.infer<typeof importExternalPlanSchema>;
