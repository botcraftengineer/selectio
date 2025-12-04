"use client";

import { usePathname } from "next/navigation";
import { ChatList } from "./chat-list";

export default async function ChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const pathname = usePathname();
  const isChatSelected = pathname.split("/").length > 4;
  const { workspaceSlug } = await params;
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div
        className={`${
          isChatSelected ? "hidden md:block" : "block"
        } w-full md:w-80 border-r h-full overflow-hidden`}
      >
        <ChatList workspaceSlug={workspaceSlug} />
      </div>
      <div
        className={`${
          isChatSelected ? "flex" : "hidden md:flex"
        } flex-1 h-full overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}
