
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
});
