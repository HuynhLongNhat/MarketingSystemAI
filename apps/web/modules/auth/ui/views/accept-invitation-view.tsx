
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function AcceptInvitationView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const invitationId = searchParams.get("invitationId");
  const { data: session, isPending } = authClient.useSession();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const returnPath = `/accept-invitation?invitationId=${encodeURIComponent(
    invitationId ?? "",
  )}`;

  async function acceptInvitation() {
    if (!invitationId || !session || busy) return;

    setBusy(true);
    setError("");

    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (result.error) {
        throw new Error(
          result.error.message ?? "Không thể chấp nhận lời mời.",
        );
      }

      const organizationId = result.data?.invitation.organizationId;

      if (organizationId) {
        const activeResult = await authClient.organization.setActive({
          organizationId,
        });

        if (activeResult.error) {
          throw new Error(
            activeResult.error.message ??
              "Đã chấp nhận lời mời nhưng chưa thể chuyển Organization.",
          );
        }
      }

      router.replace("/conversations");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return <p>Đang kiểm tra đăng nhập...</p>;
  }

  if (!invitationId) {
    return <p>Liên kết lời mời không hợp lệ.</p>;
  }

  return (
    <div className="w-full max-w-md space-y-5 rounded-xl border bg-background p-6">
      <h1 className="text-2xl font-semibold">
        Organization Invitation
      </h1>

      {!session ? (
        <>
          <p className="text-sm text-muted-foreground">
            Vui lòng đăng nhập hoặc đăng ký bằng đúng email
            nhận được lời mời.
          </p>

          <div className="flex gap-3">
            <Link
              href={`/sign-in?callbackURL=${encodeURIComponent(returnPath)}`}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              Đăng nhập
            </Link>

            <Link
              href={`/sign-up?callbackURL=${encodeURIComponent(returnPath)}`}
              className="rounded-md border px-4 py-2"
            >
              Đăng ký
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            Đang đăng nhập với: <strong>{session.user.email}</strong>
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void acceptInvitation()}
            className="w-full rounded-md bg-primary p-3 text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Đang xử lý..." : "Chấp nhận lời mời"}
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
