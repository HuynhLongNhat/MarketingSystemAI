"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-errors";
import { AuthCard } from "@/modules/auth/ui/components/auth-card";
import { AuthErrorMessage } from "@/modules/auth/ui/components/auth-error-message";
import { AuthFormField } from "@/modules/auth/ui/components/auth-form-field";
import { AuthSubmitButton } from "@/modules/auth/ui/components/auth-submit-button";

const schema = z.object({
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(128, "Mật khẩu quá dài."),
});

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidLink = !token || searchParams.get("error") === "INVALID_TOKEN";
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    if (!token) return;
    setError(null);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) return setError(getAuthErrorMessage(result.error));
      router.replace("/sign-in");
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    }
  });

  return (
    <AuthCard
      title="Đặt lại mật khẩu"
      description={
        invalidLink
          ? "Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu một liên kết mới."
          : "Chọn mật khẩu mới cho tài khoản của bạn."
      }
      footer={
        <Link
          href={invalidLink ? "/forgot-password" : "/sign-in"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {invalidLink ? "Yêu cầu liên kết mới" : "Quay lại đăng nhập"}
        </Link>
      }
    >
      {!invalidLink && (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <AuthErrorMessage message={error} />
          <AuthFormField
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <AuthSubmitButton loading={isSubmitting} loadingText="Đang lưu...">
            Lưu mật khẩu
          </AuthSubmitButton>
        </form>
      )}
    </AuthCard>
  );
}

export const ResetPasswordView = () => (
  <Suspense fallback={null}>
    <ResetPasswordContent />
  </Suspense>
);