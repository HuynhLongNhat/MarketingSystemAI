
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

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

export const CustomizationForm = ({
  initialData,
}: CustomizationFormProps) => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues: {
      greetMessage:
        initialData?.greetMessage ??
        "Xin chào! Chúng tôi có thể giúp gì cho bạn?",

      defaultSuggestions: {
        suggestion1:
          initialData?.defaultSuggestions?.suggestion1 ?? "",
        suggestion2:
          initialData?.defaultSuggestions?.suggestion2 ?? "",
        suggestion3:
          initialData?.defaultSuggestions?.suggestion3 ?? "",
      },

      // Giữ cấu trúc form cũ để tương thích type.
      // Không gửi các giá trị này lên API trong MVP-01.
      vapiSettings: {
        assistantId:
          initialData?.vapiSettings?.assistantId ?? "",
        phoneNumber:
          initialData?.vapiSettings?.phoneNumber ?? "",
      },
    },
  });

  const onSubmit = async (values: FormSchema) => {
    try {
      await widgetSettingsApi.updateCurrent({
        greetMessage: values.greetMessage.trim(),
        defaultSuggestions: {
          suggestion1:
            values.defaultSuggestions.suggestion1?.trim() ?? "",
          suggestion2:
            values.defaultSuggestions.suggestion2?.trim() ?? "",
          suggestion3:
            values.defaultSuggestions.suggestion3?.trim() ?? "",
        },
      });

      toast.success("Đã lưu cấu hình chatbot.");
    } catch (error) {
      console.error(
        "Failed to save widget settings:",
        error,
      );

      toast.error(
        "Không thể lưu cấu hình. Vui lòng thử lại.",
      );
    }
  };

  return (
    <Form {...form}>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Card>
          <CardHeader>
            <CardTitle>
              General Chat Settings
            </CardTitle>

            <CardDescription>
              Thiết lập lời chào và nội dung gợi ý
              cho khách hàng.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="greetMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Greeting Message
                  </FormLabel>

                  <FormControl>
                    <Textarea
                      {...field}
                      maxLength={2000}
                      placeholder="Nhập lời chào khi khách bắt đầu trò chuyện..."
                      rows={3}
                    />
                  </FormControl>

                  <FormDescription>
                    Tin nhắn đầu tiên khách nhận được
                    khi bắt đầu hội thoại mới.
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">
                  Default Suggestions
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Cấu hình tối đa 3 câu hỏi gợi ý
                  cho khách hàng.
                </p>
              </div>

              <FormField
                control={form.control}
                name="defaultSuggestions.suggestion1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Suggestion 1
                    </FormLabel>

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
                    <FormLabel>
                      Suggestion 2
                    </FormLabel>

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
                    <FormLabel>
                      Suggestion 3
                    </FormLabel>

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

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            )}

            {form.formState.isSubmitting
              ? "Đang lưu..."
              : "Save Settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
