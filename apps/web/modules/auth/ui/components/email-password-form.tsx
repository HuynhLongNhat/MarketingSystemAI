"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { AuthFormField } from "@/modules/auth/ui/components/auth-form-field";
import { AuthSubmitButton } from "@/modules/auth/ui/components/auth-submit-button";
import { signInWithEmail, signUpWithEmail } from "@/modules/auth/lib/auth-api";
import {   signInSchema,
  signUpSchema,
  type SignInValues,
  type SignUpValues, } from "../../schema";

type Props = {
  mode: "sign-in" | "sign-up";
  callbackURL: string;
  disabled?: boolean;
  onError: (message: string | null) => void;
};

type FormValues = SignInValues & Partial<Pick<SignUpValues, "name">>;

export function EmailPasswordForm({
  mode,
  callbackURL,
  disabled,
  onError,
}: Props) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    onError(null);

    if (isSignUp) {
      const result = await signUpWithEmail(
        values as SignUpValues,
        callbackURL,
      );
      if (!result.ok) return onError(result.message);

      const pending = new URLSearchParams({
        email: values.email.trim(),
        callbackURL,
      });
      router.replace(`/verification-pending?${pending.toString()}`);
      return;
    }

    const result = await signInWithEmail(values);
    if (!result.ok) return onError(result.message);

    router.replace(callbackURL);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {isSignUp && (
        <AuthFormField
          label="Họ và tên"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
      )}

      <AuthFormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="ban@congty.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <AuthFormField
        label="Mật khẩu"
        type="password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        error={errors.password?.message}
        labelAction={
          !isSignUp && (
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Quên mật khẩu?
            </Link>
          )
        }
        {...register("password")}
      />

      <AuthSubmitButton
        loading={isSubmitting}
        disabled={disabled}
        loadingText={isSignUp ? "Đang tạo tài khoản..." : "Đang đăng nhập..."}
      >
        {isSignUp ? "Tạo tài khoản" : "Đăng nhập"}
      </AuthSubmitButton>
    </form>
  );
}