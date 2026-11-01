"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@workspace/ui/components/button";

import { useCountdown } from "@/modules/auth/hooks/use-countdown";
import {
  sendPhoneOtp,
  verifyPhoneOtp,
} from "@/modules/auth/lib/auth-api";
import { DEFAULT_COUNTRY_CODE, maskPhone } from "@/modules/auth/lib/phone";
import { AuthCard } from "@/modules/auth/ui/components/auth-card";
import { AuthErrorMessage } from "@/modules/auth/ui/components/auth-error-message";
import { OtpVerificationForm } from "@/modules/auth/ui/components/otp-verification-form";
import {
  PhoneAuthForm,
  type PhoneDraft,
} from "@/modules/auth/ui/components/phone-auth-form";

/** Phải khớp với cooldown cấu hình ở server (cooldownSeconds trong otp-rate-limiter.ts). */
const RESEND_COOLDOWN_SECONDS = 60;

type Props = {
  mode: "sign-in" | "sign-up";
  callbackURL: string;
  onBack: () => void;
};

export function PhoneAuthFlow({ mode, callbackURL, onBack }: Props) {
  const router = useRouter();
  const countdown = useCountdown();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  // Giữ dữ liệu đã nhập để quay lại bước 1 không phải nhập lại.
  const [draft, setDraft] = useState<PhoneDraft>({
    countryCode: DEFAULT_COUNTRY_CODE,
    national: "",
  });
  const [e164, setE164] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  async function send(phone: string) {
    setError(null);
    setSending(true);
    const result = await sendPhoneOtp(phone);
    setSending(false);

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    setE164(phone);
    countdown.start(RESEND_COOLDOWN_SECONDS);
    return true;
  }

  async function handleSendFromForm(phone: string) {
    if (await send(phone)) setStep("otp");
  }

  async function handleResend() {
    if (await send(e164)) setResetKey((k) => k + 1);
  }

  async function handleVerify(code: string) {
    setError(null);
    setVerifying(true);
    const result = await verifyPhoneOtp(e164, code);

    if (!result.ok) {
      setVerifying(false);
      setError(result.message);
      setResetKey((k) => k + 1);
      return;
    }

    setRedirecting(true);
    router.replace(callbackURL);
    router.refresh();
  }

  function handleBack() {
    if (step === "otp") {
      setError(null);
      setStep("phone");
      return;
    }
    onBack();
  }

  const isSignUp = mode === "sign-up";

  return (
    <AuthCard
      title={
        step === "phone"
          ? isSignUp
            ? "Đăng ký bằng số điện thoại"
            : "Đăng nhập bằng số điện thoại"
          : "Nhập mã xác minh"
      }
      description={
        step === "phone" ? (
          "Chúng tôi sẽ gửi mã OTP gồm 6 chữ số qua SMS. Nếu số này chưa có tài khoản, tài khoản mới sẽ được tạo sau khi xác minh."
        ) : (
          <>
            Mã đã được gửi đến{" "}
            <span className="font-medium text-foreground">{maskPhone(e164)}</span>.
            Mã có hiệu lực trong vài phút.
          </>
        )
      }
      footer={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={verifying || redirecting}
        >
          <ArrowLeft aria-hidden="true" />
          {step === "otp" ? "Đổi số điện thoại" : "Chọn cách khác"}
        </Button>
      }
    >
      <AuthErrorMessage message={error} />

      {step === "phone" ? (
        <PhoneAuthForm
          value={draft}
          onChange={setDraft}
          onSubmit={handleSendFromForm}
          loading={sending}
        />
      ) : (
        <OtpVerificationForm
          onSubmit={handleVerify}
          onResend={handleResend}
          resendSeconds={countdown.seconds}
          verifying={verifying || redirecting}
          resending={sending}
          resetKey={resetKey}
        />
      )}

      {redirecting && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Xác minh thành công. Đang chuyển hướng...
        </p>
      )}
    </AuthCard>
  );
}