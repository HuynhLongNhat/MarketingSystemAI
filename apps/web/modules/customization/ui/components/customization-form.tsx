"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Globe2, Loader2Icon, Plus, Trash2 } from "lucide-react";

import {
  widgetSettingsApi,
  type WidgetSettings,
} from "@/lib/widget-settings-api";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";

import type { FormSchema } from "../../types";
import { widgetSettingsSchema } from "../../schemas";

interface CustomizationFormProps {
  initialData: WidgetSettings | null;
}

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export const CustomizationForm = ({ initialData }: CustomizationFormProps) => {
  const [newOrigin, setNewOrigin] = useState("");

  const form = useForm<FormSchema>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues: {
      greetMessage:
        initialData?.greetMessage ??
        "Xin chào! Chúng tôi có thể giúp gì cho bạn?",

      defaultSuggestions: {
        suggestion1: initialData?.defaultSuggestions?.suggestion1 ?? "",
        suggestion2: initialData?.defaultSuggestions?.suggestion2 ?? "",
        suggestion3: initialData?.defaultSuggestions?.suggestion3 ?? "",
      },

      allowedOrigins: initialData?.allowedOrigins ?? [],
    },
  });

  const originFields =
    useWatch({
      control: form.control,
      name: "allowedOrigins",
    }) ?? [];

  const handleAddOrigin = () => {
    const origin = normalizeOrigin(newOrigin);

    if (!origin) {
      toast.error(
        "Domain không hợp lệ. Hãy nhập origin như https://example.com.",
      );
      return;
    }

    const currentOrigins = form.getValues("allowedOrigins") ?? [];

    const duplicate = currentOrigins.some(
      (item) => normalizeOrigin(item) === origin,
    );

    if (duplicate) {
      toast.error("Domain này đã tồn tại.");
      return;
    }

    if (currentOrigins.length >= 20) {
      toast.error("Chỉ được cấu hình tối đa 20 domain.");
      return;
    }

    form.setValue("allowedOrigins", [...originFields, origin], {
      shouldDirty: true,
      shouldValidate: true,
    });

    setNewOrigin("");
    setNewOrigin("");
  };

  const onSubmit = async (values: FormSchema) => {
    try {
      const allowedOrigins = [
        ...new Set(
          values.allowedOrigins
            .map((origin) => {
              return normalizeOrigin(origin);
            })
            .filter((origin): origin is string => origin !== null),
        ),
      ];

      await widgetSettingsApi.updateCurrent({
        greetMessage: values.greetMessage.trim(),

        defaultSuggestions: {
          suggestion1: values.defaultSuggestions.suggestion1?.trim() ?? "",
          suggestion2: values.defaultSuggestions.suggestion2?.trim() ?? "",
          suggestion3: values.defaultSuggestions.suggestion3?.trim() ?? "",
        },

        allowedOrigins,
      });

      form.setValue("allowedOrigins", allowedOrigins);

      toast.success("Đã lưu cấu hình Widget.");
    } catch (error) {
      console.error("Failed to save widget settings:", error);
      toast.error("Không thể lưu cấu hình. Vui lòng thử lại.");
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>General Chat Settings</CardTitle>
            <CardDescription>
              Thiết lập lời chào và nội dung gợi ý cho khách hàng.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="greetMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Greeting Message</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      maxLength={2000}
                      placeholder="Nhập lời chào khi khách bắt đầu trò chuyện..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Tin nhắn đầu tiên khách nhận được khi bắt đầu hội thoại mới.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Default Suggestions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cấu hình tối đa 3 câu hỏi gợi ý cho khách hàng.
                </p>
              </div>

              <FormField
                control={form.control}
                name="defaultSuggestions.suggestion1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggestion 1</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={160}
                        placeholder="Ví dụ: Chính sách đổi trả như thế nào?"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultSuggestions.suggestion2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggestion 2</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={160}
                        placeholder="Ví dụ: Shop có giao hàng toàn quốc không?"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultSuggestions.suggestion3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggestion 3</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={160}
                        placeholder="Ví dụ: Tôi muốn gặp nhân viên tư vấn."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe2 className="size-5 text-muted-foreground" />
              <CardTitle>Allowed Origins</CardTitle>
            </div>

            <CardDescription>
              Quản lý website được phép nhúng Widget của tổ chức. Chỉ những
              origin trong danh sách này mới được API chấp nhận.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <FormLabel>Thêm domain mới</FormLabel>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newOrigin}
                  onChange={(event) => setNewOrigin(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddOrigin();
                    }
                  }}
                  placeholder="https://example.com"
                  className="flex-1"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddOrigin}
                  disabled={!newOrigin.trim()}
                >
                  <Plus className="mr-2 size-4" />
                  Thêm domain
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Ví dụ: https://example.com hoặc http://localhost:3001. Không
                nhập dấu * hoặc đường dẫn như /chat.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Domain được phép</h3>

                <span className="text-xs text-muted-foreground">
                  {originFields.length}/20
                </span>
              </div>

              {originFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
                  <Globe2 className="size-8 text-muted-foreground" />

                  <p className="text-sm font-medium">Chưa có domain nào</p>

                  <p className="max-w-sm text-xs text-muted-foreground">
                    Thêm domain để cho phép website của bạn nhúng và sử dụng
                    Widget.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {originFields.map((origin, index) => (
                    <div
                      key={`${origin}-${index}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg border p-3"
                    >
                      <Globe2 className="size-4 shrink-0 text-muted-foreground" />

                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm font-medium">
                        {origin}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Origin được cấp quyền
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          form.setValue(
                            "allowedOrigins",
                            originFields.filter((_, i) => i !== index),
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          );
                        }}
                        aria-label="Xóa domain"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <FormField
                control={form.control}
                name="allowedOrigins"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            )}

            {form.formState.isSubmitting
              ? "Đang lưu..."
              : "Lưu cấu hình Widget"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
