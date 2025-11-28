"use client";

import { Pagination, Table, TableBody } from "@selectio/ui";
import { useMemo } from "react";
import type { VacancyResponse } from "~/types/vacancy";
import { ResponseRow } from "../response-row";
import { BulkActionsBar } from "./bulk-actions-bar";
import { EmptyState } from "./empty-state";
import { ResponseTableHeader } from "./response-table-header";
import { ResponseTableToolbar } from "./response-table-toolbar";
import { useResponseActions } from "./use-response-actions";
import { useResponseTable } from "./use-response-table";

interface ResponseTableProps {
  responses: VacancyResponse[];
  vacancyId: string;
  accessToken?: string;
}

const ITEMS_PER_PAGE = 25;

export function ResponseTable({
  responses,
  vacancyId,
  accessToken,
}: ResponseTableProps) {
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
    filteredResponses,
    sortedResponses,
    handleSelectOne,
  } = useResponseTable(responses);

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

  const totalPages = Math.ceil(sortedResponses.length / ITEMS_PER_PAGE);

  const paginatedResponses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedResponses.slice(startIndex, endIndex);
  }, [sortedResponses, currentPage]);

  const allSelected =
    paginatedResponses.length > 0 &&
    paginatedResponses.every((r: VacancyResponse) => selectedIds.has(r.id));

  const handleSelectAll = () => {
    if (allSelected) {
      const newSelected = new Set(selectedIds);
      for (const r of paginatedResponses) {
        newSelected.delete(r.id);
      }
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      for (const r of paginatedResponses) {
        newSelected.add(r.id);
      }
      setSelectedIds(newSelected);
    }
  };

  return (
    <div className="space-y-4">
      {responses.length > 0 && (
        <ResponseTableToolbar
          totalResponses={responses.length}
          filteredCount={filteredResponses.length}
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
            hasResponses={paginatedResponses.length > 0}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <TableBody>
            {filteredResponses.length === 0 ? (
              <EmptyState hasResponses={responses.length > 0} colSpan={8} />
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
