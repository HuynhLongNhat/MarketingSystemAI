"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, ExternalLink, Loader2, Plus, RefreshCw, Wrench, XCircle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { ApiError } from "@/lib/api-client";
import { tasksApi, type AiTask, type AiTaskDetail, type TaskStatus } from "@/lib/tasks-api";
import { workforceApi, type AiAgent } from "@/lib/workforce-api";
import { MarkdownReport } from "./markdown-report";

const labels: Record<TaskStatus, string> = { queued: "Đang chờ", running: "Đang thực hiện", completed: "Hoàn tất", failed: "Cần xử lý", cancelled: "Đã hủy" };
const variants: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = { queued: "secondary", running: "default", completed: "outline", failed: "destructive", cancelled: "secondary" };
const pending = new Set<TaskStatus>(["queued", "running"]);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "Không thể kết nối hệ thống. Vui lòng thử lại.";
  if (error.message.includes("AGENT_CAPABILITY_REQUIRED")) return "Nhân viên này chưa được cấp công cụ tìm kiếm Internet. Hãy cập nhật công cụ làm việc của nhân viên.";
  if (error.message.includes("SEARCH_PROVIDER_NOT_CONFIGURED")) return "Công ty chưa kết nối công cụ tìm kiếm Internet. Hãy cấu hình Tavily trước khi chạy nhiệm vụ cần nghiên cứu.";
  if (error.message.includes("SEARCH_PROVIDER_DISABLED")) return "Công cụ tìm kiếm Internet hiện đang tắt. Hãy bật lại trong phần cấu hình AI & Công cụ.";
  return error.message;
}

function ConfigurationHint({ message }: { message: string }) {
  const needsSearchConfiguration = /tìm kiếm Internet|Tavily|công cụ tìm kiếm/i.test(message);
  return <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-foreground">
    <Wrench className="size-4 shrink-0" /><span className="flex-1">{message}</span>
    {needsSearchConfiguration && <Button size="sm" variant="outline" asChild><Link href="/settings/ai-providers?tab=search">Mở cấu hình</Link></Button>}
  </div>;
}

