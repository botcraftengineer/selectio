"use client";

import {
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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createTriggerPublicToken } from "~/actions/trigger";
import { useTRPC } from "~/trpc/react";
import type { VacancyResponse } from "~/types/vacancy";
import { ResponseRow } from "./response-row";

interface ResponseTableProps {
  responses: VacancyResponse[];
}

const ITEMS_PER_PAGE = 25;

type SortField = "score" | "status" | null;
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

export function ResponseTable({ responses }: ResponseTableProps) {
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

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

  const sortedResponses = useMemo(() => {
    if (!sortField) return responses;

    return [...responses].sort((a, b) => {
      let comparison = 0;

      if (sortField === "score") {
        const scoreA = a.screening?.score ?? -1;
        const scoreB = b.screening?.score ?? -1;
        comparison = scoreA - scoreB;
      } else if (sortField === "status") {
        const orderA = STATUS_ORDER[a.status];
        const orderB = STATUS_ORDER[b.status];
        comparison = orderA - orderB;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [responses, sortField, sortDirection]);

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

  return (
    <div className="rounded-lg border">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-4 py-3">
          <p className="text-sm font-medium">Выбрано: {selectedIds.size}</p>
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
                onClick={() => handleSort("score")}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Оценка
                {sortField === "score" ? (
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
          {responses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-[200px]">
                <div className="flex items-center justify-center">
                  <p className="text-muted-foreground">Нет откликов</p>
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
  );
}
