
"use client";

import { useEffect, useState } from "react";
import { UserRound, UserRoundCheck, UserRoundX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { authClient } from "@/lib/auth-client";
import { handoffApi, type OrganizationMember } from "@/lib/handoff-api";

interface HandoffControlsProps {
  conversationId: string;
  status: "unresolved" | "escalated" | "resolved";
  assignedToUserId: string | null;
  onUpdated: () => Promise<void>;
}

export function HandoffControls({
  conversationId,
  status,
  assignedToUserId,
  onUpdated,
}: HandoffControlsProps) {
  const { data: session } = authClient.useSession();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [canManageAssignments, setCanManageAssignments] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const loadMembers = async () => {
      try {
        const result = await handoffApi.listMembers();

        if (!active) return;

        setMembers(result);
        setCanManageAssignments(true);
      } catch {
        // MEMBER_READ is intentionally unavailable to regular members.
        // The backend still enforces ASSIGN permission independently.
        if (active) {
          setCanManageAssignments(false);
        }
      }
    };

    void loadMembers();

    return () => {
      active = false;
    };
  }, []);

  if (status !== "escalated") {
    return null;
  }

  const assignedMember = members.find(
    (member) => member.userId === assignedToUserId,
  );

  const isAssignedToMe =
    Boolean(session?.user.id) &&
    assignedToUserId === session?.user.id;

  const handleClaim = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await handoffApi.claim(conversationId);
      toast.success("Bạn đã nhận hội thoại.");
      await onUpdated();
    } catch (error) {
      console.error("Failed to claim conversation:", error);
      toast.error("Không thể nhận hội thoại. Có thể người khác đã nhận.");
      await onUpdated();
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await handoffApi.release(conversationId);
      toast.success("Đã trả hội thoại về hàng đợi.");
      await onUpdated();
    } catch (error) {
      console.error("Failed to release conversation:", error);
      toast.error("Không thể trả hội thoại. Hãy kiểm tra quyền của bạn.");
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (!userId || busy) return;

    setBusy(true);

    try {
      await handoffApi.assign(conversationId, userId);
      toast.success("Đã phân công hội thoại.");
      await onUpdated();
    } catch (error) {
      console.error("Failed to assign conversation:", error);
      toast.error("Không thể phân công hội thoại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b bg-background px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {assignedToUserId ? (
            <UserRoundCheck className="size-4 shrink-0 text-blue-600" />
          ) : (
            <UserRound className="size-4 shrink-0 text-amber-600" />
          )}

          <div className="min-w-0">
            <p className="text-sm font-medium">
              {assignedToUserId
                ? "Đang được nhân viên tiếp quản"
                : "Đang chờ nhân viên tiếp quản"}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              {assignedMember
                ? `${assignedMember.name} · ${assignedMember.email}`
                : assignedToUserId
                  ? "Đã có người được phân công"
                  : "Chưa có nhân viên nhận hội thoại"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!assignedToUserId && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void handleClaim()}
            >
              <UserRoundCheck className="mr-2 size-4" />
              Nhận hội thoại
            </Button>
          )}

          {canManageAssignments && (
            <>
              <select
                aria-label="Phân công nhân viên"
                className="h-9 max-w-52 rounded-md border bg-background px-2 text-sm"
                value={assignedToUserId ?? ""}
                disabled={busy}
                onChange={(event) => {
                  void handleAssign(event.target.value);
                }}
              >
                <option value="" disabled>
                  Chọn nhân viên
                </option>

                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>

              {assignedToUserId && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleRelease()}
                >
                  <UserRoundX className="mr-2 size-4" />
                  Trả về hàng đợi
                </Button>
              )}
            </>
          )}

          {isAssignedToMe && !canManageAssignments && (
            <span className="text-xs text-muted-foreground">
              Bạn đang phụ trách hội thoại này
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
