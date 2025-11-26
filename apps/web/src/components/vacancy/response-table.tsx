"use client";

import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createTriggerPublicToken } from "~/actions/trigger";
import type { VacancyResponse } from "~/types/vacancy";
import { ResponseRow } from "./response-row";

interface ResponseTableProps {
  responses: VacancyResponse[];
}

const ITEMS_PER_PAGE = 50;

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

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
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
              <TableCell colSpan={7} className="h-[200px]">
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
