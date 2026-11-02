"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { Monitor, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export interface OfficeShellProps {
  /** Ref gắn vào DOM mount của Three.js. DOM này luôn được giữ ổn định. */
  mountRef: Ref<HTMLDivElement>;
  ready: boolean;
  sceneError: string | null;
  /** Workstation Sidebar (Task 09.1B). */
  sidebar: ReactNode;
  /** Nội dung chi tiết bàn. Truyền null khi chưa chọn bàn. */
  details: ReactNode;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  className?: string;
}

export function OfficeShell({
  mountRef,
  ready,
  sceneError,
  sidebar,
  details,
  onZoomIn,
  onZoomOut,
  onResetView,
  className = "",
}: OfficeShellProps) {
  const detailsRef = useRef<HTMLElement>(null);
  const hasDetails = Boolean(details);

  // Tablet/mobile: panel chi tiết nằm dưới canvas, nên cuộn nhẹ tới panel
  // khi người dùng vừa chọn bàn. Desktop (>=1280px) panel luôn hiển thị
  // ở cột bên phải nên không cần cuộn.
  useEffect(() => {
    if (!hasDetails) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches
    ) {
      return;
    }

    detailsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [hasDetails]);

  return (
    <div
      className={`relative flex w-full min-w-0 flex-1 flex-col gap-3 xl:min-h-[560px] xl:flex-row ${className}`}
    >
      {/* VÙNG CANVAS 3D (luôn là phần tử con đầu tiên, không bao giờ unmount) */}
      <div className="relative h-[55dvh] min-h-[340px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted md:h-[64dvh] md:min-h-[520px] xl:h-auto xl:min-h-[560px] xl:min-w-0 xl:flex-1 xl:shrink">
        <div
          ref={mountRef}
          className="absolute inset-0 touch-none"
        />

        {!ready && !sceneError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center text-sm text-muted-foreground">
            Đang dựng văn phòng 3D...
          </div>
        )}

        {sceneError && (
          <div className="absolute inset-0 z-10 grid place-items-center p-4">
            <p
              role="alert"
              className="max-w-sm rounded-xl border border-destructive/40 bg-card px-4 py-3 text-center text-sm text-destructive shadow-md"
            >
              {sceneError}
            </p>
          </div>
        )}

        {/* CAMERA CONTROLS: nằm trong canvas, góc dưới bên phải */}
        <div className="absolute bottom-3 right-3 z-10 flex gap-1 rounded-xl border border-border/60 bg-card/90 p-1 shadow-md backdrop-blur-md md:bottom-4 md:right-4">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 md:size-9"
            aria-label="Thu nhỏ"
            disabled={!ready}
            onClick={onZoomOut}
          >
            <ZoomOut className="size-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 md:size-9"
            aria-label="Phóng to"
            disabled={!ready}
            onClick={onZoomIn}
          >
            <ZoomIn className="size-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10 md:size-9"
            aria-label="Đặt lại góc nhìn"
            disabled={!ready}
            onClick={onResetView}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      {/* WORKSTATION SIDEBAR
          - Mobile (<768px): nằm dưới canvas, rộng full, có thể thu gọn.
          - Tablet/Desktop (>=768px): phủ nhẹ góc trái trên của canvas,
            có thể thu gọn để trả lại diện tích cho cảnh 3D. */}
      <div className="order-2 md:absolute md:left-4 md:top-4 md:z-10 [&>aside]:max-h-72 [&>aside]:w-full md:[&>aside]:max-h-[380px] md:[&>aside]:w-[236px]">
        {sidebar}
      </div>

      {/* DESK DETAILS PANEL
          - Mobile/Tablet (<1280px): panel riêng nằm dưới canvas, chỉ hiện
            khi đã chọn bàn.
          - Desktop (>=1280px): cột cố định bên phải, luôn có mặt để kích
            thước canvas không đổi khi chọn bàn. */}
      <section
        ref={detailsRef}
        aria-label="Chi tiết bàn làm việc"
        className={`order-1 min-w-0 scroll-mt-3 xl:relative xl:w-[320px] xl:shrink-0 2xl:w-[360px] ${
          hasDetails ? "" : "hidden xl:block"
        }`}
      >
        <div className="relative max-h-none overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm xl:absolute xl:inset-0 xl:max-h-full">
          {details ?? (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Monitor className="size-5" />
              </span>

              <div>
                <p className="text-sm font-semibold">
                  Chưa chọn bàn
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Chọn một bàn trong danh sách hoặc trên cảnh 3D
                  để xem chi tiết.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}