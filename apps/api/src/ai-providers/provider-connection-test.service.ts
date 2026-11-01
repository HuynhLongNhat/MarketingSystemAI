
import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";

import {
  aiProviderConnections,
  db,
} from "@workspace/db/node";

import type {
  AiProviderConnection,
  AiProviderType,
} from "@workspace/db/node";

import type { RequestContext } from "../auth/request-context.js";
import { tenantWhere } from "../common/tenant/tenant-query.js";
import { decryptCredential } from "../ai-credentials/credential-crypto.js";

type TestStatus =
  | "connected"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "unavailable"
  | "unsupported";

export interface ConnectionTestResult {
  connectionId: string;
  provider: AiProviderType;
  status: TestStatus;
  success: boolean;
  message: string;
  checkedAt: string;
}

interface ProbeConfig {
  url: string;
  headers: Record<string, string>;
}

@Injectable()
export class ProviderConnectionTestService {
  private async findConnection(
    context: RequestContext,
    connectionId: string,
  ): Promise<AiProviderConnection> {
    const [connection] = await db
      .select()
      .from(aiProviderConnections)
      .where(
        tenantWhere(
          context,
          aiProviderConnections.organizationId,
          eq(aiProviderConnections.id, connectionId),
        ),
      )
      .limit(1);

    if (!connection) {
      throw new NotFoundException(
        "AI provider connection not found",
      );
    }

    return connection;
  }

  private buildProbe(
    provider: AiProviderType,
    apiKey: string,
  ): ProbeConfig | null {
    const bearerHeaders = {
      Authorization: `Bearer ${apiKey}`,
    };

    switch (provider) {
      case "openai":
        return {
          url: "https://api.openai.com/v1/models",
          headers: bearerHeaders,
        };

      case "openrouter":
        return {
          url: "https://openrouter.ai/api/v1/key",
          headers: bearerHeaders,
        };

      case "anthropic":
        return {
          url: "https://api.anthropic.com/v1/models?limit=1",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        };

      case "google":
        return {
          url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
          headers: {
            "x-goog-api-key": apiKey,
          },
        };

      case "groq":
        return {
          url: "https://api.groq.com/openai/v1/models",
          headers: bearerHeaders,
        };

      case "deepseek":
        return {
          url: "https://api.deepseek.com/models",
          headers: bearerHeaders,
        };

      case "mistral":
        return {
          url: "https://api.mistral.ai/v1/models",
          headers: bearerHeaders,
        };

      case "together":
        return {
          url: "https://api.together.xyz/v1/models",
          headers: bearerHeaders,
        };

      case "fireworks":
        return {
          url: "https://api.fireworks.ai/inference/v1/models",
          headers: bearerHeaders,
        };

      case "cerebras":
        return {
          url: "https://api.cerebras.ai/v1/models",
          headers: bearerHeaders,
        };

      case "xai":
        return {
          url: "https://api.x.ai/v1/models",
          headers: bearerHeaders,
        };

      case "ollama":
      case "openai_compatible":
        return null;
    }
  }

  private result(
    connection: AiProviderConnection,
    status: TestStatus,
    message: string,
  ): ConnectionTestResult {
    return {
      connectionId: connection.id,
      provider: connection.provider,
      status,
      success: status === "connected",
      message,
      checkedAt: new Date().toISOString(),
    };
  }

  async testConnection(
    context: RequestContext,
    connectionId: string,
  ): Promise<ConnectionTestResult> {
    const connection = await this.findConnection(
      context,
      connectionId,
    );

    if (!connection.enabled) {
      return this.result(
        connection,
        "unavailable",
        "Connection is disabled.",
      );
    }

    if (
      connection.provider === "ollama" ||
      connection.provider === "openai_compatible"
    ) {
      return this.result(
        connection,
        "unsupported",
        "This provider requires a configurable base URL.",
      );
    }

    let apiKey: string;

    try {
      apiKey = decryptCredential(
        {
          encryptedApiKey: connection.encryptedApiKey,
          keyIv: connection.keyIv,
          keyAuthTag: connection.keyAuthTag,
          keyVersion: "v1",
        },
        {
          organizationId: context.organizationId,
          connectionId: connection.id,
          provider: connection.provider,
        },
      );
    } catch {
      return this.result(
        connection,
        "unavailable",
        "Stored credential could not be decrypted.",
      );
    }

    const probe = this.buildProbe(
      connection.provider,
      apiKey,
    );

    if (!probe) {
      return this.result(
        connection,
        "unsupported",
        "Connection testing is not supported for this provider.",
      );
    }

    try {
      const response = await fetch(probe.url, {
        method: "GET",
        headers: {
          ...probe.headers,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });

      // Do not expose provider response bodies or headers.
      await response.body?.cancel();

      if (response.ok) {
        return this.result(
          connection,
          "connected",
          "Provider accepted the credentials.",
        );
      }

      if (response.status === 401) {
        return this.result(
          connection,
          "unauthorized",
          "Provider rejected the API key.",
        );
      }

      if (response.status === 403) {
        return this.result(
          connection,
          "forbidden",
          "Credentials do not have permission for this endpoint.",
        );
      }

      if (response.status === 429) {
        return this.result(
          connection,
          "rate_limited",
          "Provider rate limit reached. Try again later.",
        );
      }

      return this.result(
        connection,
        "unavailable",
        `Provider returned HTTP ${response.status}.`,
      );
    } catch {
      return this.result(
        connection,
        "unavailable",
        "Could not reach the provider.",
      );
    }
  }
}
