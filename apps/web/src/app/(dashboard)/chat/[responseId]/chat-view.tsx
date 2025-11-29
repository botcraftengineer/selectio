"use client";

import { toast } from "@selectio/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChatError } from "~/components/chat/chat-error";
import { ChatHeader } from "~/components/chat/chat-header";
import { ChatInput } from "~/components/chat/chat-input";
import { ChatLoading } from "~/components/chat/chat-loading";
import { ChatMessages } from "~/components/chat/chat-messages";
import { ChatSidebar } from "~/components/chat/sidebar/chat-sidebar";
import { useTRPC } from "~/trpc/react";

export function ChatView({ conversationId }: { conversationId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [transcribingMessageId, setTranscribingMessageId] = useState<
    string | null
  >(null);
  const [toastId, setToastId] = useState<string | number | null>(null);

  const conversationQueryOptions =
    trpc.telegram.conversation.getById.queryOptions({
      id: conversationId,
    });
  const { data: currentConversation } = useQuery(conversationQueryOptions);

  const metadata = currentConversation?.metadata
    ? JSON.parse(currentConversation.metadata)
    : null;
  const candidateResponseId = metadata?.responseId;

  const responseQueryOptions = trpc.vacancy.responses.getById.queryOptions({
    id: candidateResponseId ?? "",
  });
  const { data: responseData } = useQuery({
    ...responseQueryOptions,
    enabled: !!candidateResponseId,
  });

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

  const sendMessageMutationOptions =
    trpc.telegram.sendMessage.send.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            ["telegram", "messages", "getByConversationId"],
            { input: { conversationId }, type: "query" },
          ],
        });
      },
    });

  const { mutate: sendMessage, isPending: isSending } = useMutation(
    sendMessageMutationOptions,
  );

  const transcribeVoiceMutationOptions =
    trpc.telegram.transcribeVoice.trigger.mutationOptions({
      onSuccess: () => {
        if (toastId) {
          toast.success("Транскрибация запущена", {
            id: toastId,
            description: "Результат появится через несколько секунд",
          });
        }
        queryClient.invalidateQueries({
          queryKey: [
            ["telegram", "messages", "getByConversationId"],
            { input: { conversationId }, type: "query" },
          ],
        });
        setTranscribingMessageId(null);
        setToastId(null);
      },
      onError: (error) => {
        if (toastId) {
          toast.error("Ошибка транскрибации", {
            id: toastId,
            description: error.message || "Не удалось запустить транскрибацию",
          });
        }
        setTranscribingMessageId(null);
        setToastId(null);
      },
    });

  const { mutate: transcribeVoice } = useMutation(
    transcribeVoiceMutationOptions,
  );

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !conversationId) return;

    sendMessage({
      conversationId,
      sender: "ADMIN",
      contentType: "TEXT",
      content: message,
    });
  };

  const handleTranscribe = (messageId: string, fileId: string) => {
    setTranscribingMessageId(messageId);
    const id = toast.loading("Запуск транскрибации...");
    setToastId(id);
    transcribeVoice({ messageId, fileId });
  };

  if (isPending) {
    return <ChatLoading />;
  }

  if (error || !currentConversation) {
    return <ChatError message={error?.message} />;
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0">
          <ChatHeader
            candidateName={currentConversation.candidateName ?? "Кандидат"}
            candidateEmail={currentConversation.chatId}
          />
        </div>

        <div className="flex-1 min-h-0">
          <ChatMessages
            messages={messages}
            candidateName={currentConversation.candidateName}
            onTranscribe={handleTranscribe}
            transcribingMessageId={transcribingMessageId}
          />
        </div>

        <div className="flex-shrink-0">
          <ChatInput onSendMessage={handleSendMessage} disabled={isSending} />
        </div>
      </div>

      <ChatSidebar
        candidateName={currentConversation.candidateName}
        chatId={currentConversation.chatId}
        responseData={responseData}
      />
    </div>
  );
}
