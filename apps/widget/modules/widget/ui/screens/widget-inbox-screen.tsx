
"use client";

import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { ConversationStatusIcon } from "@workspace/ui/components/conversation-status-icon";
import { WidgetHeader } from "../components/widget-header";
import { WidgetFooter } from "../components/widget-footer";

import {
  conversationIdAtom,
  organizationIdAtom,
  screenAtom,
} from "../../atoms/widget-atoms";

import {
  widgetApi,
  widgetSession,
  type WidgetConversation,
} from "@/lib/widget-api";

export const WidgetInboxScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);

  const [conversations, setConversations] =
    useState<WidgetConversation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    const token = widgetSession.get(organizationId);

    if (!token) {
      setScreen("auth");
      return;
    }

    let cancelled = false;

    widgetApi.listConversations(token)
      .then((result) => {
        if (cancelled) return;
        setConversations(result);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError("Unable to load conversations");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, setScreen]);

  return (
    <>
      <WidgetHeader>
        <div className="flex items-center gap-x-2">
          <Button
            variant="transparent"
            size="icon"
            onClick={() => setScreen("selection")}
          >
            <ArrowLeftIcon />
          </Button>
          <p>Inbox</p>
        </div>
      </WidgetHeader>

      <div className="flex flex-1 flex-col gap-y-2 overflow-y-auto p-4">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">
            Loading...
          </p>
        )}

        {error && (
          <p className="text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No conversations yet
          </p>
        )}

        {conversations.map((conversation) => (
          <Button
            className="h-20 w-full justify-between"
            key={conversation.id}
            variant="outline"
            onClick={() => {
              setConversationId(conversation.id);
              setScreen("chat");
            }}
          >
            <div className="flex w-full flex-col gap-4 overflow-hidden text-start">
              <div className="flex w-full items-center justify-between gap-x-2">
                <p className="text-xs text-muted-foreground">
                  Chat
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(
                    new Date(conversation.createdAt),
                    { addSuffix: true },
                  )}
                </p>
              </div>

              <div className="flex w-full items-center justify-between gap-x-2">
                <p className="truncate text-sm">
                  Conversation
                </p>
                <ConversationStatusIcon
                  status={conversation.status}
                  className="shrink-0"
                />
              </div>
            </div>
          </Button>
        ))}
      </div>

      <WidgetFooter />
    </>
  );
};
