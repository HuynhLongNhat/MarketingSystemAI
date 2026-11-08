
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  BookOpen,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { ApiError } from "@/lib/api-client";

import {
  knowledgePreviewApi,
  type KnowledgePreviewResponse,
} from "@/lib/knowledge-preview-api";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

export function KnowledgeRetrievalPreview() {
  const { data: organization } =
    authClient.useActiveOrganization();

  const organizationId = organization?.id;

  const [query, setQuery] = useState("");
  const [result, setResult] =
    useState<KnowledgePreviewResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestVersion = useRef(0);
  const currentOrganization = useRef(organizationId);

  currentOrganization.current = organizationId;

  useEffect(() => {
    requestVersion.current += 1;

    setQuery("");
    setResult(null);
    setError(null);
    setLoading(false);
  }, [organizationId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message = query.trim();

    if (!organizationId || !message || loading) {
      return;
    }

    const version = ++requestVersion.current;
    const submittedOrganization = organizationId;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response =
        await knowledgePreviewApi.preview(message);

      if (
        requestVersion.current !== version ||
        currentOrganization.current !== submittedOrganization
      ) {
        return;
      }

      setResult(response);
    } catch (cause) {
      if (
        requestVersion.current !== version ||
        currentOrganization.current !== submittedOrganization
      ) {
        return;
      }

      if (
        cause instanceof ApiError &&
        cause.status === 403
      ) {
        setError(
          "Bạn không có quyền xem Knowledge Base của tổ chức.",
        );
      } else {
        setError(
          "Không thể kiểm tra kiến thức. Vui lòng thử lại.",
        );
      }
    } finally {
      if (
        requestVersion.current === version &&
        currentOrganization.current === submittedOrganization
      ) {
        setLoading(false);
      }
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
              <Search className="size-5" />
            </div>

            <div className="space-y-1">
              <CardTitle className="text-base">
                Kiểm tra truy xuất kiến thức
              </CardTitle>

              <CardDescription>
                Xem FAQ và tài liệu semantic mà chatbot có thể
                sử dụng để trả lời một câu hỏi của khách hàng.
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck className="size-3" />
            Không lưu câu hỏi
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <form
          className="space-y-3"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <Label htmlFor="knowledge-preview-query">
            Câu hỏi thử nghiệm
          </Label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="knowledge-preview-query"
              value={query}
              maxLength={500}
              disabled={!organizationId || loading}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Ví dụ: Chính sách đổi trả như thế nào?"
              className="min-w-0 flex-1 bg-background"
            />

            <Button
              type="submit"
              disabled={
                !organizationId ||
                loading ||
                !query.trim()
              }
              className="shrink-0"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}

              {loading ? "Đang tìm..." : "Kiểm tra"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            FAQ dùng tìm kiếm từ khóa; tài liệu semantic dùng embedding
            provider đang cấu hình. Điểm khớp không phải tỷ lệ chính xác của AI.
          </p>
        </form>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {result && (
          <section
            aria-live="polite"
            className="space-y-4 border-t pt-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  Kết quả truy xuất
                </p>

                <p className="text-xs text-muted-foreground">
                  Đã xét {result.totalConsidered} mục kiến thức
                  gần nhất.
                </p>
              </div>

              <Badge variant="secondary">
                {result.matchCount} FAQ phù hợp
              </Badge>
            </div>

            {result.matches.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center">
                <BookOpen className="size-6 text-muted-foreground" />

                <p className="text-sm font-medium">
                  Không tìm thấy FAQ phù hợp
                </p>

                <p className="max-w-md text-xs leading-5 text-muted-foreground">
                  Hãy thử diễn đạt câu hỏi khác hoặc thêm
                  kiến thức mới ở danh sách phía dưới.
                  Chatbot sẽ không nhận được FAQ nào từ
                  truy vấn này.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.matches.map((match, index) => (
                  <article
                    key={`${index}-${match.question}`}
                    className="space-y-3 rounded-xl border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>

                        {match.category && (
                          <Badge variant="outline">
                            {match.category}
                          </Badge>
                        )}
                      </div>

                      <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium tabular-nums">
                        {match.score} điểm khớp
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold leading-6">
                      {match.question}
                    </h3>

                    <div className="max-h-36 overflow-y-auto rounded-lg bg-muted/40 px-3 py-2.5">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                        {match.answer}
                      </p>
                    </div>

                    {match.matchedKeywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-xs text-muted-foreground">
                          Từ khóa:
                        </span>

                        {match.matchedKeywords.map((word) => (
                          <Badge
                            key={word}
                            variant="secondary"
                            className="font-normal"
                          >
                            {word}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            <section className="space-y-3 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Tài liệu semantic search</p>
                <Badge variant={result.documents.status === "degraded" ? "destructive" : "secondary"}>
                  {result.documents.status === "degraded"
                    ? "Không khả dụng"
                    : `${result.documents.matches.length} chunks phù hợp`}
                </Badge>
              </div>
              {result.documents.reason && (
                <p className="text-xs text-muted-foreground">
                  Semantic retrieval: {result.documents.reason}.
                </p>
              )}
              {result.documents.matches.map((match) => (
                <article key={match.chunkId} className="space-y-2 rounded-xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{match.documentTitle}</p>
                    <Badge variant="outline">{Math.round(match.similarity * 100)}%</Badge>
                  </div>
                  <p className="line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">{match.content}</p>
                </article>
              ))}
            </section>

            {result.documents.diagnostic && (
              <section className="space-y-3 border-t pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    Chẩn đoán semantic search
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chỉ hiển thị dữ liệu của Organization đang chọn. Threshold
                    không bị thay đổi bởi màn hình này.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    ["Chunks", result.documents.diagnostic.totalChunks],
                    ["Embeddings", result.documents.diagnostic.totalEmbeddings],
                    ["Đúng model", result.documents.diagnostic.matchingProviderModelEmbeddings],
                    ["Qua filters", result.documents.diagnostic.candidatesAfterFilters],
                    ["Semantic ≥ threshold", result.documents.diagnostic.candidatesAboveThreshold],
                    ["Threshold (tham khảo)", result.documents.diagnostic.threshold],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border bg-muted/30 p-2.5">
                      <p className="text-muted-foreground">{label}</p>
                      <p className="mt-1 font-semibold tabular-nums">{typeof value === "number" && String(label).startsWith("Threshold") ? value.toFixed(2) : value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border px-3 py-2 text-xs">
                  <span className="font-medium">Provider/model query: </span>
                  {result.documents.diagnostic.provider && result.documents.diagnostic.modelId
                    ? `${result.documents.diagnostic.provider} / ${result.documents.diagnostic.modelId}`
                    : "Không xác định do lỗi provider hoặc database"}
                  {result.documents.diagnostic.noMatchReason && (
                    <p className="mt-1 text-muted-foreground">
                      Lý do: {semanticReason(result.documents.diagnostic.noMatchReason)}
                    </p>
                  )}
                </div>

                {result.documents.diagnostic.topCandidates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Top chunks trước khi lọc threshold
                    </p>
                    {result.documents.diagnostic.topCandidates.map((candidate, index) => (
                      <article key={candidate.chunkId} className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">#{index + 1} · {candidate.documentTitle}</p>
                          <Badge variant="outline">{candidate.similarity.toFixed(4)}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{candidate.content}</p>
                      </article>
                    ))}
                  </div>
                )}

                {result.documents.diagnostic.lexicalCandidates.length > 0 && (
                  <DiagnosticCandidates
                    title="Lexical matches (không dùng LLM)"
                    candidates={result.documents.diagnostic.lexicalCandidates}
                    score="lexical"
                  />
                )}

                {result.documents.diagnostic.finalCandidates.length > 0 && (
                  <DiagnosticCandidates
                    title="Final hybrid ranking (RRF)"
                    candidates={result.documents.diagnostic.finalCandidates}
                    score="hybrid"
                  />
                )}
              </section>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function DiagnosticCandidates({
  title,
  candidates,
  score,
}: {
  title: string;
  candidates: Array<{
    chunkId: string;
    documentTitle: string;
    content: string;
    lexicalScore?: number;
    hybridScore?: number;
  }>;
  score: "lexical" | "hybrid";
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {candidates.map((candidate, index) => {
        const value = score === "lexical" ? candidate.lexicalScore : candidate.hybridScore;
        return (
          <article key={`${score}-${candidate.chunkId}`} className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">#{index + 1} · {candidate.documentTitle}</p>
              <Badge variant="outline">{value?.toFixed(4) ?? "—"}</Badge>
            </div>
            <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{candidate.content}</p>
          </article>
        );
      })}
    </div>
  );
}

function semanticReason(reason: NonNullable<KnowledgePreviewResponse["documents"]["diagnostic"]>["noMatchReason"]) {
  const labels: Record<NonNullable<typeof reason>, string> = {
    no_embeddings: "Organization chưa có embeddings.",
    provider_model_mismatch: "Embeddings có nhưng không khớp provider/model của query.",
    document_not_ready: "Document hoặc embedding chưa ở trạng thái ready/completed.",
    document_filter: "Embeddings bị loại bởi bộ lọc nguồn/document.",
    below_threshold: "Có candidates nhưng similarity thấp hơn 0.72.",
    provider_error: "Provider embedding không trả được query vector.",
    database_error: "Không thể truy vấn semantic search database.",
  };
  return reason ? labels[reason] : "Có kết quả semantic search.";
}
