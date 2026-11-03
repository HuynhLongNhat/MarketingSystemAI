export type ReplyDecision =
  | "skip_not_active"
  | "skip_superseded"
  | "skip_already_processed"
  | "save_reply"
  | "handoff_fallback";

/**
 * Quyết định cách xử lý kết quả AI sau khi đã khóa hội thoại.
 */
export function decideReplyAction(input: {
  status: string | null | undefined;
  latestUserMessageId: string | null | undefined;
  triggerMessageId: string;
  reply: string | null | undefined;
  alreadyProcessed?: boolean;
}): ReplyDecision {
  if (input.status !== "unresolved") {
    return "skip_not_active";
  }

  if (input.latestUserMessageId !== input.triggerMessageId) {
    return "skip_superseded";
  }

  if (input.alreadyProcessed) {
    return "skip_already_processed";
  }

  return input.reply?.trim() ? "save_reply" : "handoff_fallback";
}

/**
 * Tóm tắt lỗi để ghi log mà không lộ nội dung.
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