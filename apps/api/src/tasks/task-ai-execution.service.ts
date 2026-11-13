import { Injectable, Logger } from "@nestjs/common";
import { and, eq, gte, isNull, lt, ne, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  aiProviderConnections,
  aiTaskEvents,
  aiTasks,
  db,
} from "@workspace/db/node";
import { decryptCredential } from "../ai-credentials/credential-crypto.js";
import { PROVIDER_REGISTRY } from "../ai-providers/provider-registry.js";
import { AiUsageQuotaService } from "../conversations/ai-usage-quota.service.js";
import { AiUsageRecorder } from "../conversations/ai-usage-recorder.js";
import type { AiTaskJobData } from "../jobs/jobs.service.js";
import { canAttemptTaskExecution, canWorkerClaimTask, MAX_TASK_EXECUTIONS } from "./task-execution-state.js";

const TIMEOUT_MS = 60_000;
const MAX_OUTPUT_TOKENS = 2_000;
const LEASE_MS = 90_000;
const LEASE_HEARTBEAT_MS = 20_000;

type Usage = { input?: unknown; output?: unknown; total?: unknown };
type Runtime = { provider: string; protocol: "openai" | "anthropic" | "google"; endpoint: string; apiKey: string; modelId: string };

export class TaskProviderError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

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
  constructor(private readonly usage: AiUsageRecorder, private readonly quota: AiUsageQuotaService) {}

  private prompt(task: { title: string; description: string; agentName: string | null; agentRole: string | null; agentSystemPrompt: string | null }) {
    const limitations = "MVP này KHÔNG có Web Search, dữ liệu Internet trực tiếp hoặc tool được tích hợp. Không được gọi, giả lập hoặc tuyên bố đã dùng tool/Web Search. Không được bịa số liệu, nguồn dẫn, thị phần, giá cả hoặc tuyên bố rằng đã nghiên cứu Internet; hãy nêu rõ các giả định và dữ liệu cần kiểm chứng khi phù hợp.";
    if (task.agentName) {
      return `Bạn đang thực hiện nhiệm vụ với tư cách Agent “${task.agentName}”, vai trò “${task.agentRole ?? "không xác định"}”.\n\nĐây là system prompt snapshot của Agent tại thời điểm tạo task. Thực hiện theo hướng dẫn này khi không mâu thuẫn với các giới hạn hệ thống bên dưới:\n--- AGENT SYSTEM PROMPT ---\n${task.agentSystemPrompt ?? ""}\n--- END AGENT SYSTEM PROMPT ---\n\nNhiệm vụ\nTiêu đề: ${task.title}\nYêu cầu/bối cảnh: ${task.description}\n\nHãy hoàn thành nhiệm vụ theo đúng chuyên môn và định dạng phù hợp với yêu cầu, bằng tiếng Việt trừ khi nhiệm vụ yêu cầu ngôn ngữ khác.\n\n${limitations}`;
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

  private async request(runtime: Runtime, prompt: string): Promise<{ text: string; usage: Usage }> {
    let response: Response;
    try {
      if (runtime.protocol === "anthropic") {
        response = await fetch(runtime.endpoint, { method: "POST", headers: { "x-api-key": runtime.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: runtime.modelId, max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.3, messages: [{ role: "user", content: prompt }] }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      } else if (runtime.protocol === "google") {
        response = await fetch(runtime.endpoint, { method: "POST", headers: { "x-goog-api-key": runtime.apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: MAX_OUTPUT_TOKENS } }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      } else {
        response = await fetch(runtime.endpoint, { method: "POST", headers: { Authorization: `Bearer ${runtime.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: runtime.modelId, temperature: 0.3, max_completion_tokens: MAX_OUTPUT_TOKENS, messages: [{ role: "system", content: "Trả lời chính xác theo yêu cầu, không bịa dữ liệu." }, { role: "user", content: prompt }] }), signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      }
    } catch (error) {
      throw new TaskProviderError(error instanceof Error && error.name === "TimeoutError" ? "AI Provider hết thời gian phản hồi." : "Không thể kết nối AI Provider.", true);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new TaskProviderError(`AI Provider trả về HTTP ${response.status}.`, isRetryableStatus(response.status));
    }
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }>; content?: Array<{ text?: string }>; usage?: { input_tokens?: unknown; output_tokens?: unknown; prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown }; usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown; totalTokenCount?: unknown }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = runtime.protocol === "anthropic" ? body.content?.map((part) => part.text ?? "").join("") : runtime.protocol === "google" ? body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") : body.choices?.[0]?.message?.content;
    if (!text?.trim()) throw new TaskProviderError("AI Provider trả về nội dung trống.", false);
    const usage = runtime.protocol === "google" ? { input: body.usageMetadata?.promptTokenCount, output: body.usageMetadata?.candidatesTokenCount, total: body.usageMetadata?.totalTokenCount } : { input: body.usage?.input_tokens ?? body.usage?.prompt_tokens, output: body.usage?.output_tokens ?? body.usage?.completion_tokens, total: body.usage?.total_tokens };
    return { text: text.trim(), usage };
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
      const prompt = this.prompt(task);
      const reservation = await this.quota.reserve(task.organizationId, Math.max(1, Math.ceil(Buffer.byteLength(prompt, "utf8") / 2) + MAX_OUTPUT_TOKENS));
      if (reservation.limited && !reservation.allowed) throw new TaskProviderError("Đã vượt quota token AI của Organization.", false);
      reservationId = reservation.limited ? reservation.reservationId : null;
      const result = await this.request(runtime, prompt);
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
