export type TaskExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/** Includes retries and independently-created recovery jobs. */
export const MAX_TASK_EXECUTIONS = 4;

/** Delayed BullMQ jobs may claim only non-terminal tasks. */
export function canWorkerClaimTask(status: TaskExecutionStatus): boolean {
  return status === "queued" || status === "running";
}

export function canAttemptTaskExecution(attemptCount: number): boolean {
  return attemptCount < MAX_TASK_EXECUTIONS;
}
