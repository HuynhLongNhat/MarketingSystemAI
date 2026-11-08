import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  rankLexicalCandidates,
  reciprocalRankFusion,
  type HybridCandidate,
} from "../knowledge-connections/hybrid-ranking.js";
import { getKeywords } from "./knowledge-ranking.js";
import { KnowledgeRetrievalService } from "../knowledge-connections/knowledge-retrieval.service.js";
import { AiUsageRecorder } from "./ai-usage-recorder.js";
import { AiUsageQuotaService } from "./ai-usage-quota.service.js";
import { PublicWidgetAiService } from "./public-widget-ai.service.js";
import { RAG_TRACE_MARKER } from "./rag-trace.js";

// TEST FIXTURE ONLY (không dùng trong production). Mô phỏng 3 chunk của
// tài liệu kiểm thử "Quy Nhơn Digital". Đây là MOCK test: ranking là code thật,
// nhưng DB, embedding và LLM đều được giả lập.
const CHUNKS: HybridCandidate[] = [
  {
    documentId: "doc-qnd",
    documentTitle: "Quy Nhơn Digital.docx",
    chunkId: "c1",
    similarity: 0.49,
    content:
      "Bảng giá dịch vụ. Website bán hàng: 9.500.000 VNĐ. Website giới thiệu: 5.000.000 VNĐ. " +
      "Giá chưa gồm VAT 8%. Hosting và tên miền chưa bao gồm.",
  },
  {
    documentId: "doc-qnd",
    documentTitle: "Quy Nhơn Digital.docx",
    chunkId: "c2",
    similarity: 0.49,
    content:
      "Chính sách bảo hành. Website bán hàng bảo hành 18 tháng. Website giới thiệu bảo hành 12 tháng. " +
      "Đặt cọc website 40%.",
  },
  {
    documentId: "doc-qnd",
    documentTitle: "Quy Nhơn Digital.docx",
    chunkId: "c3",
    similarity: 0.49,
    content: "Giờ làm việc: thứ Hai đến thứ Bảy, 8:00 - 17:30. Chủ nhật nghỉ. Dịch vụ Facebook Ads, Google Ads.",
  },
];

// Thứ hạng semantic thật phụ thuộc embedding nên KHÔNG mô phỏng ở đây:
// tất cả chunk có similarity 0.49 như Preview. Nên ranking được kiểm bằng
// lexical (xác định) và RRF chỉ dùng để dựng context trong test bên dưới.
function lexicalTop(query: string): HybridCandidate | undefined {
  return rankLexicalCandidates(CHUNKS, query)[0];
}

function hybrid(query: string): HybridCandidate[] {
  const lexical = rankLexicalCandidates(CHUNKS, query);
  return reciprocalRankFusion(CHUNKS, lexical, 5);
}

describe("Quy Nhơn Digital fixture - ranking thật (mock DB/LLM)", () => {
  it("giá website bán hàng: chunk bảng giá đứng đầu và chứa 9.500.000", () => {
    const top = lexicalTop("Website bán hàng giá bao nhiêu?");
    assert.equal(top?.chunkId, "c1");
    assert.ok(top?.content.includes("9.500.000"));
    assert.ok(top?.content.includes("VAT 8%"));
  });

  it("giá website giới thiệu", () => {
    const top = lexicalTop("Website giới thiệu giá bao nhiêu?");
    assert.equal(top?.chunkId, "c1");
    assert.ok(top?.content.includes("5.000.000"));
  });

  it("bảo hành website bán hàng", () => {
    const top = lexicalTop("Website bán hàng bảo hành bao lâu?");
    assert.equal(top?.chunkId, "c2");
    assert.ok(top?.content.includes("18 tháng"));
  });

  it("ghi nhận: 'bán' và 'bảo' bị bỏ vì STOP_WORDS bỏ dấu trùng 'ban'/'bao'", () => {
    // Không phải root cause (từ còn lại vẫn đủ phân biệt), nhưng là điểm yếu thật.
    const keywords = [...getKeywords("Website bán hàng bảo hành bao lâu?")];
    assert.deepEqual(keywords, ["website", "hang", "hanh"]);
  });

  it("Chủ nhật có làm việc không?", () => {
    const top = lexicalTop("Chủ nhật có làm việc không?");
    assert.equal(top?.chunkId, "c3");
  });
});

