"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const result = await authClient.organization.create({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
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

  if (sessionPending || organizationsPending) {
    return <p>Đang tải...</p>;
  }

  if (!session) {
    return (
      <button type="button" onClick={() => router.replace("/sign-in")}>
        Vui lòng đăng nhập
      </button>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-6 rounded-xl border bg-white p-6 text-gray-900 shadow-sm">
      <h1 className="text-2xl font-semibold">Chọn Organization</h1>

      <div className="space-y-2">
        {organizations?.map((org) => (
          <button
            key={org.id}
            type="button"
            disabled={busy}
            onClick={() => void selectOrganization(org.id)}
            className="w-full rounded-md border p-3 text-left hover:bg-gray-50 disabled:opacity-50"
          >
            {org.name}
          </button>
        ))}
      </div>

      <form onSubmit={createOrganization} className="space-y-3">
        <h2 className="font-medium">Tạo Organization mới</h2>

        <input
          required
          placeholder="Tên Organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border p-2"
        />

        <input
          required
          pattern="[a-z0-9-]+"
          placeholder="Slug (ví dụ: my-company)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-md border p-2"
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          {busy ? "Đang xử lý..." : "Tạo Organization"}
        </button>
      </form>
    </div>
  );
};
