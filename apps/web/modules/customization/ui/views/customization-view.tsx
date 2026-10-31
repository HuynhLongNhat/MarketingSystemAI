
"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import {
  widgetSettingsApi,
  type WidgetSettings,
} from "@/lib/widget-settings-api";

import { Button } from "@workspace/ui/components/button";

import { CustomizationForm } from "../components/customization-form";

export const CustomizationView = () => {
  const {
    data: organization,
    isPending: organizationLoading,
  } = authClient.useActiveOrganization();

  const [settings, setSettings] =
    useState<WidgetSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const organizationId = organization?.id;

  useEffect(() => {
    let cancelled = false;

    if (!organizationId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      setLoading(true);
      setLoadError(false);
      setSettings(null);

      try {
        const result =
          await widgetSettingsApi.getCurrent();

        if (cancelled) return;

        setSettings(result);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Failed to load widget settings:",
          error,
        );

        setLoadError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [organizationId, retryCount]);

  const isLoading =
    organizationLoading ||
    (Boolean(organizationId) && loading);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted p-8">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />

        <p className="text-sm text-muted-foreground">
          Đang tải cấu hình chatbot...
        </p>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-8">
        <p className="text-sm text-muted-foreground">
          Vui lòng chọn Organization trước khi cấu hình chatbot.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <AlertCircleIcon className="size-7 text-destructive" />

          <p className="text-sm text-muted-foreground">
            Không thể tải cấu hình chatbot.
            Vui lòng thử lại.
          </p>

          <Button
            variant="outline"
            onClick={() =>
              setRetryCount((count) => count + 1)
            }
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted p-4 md:p-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold md:text-3xl">
            Widget Customization
          </h1>

          <p className="text-sm text-muted-foreground">
            Tùy chỉnh lời chào và câu hỏi gợi ý
            cho chatbot chăm sóc khách hàng.
          </p>
        </div>

        <div className="mt-8">
          <CustomizationForm
            key={organizationId}
            initialData={settings}
          />
        </div>
      </div>
    </div>
  );
};
