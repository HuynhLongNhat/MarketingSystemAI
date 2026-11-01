
import { FilesView } from "@/modules/files/ui/views/files-view";
import { KnowledgeRetrievalPreview } from "@/modules/files/ui/components/knowledge-retrieval-preview";

export default function Page() {
  return (
    <div className="min-w-0 bg-muted">
      <section className="px-4 pt-6 md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <KnowledgeRetrievalPreview />
        </div>
      </section>

      <FilesView />
    </div>
  );
}
