
"use client";

import { useAtomValue } from "jotai";

import { screenAtom } from "@/modules/widget/atoms/widget-atoms";

import { WidgetAuthScreen } from "../screens/widget-auth-screen";
import { WidgetErrorScreen } from "../screens/widget-error-screen";
import { WidgetLoadingScreen } from "../screens/widget-loading-screen";
import { WidgetVoiceScreen } from "../screens/widget-voice-screen";
import { WidgetContactScreen } from "../screens/widget-contact-screen";
import { WidgetChatWorkspace } from "./widget-chat-workspace";

interface Props {
  organizationId: string | null;
}

export const WidgetView = ({ organizationId }: Props) => {
  const screen = useAtomValue(screenAtom);

  const renderScreen = () => {
    switch (screen) {
      case "loading":
        return (
          <WidgetLoadingScreen organizationId={organizationId} />
        );

      case "error":
        return <WidgetErrorScreen />;

      case "auth":
        return <WidgetAuthScreen />;

      case "voice":
        return <WidgetVoiceScreen />;

      case "contact":
        return <WidgetContactScreen />;

      case "selection":
      case "inbox":
      case "chat":
        return <WidgetChatWorkspace />;

      default:
        return (
          <WidgetLoadingScreen organizationId={organizationId} />
        );
    }
  };

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      {renderScreen()}
    </main>
  );
};
