"use client";

import { Badge, Button, Card, Input, ScrollArea, Skeleton } from "@selectio/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Circle, Send } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { SiteHeader } from "~/components/layout";
import { useTRPC } from "~/trpc/react";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { id } = use(params);
  const trpc = useTRPC();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: response } = useQuery(
    trpc.vacancy.responses.getById.queryOptions({ id }),
  );

  const conversationId = response?.conversation?.id;

  const {
    data: messages,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.telegram.messages.getByConversationId.queryOptions({
      conversationId: conversationId || "",
    }),
    enabled: !!conversationId,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation(
    trpc.telegram.sendMessage.mutate.mutationOptions({
      onSuccess: () => {
        setMessage("");
        refetch();
      },
    }),
  );

  useEffect(() => {
    if (messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length]);

  const handleSend = () => {
    if (!message.trim() || !conversationId) return;
    sendMessageMutation.mutate({
      conversationId,
      text: message,
    });
  };

  if (!conversationId) {
    return (
      <>
        <SiteHeader title="Чат" />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-muted-foreground">
            Чат недоступен для этого отклика
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader title={`Чат с ${response?.candidateName || "кандидатом"}`} />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col h-full">
          <div className="px-4 py-4 lg:px-6 flex items-center justify-between">
            <Link href={`/responses/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад к отклику
              </Button>
            </Link>
            <Badge variant="outline" className="gap-1">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              Онлайн
            </Badge>
          </div>

          <Card className="flex-1 mx-4 mb-4 lg:mx-6 flex flex-col">
            <ScrollArea
              ref={scrollRef}
              className="flex-1 p-4"
              style={{ height: "calc(100vh - 300px)" }}
            >
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-16 w-2/3 ml-auto" />
                  <Skeleton className="h-16 w-3/4" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "ADMIN" || msg.sender === "BOT"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.sender === "ADMIN" || msg.sender === "BOT"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.contentType === "VOICE" ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              🎤 Голосовое сообщение
                            </p>
                            {msg.voiceTranscription && (
                              <p className="text-sm italic">
                                {msg.voiceTranscription}
                              </p>
                            )}
                            {msg.fileUrl && (
                              <audio controls className="w-full">
                                <source src={msg.fileUrl} type="audio/ogg" />
                                <track kind="captions" />
                              </audio>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
