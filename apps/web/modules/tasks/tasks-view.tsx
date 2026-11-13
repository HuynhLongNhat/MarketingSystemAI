"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Loader2, Plus, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { ApiError } from "@/lib/api-client";
import { tasksApi, type AiTask, type AiTaskDetail, type TaskStatus } from "@/lib/tasks-api";
import { workforceApi, type AiAgent } from "@/lib/workforce-api";

const labels: Record<TaskStatus, string> = { queued: "Đang chờ", running: "Đang xử lý", completed: "Hoàn tất", failed: "Thất bại", cancelled: "Đã hủy" };
const variants: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = { queued: "secondary", running: "default", completed: "outline", failed: "destructive", cancelled: "secondary" };
const pending = new Set<TaskStatus>(["queued", "running"]);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

function errorMessage(error: unknown) { return error instanceof ApiError ? error.message : "Không thể kết nối API. Vui lòng thử lại."; }

export function TasksView({ initialTaskId }: { initialTaskId?: string }) {
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [selected, setSelected] = useState<AiTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [agentFilter, setAgentFilter] = useState("");

  const load = useCallback(async (id?: string) => {
    try {
      const list = await tasksApi.list(agentFilter || undefined);
      setTasks(list); setError(null);
      const chosen = id ?? selected?.id ?? initialTaskId;
      if (chosen) setSelected(await tasksApi.get(chosen));
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setLoading(false); }
  }, [agentFilter, initialTaskId, selected?.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void workforceApi.listAgents().then(setAgents).catch(() => undefined); }, []);
  useEffect(() => {
    if (!tasks.some((task) => pending.has(task.status)) && !(selected && pending.has(selected.status))) return;
    const timer = window.setInterval(() => void load(), 4_000);
    return () => window.clearInterval(timer);
  }, [tasks, selected, load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) { toast.error("Nhập tiêu đề và yêu cầu nghiên cứu."); return; }
    setCreating(true);
    try { const task = await tasksApi.create({ title, description }); setTitle(""); setDescription(""); toast.success("Đã tạo task và đưa vào hàng đợi."); await load(task.id); }
    catch (cause) { toast.error(errorMessage(cause)); }
    finally { setCreating(false); }
  }
  async function cancel() {
    if (!selected) return;
    try { await tasksApi.cancel(selected.id); toast.success("Đã hủy task."); await load(selected.id); }
    catch (cause) { toast.error(errorMessage(cause)); }
  }
  async function choose(id: string) { setLoading(true); await load(id); }

  return <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">AI Workspace</p><h1 className="text-2xl font-semibold tracking-tight">Nghiên cứu thị trường</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Giao nhiệm vụ, theo dõi AI xử lý và lưu báo cáo theo Organization.</p></div><Button variant="outline" onClick={() => { setLoading(true); void load(); }} disabled={loading}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />Làm mới</Button></header>
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(380px,1.2fr)]">
      <div className="space-y-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-4" />Tạo nhiệm vụ</CardTitle><CardDescription>AI dùng model “General” của Organization. Báo cáo không dùng Web Search.</CardDescription></CardHeader><CardContent><form className="space-y-3" onSubmit={create}><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ví dụ: Thị trường phần mềm quản lý spa" aria-label="Tiêu đề task" /><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={12000} rows={6} placeholder="Mô tả ngành, khu vực, sản phẩm, khách hàng hoặc câu hỏi cần phân tích…" aria-label="Yêu cầu nghiên cứu" /><Button type="submit" className="w-full" disabled={creating}>{creating && <Loader2 className="size-4 animate-spin" />}Tạo báo cáo</Button></form></CardContent></Card>
        <Card><CardHeader><CardTitle>Danh sách task</CardTitle><CardDescription>{tasks.length ? `${tasks.length} task gần đây` : "Chưa có task nào."}</CardDescription></CardHeader><CardContent className="space-y-2"><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" aria-label="Lọc theo Agent" value={agentFilter} onChange={(event) => { setAgentFilter(event.target.value); setSelected(null); setLoading(true); }}><option value="">Tất cả Agent và General Model</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select>{loading && !tasks.length ? <p className="text-sm text-muted-foreground">Đang tải…</p> : tasks.length === 0 ? <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground"><ClipboardList className="mx-auto mb-2 size-5" />Chưa có task nào phù hợp.</div> : tasks.map((task) => <button key={task.id} type="button" onClick={() => void choose(task.id)} className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/50 ${selected?.id === task.id ? "border-primary" : ""}`}><div className="flex gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span><Badge variant={variants[task.status]}>{labels[task.status]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{task.agentName ? `Agent: ${task.agentName}` : "General Model"} · {date(task.updatedAt)}</p></button>)}</CardContent></Card></div>
      <Card className="min-h-[420px]"><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>{selected?.title ?? "Chi tiết báo cáo"}</CardTitle>{selected && <CardDescription>Tạo lúc {date(selected.createdAt)} · {selected.agentName ? `Agent: ${selected.agentName} (${selected.agentRole})` : "General Model"}</CardDescription>}</div>{selected && <Badge variant={variants[selected.status]}>{labels[selected.status]}</Badge>}</div></CardHeader><CardContent>{error ? <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}<Button variant="outline" className="ml-3" onClick={() => { setLoading(true); void load(); }}>Thử lại</Button></div> : !selected ? <div className="flex min-h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground"><ClipboardList className="mb-3 size-8" />Chọn một task để xem tiến độ và báo cáo đã lưu.</div> : <div className="space-y-6">{pending.has(selected.status) && <div className="rounded-lg border bg-muted/40 p-4 text-sm"><Loader2 className="mr-2 inline size-4 animate-spin" />Worker đang xử lý. Trang tự cập nhật mỗi 4 giây.</div>}{selected.error && <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{selected.error}</div>}{selected.result && <article className="whitespace-pre-wrap text-sm leading-7">{selected.result}</article>}{!selected.result && !selected.error && <p className="text-sm text-muted-foreground">Chưa có kết quả.</p>}<section className="border-t pt-4"><h2 className="text-sm font-semibold">Lịch sử xử lý</h2><ol className="mt-3 space-y-2">{selected.events.map((event) => <li key={event.id} className="text-sm"><span className="font-medium">{event.message}</span><span className="ml-2 text-xs text-muted-foreground">{date(event.createdAt)}</span></li>)}</ol></section>{pending.has(selected.status) && <Button type="button" variant="outline" onClick={() => void cancel()}><XCircle className="size-4" />Hủy task</Button>}<Link className="text-sm text-primary underline-offset-4 hover:underline" href={`/tasks/${selected.id}`}>Mở trang chi tiết</Link></div>}</CardContent></Card>
    </div></div>;
}
