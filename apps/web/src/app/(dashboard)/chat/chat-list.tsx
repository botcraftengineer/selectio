"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { usePathname } from "next/navigation";

export function ChatList() {
  const trpc = useTRPC();
  const pathname = usePathname();

  const conversationsQueryOptions =
    trpc.telegram.conversation.getAll.queryOptions();
  const {
    data: conversations = [],
    isPending,
    error,
  } = useQuery(conversationsQueryOptions);

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка чатов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-red-200">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-red-600">Ошибка</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Нет чатов</h2>
          <p className="text-muted-foreground">
            Пока нет активных диалогов с кандидатами
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3">
        <h1 className="text-xl font-semibold">Чаты</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const lastMessage = conversation.messages[0];
          const initials = conversation.candidateName
            ? conversation.candidateName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "??";

          const isActive = pathname === `/chat/${conversation.id}`;

          return (
            <Link key={conversation.id} href={`/chat/${conversation.id}`}>
              <div
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b ${
                  isActive ? "bg-muted" : ""
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold shrink-0">
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="font-semibold truncate">
                      {conversation.candidateName ?? "Без имени"}
                    </h3>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(lastMessage.createdAt, "HH:mm", { locale: ru })}
                      </span>
                    )}
                  </div>

                  {lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {lastMessage.sender === "ADMIN" && "Вы: "}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
