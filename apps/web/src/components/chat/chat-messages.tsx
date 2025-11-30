import { ScrollArea } from "@selectio/ui";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";

interface Message {
  id: string;
  sender: "ADMIN" | "BOT" | "CANDIDATE";
  contentType: string;
  content: string;
  createdAt: Date;
  fileUrl?: string | null;
  fileId?: string | null;
  voiceTranscription?: string | null;
}

interface ChatMessagesProps {
  messages: Message[];
  candidateName: string | null;
  onTranscribe?: (messageId: string, fileId: string) => void;
  transcribingMessageId?: string | null;
}

export function ChatMessages({
  messages,
  candidateName,
  onTranscribe,
  transcribingMessageId,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages.length]);

  // Группируем сообщения по датам
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = format(message.createdAt, "d MMMM yyyy", { locale: ru });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>,
  );

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="px-4 py-6 space-y-6">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="bg-muted px-3 py-1 rounded-full">
                <span className="text-xs font-medium text-muted-foreground">
                  {date}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              {msgs.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  id={msg.id}
                  sender={msg.sender}
                  contentType={msg.contentType}
                  content={msg.content}
                  createdAt={msg.createdAt}
                  candidateName={candidateName}
                  fileUrl={msg.fileUrl}
                  fileId={msg.fileId}
                  voiceTranscription={msg.voiceTranscription}
                  onTranscribe={onTranscribe}
                  isTranscribing={transcribingMessageId === msg.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
