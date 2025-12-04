import { Avatar, AvatarFallback } from "@selectio/ui";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Bot, User } from "lucide-react";
import { memo, useRef } from "react";
import type { ChatMessageProps } from "../../types/chat";
import { VoicePlayer } from "./voice-player";

export const ChatMessage = memo(function ChatMessage({
  id,
  sender,
  contentType,
  content,
  createdAt,
  candidateName,
  fileUrl,
  fileId,
  voiceTranscription,
  onTranscribe,
  isTranscribing = false,
}: ChatMessageProps) {
  const isAdmin = sender === "ADMIN";
  const isBot = sender === "BOT";
  const isVoice = contentType === "VOICE";

  // Store the initial fileUrl to prevent audio interruption when presigned URL changes
  const stableFileUrlRef = useRef<string | null>(null);
  if (fileUrl && !stableFileUrlRef.current) {
    stableFileUrlRef.current = fileUrl;
  }

  const senderLabel = isAdmin
    ? "Вы"
    : isBot
      ? "Бот"
      : (candidateName ?? "Кандидат");

  const initials = senderLabel
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex gap-2 md:gap-3 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0">
        <AvatarFallback
          className={
            isAdmin
              ? "bg-primary text-primary-foreground"
              : isBot
                ? "bg-blue-500 text-white"
                : "bg-muted"
          }
        >
          {isBot ? (
            <Bot className="h-3.5 w-3.5 md:h-4 md:w-4" />
          ) : isAdmin ? (
            <span className="text-xs">{initials}</span>
          ) : (
            <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div
        className={`flex flex-col gap-1 max-w-[85%] md:max-w-[70%] ${isAdmin ? "items-end" : "items-start"}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {senderLabel}
          </span>
          <span className="text-xs text-muted-foreground/70">
            {format(createdAt, "HH:mm", { locale: ru })}
          </span>
        </div>

        <div
          className={`rounded-2xl px-3 py-2 md:px-4 md:py-2 ${
            isAdmin
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : isBot
                ? "bg-blue-50 text-blue-950 dark:bg-blue-950 dark:text-blue-50 rounded-tl-sm"
                : "bg-muted rounded-tl-sm"
          }`}
        >
          {isVoice && stableFileUrlRef.current ? (
            <div className="space-y-2">
              <VoicePlayer
                src={stableFileUrlRef.current}
                isOutgoing={isAdmin}
                messageId={id}
                fileId={fileId ?? undefined}
                hasTranscription={!!voiceTranscription}
                onTranscribe={
                  fileId && onTranscribe
                    ? () => onTranscribe(id, fileId)
                    : undefined
                }
                isTranscribing={isTranscribing}
              />
              {voiceTranscription && (
                <div className="text-xs leading-relaxed pt-2 border-t border-current/10">
                  <p className="opacity-70 mb-1 font-medium">Транскрипция:</p>
                  <p className="opacity-90">{voiceTranscription}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
              {content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - ignore fileUrl changes as we cache the first one
  return (
    prevProps.id === nextProps.id &&
    prevProps.sender === nextProps.sender &&
    prevProps.contentType === nextProps.contentType &&
    prevProps.content === nextProps.content &&
    prevProps.createdAt.getTime() === nextProps.createdAt.getTime() &&
    prevProps.candidateName === nextProps.candidateName &&
    prevProps.fileId === nextProps.fileId &&
    prevProps.voiceTranscription === nextProps.voiceTranscription &&
    prevProps.isTranscribing === nextProps.isTranscribing
    // Intentionally NOT comparing fileUrl and onTranscribe
  );
});
