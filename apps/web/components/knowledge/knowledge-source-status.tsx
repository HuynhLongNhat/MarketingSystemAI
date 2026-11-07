import { Badge } from "@workspace/ui/components/badge";

import type { GoogleDriveSource } from "@/lib/knowledge-connections-api";

export type KnowledgeSourceStage =
  | "pending"
  | "indexing"
  | "embedding-waiting"
  | "embedding-processing"
  | "ready"
  | "failed";

export function getKnowledgeSourceStage(
  source: GoogleDriveSource,
): KnowledgeSourceStage {
  if (source.status === "failed" || source.documentStatus === "failed") {
    return "failed";
  }

  if (source.status === "pending") return "pending";
  if (source.status === "indexing") return "indexing";

  if (source.embeddingStatus === "waiting") return "embedding-waiting";
  if (source.embeddingStatus === "processing") return "embedding-processing";

  if (source.embeddingStatus === "failed") return "failed";

  return "ready";
}

const STAGE_LABELS: Record<KnowledgeSourceStage, string> = {
  pending: "Đang chờ",
  indexing: "Đang trích xuất",
  "embedding-waiting": "Chờ embedding",
  "embedding-processing": "Đang tạo embedding",
  ready: "Sẵn sàng tìm kiếm",
  failed: "Thất bại",
};

const STAGE_CLASSES: Record<KnowledgeSourceStage, string> = {
  pending: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  indexing: "border-blue-500/40 text-blue-700 dark:text-blue-300",
  "embedding-waiting": "border-violet-500/40 text-violet-700 dark:text-violet-300",
  "embedding-processing": "border-violet-500/40 text-violet-700 dark:text-violet-300",
  ready: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  failed: "border-destructive/40 text-destructive",
};

export function KnowledgeSourceStatus({
  source,
}: {
  source: GoogleDriveSource;
}) {
  const stage = getKnowledgeSourceStage(source);

  return (
    <Badge variant="outline" className={STAGE_CLASSES[stage]}>
      {STAGE_LABELS[stage]}
    </Badge>
  );
}

export function isKnowledgeSourceProcessing(source: GoogleDriveSource) {
  const stage = getKnowledgeSourceStage(source);
  return stage === "pending" || stage === "indexing" || stage === "embedding-waiting" || stage === "embedding-processing";
}
