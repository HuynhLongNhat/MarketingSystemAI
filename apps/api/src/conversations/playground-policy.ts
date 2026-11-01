export const PLAYGROUND_MAX_USER_MESSAGE_LENGTH = 4000;
export const PLAYGROUND_MAX_ASSISTANT_MESSAGE_LENGTH = 5000;
export const PLAYGROUND_MAX_HISTORY_MESSAGES = 12;
export const PLAYGROUND_MAX_TOTAL_CHARACTERS = 24000;

export type PlaygroundMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PlaygroundInputResult =
  | { ok: true; messages: PlaygroundMessage[] }
  | { ok: false; code: "empty" | "last_not_user" | "too_long" };

/**
 * Chuẩn hóa lịch sử gửi từ trình duyệt:
 * - bỏ vai trò lạ và tin rỗng,
 * - chỉ giữ các tin gần nhất,
 * - tin cuối bắt buộc là của người dùng,
 * - giới hạn độ dài từng tin và tổng số ký tự.
 */
export function normalizePlaygroundMessages(
  input: ReadonlyArray<{ role: string; content: string }>,
): PlaygroundInputResult {
  const cleaned: PlaygroundMessage[] = [];

  for (const item of input) {
    if (item.role !== "user" && item.role !== "assistant") {
      continue;
    }

    const content =
      typeof item.content === "string" ? item.content.trim() : "";

    if (!content) {
      continue;
    }

    cleaned.push({ role: item.role, content });
  }

  const recent = cleaned.slice(-PLAYGROUND_MAX_HISTORY_MESSAGES);
  const last = recent.at(-1);

  if (!last) {
    return { ok: false, code: "empty" };
  }

  if (last.role !== "user") {
    return { ok: false, code: "last_not_user" };
  }

  let total = 0;

  for (const message of recent) {
    const max =
      message.role === "user"
        ? PLAYGROUND_MAX_USER_MESSAGE_LENGTH
        : PLAYGROUND_MAX_ASSISTANT_MESSAGE_LENGTH;

    if (message.content.length > max) {
      return { ok: false, code: "too_long" };
    }

    total += message.content.length;
  }

  if (total > PLAYGROUND_MAX_TOTAL_CHARACTERS) {
    return { ok: false, code: "too_long" };
  }

  return { ok: true, messages: recent };
}

export type PlaygroundLimitDecision =
  | { ok: true; release: () => void }
  | { ok: false; reason: "busy" | "rate_limited" | "daily_limit" };

export type PlaygroundLimiterOptions = {
  perUserPerMinute: number;
  perOrganizationPerDay: number;
  now?: () => number;
};

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const SWEEP_THRESHOLD = 1000;

function prune(hits: number[], since: number): number[] {
  return hits.filter((time) => time > since);
}

/**
 * Giới hạn chi phí cho Playground (lưu trong bộ nhớ tiến trình):
 * - mỗi người dùng chỉ có 1 yêu cầu AI đang chạy,
 * - tối đa N yêu cầu/phút cho mỗi người dùng,
 * - tối đa M yêu cầu/ngày cho mỗi tổ chức.
 *
 * Nếu chạy nhiều instance API, giới hạn áp dụng riêng từng instance.
 */
export class PlaygroundLimiter {
  private readonly options: PlaygroundLimiterOptions;
  private readonly inFlight = new Set<string>();
  private readonly userHits = new Map<string, number[]>();
  private readonly organizationHits = new Map<string, number[]>();

  constructor(options: PlaygroundLimiterOptions) {
    this.options = options;
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  private sweep(now: number): void {
    if (this.userHits.size > SWEEP_THRESHOLD) {
      for (const [key, hits] of this.userHits) {
        if (prune(hits, now - MINUTE_MS).length === 0) {
          this.userHits.delete(key);
        }
      }
    }

    if (this.organizationHits.size > SWEEP_THRESHOLD) {
      for (const [key, hits] of this.organizationHits) {
        if (prune(hits, now - DAY_MS).length === 0) {
          this.organizationHits.delete(key);
        }
      }
    }
  }

  acquire(
    organizationId: string,
    userId: string,
  ): PlaygroundLimitDecision {
    const now = this.now();
    this.sweep(now);

    const userKey = `${organizationId}:${userId}`;

    if (this.inFlight.has(userKey)) {
      return { ok: false, reason: "busy" };
    }

    const userHits = prune(
      this.userHits.get(userKey) ?? [],
      now - MINUTE_MS,
    );

    if (userHits.length >= this.options.perUserPerMinute) {
      this.userHits.set(userKey, userHits);
      return { ok: false, reason: "rate_limited" };
    }

    const organizationHits = prune(
      this.organizationHits.get(organizationId) ?? [],
      now - DAY_MS,
    );

    if (organizationHits.length >= this.options.perOrganizationPerDay) {
      this.organizationHits.set(organizationId, organizationHits);
      return { ok: false, reason: "daily_limit" };
    }

    userHits.push(now);
    organizationHits.push(now);
    this.userHits.set(userKey, userHits);
    this.organizationHits.set(organizationId, organizationHits);
    this.inFlight.add(userKey);

    let released = false;

    return {
      ok: true,
      release: () => {
        if (released) return;
        released = true;
        this.inFlight.delete(userKey);
      },
    };
  }
}