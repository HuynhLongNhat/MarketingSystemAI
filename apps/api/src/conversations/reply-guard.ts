export type ReplyDecision =
  | "skip_not_active"
  | "skip_superseded"
  | "save_reply"
  | "handoff_fallback";

/**
 * Quyết định cách xử lý kết quả AI sau khi đã khóa hội thoại.
 *
 * - Hội thoại không còn `unresolved` (nhân viên tiếp quản/đóng): bỏ kết quả.
 * - Đã có tin nhắn khách mới hơn tin kích hoạt lượt AI này:
 *   bỏ kết quả, để lượt AI của tin mới nhất trả lời (tránh trùng/sai thứ tự).
 * - AI có phản hồi: lưu phản hồi.
 * - AI lỗi/rỗng: chuyển nhân viên.
 */
export function decideReplyAction(input: {
  status: string | null | undefined;
  latestUserMessageId: string | null | undefined;
  triggerMessageId: string;
  reply: string | null | undefined;
}): ReplyDecision {
  if (input.status !== "unresolved") {
    return "skip_not_active";
  }

  if (input.latestUserMessageId !== input.triggerMessageId) {
    return "skip_superseded";
  }

  return input.reply?.trim() ? "save_reply" : "handoff_fallback";
}

/**
 * Tóm tắt lỗi để ghi log mà không lộ nội dung.
 * Lỗi của Drizzle/pg có thể chứa câu SQL kèm tham số
 * (gồm nội dung tin nhắn của khách), nên chỉ log tên và mã lỗi.
 */
export function safeErrorSummary(error: unknown): string {
  if (!(error instanceof Error)) {
    return "UnknownError";
  }

  const withCode = error as Error & {
    code?: unknown;
    cause?: unknown;
  };

  const cause = withCode.cause as { code?: unknown } | undefined;
  const code =
    typeof withCode.code === "string"
      ? withCode.code
      : typeof cause?.code === "string"
        ? cause.code
        : undefined;

  return code ? `${error.name} (code=${code})` : error.name;
}