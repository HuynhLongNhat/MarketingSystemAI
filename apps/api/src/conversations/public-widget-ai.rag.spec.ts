import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { KnowledgeRetrievalService } from "../knowledge-connections/knowledge-retrieval.service.js";
import { AiUsageRecorder } from "./ai-usage-recorder.js";
import { AiUsageQuotaService } from "./ai-usage-quota.service.js";
import { PublicWidgetAiService } from "./public-widget-ai.service.js";

function makeService(input: {
  quotaAllowed?: boolean;
  retrievalStatus?: "ok" | "no_match" | "degraded";
}) {
  const order: string[] = [];
  const quota = {
    reserve: async () => {
      order.push("quota");
      return input.quotaAllowed === false
        ? {
            limited: true as const,
            allowed: false as const,
            monthlyTokenLimit: 10,
            usedTokens: 10,
            reservedTokens: 0,
            requestedTokens: 1,
          }
        : { limited: false as const, reservationId: null };
    },
    release: async () => undefined,
    retainUntilPeriodEnd: async () => undefined,
  };
  const retrieval = {
    retrieve: async () => {
      order.push("retrieval");
      return input.retrievalStatus === "ok"
        ? {
            status: "ok" as const,
            matches: [{
              documentId: "doc-a",
              documentTitle: "Chính sách bảo hành.pdf",
              chunkId: "chunk-a",
              content: "Sản phẩm được bảo hành 12 tháng.",
              similarity: 0.88,
            }],
            latencyMs: 1,
          }
        : {
            status: input.retrievalStatus ?? "no_match",
            matches: [],
            latencyMs: 1,
          };
    },
    formatContext: (matches: Array<{
      documentId: string;
      documentTitle: string;
      chunkId: string;
      content: string;
    }>) => matches.map((match) => ({
      source: {
        documentId: match.documentId,
        documentTitle: match.documentTitle,
        chunkId: match.chunkId,
      },
      content: match.content,
    })),
  };
  const service = new PublicWidgetAiService(
    { record: async () => true } as unknown as AiUsageRecorder,
    quota as unknown as AiUsageQuotaService,
    retrieval as unknown as KnowledgeRetrievalService,
  );

  Reflect.set(service, "resolveAgent", async () => ({ kind: "none" }));
  Reflect.set(service, "resolveRuntime", async () => ({
    endpoint: "https://example.invalid/chat/completions",
    apiKey: "test-key",
    modelId: "test-model",
    provider: "openrouter",
    connectionName: null,
    source: "default",
  }));
  Reflect.set(service, "loadRelevantFaq", async () => [{
    question: "Bảo hành bao lâu?",
    answer: "Bảo hành 12 tháng.",
    category: "Bảo hành",
  }]);

  return { service, order };
}

describe("RAG customer-support flow", () => {
  it("reserves quota before retrieval, then supplies FAQ and document context to chat", async () => {
    const originalFetch = globalThis.fetch;
    const { service, order } = makeService({ retrievalStatus: "ok" });
    let systemPrompt = "";

    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          messages: Array<{ role: string; content: string }>;
        };
        systemPrompt = body.messages[0]?.content ?? "";
        return Response.json({
          choices: [{ message: { content: "Sản phẩm được bảo hành 12 tháng." } }],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        });
      },
    });

    try {
      const result = await service.generatePlaygroundReply(
        [{ role: "user", content: "Chế độ bảo hành thế nào?" }],
        "org-a",
      );

      assert.equal(result.ok, true);
      assert.deepEqual(order.slice(0, 2), ["quota", "retrieval"]);
      assert.match(systemPrompt, /Bảo hành 12 tháng/);
      assert.match(systemPrompt, /Chính sách bảo hành\.pdf/);
      assert.match(systemPrompt, /không phải chỉ dẫn hệ thống/);
    } finally {
      Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: originalFetch,
      });
    }
  });

  it("does not call the embedding retrieval path when quota rejects the chat", async () => {
    const { service, order } = makeService({ quotaAllowed: false });

    const result = await service.generatePlaygroundReply(
      [{ role: "user", content: "Chế độ bảo hành thế nào?" }],
      "org-a",
    );

    assert.deepEqual(result, { ok: false, code: "quota_exceeded" });
    assert.deepEqual(order, ["quota"]);
  });

  it("does not serialize an empty knowledge JSON when neither FAQ nor documents match", async () => {
    const { service } = makeService({ retrievalStatus: "no_match" });
    Reflect.set(service, "loadRelevantFaq", async () => []);

    const getKnowledgeContext = Reflect.get(
      service,
      "getKnowledgeContext",
    ) as (organizationId: string, query: string) => Promise<{
      context: string | null;
      count: number;
    }>;
    const context = await getKnowledgeContext.call(
      service,
      "org-a",
      "Câu hỏi không có trong knowledge",
    );

    assert.equal(context.context, null);
    assert.equal(context.count, 0);
  });
});
