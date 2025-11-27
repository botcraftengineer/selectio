"use client";

import Link from "next/link";
import { Badge, Card } from "@selectio/ui";
import { MessageCircle, User } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const statusConfig = {
  NEW: { label: "Новый", variant: "secondary" as const },
  EVALUATED: { label: "Оценен", variant: "default" as const },
  DIALOG_APPROVED: { label: "Диалог одобрен", variant: "default" as const },
  INTERVIEW_HH: { label: "Интервью HH", variant: "default" as const },
  INTERVIEW_WHATSAPP: {
    label: "Интервью WhatsApp",
    variant: "default" as const,
  },
  COMPLETED: { label: "Завершен", variant: "outline" as const },
  SKIPPED: { label: "Пропущен", variant: "outline" as const },
};

export function ChatList() {
  const trpc = useTRPC();

  const responsesQueryOptions = trpc.vacancy.responses.listAll.queryOptions();
  const {
    data: responses = [],
    isPending,
    error,
  } = useQuery(responsesQueryOptions);

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка кандидатов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-red-200">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2 text-red-600">Ошибка</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Нет кандидатов</h2>
          <p className="text-muted-foreground">
            Пока нет откликов от кандидатов
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Чаты с кандидатами</h1>
        <p className="text-muted-foreground">
          Выберите кандидата для начала переписки
        </p>
      </div>

      <div className="grid gap-3">
        {responses.map((response) => {
          const status =
            statusConfig[response.status as keyof typeof statusConfig];
          const initials = response.candidateName
            ? response.candidateName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "??";

          return (
            <Link key={response.id} href={`/chat/${response.id}`}>
              <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold shrink-0">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {response.candidateName ?? "Без имени"}
                      </h3>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {response.telegramUsername && (
                        <span>@{response.telegramUsername}</span>
                      )}
                      <span>•</span>
                      <span>
                        {format(response.createdAt, "dd MMM, HH:mm", {
                          locale: ru,
                        })}
                      </span>
                    </div>
                  </div>

                  <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
