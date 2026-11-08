import { WebsiteProjectPreviewView } from "@/modules/website-services/ui/views/website-project-preview-view";
export default async function Page({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <WebsiteProjectPreviewView projectId={projectId} />; }
