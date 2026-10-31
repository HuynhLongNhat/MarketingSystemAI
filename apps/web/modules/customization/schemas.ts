
import { z } from "zod";

export const widgetSettingsSchema = z.object({
  greetMessage: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập lời chào.")
    .max(2000, "Lời chào tối đa 2000 ký tự."),

  defaultSuggestions: z.object({
    suggestion1: z
      .string()
      .max(160, "Tối đa 160 ký tự.")
      .optional(),

    suggestion2: z
      .string()
      .max(160, "Tối đa 160 ký tự.")
      .optional(),

    suggestion3: z
      .string()
      .max(160, "Tối đa 160 ký tự.")
      .optional(),
  }),

  // Giữ schema Vapi để không phá type đang được
  // sử dụng bởi các component cũ.
  // MVP-01 không chỉnh sửa hoặc lưu Vapi.
  vapiSettings: z.object({
    assistantId: z.string().optional(),
    phoneNumber: z.string().optional(),
  }),
});
