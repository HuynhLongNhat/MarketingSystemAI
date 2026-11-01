
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api-client";
import {
  supportAssignmentApi,
  type SupportAssignment,
} from "@/lib/support-assignment-api";
import {
  workforceApi,
  type AiAgent,
} from "@/lib/workforce-api";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";

const SUPPORT_ROLES = [
  "customer_support",
  "customer-support",
];

type Props = {
  organizationId: string;
};

export function SupportAgentAssignmentCard({
  organizationId,
}: Props) {
  const [assignment, setAssignment] =
    useState<SupportAssignment | null>(null);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [selection, setSelection] = useState("automatic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [current, availableAgents] = await Promise.all([
        supportAssignmentApi.getCurrent(),
        workforceApi.listAgents(),
      ]);

      if (current.organizationId !== organizationId) {
        throw new Error("Dữ liệu tổ chức không khớp.");
      }

      setAssignment(current);
      setAgents(availableAgents);
      setSelection(current.agentId ?? "automatic");
    } catch {
      setError("Không thể tải cấu hình nhân viên CSKH.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeAgents = useMemo(
    () =>
      agents.filter(
        (agent) =>
          agent.organizationId === organizationId &&
          SUPPORT_ROLES.includes(agent.role) &&
          agent.status === "active",
      ),
    [agents, organizationId],
  );

  const selectedAgent = activeAgents.find(
    (agent) => agent.id === selection,
  );

  const savedSelection =
    assignment?.agentId ?? "automatic";

  const unchanged = selection === savedSelection;

  const canSave =
    !loading &&
    !saving &&
    !error &&
    !unchanged &&
    (selection === "automatic" || Boolean(selectedAgent));

  async function save() {
    if (!canSave) return;

    setSaving(true);

    try {
      const result =
        selection === "automatic"
          ? await supportAssignmentApi.remove()
          : await supportAssignmentApi.assign(selection);

      setAssignment(result);
      setSelection(result.agentId ?? "automatic");

      toast.success(
        result.mode === "assigned"
          ? "Đã gán nhân viên CSKH cho website."
          : "Đã chuyển về chế độ chọn Agent tự động.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof ApiError && cause.status === 403
          ? "Bạn không có quyền thay đổi nhân viên CSKH."
          : "Không thể lưu nhân viên CSKH. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bot className="size-5" />
            <CardTitle className="text-base">
              Nhân viên AI chăm sóc khách hàng
            </CardTitle>
          </div>

          <Badge variant="outline">
            {assignment?.mode === "assigned"
              ? "Đã gán"
              : "Tự động"}
          </Badge>
        </div>

        <CardDescription>
          Chọn nhân viên AI chịu trách nhiệm trả lời khách
          hàng trên website. Chỉ nhân viên CSKH đang hoạt động
          mới có thể được gán.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" />
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Nhân viên phụ trách
              </p>

              <Select
                value={selection}
                disabled={saving}
                onValueChange={setSelection}
              >
                <SelectTrigger
                  className="w-full min-w-0"
                  aria-label="Chọn nhân viên CSKH"
                >
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="automatic">
                    Tự động — tương thích cấu hình hiện tại
                  </SelectItem>

                  {activeAgents.map((agent) => (
                    <SelectItem
                      key={agent.id}
                      value={agent.id}
                    >
                      {agent.name}
                    </SelectItem>
                  ))}

                  {assignment?.agentId &&
                    !activeAgents.some(
                      (agent) => agent.id === assignment.agentId,
                    ) && (
                      <SelectItem
                        value={assignment.agentId}
                        disabled
                      >
                        Agent đã gán hiện không khả dụng
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>

            {assignment?.mode === "assigned" && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <p className="font-medium">
                  {assignment.agentName ??
                    "Nhân viên không còn khả dụng"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Trạng thái:{" "}
                  {assignment.agentStatus === "active"
                    ? "Đang hoạt động"
                    : "Không khả dụng"}
                </p>
              </div>
            )}

            {activeAgents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Chưa có Agent CSKH đang hoạt động. Hãy tạo
                hoặc kích hoạt nhân viên trong mục Nhân viên AI.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={!canSave}
                onClick={() => void save()}
              >
                {saving && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Lưu nhân viên CSKH
              </Button>

              <Button variant="outline" asChild>
                <Link href="/workforce?tab=agents">
                  Quản lý nhân viên
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Khi chọn một Agent cụ thể, chatbot sẽ không
              tự chuyển sang Agent khác nếu nhân viên
              này bị tạm dừng. Chế độ tự động vẫn dùng
              quy tắc cũ của hệ thống.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
