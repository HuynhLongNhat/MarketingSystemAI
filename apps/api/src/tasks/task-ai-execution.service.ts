import { HttpException, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, gte, isNull, lt, ne, or, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import {
  aiProviderConnections,
  aiTaskEvents,
  aiTaskReportCitations,
  aiTaskResearchRuns,
  aiTaskResearchSources,
  aiTasks,
  db,
} from "@workspace/db/node";
import { decryptCredential } from "../ai-credentials/credential-crypto.js";
import { PROVIDER_REGISTRY } from "../ai-providers/provider-registry.js";
import { AiUsageQuotaService } from "../conversations/ai-usage-quota.service.js";
import { AiUsageRecorder } from "../conversations/ai-usage-recorder.js";
import type { AiTaskJobData } from "../jobs/jobs.service.js";
import { SearchProviderRuntimeService } from "../search-providers/search-provider-runtime.service.js";
import { SearchProviderRuntimeError } from "../search-providers/search-provider.adapter.js";
import { canAttemptTaskExecution, canWorkerClaimTask, MAX_TASK_EXECUTIONS } from "./task-execution-state.js";
import { validateCeoPlanReport } from "../ceo-planning/ceo-plan-validation.js";

const TIMEOUT_MS = 60_000;
const MAX_OUTPUT_TOKENS = 2_000;
const CEO_PLAN_MAX_OUTPUT_TOKENS = 4_000;
const LEASE_MS = 90_000;
const LEASE_HEARTBEAT_MS = 20_000;

type Usage = { input?: unknown; output?: unknown; total?: unknown };
type Runtime = { provider: string; protocol: "openai" | "anthropic" | "google"; endpoint: string; apiKey: string; modelId: string };
type ResearchDecision = { useResearch: boolean; query: string | null; fallback: boolean };

export function isTruncatedFinishReason(value: unknown) {
  return typeof value === "string" && ["length", "max_tokens", "max_output_tokens", "MAX_TOKENS"].includes(value);
}

export class TaskProviderError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

class TaskCancelledError extends Error {}
type ResearchEvidence = { query: string; provider: string; sources: Array<{ citationNumber: number; title: string; url: string; excerpt: string | null }> };

function token(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function safeError(error: unknown): string {
  if (error instanceof TaskProviderError) return error.message;
  return "Không thể hoàn tất nhiệm vụ do lỗi không xác định của AI Provider.";
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

@Injectable()
export class TaskAiExecutionService {
  private readonly logger = new Logger(TaskAiExecutionService.name);
  constructor(private readonly usage: AiUsageRecorder, private readonly quota: AiUsageQuotaService, private readonly research?: SearchProviderRuntimeService) {}

  private prompt(task: { title: string; description: string; agentName: string | null; agentRole: string | null; agentSystemPrompt: string | null }, evidence?: ResearchEvidence) {
    const limitations = "MVP này KHÔNG có Web Search, dữ liệu Internet trực tiếp hoặc tool được tích hợp. Không được gọi, giả lập hoặc tuyên bố đã dùng tool/Web Search. Không được bịa số liệu, nguồn dẫn, thị phần, giá cả hoặc tuyên bố rằng đã nghiên cứu Internet; hãy nêu rõ các giả định và dữ liệu cần kiểm chứng khi phù hợp.";
    if (task.agentName) {
      const researchContext = evidence ? `\n\nDữ liệu Web Research đã truy xuất\nQuery: ${evidence.query}\nProvider: ${evidence.provider}\n${evidence.sources.length ? evidence.sources.map((source) => `[${source.citationNumber}] ${source.title}\nURL: ${source.url}\nTrích đoạn: ${source.excerpt ?? "Không có trích đoạn."}`).join("\n\n") : "Không tìm thấy nguồn công khai phù hợp cho query này."}\n\nChỉ dùng các nguồn/trích đoạn ở trên cho tuyên bố dựa trên web. Dẫn [số] khi tham chiếu nguồn; không suy diễn rằng đã đọc nội dung ngoài trích đoạn và không bịa nguồn khác.` : "";
      const agentLimitations = evidence ? "Không có quyền gọi thêm Web Search hoặc tool khác ngoài evidence đã cung cấp. Không bịa nguồn, số liệu hoặc trích dẫn." : limitations;
      return `Bạn đang thực hiện nhiệm vụ với tư cách Agent “${task.agentName}”, vai trò “${task.agentRole ?? "không xác định"}”.\n\nĐây là system prompt snapshot của Agent tại thời điểm tạo task. Thực hiện theo hướng dẫn này khi không mâu thuẫn với các giới hạn hệ thống bên dưới:\n--- AGENT SYSTEM PROMPT ---\n${task.agentSystemPrompt ?? ""}\n--- END AGENT SYSTEM PROMPT ---\n\nNhiệm vụ\nTiêu đề: ${task.title}\nYêu cầu/bối cảnh: ${task.description}${researchContext}\n\nHãy hoàn thành nhiệm vụ theo đúng chuyên môn và định dạng phù hợp với yêu cầu, bằng tiếng Việt trừ khi nhiệm vụ yêu cầu ngôn ngữ khác.\n\n${agentLimitations}`;
    }
    return `Bạn là chuyên gia nghiên cứu thị trường. Hãy lập báo cáo bằng tiếng Việt cho nhiệm vụ sau.\n\nTiêu đề: ${task.title}\nYêu cầu/bối cảnh: ${task.description}\n\nBắt buộc dùng đúng các mục Markdown: Tóm tắt điều hành; Tổng quan thị trường; Khách hàng mục tiêu; Phân tích đối thủ (sơ bộ); Cơ hội kinh doanh; Rủi ro và giả định; Kế hoạch hành động 30 ngày; Giới hạn báo cáo.\n\n${limitations}`;
  }

  private async event(taskId: string, organizationId: string, type: string, message: string) {
    await db.insert(aiTaskEvents).values({ id: randomUUID(), taskId, organizationId, type, message });
  }

  private renewLease(taskId: string, organizationId: string, token: string) {
    const leaseExpiresAt = new Date(Date.now() + LEASE_MS);
    return db.update(aiTasks).set({ leaseExpiresAt, updatedAt: new Date() }).where(and(eq(aiTasks.id, taskId), eq(aiTasks.organizationId, organizationId), eq(aiTasks.executionToken, token), eq(aiTasks.status, "running")));
  }

  private researchQuery(task: typeof aiTasks.$inferSelect) {
    return `${task.title}\n${task.description}`.replace(/\s+/g, " ").trim().slice(0, 500);
  }

  private async hasClaim(task: typeof aiTasks.$inferSelect, executionToken: string) {
    const [owned] = await db.select({ id: aiTasks.id }).from(aiTasks).where(and(eq(aiTasks.id, task.id), eq(aiTasks.organizationId, task.organizationId), eq(aiTasks.status, "running"), eq(aiTasks.executionToken, executionToken))).limit(1);
    return Boolean(owned);
  }

  private safeResearchError(error: unknown) {
    if (error instanceof SearchProviderRuntimeError) return { code: error.code, retryable: error.code === "SEARCH_PROVIDER_RATE_LIMITED" || error.code === "SEARCH_PROVIDER_TIMEOUT" || error.code === "SEARCH_PROVIDER_UNAVAILABLE", message: error.code === "SEARCH_PROVIDER_AUTH_FAILED" ? "Credential Tavily không hợp lệ hoặc đã bị từ chối." : error.code === "SEARCH_PROVIDER_RATE_LIMITED" ? "Tavily đang giới hạn lượt tìm kiếm." : error.code === "SEARCH_PROVIDER_TIMEOUT" ? "Tavily hết thời gian phản hồi." : "Không thể hoàn tất tìm kiếm Web Research." };
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const detail = typeof response === "object" && response !== null ? response as { code?: unknown; message?: unknown } : {};
      const message = typeof detail.message === "string" ? detail.message : error.message;
      return { code: typeof detail.code === "string" ? detail.code : "RESEARCH_POLICY_ERROR", retryable: false, message };
    }
    return { code: "RESEARCH_EXECUTION_ERROR", retryable: false, message: "Không thể hoàn tất tìm kiếm Web Research." };
  }

  private async webResearch(task: typeof aiTasks.$inferSelect, executionToken: string, requestedQuery?: string): Promise<ResearchEvidence> {
    if (!task.agentId || !this.research) throw new TaskProviderError("Task Web Research yêu cầu Agent và Search Provider runtime.", false);
    const [completedRun] = await db.select().from(aiTaskResearchRuns).where(and(eq(aiTaskResearchRuns.taskId, task.id), eq(aiTaskResearchRuns.organizationId, task.organizationId), eq(aiTaskResearchRuns.status, "completed"))).orderBy(desc(aiTaskResearchRuns.createdAt)).limit(1);
    if (completedRun) {
      const sources = await db.select({ title: aiTaskResearchSources.title, url: aiTaskResearchSources.displayUrl, excerpt: aiTaskResearchSources.excerpt, citationNumber: aiTaskReportCitations.citationNumber }).from(aiTaskResearchSources).leftJoin(aiTaskReportCitations, and(eq(aiTaskReportCitations.sourceId, aiTaskResearchSources.id), eq(aiTaskReportCitations.taskId, task.id), eq(aiTaskReportCitations.organizationId, task.organizationId))).where(and(eq(aiTaskResearchSources.taskId, task.id), eq(aiTaskResearchSources.organizationId, task.organizationId))).orderBy(aiTaskResearchSources.ordinal);
      return { query: completedRun.query ?? this.researchQuery(task), provider: completedRun.provider, sources: sources.map((source, index) => ({ ...source, citationNumber: source.citationNumber ?? index + 1 })) };
    }
    const query = requestedQuery?.trim().slice(0, 500) || this.researchQuery(task);
    const runId = randomUUID();
    const now = new Date();
    await db.insert(aiTaskResearchRuns).values({ id: runId, organizationId: task.organizationId, taskId: task.id, provider: task.researchProvider ?? "tavily", query, status: "running", queryCount: 1, requestCount: 1, startedAt: now, updatedAt: now });
    await this.event(task.id, task.organizationId, "research_started", `Worker đang tìm kiếm Web Research với Tavily: ${query}`);
    try {
      const response = await this.research.searchForResearch({ organizationId: task.organizationId, userId: task.createdBy, sessionId: `ai-task-${task.id}`, role: "owner" }, { agentId: task.agentId, request: { query, searchDepth: "basic", maxResults: 5 } });
      if (!await this.hasClaim(task, executionToken)) throw new TaskCancelledError();
      const existing = await db.select({ id: aiTaskResearchSources.id }).from(aiTaskResearchSources).where(and(eq(aiTaskResearchSources.taskId, task.id), eq(aiTaskResearchSources.organizationId, task.organizationId)));
      const seenUrls = new Set<string>();
      const sources: Array<typeof aiTaskResearchSources.$inferInsert> = [];
      for (const source of response.results) {
        try {
          const parsed = new URL(source.url);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;
          const canonicalUrl = parsed.toString().slice(0, 2048);
          if (seenUrls.has(canonicalUrl)) continue;
          seenUrls.add(canonicalUrl);
          const excerpt = source.snippet?.trim().slice(0, 12000) || null;
          sources.push({ id: randomUUID(), organizationId: task.organizationId, taskId: task.id, researchRunId: runId, ordinal: existing.length + sources.length + 1, canonicalUrl, displayUrl: source.url.trim().slice(0, 2048), title: source.title.trim().slice(0, 512) || parsed.hostname, domain: parsed.hostname.slice(0, 253), excerpt, contentHash: excerpt ? createHash("sha256").update(excerpt).digest("hex") : null, status: "retrieved", retrievedAt: new Date() });
        } catch { /* Discard malformed provider URLs. */ }
      }
      await db.transaction(async (tx) => {
        if (sources.length) await tx.insert(aiTaskResearchSources).values(sources);
        if (sources.length) await tx.insert(aiTaskReportCitations).values(sources.map((source) => ({ id: randomUUID(), organizationId: task.organizationId, taskId: task.id, sourceId: source.id, citationNumber: source.ordinal })));
        await tx.update(aiTaskResearchRuns).set({ provider: response.provider, status: "completed", sourceCount: sources.length, completedAt: new Date(), updatedAt: new Date(), safeErrorCode: null }).where(and(eq(aiTaskResearchRuns.id, runId), eq(aiTaskResearchRuns.organizationId, task.organizationId), eq(aiTaskResearchRuns.taskId, task.id)));
      });
      await this.event(task.id, task.organizationId, "research_completed", sources.length ? `Web Research hoàn tất: đã lưu ${sources.length} nguồn.` : "Web Research hoàn tất nhưng không tìm thấy nguồn phù hợp.");
      return { query, provider: response.provider, sources: sources.map((source) => ({ citationNumber: source.ordinal, title: source.title, url: source.displayUrl, excerpt: source.excerpt ?? null })) };
    } catch (error) {
      if (error instanceof TaskCancelledError) {
        await db.update(aiTaskResearchRuns).set({ status: "cancelled", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(aiTaskResearchRuns.id, runId), eq(aiTaskResearchRuns.organizationId, task.organizationId)));
        throw error;
      }
      const safe = this.safeResearchError(error);
      await db.update(aiTaskResearchRuns).set({ status: "failed", safeErrorCode: safe.code, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(aiTaskResearchRuns.id, runId), eq(aiTaskResearchRuns.organizationId, task.organizationId)));
      await this.event(task.id, task.organizationId, "research_failed", safe.message);
      throw new TaskProviderError(safe.message, safe.retryable);
    }
  }

  private async runtime(task: typeof aiTasks.$inferSelect): Promise<Runtime> {
    // Agent tasks always use the immutable connection/model captured at creation.
    // A malformed snapshot is a configuration error, never a fallback to General.
    if (task.agentName && (!task.agentConnectionId || !task.agentModelId || task.connectionId !== task.agentConnectionId || task.modelId !== task.agentModelId)) {
      throw new TaskProviderError("Task có snapshot cấu hình Agent không hợp lệ.", false);
    }
    if (!task.connectionId || !task.modelId) throw new TaskProviderError("Task thiếu cấu hình AI Provider.", false);
    const [connection] = await db.select().from(aiProviderConnections).where(and(eq(aiProviderConnections.organizationId, task.organizationId), eq(aiProviderConnections.id, task.connectionId), eq(aiProviderConnections.enabled, true))).limit(1);
    if (!connection) throw new TaskProviderError("AI Provider đã cấu hình không khả dụng.", false);
    const definition = PROVIDER_REGISTRY[connection.provider];
    if (!definition?.baseUrl || definition.runtimeProtocol === "ollama") throw new TaskProviderError("AI Provider này chưa có endpoint runtime được cấu hình.", false);
    let apiKey: string;
    try {
      apiKey = decryptCredential({ encryptedApiKey: connection.encryptedApiKey, keyIv: connection.keyIv, keyAuthTag: connection.keyAuthTag, keyVersion: "v1" }, { organizationId: task.organizationId, connectionId: connection.id, provider: connection.provider });
    } catch { throw new TaskProviderError("Không thể giải mã credential của AI Provider.", false); }
    if (!apiKey.trim()) throw new TaskProviderError("API key của AI Provider trống.", false);
    const endpoint = definition.baseUrl.replace(/\/$/, "");
    if (definition.runtimeProtocol === "openai") return { provider: connection.provider, protocol: "openai", endpoint: `${endpoint}/chat/completions`, apiKey, modelId: task.modelId };
    if (definition.runtimeProtocol === "anthropic") return { provider: connection.provider, protocol: "anthropic", endpoint: `${endpoint}/messages`, apiKey, modelId: task.modelId };
    return { provider: connection.provider, protocol: "google", endpoint: `${endpoint}/models/${encodeURIComponent(task.modelId)}:generateContent`, apiKey, modelId: task.modelId };
  }

  private async request(runtime: Runtime, prompt: string, maxOutputTokens = MAX_OUTPUT_TOKENS): Promise<{ text: string; usage: Usage }> {
    let response: Response;
    try {
      if (runtime.protocol === "anthropic") {
        response = await fetch(runtime.endpoint, { method: "POST", headers: { "x-api-key": runtime.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: runtime.modelId, max_tokens: maxOutputTokens, temperature: 0.3, messages: [{ role: "user", content: prompt }] }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      } else if (runtime.protocol === "google") {
        response = await fetch(runtime.endpoint, { method: "POST", headers: { "x-goog-api-key": runtime.apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens } }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      } else {
        response = await fetch(runtime.endpoint, { method: "POST", headers: { Authorization: `Bearer ${runtime.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: runtime.modelId, temperature: 0.3, max_completion_tokens: maxOutputTokens, messages: [{ role: "system", content: "Trả lời chính xác theo yêu cầu, không bịa dữ liệu." }, { role: "user", content: prompt }] }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      }
    } catch (error) {
      throw new TaskProviderError(error instanceof Error && error.name === "TimeoutError" ? "AI Provider hết thời gian phản hồi." : "Không thể kết nối AI Provider.", true);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new TaskProviderError(`AI Provider trả về HTTP ${response.status}.`, isRetryableStatus(response.status));
    }
    const body = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: unknown }>; content?: Array<{ text?: string }>; stop_reason?: unknown; usage?: { input_tokens?: unknown; output_tokens?: unknown; prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown }; usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown; totalTokenCount?: unknown }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: unknown }> };
    const text = runtime.protocol === "anthropic" ? body.content?.map((part) => part.text ?? "").join("") : runtime.protocol === "google" ? body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") : body.choices?.[0]?.message?.content;
    if (!text?.trim()) throw new TaskProviderError("AI Provider trả về nội dung trống.", false);
    const finishReason = runtime.protocol === "anthropic" ? body.stop_reason : runtime.protocol === "google" ? body.candidates?.[0]?.finishReason : body.choices?.[0]?.finish_reason;
    if (isTruncatedFinishReason(finishReason)) throw new TaskProviderError("AI Provider đã dừng output vì giới hạn token; kế hoạch/báo cáo chưa hoàn chỉnh. Hãy rút gọn yêu cầu hoặc dùng model có output limit lớn hơn.", false);
    const usage = runtime.protocol === "google" ? { input: body.usageMetadata?.promptTokenCount, output: body.usageMetadata?.candidatesTokenCount, total: body.usageMetadata?.totalTokenCount } : { input: body.usage?.input_tokens ?? body.usage?.prompt_tokens, output: body.usage?.output_tokens ?? body.usage?.completion_tokens, total: body.usage?.total_tokens };
    return { text: text.trim(), usage };
  }

  private parseResearchDecision(value: string, task: typeof aiTasks.$inferSelect): ResearchDecision {
    try {
      const parsed = JSON.parse(value.replace(/^```json\s*|\s*```$/g, "").trim()) as { use_web_research?: unknown; query?: unknown };
      if (typeof parsed.use_web_research !== "boolean") throw new Error("invalid");
      const query = typeof parsed.query === "string" && parsed.query.trim() ? parsed.query.trim().slice(0, 500) : null;
      return { useResearch: parsed.use_web_research, query: parsed.use_web_research ? query ?? this.researchQuery(task) : null, fallback: false };
    } catch { return { useResearch: false, query: null, fallback: true }; }
  }

  private async decideResearch(runtime: Runtime, task: typeof aiTasks.$inferSelect): Promise<ResearchDecision> {
    const instruction = `Decide whether this task requires current public web information. Return JSON only: {"use_web_research":boolean,"query":string|null}. Use web research only when current, externally verifiable information is necessary; do not use it for writing, editing, reasoning, or user-provided content.\nTitle: ${task.title}\nRequest: ${task.description}`;
    if (runtime.protocol === "openai") {
      try {
        const response = await fetch(runtime.endpoint, { method: "POST", headers: { Authorization: `Bearer ${runtime.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: runtime.modelId, temperature: 0, messages: [{ role: "system", content: "You decide whether to use the provided web research tool." }, { role: "user", content: instruction }], tools: [{ type: "function", function: { name: "web_research", description: "Search public web sources when current evidence is required.", parameters: { type: "object", additionalProperties: false, properties: { query: { type: "string" } }, required: ["query"] } } }], tool_choice: "auto" }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
        if (response.ok) {
          const body = await response.json() as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>; content?: string } }> };
          const message = body.choices?.[0]?.message;
          const tool = message?.tool_calls?.find((call) => call.function?.name === "web_research");
          if (tool) {
            try { const args = JSON.parse(tool.function?.arguments ?? "{}") as { query?: unknown }; const query = typeof args.query === "string" && args.query.trim() ? args.query.trim().slice(0, 500) : this.researchQuery(task); return { useResearch: true, query, fallback: false }; }
            catch { return { useResearch: false, query: null, fallback: true }; }
          }
          if (message?.content) return this.parseResearchDecision(message.content, task);
          return { useResearch: false, query: null, fallback: false };
        }
        if (response.status >= 500 || response.status === 429 || response.status === 408) throw new TaskProviderError(`AI Provider trả về HTTP ${response.status}.`, true);
        await response.body?.cancel();
      } catch (error) { if (error instanceof TaskProviderError) throw error; }
    }
    const fallback = await this.request(runtime, instruction);
    return this.parseResearchDecision(fallback.text, task);
  }

  async execute(data: AiTaskJobData, attempt: number, finalAttempt: boolean): Promise<void> {
    const [task] = await db.select().from(aiTasks).where(and(eq(aiTasks.id, data.taskId), eq(aiTasks.organizationId, data.organizationId))).limit(1);
    // A delayed or retried BullMQ job must never resurrect a terminal task.
    if (!task || !canWorkerClaimTask(task.status)) return;
    if (!canAttemptTaskExecution(task.attemptCount)) {
      const [exhausted] = await db.update(aiTasks).set({ status: "failed", error: "Task đã vượt số lần thực thi tối đa.", executionToken: null, leaseExpiresAt: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(aiTasks.id, task.id), eq(aiTasks.organizationId, task.organizationId), eq(aiTasks.status, "queued"), gte(aiTasks.attemptCount, MAX_TASK_EXECUTIONS))).returning({ id: aiTasks.id });
      if (exhausted) await this.event(task.id, task.organizationId, "failed", "Task đã vượt số lần thực thi tối đa.");
      return;
    }
    const started = Date.now();
    const executionToken = randomUUID();
    const now = new Date();
    const claimed = await db.update(aiTasks).set({ status: "running", executionToken, leaseExpiresAt: new Date(now.getTime() + LEASE_MS), attemptCount: sql`${aiTasks.attemptCount} + 1`, startedAt: task.startedAt ?? now, error: null, updatedAt: now }).where(and(
      eq(aiTasks.id, task.id),
      eq(aiTasks.organizationId, task.organizationId),
      lt(aiTasks.attemptCount, MAX_TASK_EXECUTIONS),
      or(
        eq(aiTasks.status, "queued"),
        and(eq(aiTasks.status, "running"), or(isNull(aiTasks.leaseExpiresAt), lt(aiTasks.leaseExpiresAt, now))),
      ),
    )).returning({ id: aiTasks.id });
    // Cancellation can race with a Worker that already read the task.
    // Do not send a chargeable provider request unless this Worker claimed it.
    if (!claimed.length) return;
    await this.event(task.id, task.organizationId, "running", task.agentName ? `Worker đang thực thi nhiệm vụ của Agent ${task.agentName} (lần thử ${attempt}).` : `Worker đang tạo báo cáo (lần thử ${attempt}).`);
    const heartbeat = setInterval(() => {
      void this.renewLease(task.id, task.organizationId, executionToken).catch(() => {
        this.logger.warn(`Could not renew AI task lease: ${task.id}`);
      });
    }, LEASE_HEARTBEAT_MS);
    heartbeat.unref();
    let runtime: Runtime | null = null;
    let reservationId: string | null = null;
    let usageReliable = true;
    try {
      runtime = await this.runtime(task);
      let evidence: ResearchEvidence | undefined;
      if (task.webResearchEnabled && task.agentId) {
        const decision = await this.decideResearch(runtime, task);
        await this.event(task.id, task.organizationId, "research_decision", decision.useResearch ? "Agent quyết định cần Web Research." : decision.fallback ? "Agent không trả về quyết định hợp lệ; tiếp tục không dùng Web Research." : "Agent quyết định không cần Web Research.");
        if (decision.useResearch) evidence = await this.webResearch(task, executionToken, decision.query ?? undefined);
      }
      const prompt = this.prompt(task, evidence);
      const maxOutputTokens = task.title.startsWith("Kế hoạch CEO:") ? CEO_PLAN_MAX_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS;
      const reservation = await this.quota.reserve(task.organizationId, Math.max(1, Math.ceil(Buffer.byteLength(prompt, "utf8") / 2) + maxOutputTokens));
      if (reservation.limited && !reservation.allowed) throw new TaskProviderError("Đã vượt quota token AI của Organization.", false);
      reservationId = reservation.limited ? reservation.reservationId : null;
      const result = await this.request(runtime, prompt, maxOutputTokens);
      if (task.title.startsWith("Kế hoạch CEO:")) {
        const reportError = validateCeoPlanReport(result.text);
        if (reportError) throw new TaskProviderError(`CEO chưa tạo kế hoạch hoàn chỉnh: ${reportError}`, false);
      }
      const completed = await db.update(aiTasks).set({ status: "completed", result: result.text, error: null, executionToken: null, leaseExpiresAt: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(aiTasks.id, task.id), eq(aiTasks.organizationId, task.organizationId), eq(aiTasks.executionToken, executionToken), ne(aiTasks.status, "cancelled"))).returning({ id: aiTasks.id });
      if (completed.length) {
        // Record only after the terminal state is stored. A BullMQ retry will
        // then observe `completed` and cannot create a duplicate usage entry.
        usageReliable = await this.usage.record({ organizationId: task.organizationId, provider: runtime.provider, modelId: runtime.modelId, purpose: "market_research_task", status: "success", inputTokens: token(result.usage.input), outputTokens: token(result.usage.output), totalTokens: token(result.usage.total), latencyMs: Date.now() - started });
        await this.event(task.id, task.organizationId, "completed", task.agentName ? `Nhiệm vụ của Agent ${task.agentName} đã hoàn tất.` : "Báo cáo nghiên cứu thị trường đã hoàn tất.");
      } else {
        // The provider may already have charged the request, but this Worker
        // lost its lease (for example to cancellation or recovery). Retain
        // the reservation because no reliable usage record can be written.
        usageReliable = false;
      }
    } catch (error) {
      if (error instanceof TaskCancelledError) { usageReliable = false; return; }
      const message = safeError(error);
      if (error instanceof TaskProviderError && error.retryable && !finalAttempt) {
        // Keep a short queue lease during BullMQ backoff. Dashboard polling
        // must not enqueue a second recovery job before this retry runs.
        const released = await db.update(aiTasks).set({ status: "queued", executionToken: null, leaseExpiresAt: new Date(Date.now() + LEASE_MS), updatedAt: new Date() }).where(and(eq(aiTasks.id, task.id), eq(aiTasks.organizationId, task.organizationId), eq(aiTasks.executionToken, executionToken))).returning({ id: aiTasks.id });
        if (released.length) await this.event(task.id, task.organizationId, "retrying", `${message} Worker sẽ thử lại.`);
        else usageReliable = false;
        throw error;
      }
      const failed = await db.update(aiTasks).set({ status: "failed", error: message, executionToken: null, leaseExpiresAt: null, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(aiTasks.id, task.id), eq(aiTasks.organizationId, task.organizationId), eq(aiTasks.executionToken, executionToken), ne(aiTasks.status, "cancelled"))).returning({ id: aiTasks.id });
      if (failed.length) {
        if (runtime) usageReliable = (await this.usage.record({ organizationId: task.organizationId, provider: runtime.provider, modelId: runtime.modelId, purpose: "market_research_task", status: "failed", latencyMs: Date.now() - started, errorCode: error instanceof TaskProviderError ? "provider_error" : "execution_error" })) && usageReliable;
        await this.event(task.id, task.organizationId, "failed", message);
      } else usageReliable = false;
      if (error instanceof TaskProviderError && error.retryable) throw error;
    } finally {
      clearInterval(heartbeat);
      if (reservationId) {
        try { if (usageReliable) await this.quota.release(task.organizationId, reservationId); else await this.quota.retainUntilPeriodEnd(task.organizationId, reservationId); } catch { this.logger.error("Could not settle task quota reservation"); }
      }
    }
  }
}
