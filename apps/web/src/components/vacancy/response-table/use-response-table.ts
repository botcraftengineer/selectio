import { useMemo, useState } from "react";
import type { ScreeningFilter } from "~/components/response";
import type { VacancyResponse } from "~/types/vacancy";
import { type SortDirection, type SortField, STATUS_ORDER } from "./types";

export function useResponseTable(responses: VacancyResponse[]) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [screeningFilter, setScreeningFilter] =
    useState<ScreeningFilter>("all");

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

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  return {
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
  };
}