describe("Trace và prompt", () => {
  it("context chứa giá tới được request gửi LLM; log trace không chứa nội dung", async () => {
    const logs: string[] = [];
    const retrieval = {
      retrieve: async (input: { query: string }) => {
        const matches = hybrid(input.query).map((row) => ({ ...row }));
        return {
          status: "ok" as const,
          matches,
          latencyMs: 1,
          stats: {
            lexicalCandidates: 3,
            semanticCandidates: 3,
            hybridMatches: matches.length,
            embeddingUsed: true,
          },
        };
      },
      formatContext: KnowledgeRetrievalService.prototype.formatContext,
    };
    const service = new PublicWidgetAiService(
      { record: async () => true } as unknown as AiUsageRecorder,
      { reserve: async () => ({ limited: false, reservationId: null }) } as unknown as AiUsageQuotaService,
      retrieval as unknown as KnowledgeRetrievalService,
    );
    Reflect.set(service, "resolveAgent", async () => ({ kind: "none" }));
    Reflect.set(service, "loadRelevantFaq", async () => []);
    Reflect.set(service, "resolveRuntime", async () => ({
      endpoint: "https://example.invalid/chat/completions",
      apiKey: "SECRET-KEY-SHOULD-NOT-LOG",
      modelId: "test-model",
      provider: "openrouter",
      connectionName: null,
      source: "default",
    }));
    const logger = Reflect.get(service, "logger") as { log: (m: string) => void };
    logger.log = (message: string) => { logs.push(message); };

    process.env.RAG_TRACE = "1";
    process.env.RAG_TRACE_EXPECT = "9.500.000,VAT 8%";

    const originalFetch = globalThis.fetch;
    let sentBody = "";
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: async (_url: string, init: { body: string }) => {
        sentBody = init.body;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: "9.500.000 VNĐ, chưa gồm VAT 8%." }, finish_reason: "stop" }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    try {
      const reply = await service.generateReply(
        [{ role: "user", content: "Website bán hàng giá bao nhiêu?" }],
        "org-1",
        { traceId: "trace-1", jobId: "job-1", attempt: 1 },
      );
      assert.ok(reply?.includes("9.500.000"));
    } finally {
      Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
      delete process.env.RAG_TRACE;
      delete process.env.RAG_TRACE_EXPECT;
    }

    // Context (có giá) nằm trong system prompt gửi tới chat completion.
    assert.ok(sentBody.includes("9.500.000"));

    const events = logs.map((line) => JSON.parse(line) as Record<string, unknown>);
    const built = events.find((e) => e.event === "rag.context.built");
    const request = events.find((e) => e.event === "rag.llm.request");
    const ok = events.find((e) => e.event === "rag.llm.ok");

    assert.ok(built && request && ok);
    assert.equal(built.traceId, "trace-1");
    assert.equal(built.marker, RAG_TRACE_MARKER);
    assert.deepEqual(built.evidence, { expect_1: true, expect_2: true });
    assert.equal(request.knowledgeInPrompt, true);
    assert.ok(Number(built.contextLength) > 0);

    // Không rò rỉ nội dung, câu hỏi hay API key trong log.
    const all = logs.join("\n");
    assert.ok(!all.includes("SECRET-KEY-SHOULD-NOT-LOG"));
    assert.ok(!all.includes("Website bán hàng giá bao nhiêu"));
    assert.ok(!all.includes("Bảng giá dịch vụ"));
  });

  it("ghi rõ mã lỗi khi LLM thất bại (trước đây bị nuốt thành null)", async () => {
    const logs: string[] = [];
    const service = new PublicWidgetAiService(
      { record: async () => true } as unknown as AiUsageRecorder,
      { reserve: async () => ({ limited: false, reservationId: null }) } as unknown as AiUsageQuotaService,
      { retrieve: async () => ({ status: "no_match", matches: [], latencyMs: 1 }), formatContext: () => [] } as unknown as KnowledgeRetrievalService,
    );
    Reflect.set(service, "resolveAgent", async () => ({ kind: "none" }));
    Reflect.set(service, "loadRelevantFaq", async () => []);
    Reflect.set(service, "resolveRuntime", async () => null);
    (Reflect.get(service, "logger") as { log: (m: string) => void }).log = (m) => { logs.push(m); };
    process.env.RAG_TRACE = "1";
    try {
      const reply = await service.generateReply(
        [{ role: "user", content: "xin chào" }],
        "org-1",
        { traceId: "trace-2" },
      );
      assert.equal(reply, null);
    } finally {
      delete process.env.RAG_TRACE;
    }
    const failed = logs.map((l) => JSON.parse(l) as Record<string, unknown>).find((e) => e.event === "rag.llm.failed");
    assert.equal(failed?.code, "not_configured");
    assert.equal(failed?.stage, "runtime");
  });
});
