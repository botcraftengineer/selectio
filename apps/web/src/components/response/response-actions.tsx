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
import { useState } from "react";
import { toast } from "sonner";
import {
  triggerRefreshSingleResume,
  triggerScreenResponse,
  triggerSendWelcome,
} from "~/actions/trigger";

interface ResponseActionsProps {
  responseId: string;
  resumeUrl: string;
  candidateName?: string | null;
  telegramUsername?: string | null;
  phone?: string | null;
}

export function ResponseActions({
  responseId,
  resumeUrl,
  candidateName,
  telegramUsername,
  phone,
}: ResponseActionsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);
  const [isRating, setIsRating] = useState(false);

  const handleRate = async () => {
    setIsRating(true);
    try {
      const result = await triggerScreenResponse(responseId);
      if (!result.success) {
        toast.error("Не удалось запустить оценку");
        return;
      }
      toast.success("Оценка кандидата запущена");
    } catch (error) {
      console.error("Ошибка оценки кандидата:", error);
      toast.error("Ошибка оценки кандидата");
    } finally {
      setIsRating(false);
    }
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

  const handleSendWelcomeMessage = async () => {
    if (!telegramUsername && !phone) {
      toast.error(
        "У кандидата не указаны ни Telegram username, ни номер телефона",
      );
      return;
    }

    setIsSendingWelcome(true);
    try {
      const result = await triggerSendWelcome(
        responseId,
        telegramUsername,
        phone,
      );
      if (!result.success) {
        toast.error("Не удалось отправить приветствие");
        return;
      }
      toast.success(
        `Приветствие отправлено ${candidateName ? candidateName : telegramUsername ? `@${telegramUsername}` : phone}`,
      );
    } catch (error) {
      console.error("Ошибка отправки приветствия:", error);
      toast.error("Ошибка отправки приветствия");
    } finally {
      setIsSendingWelcome(false);
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
        <DropdownMenuItem onClick={handleRate} disabled={isRating}>
          <IconStar className="h-4 w-4" />
          {isRating ? "Оценка..." : "Оценить кандидата"}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleSendWelcomeMessage}
          disabled={isSendingWelcome}
        >
          <IconSend className="h-4 w-4" />
          {isSendingWelcome ? "Отправка..." : "Отправить приветствие"}
        </DropdownMenuItem>

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
