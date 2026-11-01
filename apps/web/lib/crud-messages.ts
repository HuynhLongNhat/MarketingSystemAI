
"use client";

import { toast } from "sonner";

import type { UiLanguage } from "@/lib/ui-language";

export type CrudAction =
  | "create"
  | "update"
  | "delete"
  | "save";

export type CrudEntity =
  | "agent"
  | "agentTemplate"
  | "department"
  | "knowledge"
  | "aiConnection"
  | "chatbot"
  | "settings";

type MessageOptions = {
  language?: UiLanguage;
  description?: string;
};

const entityLabels: Record<
  UiLanguage,
  Record<CrudEntity, string>
> = {
  vi: {
    agent: "nhân viên AI",
    agentTemplate: "mẫu nhân viên",
    department: "phòng ban",
    knowledge: "kiến thức",
    aiConnection: "kết nối AI",
    chatbot: "chatbot",
    settings: "cấu hình",
  },
  en: {
    agent: "AI agent",
    agentTemplate: "agent template",
    department: "department",
    knowledge: "knowledge entry",
    aiConnection: "AI connection",
    chatbot: "chatbot",
    settings: "settings",
  },
};

const actionLabels: Record<
  UiLanguage,
  Record<CrudAction, { success: string; error: string }>
> = {
  vi: {
    create: {
      success: "Đã tạo",
      error: "Không thể tạo",
    },
    update: {
      success: "Đã cập nhật",
      error: "Không thể cập nhật",
    },
    delete: {
      success: "Đã xóa",
      error: "Không thể xóa",
    },
    save: {
      success: "Đã lưu",
      error: "Không thể lưu",
    },
  },
  en: {
    create: {
      success: "Created",
      error: "Failed to create",
    },
    update: {
      success: "Updated",
      error: "Failed to update",
    },
    delete: {
      success: "Deleted",
      error: "Failed to delete",
    },
    save: {
      success: "Saved",
      error: "Failed to save",
    },
  },
};

export function getCrudMessage(
  action: CrudAction,
  entity: CrudEntity,
  type: "success" | "error",
  language: UiLanguage = "vi",
): string {
  const label = entityLabels[language][entity];
  const verb = actionLabels[language][action][type];

  if (language === "vi") {
    return type === "success"
      ? `${verb} ${label} thành công.`
      : `${verb} ${label}. Vui lòng thử lại.`;
  }

  return type === "success"
    ? `${verb} ${label} successfully.`
    : `${verb} ${label}. Please try again.`;
}

export const crudToast = {
  success(
    action: CrudAction,
    entity: CrudEntity,
    options: MessageOptions = {},
  ) {
    const { language = "vi", description } = options;

    toast.success(
      getCrudMessage(action, entity, "success", language),
      { description },
    );
  },

  error(
    action: CrudAction,
    entity: CrudEntity,
    options: MessageOptions = {},
  ) {
    const { language = "vi", description } = options;

    toast.error(
      getCrudMessage(action, entity, "error", language),
      { description },
    );
  },
};
