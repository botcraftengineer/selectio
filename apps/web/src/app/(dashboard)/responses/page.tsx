"use client";

import {
  HR_SELECTION_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
} from "@selectio/db/schema";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import { IconBriefcase, IconClock, IconUser } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteHeader } from "~/components/layout";
import {
  ResponseActions,
  ResponseFilters,
  type ScreeningFilter,
} from "~/components/response";
import { useTRPC } from "~/trpc/react";

export default function ResponsesPage() {
  const trpc = useTRPC();
  const { data: responses, isLoading } = useQuery(
    trpc.vacancy.responses.listAll.queryOptions(),
  );
  const [screeningFilter, setScreeningFilter] =
    useState<ScreeningFilter>("all");

  const filteredResponses = useMemo(() => {
    if (!responses) return [];

    return responses.filter((response) => {
      switch (screeningFilter) {
        case "evaluated":
          return response.screening !== null;
        case "not-evaluated":
          return response.screening === null;
        case "high-score":
          return response.screening !== null && response.screening.score >= 4;
        case "low-score":
          return response.screening !== null && response.screening.score < 4;
        default:
          return true;
      }
    });
  }, [responses, screeningFilter]);

  const totalResponses = responses?.length ?? 0;
  const newResponses =
    responses?.filter(
      (response) =>
        new Date(response.createdAt) >
        new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).length ?? 0;
  const uniqueVacancies = new Set(
    responses?.map((response) => response.vacancyId) ?? [],
  ).size;

  return (
    <>
      <SiteHeader title="Отклики" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              {/* Статистика */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Всего откликов
                    </CardTitle>
                    <IconUser className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalResponses}</div>
                    <p className="text-xs text-muted-foreground">
                      На {uniqueVacancies} вакансий
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Новые за 24 часа
                    </CardTitle>
                    <IconClock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{newResponses}</div>
                    <p className="text-xs text-muted-foreground">
                      {newResponses > 0
                        ? `+${((newResponses / totalResponses) * 100).toFixed(1)}%`
                        : "Нет новых"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Активные вакансии
                    </CardTitle>
                    <IconBriefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{uniqueVacancies}</div>
                    <p className="text-xs text-muted-foreground">С откликами</p>
                  </CardContent>
                </Card>
              </div>

              {/* Фильтры */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  Показано: {filteredResponses.length} из {totalResponses}
                </div>
                <ResponseFilters
                  selectedFilter={screeningFilter}
                  onFilterChange={setScreeningFilter}
                />
              </div>

              {/* Таблица откликов */}
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Кандидат</TableHead>
                      <TableHead>Вакансия</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Отбор HR</TableHead>
                      <TableHead>Дата отклика</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-[400px] text-center"
                        >
                          <p className="text-muted-foreground">Загрузка...</p>
                        </TableCell>
                      </TableRow>
                    ) : !filteredResponses || filteredResponses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-[400px]">
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <h2 className="text-2xl font-semibold mb-2">
                                {responses && responses.length > 0
                                  ? "Нет откликов по выбранному фильтру"
                                  : "Нет откликов"}
                              </h2>
                              <p className="text-muted-foreground">
                                {responses && responses.length > 0
                                  ? "Попробуйте изменить фильтр"
                                  : "Отклики появятся после запуска парсера"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredResponses.map((response) => {
                        const isNew =
                          new Date(response.createdAt) >
                          new Date(Date.now() - 24 * 60 * 60 * 1000);

                        return (
                          <TableRow key={response.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="font-medium flex items-center gap-2">
                                  <Link
                                    href={`/responses/${response.id}`}
                                    className="hover:underline"
                                  >
                                    {response.candidateName || "Без имени"}
                                  </Link>
                                  {isNew && (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      Новый
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {response.vacancy ? (
                                <Link
                                  href={`/vacancies/${response.vacancyId}`}
                                  className="hover:underline"
                                >
                                  {response.vacancy.title}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="whitespace-nowrap"
                              >
                                {RESPONSE_STATUS_LABELS[response.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {response.hrSelectionStatus ? (
                                <Badge
                                  variant="secondary"
                                  className="whitespace-nowrap"
                                >
                                  {
                                    HR_SELECTION_STATUS_LABELS[
                                      response.hrSelectionStatus
                                    ]
                                  }
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(response.createdAt).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </TableCell>
                            <TableCell>
                              <ResponseActions
                                responseId={response.id}
                                resumeUrl={response.resumeUrl}
                                candidateName={response.candidateName}
                                hasGreeting={!!response.screening?.greeting}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
