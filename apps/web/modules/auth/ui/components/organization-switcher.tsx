
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export function OrganizationSwitcher() {
  const router = useRouter();
  const { data: activeOrganization } =
    authClient.useActiveOrganization();
  const { data: organizations, isPending } =
    authClient.useListOrganizations();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function switchOrganization(organizationId: string) {
    if (busy || organizationId === activeOrganization?.id) return;

    setBusy(true);
    setError("");

    try {
      const result = await authClient.organization.setActive({
        organizationId,
      });

      if (result.error) {
        setError(result.error.message ?? "Không thể chuyển Organization.");
        return;
      }

      router.refresh();
    } catch {
      setError("Không thể kết nối đến máy chủ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-2 p-2">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {activeOrganization?.name ?? "Chọn Organization"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0" />
      </div>

      <select
        aria-label="Chuyển Organization"
        value={activeOrganization?.id ?? ""}
        disabled={busy || isPending}
        onChange={(event) => {
          if (event.target.value) {
            void switchOrganization(event.target.value);
          }
        }}
        className="w-full rounded-md border bg-background p-2 text-xs"
      >
        <option value="">Chọn Organization</option>
        {organizations?.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => router.push("/org-selection")}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="size-3" />
        Quản lý Organization
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
