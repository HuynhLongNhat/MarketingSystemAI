"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-errors";
import { toAbsoluteUrl } from "@/modules/auth/lib/auth-urls";
import { AuthCard } from "@/modules/auth/ui/components/auth-card";
import { AuthErrorMessage } from "@/modules/auth/ui/components/auth-error-message";
import { AuthFormField } from "@/modules/auth/ui/components/auth-form-field";
import { AuthSubmitButton } from "@/modules/auth/ui/components/auth-submit-button";

const schema = z.object({
  email: z.string().trim().min(1, "Vui lòng nhập email.").email("Email không hợp lệ."),
});

export const ForgotPasswordView = () => {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: toAbsoluteUrl("/reset-password"),
      });
      if (result.error) return setError(getAuthErrorMessage(result.error));
      setSent(true);
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    }
  });

  return (
    <AuthCard
      title="Quên mật khẩu"
      description={
        sent
          ? "Nếu email này có tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Hãy kiểm tra hộp thư."
          : "Nhập email của bạn để nhận liên kết đặt lại mật khẩu."
      }
      footer={
        <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
          Quay lại đăng nhập
        </Link>
      }
    >
      {!sent && (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <AuthErrorMessage message={error} />
          <AuthFormField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <AuthSubmitButton loading={isSubmitting} loadingText="Đang gửi...">
            Gửi liên kết đặt lại
          </AuthSubmitButton>
        </form>
      )}
    </AuthCard>
  );
};