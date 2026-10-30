
import { ConversationIdView } from "@/modules/dashboard/ui/views/conversation-id-view";

const Page = async ({
  params,
}: {
  params: Promise<{
    conversationId: string;
  }>;
}) => {
  const { conversationId } = await params;

  return (
    <ConversationIdView conversationId={conversationId} />
  );
};

export default Page;
