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
  IconSend,
  IconStar,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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

  const sendByUsernameMutation = useMutation(
    trpc.vacancy.responses.sendByUsername.mutationOptions({
      onSuccess: () => {
        toast.success("Сообщение отправлено в Telegram!");
      },
      onError: (error: unknown) => {
        console.error("Ошибка отправки сообщения:", error);
        toast.error("Ошибка отправки сообщения");
      },
    })
  );

  const handleRate = () => {
    console.log("Оценить кандидата:", responseId);
  };

  const handleSendGreeting = () => {
    sendByUsernameMutation.mutate({
      responseId,
      username: "@BotCraftEngineer",
    });
    if (!telegramUsername) {
      toast.error("У кандидата не указан Telegram username");
      return;
    }
  };

  const handleOpenResume = () => {
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenChat = () => {
    // TODO: Реализовать переход в чат
    console.log("Открыть чат с:", candidateName);
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

        <DropdownMenuItem onClick={handleOpenResume}>
          <IconExternalLink className="h-4 w-4" />
          Открыть резюме на HH.ru
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
