export type TaskExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/** Delayed BullMQ jobs may claim only non-terminal tasks. */
export function canWorkerClaimTask(status: TaskExecutionStatus): boolean {
  return status === "queued" || status === "running";
}
