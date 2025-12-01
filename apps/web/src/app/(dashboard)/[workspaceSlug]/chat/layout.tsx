import { ChatList } from "./chat-list";

export default function ChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string };
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-80 border-r h-full overflow-hidden">
        <ChatList workspaceSlug={params.workspaceSlug} />
      </div>
      <div className="flex-1 h-full overflow-hidden">{children}</div>
    </div>
  );
}
