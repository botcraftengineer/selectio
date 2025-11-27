"use client";

import { ChatContainer } from "~/components/chat";
import type { ChatMessageProps, MessageSender } from "~/components/chat";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ChatClientProps {
  responseId: string;
}

export function ChatClient({ responseId }: ChatClientProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Получаем отклик кандидата
  const responseQueryOptions = trpc.vacancy.responses.getById.queryOptions({
    id: responseId,
  });
  const { data: response, isPending: isLoadingResponse } =
    useQuery(responseQueryOptions);

  // Получаем беседу
  const conversationQueryOptions =
    trpc.telegram.conversation.getByResponseId.queryOptions({
      responseId,
    });
  const { data: conversation, isPending: isLoadingConversation } = useQuery(
    conversationQueryOptions
  );

  // Получаем сообщения
  const messagesQueryOptions = conversation
    ? trpc.telegram.messages.getByConversationId.queryOptions({
        conversationId: conversation.id,
      })
    : undefined;
  const { data: telegramMessages = [], isPending: isLoadingMessages } =
    useQuery({
      ...messagesQueryOptions!,
      enabled: !!conversation,
    });

  // Мутация для отправки сообщения
  const sendMessageMutationOptions =
    trpc.telegram.sendMessage.send.mutationOptions({
      onSuccess: () => {
        // Инвалидируем кэш сообщений
        if (conversation) {
          queryClient.invalidateQueries({
            queryKey: trpc.telegram.messages.getByConversationId.queryKey({
              conversationId: conversation.id,
            }),
          });
        }

        toast.success("Ваше сообщение успешно отправлено кандидату");
      },
      onError: (error) => {
        toast.error(error.message || "Не удалось отправить сообщение");
      },
    });

  const { mutate: sendMessage, isPending: isSending } = useMutation(
    sendMessageMutationOptions
  );

  // Преобразуем сообщения в формат компонента
  const messages: ChatMessageProps[] = telegramMessages.map((msg) => ({
    id: msg.id,
    sender: msg.sender.toLowerCase() as MessageSender,
    content: msg.content,
    timestamp: msg.createdAt,
    senderName:
      msg.sender === "CANDIDATE"
        ? (response?.candidateName ?? undefined)
        : undefined,
  }));

  const handleSendMessage = async (message: string) => {
    if (!conversation) {
      toast.error("Беседа не найдена");
      return;
    }

    sendMessage({
      conversationId: conversation.id,
      sender: "ADMIN",
      contentType: "TEXT",
      content: message,
    });
  };

  if (isLoadingResponse || isLoadingConversation) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка чата...</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Кандидат не найден</h2>
          <p className="text-muted-foreground">
            Отклик с таким ID не существует
          </p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Беседа не найдена</h2>
          <p className="text-muted-foreground">
            Для этого кандидата еще нет активной беседы
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChatContainer
      candidateName={response.candidateName ?? "Кандидат"}
      candidateEmail={
        typeof response.contacts === "object" &&
        response.contacts &&
        "email" in response.contacts
          ? String(response.contacts.email)
          : undefined
      }
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoadingMessages || isSending}
      className="h-[calc(100vh-200px)]"
    />
  );
}
