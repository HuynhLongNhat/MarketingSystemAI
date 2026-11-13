import { TasksView } from "@/modules/tasks/tasks-view";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TasksView initialTaskId={id} />;
}
