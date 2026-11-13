export type AiTaskJobIdentity = {
  taskId: string;
  organizationId: string;
  createdAt: string;
};

/** Validate untrusted BullMQ payload before it reaches the Task executor. */
export function parseAiTaskJobData(value: unknown): AiTaskJobIdentity {
  const data = value as {
    taskId?: unknown;
    organizationId?: unknown;
    createdAt?: unknown;
  } | undefined;

  if (
    !data ||
    typeof data.taskId !== "string" ||
    !data.taskId ||
    typeof data.organizationId !== "string" ||
    !data.organizationId
  ) {
    throw new Error("Invalid AI task job data");
  }

  return {
    taskId: data.taskId,
    organizationId: data.organizationId,
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : new Date().toISOString(),
  };
}
