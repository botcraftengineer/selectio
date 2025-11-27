"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input, ScrollArea } from "@selectio/ui";
import { Send } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function ChatView({ conversationId }: { conversationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Получаем conversation по ID
  const conversationQueryOptions =
    trpc.telegram.conversation.getById.queryOptions({
      id: conversationId,
    });
  const { data: currentConversation } = useQuery(conversationQueryOptions);

  // Получаем сообщения
  const {
    data: messages = [],
    isPending,
    error,
  } = useQuery({
    ...trpc.telegram.messages.getByConversationId.queryOptions({
      conversationId,
    }),
    enabled: !!conversationId,
  });

  // Отправка сообщения
  const sendMessageMutationOptions =
    trpc.telegram.sendMessage.send.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            ["telegram", "messages", "getByConversationId"],
            { input: { conversationId }, type: "query" },
          ],
        });
        setMessage("");
      },
    });

  const { mutate: sendMessage, isPending: isSending } = useMutation(
    sendMessageMutationOptions
  );

  const handleSendMessage = () => {
    if (!message.trim() || !conversationId) return;

    sendMessage({
      conversationId,
      sender: "ADMIN",
      contentType: "TEXT",
      content: message,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  if (isPending) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка чата...</p>
        </div>
      </div>
    );
  }

  if (error || !currentConversation) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-red-600">Ошибка</h2>
          <p className="text-muted-foreground">
            {error?.message ?? "Чат не найден"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок */}
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">
          {currentConversation.candidateName}
        </h1>
        <p className="text-sm text-muted-foreground">
          @{currentConversation.chatId}
        </p>
      </div>

      {/* Сообщения */}
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isAdmin = msg.sender === "ADMIN";
            const isBot = msg.sender === "BOT";

            const senderLabel = isAdmin
              ? "Вы"
              : isBot
                ? "Бот"
                : (currentConversation.candidateName ?? "Кандидат");

            const bgColor = isAdmin
              ? "bg-teal-500 text-white"
              : isBot
                ? "bg-blue-500 text-white"
                : "bg-muted text-foreground";

            const timeColor = isAdmin
              ? "text-teal-100"
              : isBot
                ? "text-blue-100"
                : "text-muted-foreground";

            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[70%] rounded-lg px-4 py-2 ${bgColor}`}>
                  <p className="text-xs font-semibold mb-1 opacity-80">
                    {senderLabel}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${timeColor}`}>
                    {format(msg.createdAt, "HH:mm", { locale: ru })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Поле ввода */}
      <div className="border-t px-6 py-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Введите сообщение..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
