"use client";

import { useQuery } from "@tanstack/react-query";
import { ChatPreviewCard } from "~/components/chat";
import { useTRPC } from "~/trpc/react";

interface RecentChatsProps {
  workspaceSlug: string;
}

export function RecentChats({ workspaceSlug }: RecentChatsProps) {
  const trpc = useTRPC();

  // Получаем последние сообщения с помощью queryOptions
  const recentMessagesQueryOptions =
    trpc.telegram.messages.getRecent.queryOptions({
      limit: 5,
    });

  const { data: recentMessages = [], isPending } = useQuery(
    recentMessagesQueryOptions,
  );

  // Группируем по беседам и берем последнее сообщение из каждой
  const conversationMap = new Map();

  for (const message of recentMessages) {
    if (!conversationMap.has(message.conversationId)) {
      conversationMap.set(message.conversationId, {
        conversation: message.conversation,
        lastMessage: message,
        messageCount: 1,
      });
    }
  }

  const chats = Array.from(conversationMap.values());

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Последние чаты</h2>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2" />
          <p className="text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Последние чаты</h2>
      </div>

      <div className="grid gap-3">
        {chats.map(({ conversation, lastMessage }) => (
          <ChatPreviewCard
            key={conversation.id}
            candidateId={conversation.id}
            candidateName={conversation.candidateName ?? "Кандидат"}
            lastMessage={lastMessage.content}
            lastMessageTime={lastMessage.createdAt}
            messageCount={0}
            unreadCount={0}
            status={conversation.status === "ACTIVE" ? "active" : "completed"}
            workspaceSlug={workspaceSlug}
          />
        ))}
      </div>

      {chats.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Нет активных чатов</p>
        </div>
      )}
    </div>
  );
}
