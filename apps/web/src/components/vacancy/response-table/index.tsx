"use client";

import {
  Pagination,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTRPC } from "~/trpc/react";
import type { VacancyResponse } from "~/types/vacancy";
import { ResponseRow } from "../response-row";
import { BulkActionsBar } from "./bulk-actions-bar";
import { EmptyState } from "./empty-state";
import { ResponseTableHeader } from "./response-table-header";
import { ResponseTableToolbar } from "./response-table-toolbar";
import { useResponseActions } from "./use-response-actions";
import { useResponseTable } from "./use-response-table";

interface ResponseTableProps {
  vacancyId: string;
  workspaceSlug: string;
  accessToken?: string;
}

const ITEMS_PER_PAGE = 25;

export function ResponseTable({
  vacancyId,
  workspaceSlug,
  accessToken,
}: ResponseTableProps) {
  const trpc = useTRPC();
  const {
    currentPage,
    setCurrentPage,
    sortField,
    sortDirection,
    handleSort,
    selectedIds,
    setSelectedIds,
    screeningFilter,
    setScreeningFilter,
    searchInput,
    debouncedSearch,
    handleSearchChange,
    handleSelectOne,
  } = useResponseTable();

  const { data, isLoading, isFetching } = useQuery({
    ...trpc.vacancy.responses.list.queryOptions({
      vacancyId,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sortField,
      sortDirection,
      screeningFilter,
      search: debouncedSearch,
    }),
    placeholderData: (previousData) => previousData,
  });

  const {
    isProcessing,
    isProcessingAll,
    isProcessingNew,
    isRefreshing,
    isSendingWelcome,
    handleBulkScreen,
    handleScreenAll,
    handleScreenNew,
    handleScreeningDialogClose,
    handleRefreshResponses,
    handleRefreshComplete,
    handleSendWelcomeBatch,
  } = useResponseActions(vacancyId, selectedIds, setSelectedIds);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, sortField, sortDirection, screeningFilter, debouncedSearch]);

  const responses = data?.responses ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const allSelected =
    responses.length > 0 &&
    responses.every((r: VacancyResponse) => selectedIds.has(r.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(responses.map((r) => r.id)));
    }
  };

  // Первоначальная загрузка - показываем простой индикатор
  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  // Рендерим скелетон для строк таблицы при фоновой загрузке
  const renderTableContent = () => {
    if (isFetching && !isLoading) {
      // Показываем скелетон во время фоновой загрузки (сортировка/пагинация)
      return Array.from({ length: 5 }, () => (
        <TableRow key={crypto.randomUUID()}>
          <TableCell>
            <Skeleton className="h-5 w-5" />
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-24" />
          </TableCell>
        </TableRow>
      ));
    }

    if (responses.length === 0) {
      return <EmptyState hasResponses={total > 0} colSpan={9} />;
    }

    return responses.map((response: VacancyResponse) => (
      <ResponseRow
        key={response.id}
        response={response}
        workspaceSlug={workspaceSlug}
        accessToken={accessToken}
        isSelected={selectedIds.has(response.id)}
        onSelect={handleSelectOne}
      />
    ));
  };

  return (
    <div className="space-y-4">
      <ResponseTableToolbar
        vacancyId={vacancyId}
        totalResponses={total}
        screeningFilter={screeningFilter}
        onFilterChange={setScreeningFilter}
        search={searchInput}
        onSearchChange={handleSearchChange}
        isRefreshing={isRefreshing}
        isProcessingNew={isProcessingNew}
        isProcessingAll={isProcessingAll}
        onRefresh={handleRefreshResponses}
        onRefreshComplete={handleRefreshComplete}
        onScreenNew={handleScreenNew}
        onScreenAll={handleScreenAll}
        onScreeningDialogClose={handleScreeningDialogClose}
      />

      <div className="rounded-lg border">
        {selectedIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            isSendingWelcome={isSendingWelcome}
            isProcessing={isProcessing}
            onSendWelcome={handleSendWelcomeBatch}
            onBulkScreen={handleBulkScreen}
          />
        )}

        <Table>
          <ResponseTableHeader
            allSelected={allSelected}
            onSelectAll={handleSelectAll}
            hasResponses={responses.length > 0}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <TableBody>{renderTableContent()}</TableBody>
        </Table>

        {total > 0 && (
          <div className="border-t px-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, total)} из {total}
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
