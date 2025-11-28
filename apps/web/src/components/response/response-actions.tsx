"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@selectio/ui";
import {
  IconDots,
  IconExternalLink,
  IconMessage,
  IconRefresh,
  IconSend,
  IconStar,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { triggerRefreshSingleResume } from "~/actions/trigger";
import { useTRPC } from "~/trpc/react";

interface ResponseActionsProps {
  responseId: string;
  resumeUrl: string;
  candidateName?: string | null;
  telegramUsername?: string | null;
  hasGreeting?: boolean;
}

export function ResponseActions({
  responseId,
  resumeUrl,
  candidateName,
  telegramUsername,
  hasGreeting = false,
}: ResponseActionsProps) {
  const trpc = useTRPC();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sendByUsernameMutation = useMutation(
    trpc.vacancy.responses.sendByUsername.mutationOptions({
      onSuccess: () => {
        toast.success("Сообщение отправлено в Telegram!");
      },
      onError: (error: unknown) => {
        console.error("Ошибка отправки сообщения:", error);
        toast.error("Ошибка отправки сообщения");
      },
    }),
  );

  const handleRate = () => {
    console.log("Оценить кандидата:", responseId);
  };

  const handleSendGreeting = () => {
    if (!telegramUsername) {
      toast.error("У кандидата не указан Telegram username");
      return;
    }
    sendByUsernameMutation.mutate({
      responseId,
      username: telegramUsername,
    });
  };

  const handleOpenResume = () => {
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenChat = () => {
    // TODO: Реализовать переход в чат
    console.log("Открыть чат с:", candidateName);
  };

  const handleRefreshResume = async () => {
    setIsRefreshing(true);
    try {
      const result = await triggerRefreshSingleResume(responseId);
      if (!result.success) {
        toast.error("Не удалось обновить резюме");
        return;
      }
      toast.success("Обновление резюме запущено");
    } catch (error) {
      console.error("Ошибка обновления резюме:", error);
      toast.error("Ошибка обновления резюме");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconDots className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleRate}>
          <IconStar className="h-4 w-4" />
          Оценить кандидата
        </DropdownMenuItem>

        {hasGreeting && (
          <DropdownMenuItem
            onClick={handleSendGreeting}
            disabled={sendByUsernameMutation.isPending}
          >
            <IconSend className="h-4 w-4" />
            {sendByUsernameMutation.isPending
              ? "Отправка..."
              : "Отправить в Telegram"}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleOpenChat}>
          <IconMessage className="h-4 w-4" />
          Перейти в чат
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleRefreshResume} disabled={isRefreshing}>
          <IconRefresh className="h-4 w-4" />
          {isRefreshing ? "Обновление..." : "Обновить резюме"}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleOpenResume}>
          <IconExternalLink className="h-4 w-4" />
          Открыть резюме на HH.ru
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
