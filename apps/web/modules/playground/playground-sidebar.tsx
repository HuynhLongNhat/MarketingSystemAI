"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  Cpu,
  LibraryBig,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import type {
  PlaygroundIssue,
  PlaygroundModelSource,
  PlaygroundOverview,
} from "@/lib/playground-api";

const sourceLabels: Record<PlaygroundModelSource, string> = {
  agent: "Cấu hình riêng của nhân viên",
  default: "Mặc định của tổ chức",
  legacy: "Cấu hình hệ thống (dự phòng)",
};

export const issueMessages: Record<
  PlaygroundIssue,
  { title: string; description: string; blocking: boolean }
> = {
  multiple_active_agents: {
    title: "Có nhiều nhân viên CSKH đang hoạt động",
    description:
      "Chatbot thật sẽ chuyển hội thoại cho nhân viên khi gặp tình huống này. Hãy để lại đúng một nhân viên ở trạng thái hoạt động.",
    blocking: true,
  },
  no_active_agent: {
    title: "Chưa có nhân viên CSKH đang hoạt động",
    description:
      "Chatbot đang dùng hướng dẫn mặc định, chưa áp dụng System Prompt riêng.",
    blocking: false,
  },
  model_not_configured: {
    title: "Chưa có mô hình AI khả dụng",
    description:
      "Hãy kết nối nhà cung cấp AI và chọn mô hình cho nhân viên CSKH hoặc đặt mô hình mặc định.",
    blocking: true,
  },
};

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="break-words text-sm">{children}</div>
    </div>
  );
}

interface PlaygroundSidebarProps {
  overview: PlaygroundOverview;
  messageCount: number;
  lastLatencyMs: number | null;
}

export function PlaygroundSidebar({
  overview,
  messageCount,
  lastLatencyMs,
}: PlaygroundSidebarProps) {
  return (
    <div className="space-y-4">
      {overview.issues.map((issue) => (
        <Alert key={issue}>
          <AlertTriangle />
          <AlertTitle>{issueMessages[issue].title}</AlertTitle>
          <AlertDescription>
            {issueMessages[issue].description}
          </AlertDescription>
        </Alert>
      ))}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Bot className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Nhân viên CSKH
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Row label="Tên">
            {overview.agent?.name ?? "Chưa có nhân viên hoạt động"}
          </Row>

          <Row label="Trạng thái">
            <Badge variant="outline" className="text-foreground">
              {overview.agent ? "Đang hoạt động" : "Chưa kích hoạt"}
            </Badge>
          </Row>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Link href="/workforce?tab=agents">
              Cấu hình nhân viên
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Cpu className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Mô hình AI
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {overview.model ? (
            <>
              <Row label="Nhà cung cấp">
                {overview.model.provider ?? "Không xác định"}
                {overview.model.connectionName
                  ? ` · ${overview.model.connectionName}`
                  : ""}
              </Row>

              <Row label="Mô hình">
                <span className="break-all font-mono text-xs">
                  {overview.model.modelId}
                </span>
              </Row>

              <Row label="Nguồn cấu hình">
                {sourceLabels[overview.model.source]}
              </Row>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có mô hình khả dụng.
            </p>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Link href="/settings/ai-providers">
              Nhà cung cấp AI
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <LibraryBig className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Kho kiến thức
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Row label="Số mục FAQ">{overview.knowledgeCount}</Row>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Link href="/files">Quản lý kiến thức</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Phiên thử nghiệm
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Row label="Số tin nhắn">{messageCount}</Row>

          <Row label="Độ trễ gần nhất">
            {lastLatencyMs === null
              ? "Chưa có"
              : `${(lastLatencyMs / 1000).toFixed(1)} giây`}
          </Row>

          <p className="text-xs text-muted-foreground">
            Cuộc thử không tạo khách hàng, không lưu vào hộp thư
            hội thoại và không tính vào thống kê.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}