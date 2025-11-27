import { ChatView } from "./chat-view";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ responseId: string }>;
}) {
  const { responseId } = await params;

  return <ChatView conversationId={responseId} />;
}
