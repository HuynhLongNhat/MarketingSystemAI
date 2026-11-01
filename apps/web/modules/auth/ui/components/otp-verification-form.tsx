"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";

import { AuthSubmitButton } from "@/modules/auth/ui/components/auth-submit-button";

export const OTP_LENGTH = 6;
const DIGITS_ONLY_PATTERN = "^[0-9]*$";
type Props = {
  /** Gọi khi người dùng nhập đủ 6 số hoặc bấm Xác minh. */
  onSubmit: (code: string) => void | Promise<void>;
  onResend: () => void | Promise<void>;
  resendSeconds: number;
  verifying?: boolean;
  resending?: boolean;
  /** Đổi mã khi cần xóa ô nhập (ví dụ sau khi nhập sai). */
  resetKey?: number;
};

export function OtpVerificationForm({
  onSubmit,
  onResend,
  resendSeconds,
  verifying,
  resending,
  resetKey,
}: Props) {
  const [code, setCode] = useState("");

  // Xóa ô nhập khi cha đổi resetKey (render-time reset, không cần effect).
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setCode("");
  }

  async function submit(value: string) {
    if (value.length === OTP_LENGTH && !verifying) await onSubmit(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(code);
  }

  const canResend = resendSeconds === 0 && !resending && !verifying;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex justify-center">
        <InputOTP
          maxLength={OTP_LENGTH}
         pattern={DIGITS_ONLY_PATTERN}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          disabled={verifying}
          onChange={setCode}
          onComplete={(value) => void submit(value)}
          aria-label="Mã OTP gồm 6 chữ số"
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <InputOTPSlot key={i} index={i} className="size-11 text-base" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <AuthSubmitButton
        loading={verifying}
        loadingText="Đang xác minh..."
        disabled={code.length !== OTP_LENGTH}
      >
        Xác minh
      </AuthSubmitButton>

      <div className="text-center text-sm text-muted-foreground">
        {resendSeconds > 0 ? (
          <span aria-live="polite">Gửi lại mã sau {resendSeconds} giây</span>
        ) : (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-foreground"
            disabled={!canResend}
            onClick={() => void onResend()}
          >
            {resending ? "Đang gửi lại..." : "Gửi lại mã"}
          </Button>
        )}
      </div>
    </form>
  );
}