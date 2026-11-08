import { randomUUID } from "node:crypto";

/**
 * Instrumentation cho đường đi Customer Support RAG.
 *
 * - Chỉ ghi metadata an toàn: ID, số lượng, độ dài, outcome.
 * - KHÔNG ghi nội dung câu hỏi, nội dung chunk, lịch sử chat, API key, token.
 * - Bật mặc định ngoài production; tắt hẳn bằng RAG_TRACE=0, ép bật bằng RAG_TRACE=1.
 */

/**
 * Đổi chuỗi này mỗi khi sửa luồng RAG. Nếu log của Worker không có
 * marker mới nhất, Worker đang chạy code cũ (hoặc một Worker khác nhận job).
 */
export const RAG_TRACE_MARKER = "rag-trace-v1";

export type RagTrace = {
  traceId: string;
  jobId?: string | null;
  attempt?: number;
};

export function isRagTraceEnabled(): boolean {
  const flag = process.env.RAG_TRACE?.trim();
  if (flag === "0") return false;
  if (flag === "1") return true;
  return (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development") !== "production";
}

export function newTraceId(): string {
  return randomUUID();
}

function dbTarget(): string | null {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // Không bao giờ in username/password.
    return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return "unparseable";
  }
}

/**
 * Dấu vân tay runtime: dùng để so API với Worker (cùng source? cùng Redis?
 * cùng DB?). Không chứa secret.
 */
export function runtimeFingerprint() {
  return {
    marker: RAG_TRACE_MARKER,
    pid: process.pid,
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    redis: `${process.env.REDIS_HOST ?? "127.0.0.1"}:${process.env.REDIS_PORT ?? 6379}`,
    db: dbTarget(),
    gitSha: process.env.GIT_SHA ?? process.env.COMMIT_SHA ?? null,
  };
}

export function ragTraceLog(
  logger: { log: (message: string) => void },
  event: string,
  trace: RagTrace | undefined,
  fields: Record<string, unknown> = {},
): void {
  if (!isRagTraceEnabled()) return;

  logger.log(
    JSON.stringify({
      event: `rag.${event}`,
      traceId: trace?.traceId ?? null,
      jobId: trace?.jobId ?? null,
      attempt: trace?.attempt ?? null,
      marker: RAG_TRACE_MARKER,
      ...fields,
    }),
  );
}

/**
 * Chỉ dùng với test fixture (dev). RAG_TRACE_EXPECT="9.500.000,18 thang"
 * -> kiểm tra các chuỗi này có nằm trong context gửi LLM hay không và chỉ
 * log true/false. Bị vô hiệu ở production.
 */
export function expectedEvidencePresence(context: string | null): Record<string, boolean> | null {
  const raw = process.env.RAG_TRACE_EXPECT?.trim();
  const env = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  if (!raw || env === "production") return null;

  const haystack = (context ?? "").toLowerCase();
  const result: Record<string, boolean> = {};
  raw.split(",").map((item) => item.trim()).filter(Boolean).forEach((needle, index) => {
    result[`expect_${index + 1}`] = haystack.includes(needle.toLowerCase());
  });
  return result;
}
