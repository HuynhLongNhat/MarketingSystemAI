
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

  async record(input: AiUsageInput): Promise<void> {
    try {
      const inputTokens = validInteger(input.inputTokens);
      const outputTokens = validInteger(input.outputTokens);
      const reportedTotal = validInteger(input.totalTokens);

      const totalTokens =
        reportedTotal ??
        (
          inputTokens !== null && outputTokens !== null
            ? inputTokens + outputTokens
            : null
        );

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
    } catch {
      // Usage logging không được làm gián đoạn chatbot.
      this.logger.error("Could not persist AI usage record");
    }
  }
}
