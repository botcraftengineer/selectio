"use client";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Award, FileText } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "~/trpc/react";

export function TopResponses() {
  const trpc = useTRPC();

  const { data: responses, isLoading } = useQuery(
    trpc.vacancy.responses.listAll.queryOptions(),
  );

  // Фильтруем отклики с оценками и сортируем по убыванию
  const topResponses =
    responses
      ?.filter((r) => r.screening?.score)
      .sort((a, b) => (b.screening?.score ?? 0) - (a.screening?.score ?? 0))
      .slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Лучшие отклики</CardTitle>
          <CardDescription>Кандидаты с наивысшими оценками</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-center gap-3 rounded-lg border p-3 animate-pulse"
              >
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topResponses.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Лучшие отклики</CardTitle>
          <CardDescription>Кандидаты с наивысшими оценками</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Award className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Пока нет оцененных откликов
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Лучшие отклики</CardTitle>
        <CardDescription>Кандидаты с наивысшими оценками</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topResponses.map((response, index) => (
            <Link
              key={response.id}
              href={`/responses/${response.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                {index === 0 ? (
                  <Award className="h-5 w-5 text-yellow-500" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {response.candidateName || "Без имени"}
                  </p>
                  {response.screening && (
                    <Badge
                      variant={index === 0 ? "default" : "outline"}
                      className="h-5 px-1.5"
                    >
                      {response.screening.score.toFixed(1)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {response.vacancy?.title || "Вакансия"}
                </p>
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(response.createdAt), {
                  addSuffix: true,
                  locale: ru,
                })}
              </div>
            </Link>
          ))}
        </div>
        {responses &&
          responses.filter((r) => r.screening?.score).length > 5 && (
            <Link
              href="/responses"
              className="mt-4 block text-center text-sm text-primary hover:underline"
            >
              Показать все отклики
            </Link>
          )}
      </CardContent>
    </Card>
  );
}
