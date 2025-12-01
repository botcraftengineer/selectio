"use client";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";

export function ChatList({ workspaceSlug }: { workspaceSlug: string }) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>("all");

  const vacanciesQueryOptions = trpc.vacancy.list.queryOptions();
  const { data: vacancies = [] } = useQuery(vacanciesQueryOptions);

  const conversationsQueryOptions =
    trpc.telegram.conversation.getAll.queryOptions({
      vacancyId: selectedVacancyId === "all" ? undefined : selectedVacancyId,
    });
  const {
    data: conversations = [],
    isPending,
    error,
  } = useQuery(conversationsQueryOptions);

  if (isPending) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b px-4 py-3 space-y-3">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 space-y-0">
          {Array.from({ length: 5 }, (_, index) => `skeleton-${index}`).map(
            (key) => (
              <div
                key={key}
                className="flex items-start gap-3 px-4 py-3 border-b"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ),
          )}
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

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Нет чатов</h2>
          <p className="text-muted-foreground">
            Пока нет активных диалогов с кандидатами
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 space-y-3">
        <h1 className="text-xl font-semibold">Чаты</h1>

        <Select value={selectedVacancyId} onValueChange={setSelectedVacancyId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Все вакансии" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все вакансии</SelectItem>
            {vacancies.map((vacancy) => (
              <SelectItem key={vacancy.id} value={vacancy.id}>
                {vacancy.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        {conversations.map((conversation) => {
          const lastMessage = conversation.messages[0];
          const initials = conversation.candidateName
            ? conversation.candidateName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "??";

          const isActive =
            pathname === `/${workspaceSlug}/chat/${conversation.id}`;

          let vacancyTitle = null;
          if (conversation.metadata) {
            try {
              const metadata = JSON.parse(conversation.metadata);
              const vacancy = vacancies.find(
                (v) => v.id === metadata.vacancyId,
              );
              vacancyTitle = vacancy?.title;
            } catch {
              // ignore
            }
          }

          return (
            <Link
              key={conversation.id}
              href={`/${workspaceSlug}/chat/${conversation.id}`}
            >
              <div
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b ${
                  isActive ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-teal-500 text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="font-semibold truncate">
                      {conversation.candidateName ?? "Без имени"}
                    </h3>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(lastMessage.createdAt, "HH:mm", { locale: ru })}
                      </span>
                    )}
                  </div>

                  {vacancyTitle && (
                    <Badge
                      variant="outline"
                      className="mb-1 text-teal-600 border-teal-200"
                    >
                      {vacancyTitle}
                    </Badge>
                  )}

                  {lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {lastMessage.sender === "ADMIN" && "Вы: "}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
