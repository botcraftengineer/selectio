"use client";

import {
  Badge,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
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
        {Array.from({ length: 4 }, (_, index) => `skeleton-${index}`).map(
          (key) => (
            <Card key={key} className="@container/card animate-pulse">
              <CardHeader>
                <CardDescription>Загрузка...</CardDescription>
                <CardTitle className="text-2xl font-semibold">—</CardTitle>
              </CardHeader>
            </Card>
          ),
        )}
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
            <Badge
              variant="outline"
              className={cn(
                stats.newResponses > 0
                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
              )}
            >
              {stats.newResponses > 0 ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
              {stats.newResponses} новых
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
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
            <Badge
              variant="outline"
              className={cn(
                isGoodProcessed
                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
              )}
            >
              {isGoodProcessed ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
              {processedPercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
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
            <Badge
              variant="outline"
              className={cn(
                isGoodHighScore
                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
              )}
            >
              {isGoodHighScore ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
              {highScorePercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
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
            <Badge
              variant="outline"
              className={cn(
                isGoodAvgScore
                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
              )}
            >
              {isGoodAvgScore ? (
                <IconTrendingUp className="size-4" />
              ) : (
                <IconTrendingDown className="size-4" />
              )}
              {stats.processedResponses > 0 ? "из 5.0" : "—"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">общая оценка кандидатов</div>
        </CardFooter>
      </Card>
    </div>
  );
}
