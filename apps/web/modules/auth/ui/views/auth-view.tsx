"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { authPath, safeAuthRedirect } from "@/lib/auth-redirect";
import { getCallbackErrorMessage } from "@/modules/auth/lib/auth-errors";
import { AuthCard } from "@/modules/auth/ui/components/auth-card";
import { AuthDivider } from "@/modules/auth/ui/components/auth-divider";
import { AuthErrorMessage } from "@/modules/auth/ui/components/auth-error-message";
import { EmailPasswordForm } from "@/modules/auth/ui/components/email-password-form";
import { PhoneAuthFlow } from "@/modules/auth/ui/components/phone-auth-flow";
import { SocialAuthButtons } from "@/modules/auth/ui/components/social-auth-buttons";

type Mode = "sign-in" | "sign-up";

const COPY = {
  "sign-in": {
    title: "Đăng nhập",
    description: "Chào mừng quay lại. Chọn cách bạn muốn đăng nhập.",
    switchText: "Chưa có tài khoản?",
    switchLabel: "Đăng ký",
    switchPath: "/sign-up",
  },
  "sign-up": {
    title: "Tạo tài khoản",
    description: "Bắt đầu với CompanyMarketingSystem chỉ trong vài bước.",
    switchText: "Đã có tài khoản?",
    switchLabel: "Đăng nhập",
    switchPath: "/sign-in",
  },
} as const;

/** Màn hình dùng chung cho Sign In và Sign Up; chỉ khác nhau ở `mode`. */
export function AuthView({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams();
  const callbackURL = safeAuthRedirect(searchParams.get("callbackURL"));
  const copy = COPY[mode];

  const [usePhone, setUsePhone] = useState(false);
  // Lỗi từ OAuth callback (?error=...) được hiển thị ngay khi vào trang.
  const [error, setError] = useState<string | null>(() =>
    getCallbackErrorMessage(searchParams.get("error")),
  );

  if (usePhone) {
    return (
      <PhoneAuthFlow
        mode={mode}
        callbackURL={callbackURL}
        onBack={() => setUsePhone(false)}
      />
    );
  }

  return (
    <AuthCard
      title={copy.title}
      description={copy.description}
      footer={
        <>
          {copy.switchText}{" "}
          <Link
            href={authPath(copy.switchPath, callbackURL)}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {copy.switchLabel}
          </Link>
        </>
      }
    >
      <AuthErrorMessage message={error} />

      <EmailPasswordForm
        mode={mode}
        callbackURL={callbackURL}
        onError={setError}
      />

      <AuthDivider />

      <SocialAuthButtons
        mode={mode}
        callbackURL={callbackURL}
        onPhoneClick={() => {
          setError(null);
          setUsePhone(true);
        }}
        onError={setError}
      />
    </AuthCard>
  );
}