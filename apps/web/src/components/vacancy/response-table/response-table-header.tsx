import { Checkbox, TableHead, TableHeader, TableRow } from "@selectio/ui";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortDirection, SortField } from "./types";

interface ResponseTableHeaderProps {
  allSelected: boolean;
  onSelectAll: () => void;
  hasResponses: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export function ResponseTableHeader({
  allSelected,
  onSelectAll,
  hasResponses,
  sortField,
  sortDirection,
  onSort,
}: ResponseTableHeaderProps) {
  const renderSortIcon = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === "asc" ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      );
    }
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
            disabled={!hasResponses}
          />
        </TableHead>
        <TableHead>Кандидат</TableHead>
        <TableHead>
          <button
            type="button"
            onClick={() => onSort("status")}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Статус
            {renderSortIcon("status")}
          </button>
        </TableHead>
        <TableHead>
          <button
            type="button"
            onClick={() => onSort("detailedScore")}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Скрининг
            {renderSortIcon("detailedScore")}
          </button>
        </TableHead>
        <TableHead>Отбор HR</TableHead>
        <TableHead>Контакты</TableHead>
        <TableHead>Дата отклика</TableHead>
        <TableHead className="text-right">Действия</TableHead>
      </TableRow>
    </TableHeader>
  );
}
