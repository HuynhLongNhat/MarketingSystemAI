
"use client";

import { useEffect, useState } from "react";
import { LoaderIcon } from "lucide-react";
import { useSetAtom } from "jotai";

import {
  contactSessionIdAtomFamily,
  conversationIdAtom,
  errorMessageAtom,
  organizationIdAtom,
  screenAtom,
  vapiSecretsAtom,
  widgetSettingsAtom,
} from "@/modules/widget/atoms/widget-atoms";

import {
  widgetApi,
  widgetSession,
  widgetConversationStorage,
} from "@/lib/widget-api";

export const WidgetLoadingScreen = ({
  organizationId,
}: {
  organizationId: string | null;
}) => {
  const [loadingMessage, setLoadingMessage] =
    useState("Đang khởi tạo...");

  const setOrganizationId = useSetAtom(organizationIdAtom);
  const setWidgetSettings = useSetAtom(widgetSettingsAtom);
  const setConversationId = useSetAtom(conversationIdAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setScreen = useSetAtom(screenAtom);
  const setVapiSecrets = useSetAtom(vapiSecretsAtom);

  const setContactSessionId = useSetAtom(
    contactSessionIdAtomFamily(organizationId ?? ""),
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!organizationId) {
        setErrorMessage("Thiếu Organization ID");
        setScreen("error");
        return;
      }

      try {
        setLoadingMessage("Đang tải cấu hình...");

        const configuration =
          await widgetApi.getPublicConfiguration(organizationId);

        if (cancelled) return;

        if (configuration.organization.id !== organizationId) {
          throw new Error("Organization không hợp lệ");
        }

        setOrganizationId(organizationId);
        setWidgetSettings(configuration.settings);
        setVapiSecrets(null);

        const token = widgetSession.get(organizationId);

        if (!token) {
          setContactSessionId(null);
          setConversationId(null);
          setScreen("auth");
          return;
        }

        setLoadingMessage("Đang khôi phục phiên chat...");

        let session;

        try {
          session = await widgetApi.validateSession(token);
        } catch {
          if (cancelled) return;

          widgetSession.clear(organizationId);
          setContactSessionId(null);
          setConversationId(null);
          setScreen("auth");
          return;
        }

        if (cancelled) return;

        if (
          !session.valid ||
          session.organizationId !== organizationId
        ) {
          widgetSession.clear(organizationId);
          setContactSessionId(null);
          setConversationId(null);
          setScreen("auth");
          return;
        }

        setContactSessionId(session.contactSessionId);

        setLoadingMessage("Đang tải lịch sử trò chuyện...");

        const conversations =
          await widgetApi.listConversations(token);

        if (cancelled) return;

        const savedId =
          widgetConversationStorage.get(organizationId);

        const selected =
          conversations.find(
            (conversation) => conversation.id === savedId,
          ) ?? conversations[0];

        if (!selected) {
          widgetConversationStorage.clear(organizationId);
          setConversationId(null);
          setScreen("selection");
          return;
        }

        widgetConversationStorage.set(
          organizationId,
          selected.id,
        );

        setConversationId(selected.id);
        setScreen("chat");
      } catch (error) {
        if (cancelled) return;

        console.error("Widget initialization failed", error);

        setErrorMessage(
          "Không thể khởi tạo Widget. Vui lòng thử lại.",
        );

        setScreen("error");
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [
    organizationId,
    setOrganizationId,
    setWidgetSettings,
    setVapiSecrets,
    setContactSessionId,
    setConversationId,
    setErrorMessage,
    setScreen,
  ]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-background p-6">
      <LoaderIcon className="size-6 animate-spin text-primary" />

      <p className="text-center text-sm text-muted-foreground">
        {loadingMessage}
      </p>
    </div>
  );
};
