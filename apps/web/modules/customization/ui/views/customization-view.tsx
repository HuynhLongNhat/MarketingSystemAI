
"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import {
  widgetSettingsApi,
  type WidgetSettings,
} from "@/lib/widget-settings-api";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { CustomizationForm } from "../components/customization-form";
import { SupportAgentAssignmentCard } from "../components/support-agent-assignment-card";

export function CustomizationView() {
  const {
    data: organization,
    isPending: organizationLoading,
  } = authClient.useActiveOrganization();

  const organizationId = organization?.id;

  const [settings, setSettings] =
    useState<WidgetSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;

    if (!organizationId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    setSettings(null);

    void widgetSettingsApi
      .getCurrent()
      .then((result) => {
        if (active) {
          setSettings(result);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [organizationId, revision]);

  if (organizationLoading || loading) {
    return (
      <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="w-full min-w-0 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Vui lòng chọn tổ chức để cấu hình chatbot.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full min-w-0 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 rounded-xl border p-10 text-center">
          <AlertCircle className="size-6" />

          <p className="text-sm text-muted-foreground">
            Không thể tải cấu hình chatbot.
          </p>

          <Button
            variant="outline"
            onClick={() =>
              setRevision((value) => value + 1)
            }
          >
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tùy chỉnh Chatbot
        </h1>

        <p className="text-sm text-muted-foreground">
          Quản lý nhân viên AI phụ trách website,
          lời chào và các câu hỏi gợi ý.
        </p>
      </header>

      <div className="space-y-6">
        <SupportAgentAssignmentCard
          key={organizationId}
          organizationId={organizationId}
        />

        <CustomizationForm
          key={`${organizationId}-${revision}`}
          initialData={settings}
        />
      </div>
    </div>
  );
}