export function TasksView({ initialTaskId }: { initialTaskId?: string }) {
  const searchParams = useSearchParams();
  const requestedAgentId = searchParams.get("agentId") ?? "";
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [selected, setSelected] = useState<AiTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [agentFilter, setAgentFilter] = useState("");
  const [taskAgentId, setTaskAgentId] = useState("");
  const load = useCallback(async (id?: string) => { try { const list = await tasksApi.list(agentFilter || undefined); setTasks(list); setError(null); const chosen = id ?? selected?.id ?? initialTaskId; if (chosen) setSelected(await tasksApi.get(chosen)); } catch (cause) { setError(errorMessage(cause)); } finally { setLoading(false); } }, [agentFilter, initialTaskId, selected?.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void workforceApi.listAgents().then(setAgents).catch(() => undefined); }, []);
  useEffect(() => { if (requestedAgentId) setTaskAgentId(requestedAgentId); }, [requestedAgentId]);
  useEffect(() => { if (!tasks.some((task) => pending.has(task.status)) && !(selected && pending.has(selected.status))) return; const timer = window.setInterval(() => void load(), 4_000); return () => window.clearInterval(timer); }, [tasks, selected, load]);
  async function create(event: React.FormEvent) { event.preventDefault(); if (!title.trim() || !description.trim()) { toast.error("Hãy nhập tiêu đề và yêu cầu công việc."); return; } setCreating(true); try { const task = await tasksApi.create({ title, description, ...(taskAgentId ? { agentId: taskAgentId } : {}) }); setTitle(""); setDescription(""); setTaskAgentId(""); toast.success("Đã giao việc cho đội ngũ AI."); await load(task.id); } catch (cause) { toast.error(errorMessage(cause)); } finally { setCreating(false); } }
  async function cancel() { if (!selected) return; try { await tasksApi.cancel(selected.id); toast.success("Đã hủy công việc."); await load(selected.id); } catch (cause) { toast.error(errorMessage(cause)); } }
  async function choose(id: string) { setLoading(true); await load(id); }
  return <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Không gian làm việc</p><h1 className="text-2xl font-semibold tracking-tight">Công việc</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Giao việc cho nhân viên AI, theo dõi tiến độ và xem kết quả đã lưu của công ty.</p></div><Button variant="outline" onClick={() => { setLoading(true); void load(); }} disabled={loading}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />Làm mới</Button></header>
    <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(420px,1.2fr)]"><div className="space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-4" />Giao việc mới</CardTitle><CardDescription>Chọn một nhân viên AI và mô tả mục tiêu bằng ngôn ngữ tự nhiên. Nhân viên tự quyết định khi nào cần tham khảo Internet.</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={create}><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="Ví dụ: Chuẩn bị lời chào khách hàng mới" aria-label="Tiêu đề công việc" /><Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={12000} rows={6} placeholder="Bạn muốn nhân viên thực hiện điều gì? Bổ sung bối cảnh, khách hàng hoặc kết quả mong muốn…" aria-label="Yêu cầu công việc" /><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" aria-label="Nhân viên AI thực hiện" value={taskAgentId} onChange={(event) => setTaskAgentId(event.target.value)}><option value="">Đội ngũ AI chung</option>{agents.filter((agent) => agent.status === "active").map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>)}</select><p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">Bạn không cần chọn công cụ kỹ thuật. Khi nhiệm vụ cần thông tin công khai mới, nhân viên đủ điều kiện sẽ tự tìm nguồn phù hợp.</p><Button type="submit" className="w-full" disabled={creating}>{creating && <Loader2 className="size-4 animate-spin" />}Giao việc</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>Công việc gần đây</CardTitle><CardDescription>{tasks.length ? `${tasks.length} công việc gần đây` : "Chưa có công việc nào."}</CardDescription></CardHeader><CardContent className="space-y-2"><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" aria-label="Lọc theo nhân viên AI" value={agentFilter} onChange={(event) => { setAgentFilter(event.target.value); setSelected(null); setLoading(true); }}><option value="">Tất cả nhân viên</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>{loading && !tasks.length ? <p className="text-sm text-muted-foreground">Đang tải…</p> : tasks.length === 0 ? <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground"><ClipboardList className="mx-auto mb-2 size-5" />Chưa có công việc nào phù hợp.</div> : tasks.map((task) => <button key={task.id} type="button" onClick={() => void choose(task.id)} className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/50 ${selected?.id === task.id ? "border-primary" : ""}`}><div className="flex gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span><Badge variant={variants[task.status]}>{labels[task.status]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{task.agentName ? task.agentName : "Đội ngũ AI chung"} · {date(task.updatedAt)}</p></button>)}</CardContent></Card></div>
      <Card className="min-h-[420px]"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>{selected?.title ?? "Chi tiết công việc"}</CardTitle>{selected && <CardDescription>Tạo lúc {date(selected.createdAt)} · {selected.agentName ? `${selected.agentName} · ${selected.agentRole}` : "Đội ngũ AI chung"}</CardDescription>}</div>{selected && <Badge variant={variants[selected.status]}>{labels[selected.status]}</Badge>}</div></CardHeader><CardContent>{error ? <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}<Button variant="outline" className="ml-3" onClick={() => { setLoading(true); void load(); }}>Thử lại</Button></div> : !selected ? <div className="flex min-h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground"><ClipboardList className="mb-3 size-8" />Chọn một công việc để xem tiến độ và kết quả.</div> : <div className="space-y-6">{pending.has(selected.status) && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><Loader2 className="mr-2 inline size-4 animate-spin" />Nhân viên AI đang thực hiện. Trang tự cập nhật mỗi 4 giây.</div>}{selected.error && <ConfigurationHint message={errorMessage(new ApiError(400, selected.error))} />}{selected.result && <article><MarkdownReport content={selected.result} sources={selected.researchSources} /></article>}{!selected.result && !selected.error && <p className="text-sm text-muted-foreground">Chưa có kết quả.</p>}{selected.researchSources.length > 0 && <section className="border-t pt-4"><h2 className="text-sm font-semibold">Nguồn tham khảo</h2>{selected.researchRuns[0]?.query && <p className="mt-1 text-xs text-muted-foreground">Nghiên cứu: {selected.researchRuns[0].query}</p>}<ol className="mt-3 space-y-3">{selected.researchSources.map((source) => <li key={source.id} className="rounded-md border p-3 text-sm"><a href={source.displayUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">[{source.citationNumber ?? source.ordinal}] {source.title}<ExternalLink className="size-3" /></a><p className="mt-1 break-all text-xs text-muted-foreground">{source.domain}</p>{source.excerpt && <p className="mt-2 text-muted-foreground">{source.excerpt}</p>}</li>)}</ol></section>}<section className="border-t pt-4"><h2 className="text-sm font-semibold">Lịch sử thực hiện</h2><ol className="mt-3 space-y-2">{selected.events.map((event) => <li key={event.id} className="text-sm"><span className="font-medium">{event.message}</span><span className="ml-2 text-xs text-muted-foreground">{date(event.createdAt)}</span></li>)}</ol></section>{pending.has(selected.status) && <Button type="button" variant="outline" onClick={() => void cancel()}><XCircle className="size-4" />Hủy công việc</Button>}<Link className="text-sm text-primary underline-offset-4 hover:underline" href={`/tasks/${selected.id}`}>Mở trang chi tiết</Link></div>}</CardContent></Card></div>
  </div>;
}
