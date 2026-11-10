"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@workspace/ui/components/sidebar";

const TITLES: Record<string, string> = {
  "/": "Tổng quan",
  "/conversations": "Hội thoại",
  "/contacts": "Khách hàng",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/tasks": "Công việc",
  "/files": "Knowledge Base",
  "/integrations": "Kênh kết nối",
};

export const DashboardTopbar = () => {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Workspace";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6">
      <SidebarTrigger className="md:hidden" aria-label="Mở điều hướng" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
      </div>
    </header>
  );
};
