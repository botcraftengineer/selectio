import { ChatView } from "./chat-view";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; responseId: string }>;
}) {
  const { responseId } = await params;

  return <ChatView conversationId={responseId} />;
}
