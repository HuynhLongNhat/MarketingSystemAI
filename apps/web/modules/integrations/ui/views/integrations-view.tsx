
"use client";

import { useState } from "react";
import Image from "next/image";
import { CopyIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import {
  INTEGRATIONS,
  WIDGET_BASE_URL,
  type IntegrationId,
} from "../../constants";

import { createScript } from "../../utils";

const INSTRUCTIONS: Record<IntegrationId, string> = {
  html: "Dán mã trước thẻ đóng </body> trong file HTML.",
  react:
    "Dán thẻ script vào file index.html của dự án React/Vite, trước thẻ đóng </body>.",
  nextjs:
    "Thêm component Script vào app/layout.tsx. Giữ nguyên các provider và thành phần hiện có.",
  javascript:
    "Thêm đoạn JavaScript vào file được chạy trên website, sau khi trang đã có phần body.",
};

export const IntegrationsView = () => {
  const { data: organization } =
    authClient.useActiveOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] =
    useState("");
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationId>("html");

  const handleIntegrationClick = (
    integrationId: IntegrationId,
  ) => {
    if (!organization?.id) {
      toast.error("Vui lòng chọn tổ chức.");
      return;
    }

    setSelectedIntegration(integrationId);
    setSelectedSnippet(
      createScript(integrationId, organization.id),
    );
    setDialogOpen(true);
  };

  const handleCopyOrganizationId = async () => {
    if (!organization?.id) {
      toast.error("Không tìm thấy mã tổ chức.");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        organization.id,
      );
      toast.success("Đã sao chép mã tổ chức.");
    } catch {
      toast.error("Không thể sao chép.");
    }
  };

  return (
    <>
      <IntegrationsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        snippet={selectedSnippet}
        integrationId={selectedIntegration}
      />

      <div className="flex min-h-screen flex-col bg-muted p-4 md:p-8">
        <div className="mx-auto w-full max-w-screen-md">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold md:text-3xl">
              Tích hợp Website
            </h1>

            <p className="text-sm text-muted-foreground">
              Nhúng chatbot chăm sóc khách hàng vào
              website của bạn.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="organization-id">
                Mã tổ chức (Organization ID)
              </Label>

              <div className="flex gap-2">
                <Input
                  id="organization-id"
                  readOnly
                  value={organization?.id ?? ""}
                  className="min-w-0 flex-1 bg-background font-mono text-sm"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!organization?.id}
                  onClick={() =>
                    void handleCopyOrganizationId()
                  }
                >
                  <CopyIcon className="mr-2 size-4" />
                  Sao chép
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Địa chỉ Widget</Label>

              <Input
                readOnly
                value={WIDGET_BASE_URL}
                className="bg-background font-mono text-sm"
              />

              <p className="text-xs text-muted-foreground">
                Được cấu hình qua NEXT_PUBLIC_WIDGET_URL.
                Khi triển khai production, hãy sử dụng
                domain HTTPS của Widget.
              </p>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">
                Chọn nền tảng website
              </h2>

              <p className="text-sm text-muted-foreground">
                Chọn công nghệ website để lấy mã nhúng
                phù hợp.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {INTEGRATIONS.map((integration) => (
                <button
                  key={integration.id}
                  type="button"
                  disabled={!organization?.id}
                  onClick={() =>
                    handleIntegrationClick(integration.id)
                  }
                  className="flex items-center gap-3 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Image
                    src={integration.icon}
                    alt={integration.title}
                    width={28}
                    height={28}
                  />

                  <span className="text-sm font-medium">
                    {integration.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

interface IntegrationsDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  snippet: string;
  integrationId: IntegrationId;
}

export const IntegrationsDialog = ({
  open,
  onOpenChange,
  snippet,
  integrationId,
}: IntegrationsDialogProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Đã sao chép mã nhúng.");
    } catch {
      toast.error("Không thể sao chép mã nhúng.");
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setCopied(false);
    }

    onOpenChange(value);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Nhúng chatbot vào website
          </DialogTitle>

          <DialogDescription>
            Sao chép mã và thêm vào website theo
            hướng dẫn bên dưới.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>1. Sao chép mã nhúng</Label>

            <pre className="max-h-72 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
              <code className="whitespace-pre-wrap break-all">
                {snippet}
              </code>
            </pre>

            <Button
              type="button"
              onClick={() => void handleCopy()}
              className="w-full gap-2"
            >
              {copied ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}

              {copied
                ? "Đã sao chép"
                : "Sao chép mã nhúng"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>2. Thêm mã vào website</Label>

            <p className="text-sm leading-6 text-muted-foreground">
              {INSTRUCTIONS[integrationId]}
            </p>
          </div>

          <div className="space-y-2">
            <Label>3. Kiểm tra chatbot</Label>

            <p className="text-sm leading-6 text-muted-foreground">
              Mở website, tìm nút hỗ trợ khách hàng
              ở góc dưới bên phải và thử gửi một
              tin nhắn.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
