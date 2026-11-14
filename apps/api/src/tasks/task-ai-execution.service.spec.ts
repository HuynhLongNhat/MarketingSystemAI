import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AiUsageQuotaService } from "../conversations/ai-usage-quota.service.js";
import { AiUsageRecorder } from "../conversations/ai-usage-recorder.js";
import { TaskAiExecutionService } from "./task-ai-execution.service.js";

function service() {
  return new TaskAiExecutionService(
    {} as AiUsageRecorder,
    {} as AiUsageQuotaService,
  );
}

type PromptTask = {
  title: string;
  description: string;
  agentName: string | null;
  agentRole: string | null;
  agentSystemPrompt: string | null;
};

describe("AI task prompts", () => {
  it("keeps the UC-00 market-research template for tasks without an Agent", () => {
    const prompt = (Reflect.get(service(), "prompt") as (task: PromptTask) => string)({
      title: "Thị trường spa", description: "Việt Nam", agentName: null, agentRole: null, agentSystemPrompt: null,
    });
    assert.match(prompt, /Tóm tắt điều hành/);
    assert.match(prompt, /Giới hạn báo cáo/);
  });

  it("uses the Agent snapshot without imposing the market-research template", () => {
    const prompt = (Reflect.get(service(), "prompt") as (task: PromptTask) => string)({
      title: "Viết email chăm sóc", description: "Khách hàng vừa đăng ký", agentName: "CSKH", agentRole: "Chăm sóc khách hàng", agentSystemPrompt: "Viết ngắn gọn, thân thiện và hỏi một câu làm rõ.",
    });
    assert.match(prompt, /CSKH/);
    assert.match(prompt, /Chăm sóc khách hàng/);
    assert.match(prompt, /Viết ngắn gọn, thân thiện/);
    assert.doesNotMatch(prompt, /Tóm tắt điều hành/);
    assert.match(prompt, /KHÔNG có Web Search/);
  });

  it("adds persisted web evidence to an Agent prompt without inventing additional sources", () => {
    const prompt = (Reflect.get(service(), "prompt") as (task: PromptTask, evidence?: unknown) => string)({
      title: "Xu hướng AI", description: "Dành cho doanh nghiệp nhỏ", agentName: "Research", agentRole: "Analyst", agentSystemPrompt: "Ưu tiên nguồn đáng tin cậy.",
    }, { query: "AI agents small business", provider: "tavily", sources: [{ citationNumber: 1, title: "Nguồn mẫu", url: "https://example.com/source", excerpt: "Dữ liệu đã truy xuất." }] });
    assert.match(prompt, /Dữ liệu Web Research đã truy xuất/);
    assert.match(prompt, /\[1\] Nguồn mẫu/);
    assert.match(prompt, /https:\/\/example.com\/source/);
    assert.match(prompt, /Không có quyền gọi thêm Web Search/);
  });

  it("validates the model research decision instead of using task keywords", () => {
    const task = { title: "Viết lời chào", description: "Khách mới", agentName: "Agent", agentRole: "Support", agentSystemPrompt: "" } as never;
    const parse = Reflect.get(service(), "parseResearchDecision") as (value: string, valueTask: typeof task) => { useResearch: boolean; query: string | null; fallback: boolean };
    assert.deepEqual(parse('{"use_web_research":true,"query":"AI agent trends 2026"}', task), { useResearch: true, query: "AI agent trends 2026", fallback: false });
    assert.deepEqual(parse('not-json', task), { useResearch: false, query: null, fallback: true });
  });

  it("sends the Agent snapshot prompt to an OpenAI-compatible provider", async () => {
    const task: PromptTask = { title: "Soạn email", description: "Chào khách mới", agentName: "CSKH", agentRole: "Support", agentSystemPrompt: "Luôn xưng em." };
    const prompt = (Reflect.get(service(), "prompt") as (value: PromptTask) => string)(task);
    const previousFetch = globalThis.fetch;
    let payload: { model: string; messages: Array<{ role: string; content: string }> } | undefined;
    globalThis.fetch = (async (_input, init) => {
      payload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: "Đã soạn" } }], usage: { total_tokens: 3 } }), { status: 200 });
    }) as typeof fetch;
    try {
      const result = await (Reflect.get(service(), "request") as (runtime: { provider: string; protocol: "openai"; endpoint: string; apiKey: string; modelId: string }, value: string) => Promise<{ text: string }>)(
        { provider: "openai", protocol: "openai", endpoint: "https://provider.invalid/chat/completions", apiKey: "test", modelId: "agent-model" }, prompt,
      );
      assert.equal(result.text, "Đã soạn");
      assert.equal(payload?.model, "agent-model");
      assert.match(payload?.messages[1]?.content ?? "", /Luôn xưng em/);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
