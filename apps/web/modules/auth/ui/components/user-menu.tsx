
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    setBusy(true);
    setError("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setError(result.error.message ?? "Đăng xuất thất bại.");
        return;
      }

      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2">
        <UserRound className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {session?.user.name ?? "Tài khoản"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session?.user.email ?? ""}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void handleSignOut()}
        className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-sidebar-accent disabled:opacity-50"
      >
        <LogOut className="size-4" />
        {busy ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
