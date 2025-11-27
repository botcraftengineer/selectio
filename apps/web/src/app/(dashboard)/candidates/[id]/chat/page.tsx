import { SiteHeader } from "~/components/layout";
import { ChatClient } from "./chat-client";

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  return (
    <>
      <SiteHeader title="Чат с кандидатом" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <ChatClient responseId={id} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
