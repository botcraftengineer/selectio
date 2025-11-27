"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Checkbox,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createTriggerPublicToken } from "~/actions/trigger";
import { ResponseFilters, type ScreeningFilter } from "~/components/response";
import { useTRPC } from "~/trpc/react";
import type { VacancyResponse } from "~/types/vacancy";
import { ResponseRow } from "./response-row";

interface ResponseTableProps {
  responses: VacancyResponse[];
  vacancyId: string;
}

const ITEMS_PER_PAGE = 25;

type SortField = "score" | "detailedScore" | "status" | null;
type SortDirection = "asc" | "desc";

const STATUS_ORDER = {
  NEW: 1,
  EVALUATED: 2,
  DIALOG_APPROVED: 3,
  INTERVIEW_HH: 4,
  INTERVIEW_WHATSAPP: 5,
  COMPLETED: 6,
  SKIPPED: 7,
} as const;

export function ResponseTable({ responses, vacancyId }: ResponseTableProps) {
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);
  const [screeningFilter, setScreeningFilter] =
    useState<ScreeningFilter>("all");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    createTriggerPublicToken("screen-response").then((result) => {
      if (isMounted && result.success) {
        setAccessToken(result.token);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      switch (screeningFilter) {
        case "evaluated":
          return (
            response.screening !== null && response.screening !== undefined
          );
        case "not-evaluated":
          return (
            response.screening === null || response.screening === undefined
          );
        case "high-score":
          return response.screening && response.screening.score >= 4;
        case "low-score":
          return response.screening && response.screening.score < 4;
        case "all":
        default:
          return true;
      }
    });
  }, [responses, screeningFilter]);

  const sortedResponses = useMemo(() => {
    if (!sortField) return filteredResponses;

    return [...filteredResponses].sort((a, b) => {
      let comparison = 0;

      if (sortField === "score") {
        const scoreA = a.screening?.score ?? -1;
        const scoreB = b.screening?.score ?? -1;
        comparison = scoreA - scoreB;
      } else if (sortField === "detailedScore") {
        const scoreA = a.screening?.detailedScore ?? -1;
        const scoreB = b.screening?.detailedScore ?? -1;
        comparison = scoreA - scoreB;
      } else if (sortField === "status") {
        const orderA = STATUS_ORDER[a.status];
        const orderB = STATUS_ORDER[b.status];
        comparison = orderA - orderB;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredResponses, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedResponses.length / ITEMS_PER_PAGE);

  const paginatedResponses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedResponses.slice(startIndex, endIndex);
  }, [sortedResponses, currentPage]);

  const newResponses = useMemo(
    () => paginatedResponses.filter((r) => r.status === "NEW"),
    [paginatedResponses]
  );

  const allNewSelected =
    newResponses.length > 0 && newResponses.every((r) => selectedIds.has(r.id));

  const handleSelectAll = () => {
    if (allNewSelected) {
      const newSelected = new Set(selectedIds);
      for (const r of newResponses) {
        newSelected.delete(r.id);
      }
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      for (const r of newResponses) {
        newSelected.add(r.id);
      }
      setSelectedIds(newSelected);
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkScreen = async () => {
    if (selectedIds.size === 0 || !accessToken) return;

    setIsProcessing(true);

    try {
      const promises = Array.from(selectedIds).map(async (responseId) => {
        const response = await fetch("/api/trigger/screen-response", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ responseId }),
        });
        return response.json();
      });

      await Promise.all(promises);

      await queryClient.invalidateQueries(
        trpc.vacancy.responses.list.pathFilter()
      );

      setSelectedIds(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScreenAll = async () => {
    if (!accessToken || responses.length === 0) return;

    setIsProcessingAll(true);

    try {
      const res = await fetch("/api/trigger/screen-all-responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vacancyId }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error("Failed to trigger screen all:", data.error);
        return;
      }

      console.log(
        `Запущена пакетная оценка ${data.count} откликов (batch ID: ${data.batchId})`
      );

      // Обновляем данные через некоторое время, чтобы дать триггерам время выполниться
      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter()
        );
      }, 2000);
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleRefreshResponses = async () => {
    if (!accessToken) return;

    setIsRefreshing(true);

    try {
      const res = await fetch("/api/trigger/refresh-vacancy-responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vacancyId }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error("Failed to trigger refresh:", data.error);
        return;
      }

      console.log("Запущено обновление откликов для вакансии");

      // Обновляем данные через некоторое время
      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter()
        );
      }, 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendWelcomeBatch = async () => {
    if (selectedIds.size === 0 || !accessToken) return;

    setIsSendingWelcome(true);

    try {
      const res = await fetch("/api/trigger/send-welcome-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ responseIds: Array.from(selectedIds) }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error("Failed to trigger welcome batch:", data.error);
        return;
      }

      console.log(
        `Запущена массовая отправка приветствий для ${data.count} откликов`
      );

      setSelectedIds(new Set());
    } finally {
      setIsSendingWelcome(false);
    }
  };

  return (
    <div className="space-y-4">
      {responses.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Показано: {filteredResponses.length} из {responses.length}
            </div>
            <ResponseFilters
              selectedFilter={screeningFilter}
              onFilterChange={setScreeningFilter}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefreshResponses}
              disabled={!accessToken || isRefreshing}
              variant="outline"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRefreshing ? "Обновление..." : "Получить новые отклики"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={!accessToken || isProcessingAll}
                  variant="default"
                >
                  {isProcessingAll ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {isProcessingAll
                    ? "Запуск оценки..."
                    : `Оценить всех (${responses.length})`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Подтверждение массовой оценки
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы собираетесь запустить оценку для {responses.length}{" "}
                    {responses.length === 1
                      ? "отклика"
                      : responses.length < 5
                        ? "откликов"
                        : "откликов"}
                    . Это может занять некоторое время.
                    <br />
                    <br />
                    Процесс будет выполняться в фоновом режиме. Вы можете
                    продолжать работу, а результаты появятся автоматически.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={handleScreenAll}>
                    Запустить оценку
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-4 py-3">
            <p className="text-sm font-medium">Выбрано: {selectedIds.size}</p>
            <div className="flex gap-2">
              <Button
                onClick={handleSendWelcomeBatch}
                disabled={!accessToken || isSendingWelcome}
                size="sm"
                variant="outline"
              >
                {isSendingWelcome ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Отправить приветствие
              </Button>
              <Button
                onClick={handleBulkScreen}
                disabled={!accessToken || isProcessing}
                size="sm"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Оценить выбранные
              </Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allNewSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={newResponses.length === 0}
                />
              </TableHead>
              <TableHead>Кандидат</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Статус
                  {sortField === "status" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("detailedScore")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Скрининг
                  {sortField === "detailedScore" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </button>
              </TableHead>
              <TableHead>Отбор HR</TableHead>
              <TableHead>Контакты</TableHead>
              <TableHead>Дата отклика</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResponses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-[200px]">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-muted-foreground">
                        {responses.length > 0
                          ? "Нет откликов по выбранному фильтру"
                          : "Нет откликов"}
                      </p>
                      {responses.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Попробуйте изменить фильтр
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedResponses.map((response) => (
                <ResponseRow
                  key={response.id}
                  response={response}
                  accessToken={accessToken}
                  isSelected={selectedIds.has(response.id)}
                  onSelect={handleSelectOne}
                />
              ))
            )}
          </TableBody>
        </Table>

        {responses.length > 0 && (
          <div className="border-t px-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, sortedResponses.length)}{" "}
                из {sortedResponses.length}
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
