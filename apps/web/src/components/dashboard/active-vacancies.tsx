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
import { Briefcase, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "~/trpc/react";

export function ActiveVacancies() {
  const trpc = useTRPC();

  const { data: vacancies, isLoading } = useQuery(
    trpc.vacancy.list.queryOptions(),
  );

  const activeVacancies =
    vacancies?.filter((v) => v.isActive).slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Активные вакансии</CardTitle>
          <CardDescription>Вакансии в работе</CardDescription>
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

  if (activeVacancies.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Активные вакансии</CardTitle>
          <CardDescription>Вакансии в работе</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Нет активных вакансий
            </p>
            <Link
              href="/vacancies"
              className="text-sm text-primary hover:underline"
            >
              Перейти к вакансиям
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Активные вакансии</CardTitle>
        <CardDescription>Вакансии в работе</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeVacancies.map((vacancy) => (
            <Link
              key={vacancy.id}
              href={`/vacancies/${vacancy.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {vacancy.title}
                  </p>
                  <Badge variant="default" className="h-5">
                    Активна
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{vacancy.responses ?? 0} откликов</span>
                  {vacancy.newResponses && vacancy.newResponses > 0 ? (
                    <span className="text-primary font-medium">
                      +{vacancy.newResponses} новых
                    </span>
                  ) : null}
                </div>
              </div>
              {vacancy.url && (
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              )}
            </Link>
          ))}
        </div>
        {vacancies && vacancies.filter((v) => v.isActive).length > 5 && (
          <Link
            href="/vacancies"
            className="mt-4 block text-center text-sm text-primary hover:underline"
          >
            Показать все вакансии
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
