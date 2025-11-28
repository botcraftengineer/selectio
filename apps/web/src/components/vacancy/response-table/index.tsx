"use client";

import { Pagination, Table, TableBody } from "@selectio/ui";
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
  accessToken?: string;
}

const ITEMS_PER_PAGE = 50;

export function ResponseTable({ vacancyId, accessToken }: ResponseTableProps) {
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
    handleSelectOne,
  } = useResponseTable();

  const { data, isLoading } = useQuery(
    trpc.vacancy.responses.list.queryOptions({
      vacancyId,
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      sortField,
      sortDirection,
      screeningFilter,
    }),
  );

  const {
    isProcessing,
    isProcessingAll,
    isProcessingNew,
    isRefreshing,
    isSendingWelcome,
    isParsingResumes,
    handleBulkScreen,
    handleScreenAll,
    handleScreenNew,
    handleRefreshResponses,
    handleSendWelcomeBatch,
    handleParseNewResumes,
  } = useResponseActions(vacancyId, selectedIds, setSelectedIds);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, sortField, sortDirection, screeningFilter]);

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

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      {total > 0 && (
        <ResponseTableToolbar
          totalResponses={total}
          filteredCount={responses.length}
          screeningFilter={screeningFilter}
          onFilterChange={setScreeningFilter}
          isRefreshing={isRefreshing}
          isProcessingNew={isProcessingNew}
          isProcessingAll={isProcessingAll}
          isParsingResumes={isParsingResumes}
          onRefresh={handleRefreshResponses}
          onScreenNew={handleScreenNew}
          onScreenAll={handleScreenAll}
          onParseResumes={handleParseNewResumes}
        />
      )}

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
          <TableBody>
            {responses.length === 0 ? (
              <EmptyState hasResponses={total > 0} colSpan={8} />
            ) : (
              responses.map((response: VacancyResponse) => (
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
