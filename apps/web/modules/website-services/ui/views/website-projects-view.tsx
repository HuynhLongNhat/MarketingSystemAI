"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CirclePlus, Globe2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { websiteServicesApi, type WebsiteProject } from "@/lib/website-services-api";
import { useUiLanguage } from "@/lib/ui-language";
import { TemplatePreview } from "../components/template-preview";

export function WebsiteProjectsView() {
  const { language } = useUiLanguage();
  const vi = language === "vi";
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setProjects(await websiteServicesApi.listProjects()); }
    catch (error) { toast.error(vi ? "Không thể tải Website Services." : "Unable to load Website Services.", { description: error instanceof Error ? error.message : undefined }); }
    finally { setLoading(false); }
  }, [vi]);

  useEffect(() => { void load(); }, [load]);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Marketing / Website Services</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{vi ? "Website Services" : "Website Services"}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{vi ? "Tạo landing page từ template nguyên bản, xem trước và chuẩn bị nội dung cho thương hiệu của bạn." : "Create original template-based landing pages, preview them, and prepare content for your brand."}</p></div><div className="flex gap-2"><Button variant="outline" disabled={refreshing} onClick={() => void refresh()}><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />{vi ? "Làm mới" : "Refresh"}</Button><Link href="/marketing/websites/new"><Button><CirclePlus className="size-4" />{vi ? "Tạo website" : "Create website"}</Button></Link></div></header>
    {loading ? <div className="flex min-h-72 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" />{vi ? "Đang tải projects..." : "Loading projects..."}</div> : projects.length ? <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => project.templateId && <Link key={project.id} href={`/marketing/websites/${project.id}`} className="group"><Card className="h-full overflow-hidden transition-colors group-hover:border-primary/50"><TemplatePreview templateId={project.templateId} project={project} compact /><CardHeader><CardTitle className="truncate">{project.name}</CardTitle><p className="text-xs text-muted-foreground">{vi ? "Bản nháp" : "Draft"} · {new Intl.DateTimeFormat(vi ? "vi-VN" : "en-US", { dateStyle: "medium" }).format(new Date(project.updatedAt))}</p></CardHeader><CardContent><p className="line-clamp-2 text-sm text-muted-foreground">{project.description || (vi ? "Chưa có mô tả." : "No description yet.")}</p></CardContent></Card></Link>)}</section> : <Card className="border-dashed"><CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center"><div className="rounded-full bg-primary/10 p-4 text-primary"><Globe2 className="size-8" /></div><h2 className="mt-5 text-lg font-semibold">{vi ? "Tạo website đầu tiên" : "Create your first website"}</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">{vi ? "Chọn một trong ba template có bản quyền nguyên bản và xem trước website trước khi tùy chỉnh." : "Choose one of three original templates and preview your website before customization."}</p><Link href="/marketing/websites/new" className="mt-6"><Button><CirclePlus className="size-4" />{vi ? "Chọn template" : "Choose a template"}</Button></Link></CardContent></Card>}
  </div>;
}
