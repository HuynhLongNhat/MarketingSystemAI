
import { z } from "zod";

const allowedOriginSchema = z
  .string()
  .trim()
  .url("Vui lòng nhập URL hợp lệ.")
  .refine(
    (value) => {
      try {
        const url = new URL(value);

        return (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          url.pathname === "/" &&
          !url.search &&
          !url.hash
        );
      } catch {
        return false;
      }
    },
    {
      message:
        "Chỉ nhập origin, ví dụ https://example.com hoặc http://localhost:3001.",
    },
  );

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

  allowedOrigins: z
    .array(allowedOriginSchema)
    .max(20, "Chỉ được cấu hình tối đa 20 domain."),
});
