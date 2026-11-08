/**
 * DEV ONLY. Chạy đúng code retrieval + prompt + chat completion của Widget
 * trên DB/provider thật của bạn, không qua queue, không tạo conversation.
 *
 *   pnpm --filter @workspace/api build
 *   cd apps/api
 *   RAG_TRACE=1 RAG_TRACE_EXPECT="9.500.000" \
 *   node scripts/rag-trace-probe.mjs <organizationId> "Website bán hàng giá bao nhiêu?" [--llm]
 *
 * Không có --llm: chỉ chạy retrieval (phân biệt A/B). Có --llm: gọi cả provider
 * thật (phân biệt C/D). organizationId PHẢI là org mà Widget đang dùng.
 * Script này không in nội dung chunk, chỉ in ID/độ dài/số lượng.
 */
import "reflect-metadata";
import "../dist/env.js";

import { KnowledgeEmbeddingService } from "../dist/knowledge-connections/knowledge-embedding.service.js";
import { KnowledgeRetrievalService } from "../dist/knowledge-connections/knowledge-retrieval.service.js";
import { PublicWidgetAiService } from "../dist/conversations/public-widget-ai.service.js";
import { AiUsageRecorder } from "../dist/conversations/ai-usage-recorder.js";
import { AiUsageQuotaService } from "../dist/conversations/ai-usage-quota.service.js";
import { expectedEvidencePresence, newTraceId, runtimeFingerprint } from "../dist/conversations/rag-trace.js";
import { pool } from "@workspace/db/node";

const [organizationId, question, flag] = process.argv.slice(2);

if (!organizationId || !question) {
  console.error('Usage: node scripts/rag-trace-probe.mjs <organizationId> "<question>" [--llm]');
  process.exit(2);
}

const embeddings = new KnowledgeEmbeddingService();
const retrieval = new KnowledgeRetrievalService(embeddings);

console.log(JSON.stringify({ step: "runtime", ...runtimeFingerprint() }));

const result = await retrieval.retrieve({ organizationId, query: question, diagnostic: true });
const context = retrieval
  .formatContext(result.matches)
  .map((item) => item.content)
  .join("\n\n");

console.log(JSON.stringify({
  step: "retrieval",
  status: result.status,
  reason: result.reason ?? null,
  stats: result.stats ?? null,
  chunkIds: result.matches.map((match) => match.chunkId),
  chunkLengths: result.matches.map((match) => match.content.length),
  contextLength: context.length,
  evidence: expectedEvidencePresence(context),
  noMatchReason: result.diagnostic?.noMatchReason ?? null,
  totalChunks: result.diagnostic?.totalChunks ?? null,
  totalEmbeddings: result.diagnostic?.totalEmbeddings ?? null,
}));

if (flag === "--llm") {
  const ai = new PublicWidgetAiService(new AiUsageRecorder(), new AiUsageQuotaService(), retrieval);
  const traceId = newTraceId();
  const outcome = await ai.generatePlaygroundReply([{ role: "user", content: question }], organizationId, {
    traceId,
    jobId: "probe",
    attempt: 1,
  });
  console.log(JSON.stringify({
    step: "llm",
    traceId,
    ok: outcome.ok,
    code: outcome.ok ? null : outcome.code,
    knowledgeMatched: outcome.ok ? outcome.meta.knowledgeMatched : null,
    model: outcome.ok ? outcome.meta.modelId : null,
    replyLength: outcome.ok ? outcome.reply.length : null,
    // Chỉ để bạn tự đọc trong terminal của mình.
    reply: outcome.ok ? outcome.reply : null,
  }));
}

await pool.end();
