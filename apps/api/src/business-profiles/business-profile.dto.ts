import { Transform } from "class-transformer";
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { BUSINESS_RISK_TOLERANCES } from "@workspace/db/node";
const list = ({ value }: { value: unknown }) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))] : value;
export class UpdateBusinessProfileDto {
  @IsOptional() @IsInt() @Min(0) @Max(9_000_000_000_000) marketingBudgetVnd?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(9_000_000_000_000) paidAdsBudgetVnd?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(366) budgetPeriodDays?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) teamSize?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) availableHoursPerWeek?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) @Transform(list) availableTools?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) @Transform(list) availableChannels?: string[];
  @IsOptional() @IsIn(BUSINESS_RISK_TOLERANCES) riskTolerance?: typeof BUSINESS_RISK_TOLERANCES[number];
  @IsOptional() @IsString() @MaxLength(4000) constraintsNote?: string | null;
}
