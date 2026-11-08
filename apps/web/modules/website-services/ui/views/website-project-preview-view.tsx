"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Monitor, Smartphone } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { websiteServicesApi, type WebsiteProject } from "@/lib/website-services-api";
import { TemplatePreview } from "../components/template-preview";

export function WebsiteProjectPreviewView({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<WebsiteProject | null>(null); const [mobile, setMobile] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setProject(await websiteServicesApi.getProject(projectId)); } catch (value) { setError(value instanceof Error ? value.message : "Unable to load project"); } }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  if (error) return <div className="p-8"><Link href="/marketing/websites"><Button variant="outline"><ArrowLeft className="size-4" />Quay lại</Button></Link><p className="mt-5 text-sm text-destructive">{error}</p></div>;
  if (!project || !project.templateId) return <div className="flex min-h-72 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" />Đang tải preview...</div>;
  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/marketing/websites"><Button variant="ghost" size="sm"><ArrowLeft className="size-4" />Website projects</Button></Link><h1 className="mt-3 text-3xl font-semibold tracking-tight">{project.name}</h1></div><div className="flex gap-2"><Button variant={mobile ? "outline" : "default"} size="sm" onClick={() => setMobile(false)}><Monitor className="size-4" />Desktop</Button><Button variant={mobile ? "default" : "outline"} size="sm" onClick={() => setMobile(true)}><Smartphone className="size-4" />Mobile</Button></div></div><Card><CardHeader><CardTitle>Template preview</CardTitle><p className="text-sm text-muted-foreground">Bản preview được render bằng React components cố định; không thực thi HTML, JavaScript hay code từ người dùng.</p></CardHeader><CardContent><div className={`mx-auto overflow-hidden rounded-2xl border bg-background p-3 transition-all ${mobile ? "max-w-sm" : "max-w-6xl"}`}><TemplatePreview templateId={project.templateId} project={project} /></div></CardContent></Card></div>;
}
