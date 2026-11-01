import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-errors";
import {
  buildErrorCallbackUrl,
  toAbsoluteUrl,
} from "@/modules/auth/lib/auth-urls";
import { SignInValues, SignUpValues } from "../schema";

export type AuthResult = { ok: true } | { ok: false; message: string };
export type SocialProvider = "google" | "facebook";

const NETWORK_ERROR = "Không thể kết nối đến máy chủ.";

async function run(
  action: () => Promise<{
    error?: { code?: string; message?: string; status?: number } | null;
  }>,
  fallback: string,
): Promise<AuthResult> {
  try {
    const result = await action();
    if (result.error) {
      return { ok: false, message: getAuthErrorMessage(result.error, fallback) };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

export function signInWithEmail(values: SignInValues) {
  return run(
    () =>
      authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
      }),
    "Đăng nhập thất bại.",
  );
}

export function signUpWithEmail(values: SignUpValues, callbackURL: string) {
  const verificationCallback = new URL(
    "/verify-email",
    window.location.origin,
  );
  verificationCallback.searchParams.set("callbackURL", callbackURL);

  return run(
    () =>
      authClient.signUp.email({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        callbackURL: verificationCallback.toString(),
      }),
    "Đăng ký thất bại.",
  );
}

/** Thành công thì trình duyệt được chuyển hướng sang nhà cung cấp; chỉ trả về khi có lỗi. */
export function signInWithSocial(
  provider: SocialProvider,
  mode: "sign-in" | "sign-up",
  callbackURL: string,
) {
  return run(
    () =>
      authClient.signIn.social({
        provider,
        callbackURL: toAbsoluteUrl(callbackURL),
        newUserCallbackURL: toAbsoluteUrl(callbackURL),
        errorCallbackURL: buildErrorCallbackUrl(
          mode === "sign-in" ? "/sign-in" : "/sign-up",
          callbackURL,
        ),
      }),
    "Không thể bắt đầu đăng nhập.",
  );
}

export function sendPhoneOtp(phoneNumber: string) {
  return run(
    () => authClient.phoneNumber.sendOtp({ phoneNumber }),
    "Không thể gửi mã OTP.",
  );
}

export function verifyPhoneOtp(phoneNumber: string, code: string) {
  return run(
    () => authClient.phoneNumber.verify({ phoneNumber, code }),
    "Không thể xác minh mã OTP.",
  );
}