"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Monitor } from "lucide-react";

import type { OfficeDeskLayout } from "@/modules/office/config/office-layout";

export interface WorkstationOccupant {
  agent: {
    name: string;
    role?: string | null;
  };
}

export interface OfficeWorkstationListProps {
  desks: readonly OfficeDeskLayout[];
  assignmentByDesk: ReadonlyMap<string, WorkstationOccupant>;
  selectedDeskId: string | null;
  getDeskLabel: (deskId: string) => string;
  onSelectDesk: (deskId: string) => void;
  disabled?: boolean;
  className?: string;
}

function agentInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function OfficeWorkstationList({
  desks,
  assignmentByDesk,
  selectedDeskId,
  getDeskLabel,
  onSelectDesk,
  disabled = false,
  className = "",
}: OfficeWorkstationListProps) {
  const [collapsed, setCollapsed] = useState(false);

  const { total, used, free, percent } = useMemo(() => {
    const totalDesks = desks.length;
    const usedDesks = desks.filter((desk) =>
      assignmentByDesk.has(desk.id),
    ).length;

    return {
      total: totalDesks,
      used: usedDesks,
      free: totalDesks - usedDesks,
      percent:
        totalDesks > 0
          ? Math.round((usedDesks / totalDesks) * 100)
          : 0,
    };
  }, [desks, assignmentByDesk]);

  if (collapsed) {
    return (
      <div className={className}>
        <button
          type="button"
          aria-expanded={false}
          aria-label="Mở rộng danh sách bàn làm việc"
          onClick={() => setCollapsed(false)}
          className="group flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-md backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-lg"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Monitor className="size-3.5" />
          </span>

          <span>Bàn làm việc</span>

          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {used}/{total}
          </span>

          <ChevronRight className="size-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Danh sách bàn làm việc"
      className={`flex max-h-[min(380px,calc(100%-2rem))] w-[210px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 text-foreground shadow-lg backdrop-blur-md md:w-[236px] ${className}`}
    >
      {/* Header */}
      <div className="border-b border-border/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Monitor className="size-4" />
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                Bàn làm việc
              </p>

              <p className="truncate text-[11px] text-muted-foreground">
                Chọn bàn để xem hoặc phân công
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-expanded
            aria-label="Thu gọn danh sách bàn làm việc"
            onClick={() => setCollapsed(true)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-primary/10 px-2 py-1.5">
            <p className="text-sm font-semibold tabular-nums text-primary">
              {used}
            </p>

            <p className="text-[10px] text-muted-foreground">
              Đã sử dụng
            </p>
          </div>

          <div className="rounded-lg bg-muted px-2 py-1.5">
            <p className="text-sm font-semibold tabular-nums">
              {free}
            </p>

            <p className="text-[10px] text-muted-foreground">
              Còn trống
            </p>
          </div>
        </div>

        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Tỷ lệ bàn đã sử dụng"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Desk list */}
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {desks.map((desk) => {
          const assignment = assignmentByDesk.get(desk.id);
          const occupied = Boolean(assignment);
          const active = selectedDeskId === desk.id;

          const stateClass = active
            ? "border-primary/50 bg-primary/10 shadow-sm"
            : occupied
              ? "border-transparent hover:border-border hover:bg-muted/70"
              : "border-dashed border-border/70 text-muted-foreground hover:border-primary/30 hover:bg-muted/50";

          return (
            <li key={desk.id}>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={active}
                title={
                  assignment
                    ? `${getDeskLabel(desk.id)} · ${assignment.agent.name}`
                    : `${getDeskLabel(desk.id)} · Bàn trống`
                }
                onClick={() => onSelectDesk(desk.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${stateClass}`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors duration-200 ${
                    occupied
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {assignment ? (
                    agentInitial(assignment.agent.name)
                  ) : (
                    <Monitor className="size-3.5" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {getDeskLabel(desk.id)}
                  </span>

                  <span className="block truncate text-[11px] text-muted-foreground">
                    {assignment
                      ? assignment.agent.name
                      : "Bàn trống"}
                  </span>
                </span>

                {active ? (
                  <Check className="size-4 shrink-0 text-primary" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 rounded-full ${
                      occupied
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Legend */}
      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Có Agent
        </span>

        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          Trống
        </span>

        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-primary" />
          Đang chọn
        </span>
      </div>
    </aside>
  );
}