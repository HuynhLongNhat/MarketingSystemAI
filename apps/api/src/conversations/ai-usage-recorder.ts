
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { aiUsageLogs, db } from "@workspace/db/node";

export type AiUsageInput = {
  organizationId: string;
  provider: string;
  modelId: string;
  purpose: string;
  status: "success" | "failed";
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  errorCode?: string | null;
};

function validInteger(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 2_147_483_647
  ) {
    return null;
  }

  return value;
}

@Injectable()
export class AiUsageRecorder {
  private readonly logger = new Logger(AiUsageRecorder.name);

  /**
   * Returns true only when usage was persisted successfully
   * and a valid total token count is available.
   *
   * The boolean is used by quota settlement:
   * uncertain usage must keep its reservation until month end.
   */
  async record(input: AiUsageInput): Promise<boolean> {
    try {
      const inputTokens = validInteger(input.inputTokens);
      const outputTokens = validInteger(input.outputTokens);
      const reportedTotal = validInteger(input.totalTokens);

      const calculatedTotal =
        inputTokens !== null && outputTokens !== null
          ? inputTokens + outputTokens
          : null;

      const totalTokens = reportedTotal ?? calculatedTotal;

      await db.insert(aiUsageLogs).values({
        id: randomUUID(),
        organizationId: input.organizationId,
        provider: input.provider,
        modelId: input.modelId,
        purpose: input.purpose,
        status: input.status,
        inputTokens,
        outputTokens,
        totalTokens,
        latencyMs: validInteger(input.latencyMs),
        errorCode: input.errorCode ?? null,
      });

      return totalTokens !== null;
    } catch {
      // Usage logging must not interrupt chatbot behavior.
      this.logger.error("Could not persist AI usage record");
      return false;
    }
  }
}
