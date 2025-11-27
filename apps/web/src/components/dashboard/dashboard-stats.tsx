"use client";

import {
  Badge,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@selectio/ui";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

export function DashboardStats() {
  const trpc = useTRPC();

  const { data: stats, isLoading } = useQuery(
    trpc.vacancy.getDashboardStats.queryOptions(),
  );

  if (isLoading || !stats) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={`skeleton-${i}`} className="@container/card animate-pulse">
            <CardHeader>
              <CardDescription>Загрузка...</CardDescription>
              <CardTitle className="text-2xl font-semibold">—</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const processedPercentage =
    stats.totalResponses > 0
      ? Math.round((stats.processedResponses / stats.totalResponses) * 100)
      : 0;

  const highScorePercentage =
    stats.processedResponses > 0
      ? Math.round((stats.highScoreResponses / stats.processedResponses) * 100)
      : 0;

  const topScorePercentage =
    stats.processedResponses > 0
      ? Math.round((stats.topScoreResponses / stats.processedResponses) * 100)
      : 0;

  const isGoodProcessed = processedPercentage >= 50;
  const isGoodHighScore = highScorePercentage >= 30;
  const _isGoodTopScore = topScorePercentage >= 15;
  const isGoodAvgScore = stats.avgScore >= 3.0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Всего откликов</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalResponses}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {stats.newResponses > 0 ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {stats.newResponses} новых
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.newResponses > 0
              ? "Есть новые отклики"
              : "Нет новых откликов"}
            {stats.newResponses > 0 ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            по {stats.totalVacancies} вакансиям
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Обработано</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.processedResponses}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isGoodProcessed ? <IconTrendingUp /> : <IconTrendingDown />}
              {processedPercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isGoodProcessed ? "Хороший прогресс" : "Требует обработки"}
            {isGoodProcessed ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">откликов прошли скрининг</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Качественные кандидаты</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.highScoreResponses}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isGoodHighScore ? <IconTrendingUp /> : <IconTrendingDown />}
              {highScorePercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isGoodHighScore ? "Отличные результаты" : "Нужно больше"}
            {isGoodHighScore ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            кандидатов со скорингом ≥ 3
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Средний балл</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.processedResponses > 0 ? stats.avgScore.toFixed(1) : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isGoodAvgScore ? <IconTrendingUp /> : <IconTrendingDown />}
              {stats.processedResponses > 0 ? "из 5.0" : "—"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isGoodAvgScore ? "Качество выше среднего" : "Требует улучшения"}
            {isGoodAvgScore ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">общая оценка кандидатов</div>
        </CardFooter>
      </Card>
    </div>
  );
}
