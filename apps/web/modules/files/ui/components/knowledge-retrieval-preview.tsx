
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
                Xem FAQ mà chatbot sẽ sử dụng để trả lời
                một câu hỏi của khách hàng.
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck className="size-3" />
            Không gọi AI
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
            Kiểm tra bằng thuật toán tìm kiếm từ khóa.
            Điểm khớp không phải tỷ lệ chính xác của AI.
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
          </section>
        )}
      </CardContent>
    </Card>
  );
}
