"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { safeAuthRedirect } from "@/lib/auth-redirect";
function VerificationPendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const callbackURL = safeAuthRedirect(searchParams.get("callbackURL"));

  const verificationCallback = new URL("/verify-email", window.location.origin);

  verificationCallback.searchParams.set("callbackURL", callbackURL);
  async function resendVerification() {
    if (!email || loading) return;

    setLoading(true);
    setMessage("");

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: verificationCallback.toString(),
      });

      if (result.error) {
        setMessage(result.error.message ?? "Không thể gửi email.");
        return;
      }

      setMessage(
        "Nếu địa chỉ email hợp lệ, hệ thống sẽ gửi hướng dẫn xác minh.",
      );
    } catch {
      setMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-5 rounded-xl border bg-background p-6">
      <h1 className="text-2xl font-semibold">Verify your email</h1>

      <p className="text-sm text-muted-foreground">
        Vui lòng kiểm tra hộp thư và nhấn vào liên kết xác minh.
      </p>

      {email && (
        <p className="text-sm">
          Email: <strong>{email}</strong>
        </p>
      )}

      <button
        type="button"
        disabled={!email || loading}
        onClick={() => void resendVerification()}
        className="w-full rounded-md border p-3 disabled:opacity-50"
      >
        {loading ? "Đang gửi..." : "Gửi lại email xác minh"}
      </button>

      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}

      <Link href="/sign-in" className="block text-center text-sm underline">
        Quay lại đăng nhập
      </Link>
    </div>
  );
}

export default function VerificationPendingPage() {
  return (
    <Suspense fallback={<p>Đang tải...</p>}>
      <VerificationPendingContent />
    </Suspense>
  );
}
