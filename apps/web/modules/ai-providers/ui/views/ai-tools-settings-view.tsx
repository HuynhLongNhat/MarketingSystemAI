"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { AiProvidersView } from "./ai-providers-view";
import { SearchProvidersView } from "@/modules/search-providers/ui/views/search-providers-view";

type SettingsTab = "models" | "search";

export function AiToolsSettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: SettingsTab = searchParams.get("tab") === "search" ? "search" : "models";

  function selectTab(value: string) {
    router.replace(value === "search" ? "/settings/ai-providers?tab=search" : "/settings/ai-providers");
  }

  return (
    <div className="space-y-6">
      <header className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <p className="text-sm font-medium text-muted-foreground">Quản trị</p>
        <h1 className="text-2xl font-semibold tracking-tight">Cấu hình AI & Công cụ</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Kết nối mô hình và công cụ để đội ngũ AI có thể làm việc. Khóa API luôn được lưu mã hóa.
        </p>
      </header>
      <Tabs value={tab} onValueChange={selectTab} className="gap-0">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TabsList aria-label="Cấu hình AI và công cụ">
            <TabsTrigger value="models">Mô hình AI</TabsTrigger>
            <TabsTrigger value="search">Công cụ tìm kiếm</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="models" forceMount className={tab === "models" ? "block" : "hidden"}>
          <AiProvidersView embedded />
        </TabsContent>
        <TabsContent value="search" forceMount className={tab === "search" ? "block" : "hidden"}>
          <SearchProvidersView embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
