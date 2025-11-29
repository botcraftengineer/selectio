import { ScrollArea } from "@selectio/ui";
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="px-6 py-4 space-y-4">
        {messages.map((msg) => (
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
    </ScrollArea>
  );
}
