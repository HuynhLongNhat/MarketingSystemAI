"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailPlus, RefreshCw, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

type Member = {
  id: string;
  userId: string;
  role: string;
  user: {
    name: string;
    email: string;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: string | null;
  status: string;
};

export function MembersView() {
  const router = useRouter();
  const requestVersion = useRef(0);
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const { data: organization, isPending: orgPending } =
    authClient.useActiveOrganization();

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const currentMember = members.find(
    (member) => member.userId === session?.user.id,
  );

  const currentRole = currentMember?.role;
  const canManage = currentRole === "owner" || currentRole === "admin";

  const loadData = useCallback(async () => {
    const version = ++requestVersion.current;
    const organizationId = organization?.id;

    setMembers([]);
    setInvitations([]);

    if (!organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [membersResult, invitationsResult] = await Promise.all([
        authClient.organization.listMembers({
          query: { organizationId },
        }),
        authClient.organization.listInvitations({
          query: { organizationId },
        }),
      ]);

      // Ignore responses from an older organization/request.
      if (version !== requestVersion.current) {
        return;
      }

      if (membersResult.error) {
        throw new Error(
          membersResult.error.message ?? "Không thể tải thành viên",
        );
      }

      if (invitationsResult.error) {
        throw new Error(
          invitationsResult.error.message ?? "Không thể tải lời mời",
        );
      }

      setMembers((membersResult.data?.members ?? []) as Member[]);

      setInvitations((invitationsResult.data ?? []) as Invitation[]);
    } catch (error) {
      if (version === requestVersion.current) {
        toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
      }
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [organization?.id]);

  useEffect(() => {
  return () => {
    requestVersion.current += 1;
  };
  }, [organization?.id]);
  
  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage || !organization?.id || busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setBusy(true);

    try {
      const result = await authClient.organization.inviteMember({
        organizationId: organization.id,
        email: normalizedEmail,
        role: inviteRole,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Mời thất bại");
      }

      toast.success("Đã tạo lời mời");
      setEmail("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(memberId: string, role: "admin" | "member") {
    if (!canManage || !organization?.id || busy) return;

    setBusy(true);

    try {
      const result = await authClient.organization.updateMemberRole({
        organizationId: organization.id,
        memberId,
        role,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Đổi role thất bại");
      }

      toast.success("Đã cập nhật vai trò");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!canManage || !organization?.id || busy) return;

    if (!window.confirm("Bạn muốn xóa thành viên này?")) {
      return;
    }

    setBusy(true);

    try {
      const result = await authClient.organization.removeMember({
        organizationId: organization.id,
        memberIdOrEmail: memberId,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Xóa thất bại");
      }

      toast.success("Đã xóa thành viên");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    if (!canManage || busy) return;

    setBusy(true);

    try {
      const result = await authClient.organization.cancelInvitation({
        invitationId,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Hủy lời mời thất bại");
      }

      toast.success("Đã hủy lời mời");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  if (sessionPending || orgPending || loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8">
        <p>Vui lòng đăng nhập.</p>
        <button
          onClick={() => router.push("/sign-in")}
          className="mt-3 underline"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-8">
        <p>Chưa chọn Organization.</p>
        <button
          onClick={() => router.push("/org-selection")}
          className="mt-3 underline"
        >
          Chọn Organization
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="size-6" />
            Organization Members
          </h1>
          <p className="text-sm text-muted-foreground">{organization.name}</p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={busy}
          className="rounded-md border p-2 hover:bg-accent"
          aria-label="Tải lại"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {canManage && (
        <form
          onSubmit={inviteMember}
          className="space-y-4 rounded-lg border p-5"
        >
          <h2 className="flex items-center gap-2 font-semibold">
            <MailPlus className="size-5" />
            Invite Member
          </h2>

          <div className="flex flex-wrap gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@example.com"
              className="min-w-0 flex-1 rounded-md border bg-background p-2"
            />

            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as "admin" | "member")
              }
              className="rounded-md border bg-background p-2"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Members ({members.length})</h2>

        <div className="divide-y rounded-lg border">
          {members.map((member) => {
            const isSelf = member.userId === session.user.id;
            const isOwner = member.role === "owner";

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {member.user.name}
                    {isSelf ? " (You)" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {canManage && !isOwner && !isSelf ? (
                    <select
                      value={member.role}
                      disabled={busy}
                      onChange={(event) =>
                        void changeRole(
                          member.id,
                          event.target.value as "admin" | "member",
                        )
                      }
                      className="rounded-md border bg-background p-2 text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-sm capitalize">{member.role}</span>
                  )}

                  {canManage && !isOwner && !isSelf && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeMember(member.id)}
                      aria-label={`Xóa ${member.user.name}`}
                      className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {canManage && (
        <section className="space-y-3">
          <h2 className="font-semibold">Pending Invitations</h2>

          <div className="divide-y rounded-lg border">
            {invitations
              .filter((invitation) => invitation.status === "pending")
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.role}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancelInvitation(invitation.id)}
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
