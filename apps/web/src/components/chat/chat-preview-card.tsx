"use client";

import { Badge, Button, Card, cn } from "@selectio/ui";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, MessageCircle } from "lucide-react";
import Link from "next/link";

interface ChatPreviewCardProps {
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  lastMessage: string;
  lastMessageTime: Date;
  messageCount: number;
  unreadCount?: number;
  status?: "active" | "pending" | "completed";
  className?: string;
  workspaceSlug: string;
}

const statusConfig = {
  active: { label: "Активный", variant: "default" as const },
  pending: { label: "Ожидание", variant: "secondary" as const },
  completed: { label: "Завершен", variant: "outline" as const },
};

export function ChatPreviewCard({
  candidateId,
  candidateName,
  candidateEmail,
  lastMessage,
  lastMessageTime,
  messageCount,
  unreadCount = 0,
  status = "active",
  className,
  workspaceSlug,
}: ChatPreviewCardProps) {
  const statusInfo = statusConfig[status];
  const initials = candidateName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className={cn("p-4 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{candidateName}</h3>
            <Badge variant={statusInfo.variant} className="text-xs">
              {statusInfo.label}
            </Badge>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>

          {candidateEmail && (
            <p className="text-xs text-muted-foreground mb-2 truncate">
              {candidateEmail}
            </p>
          )}

          <div className="flex items-center gap-2 text-sm mb-3">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-muted-foreground truncate flex-1">
              {lastMessage}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(lastMessageTime, "dd MMM, HH:mm", { locale: ru })}
            </div>

            <Link href={`/${workspaceSlug}/chat/${candidateId}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                Открыть ({messageCount})
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
