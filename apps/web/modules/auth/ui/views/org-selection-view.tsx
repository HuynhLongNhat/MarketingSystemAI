"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Plus } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { activateOrganization } from "@/lib/organization-navigation";
export const OrgSelectionView = () => {
  const router = useRouter();

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const {
    data: organizations,
    isPending: organizationsPending,
    refetch,
  } = authClient.useListOrganizations();
  const { data: activeOrganization, isPending: activePending } =
    authClient.useActiveOrganization();

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const autoSelecting = useRef(false);

  function generateSlug(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function selectOrganization(organizationId: string) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await activateOrganization(organizationId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Không thể chuyển Organization.",
      );
      setBusy(false);
    }
  }

  useEffect(() => {
    if (
      sessionPending ||
      organizationsPending ||
      activePending ||
      busy ||
      autoSelecting.current ||
      !session
    ) return;

    if (activeOrganization) {
      autoSelecting.current = true;
      void activateOrganization(activeOrganization.id);
      return;
    }

    if (organizations?.length === 1 && organizations[0]) {
      autoSelecting.current = true;
      void selectOrganization(organizations[0].id);
    }
  }, [activeOrganization, activePending, busy, organizations, organizationsPending, session, sessionPending]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await authClient.organization.create({
        name: name.trim(),
        slug: generateSlug(name),
      });

      if (result.error || !result.data) {
        setError(result.error?.message ?? "Không thể tạo Organization.");
        return;
      }

      try {
        await activateOrganization(result.data.id);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Không thể kích hoạt Organization.",
        );
        await refetch();
        return;
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể tạo Organization.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sessionPending || organizationsPending || activePending) {
    return <div className="w-full max-w-lg space-y-4 rounded-2xl border bg-card p-6 shadow-sm"><div className="h-7 w-48 animate-pulse rounded bg-muted" /><div className="h-16 animate-pulse rounded-xl bg-muted" /></div>;
  }

  if (!session) {
    return (
      <button type="button" onClick={() => router.replace("/sign-in")}>
        Vui lòng đăng nhập
      </button>
    );
  }

  const hasOrganizations = (organizations?.length ?? 0) > 0;

  return (
    <div className="w-full max-w-lg space-y-6 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
      <div className="space-y-2">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-5" /></div>
        <h1 className="text-2xl font-semibold tracking-tight">{hasOrganizations ? "Chọn workspace" : "Tạo workspace đầu tiên"}</h1>
        <p className="text-sm text-muted-foreground">{hasOrganizations ? "Chọn organization bạn muốn làm việc. Bạn có thể tạo thêm workspace trong menu Organization của Dashboard." : "Tạo organization để bắt đầu quản lý hỗ trợ khách hàng."}</p>
      </div>

      {hasOrganizations && <div className="space-y-2" role="list" aria-label="Danh sách Organization">
        {organizations?.map((org) => (
          <button
            key={org.id}
            type="button"
            disabled={busy}
            onClick={() => void selectOrganization(org.id)}
            className="group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">{org.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{org.name}</span>
            <Check className="size-4 text-muted-foreground group-hover:text-primary" />
          </button>
        ))}
      </div>}

      {!hasOrganizations && <form onSubmit={createOrganization} className="space-y-4">

        <input
          required
          placeholder="Tên Organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-ring"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? <><Loader2 className="size-4 animate-spin" /> Đang xử lý...</> : <><Plus className="size-4" /> Tạo Organization</>}
        </button>
      </form>}
    </div>
  );
};
