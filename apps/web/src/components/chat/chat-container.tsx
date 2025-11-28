"use client";

import { cn } from "@selectio/ui";
import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessage, type ChatMessageProps } from "./chat-message";
import { ScrollArea } from "./scroll-area";

interface ChatContainerProps {
  candidateName: string;
  candidateEmail?: string;
  avatarUrl?: string;
  messages: ChatMessageProps[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function ChatContainer({
  candidateName,
  candidateEmail,
  avatarUrl,
  messages,
  onSendMessage,
  isLoading = false,
  className,
}: ChatContainerProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesLength = messages.length;

  // Auto-scroll to bottom when new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: only trigger on message count change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messagesLength]);

  const handleSendMessage = async (message: string) => {
    setIsSending(true);
    try {
      await onSendMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = format(message.timestamp, "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, ChatMessageProps[]>,
  );

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Сегодня";
    if (isYesterday(date)) return "Вчера";
    return format(date, "d MMMM yyyy", { locale: ru });
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#0f1419] dark:bg-[#0f1419]",
        className,
      )}
    >
      {/* Header */}
      <ChatHeader
        candidateName={candidateName}
        candidateEmail={candidateEmail}
        avatarUrl={avatarUrl}
      />

      {/* Messages area with Telegram pattern background */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 relative"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-center text-gray-400">
                <p className="text-sm">Нет сообщений</p>
                <p className="text-xs mt-1">Начните диалог с кандидатом</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date} className="space-y-1">
                {/* Date separator */}
                <div className="flex justify-center my-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-xs text-white/70">
                      {getDateLabel(date)}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                {msgs.map((message) => (
                  <ChatMessage key={message.id} {...message} />
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isSending || isLoading}
        placeholder="Сообщение"
      />
    </div>
  );
}
