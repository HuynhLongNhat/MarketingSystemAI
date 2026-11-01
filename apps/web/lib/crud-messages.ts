
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

type CrudMessageType = "success" | "error";

const messages: Record<
  UiLanguage,
  Record<
    CrudAction,
    Record<CrudMessageType, string>
  >
> = {
  vi: {
    create: {
      success: "Đã tạo thành công.",
      error: "Tạo thất bại.",
    },
    update: {
      success: "Đã cập nhật thành công.",
      error: "Cập nhật thất bại.",
    },
    delete: {
      success: "Đã xóa thành công.",
      error: "Xóa thất bại.",
    },
    save: {
      success: "Đã lưu thành công.",
      error: "Lưu thất bại.",
    },
  },

  en: {
    create: {
      success: "Created successfully.",
      error: "Failed to create.",
    },
    update: {
      success: "Updated successfully.",
      error: "Failed to update.",
    },
    delete: {
      success: "Deleted successfully.",
      error: "Failed to delete.",
    },
    save: {
      success: "Saved successfully.",
      error: "Failed to save.",
    },
  },
};

/**
 * Returns a consistent CRUD notification.
 *
 * The entity argument is optional and retained
 * for compatibility with existing callers.
 *
 * Examples:
 * getCrudMessage("create", "agent", "success", "vi")
 * getCrudMessage("delete", "department", "success", "vi")
 *
 * Both return generic messages without entity names.
 */
export function getCrudMessage(
  action: CrudAction,
  entity: CrudEntity | undefined,
  type: CrudMessageType,
  language: UiLanguage = "vi",
): string {
  void entity;

  return messages[language][action][type];
}

export const crudToast = {
  success(
    action: CrudAction,
    entity?: CrudEntity,
    options: MessageOptions = {},
  ) {
    void entity;

    const {
      language = "vi",
      description,
    } = options;

    toast.success(
      messages[language][action].success,
      { description },
    );
  },

  error(
    action: CrudAction,
    entity?: CrudEntity,
    options: MessageOptions = {},
  ) {
    void entity;

    const {
      language = "vi",
      description,
    } = options;

    toast.error(
      messages[language][action].error,
      { description },
    );
  },
};
