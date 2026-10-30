import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

import { MESSAGE_ENHANCEMENT_PROMPT } from "./message-enhancement.prompt.js";

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

@Injectable()
export class MessageEnhancementService {
  private readonly logger = new Logger(MessageEnhancementService.name);

  async enhance(prompt: string): Promise<{
    text: string;
  }> {
    const original = prompt.trim();

    if (!original) {
      throw new BadRequestException("Message cannot be empty");
    }

    if (original.length > 5000) {
      throw new BadRequestException("Message is too long");
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException("AI enhancement is not configured");
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(
        `${process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model:
              process.env.OPENROUTER_ENHANCEMENT_MODEL ||
              "nvidia/nemotron-3.5-super-vl:free",
            temperature: 0.3,
            max_completion_tokens: 1000,
            messages: [
              {
                role: "system",
                content: MESSAGE_ENHANCEMENT_PROMPT,
              },
              {
                role: "user",
                content: original,
              },
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        this.logger.error(`OpenAI enhancement failed: HTTP ${response.status}`);

        throw new BadGatewayException("AI enhancement failed");
      }

      const data = (await response.json()) as OpenAIResponse;

      const enhanced = data.choices?.[0]?.message?.content?.trim();

      if (!enhanced) {
        throw new BadGatewayException("AI returned an empty response");
      }

      return {
        text: enhanced,
      };
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        "AI enhancement request failed",
        error instanceof Error ? error.stack : undefined,
      );

      throw new BadGatewayException(
        "AI enhancement is temporarily unavailable",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
