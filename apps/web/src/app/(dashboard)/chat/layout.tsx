import { ChatList } from "./chat-list";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-80 border-r">
        <ChatList />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
