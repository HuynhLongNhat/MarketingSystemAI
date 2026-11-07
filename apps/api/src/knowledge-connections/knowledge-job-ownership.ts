export const KNOWLEDGE_JOB_STALE_MS = 5 * 60 * 1000;

export function isCurrentJobOwner(input: {
  actualGeneration: number;
  actualToken: string | null;
  expectedGeneration: number;
  expectedToken: string;
}) {
  return (
    input.actualGeneration === input.expectedGeneration &&
    input.actualToken === input.expectedToken
  );
}

export function isFreshKnowledgeJob(
  queuedAt: Date | null,
  now = Date.now(),
) {
  return Boolean(
    queuedAt && now - queuedAt.getTime() < KNOWLEDGE_JOB_STALE_MS,
  );
}
