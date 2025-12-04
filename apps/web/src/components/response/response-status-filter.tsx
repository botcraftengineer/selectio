"use client";

import type { ResponseStatus } from "@selectio/db/schema";
import { RESPONSE_STATUS, RESPONSE_STATUS_LABELS } from "@selectio/db/schema";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@selectio/ui";
import { ListFilter } from "lucide-react";

interface ResponseStatusFilterProps {
  selectedStatuses: ResponseStatus[];
  onStatusChange: (statuses: ResponseStatus[]) => void;
}

export function ResponseStatusFilter({
  selectedStatuses,
  onStatusChange,
}: ResponseStatusFilterProps) {
  const isFiltered = selectedStatuses.length > 0;

  const toggleStatus = (status: ResponseStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const clearFilters = () => {
    onStatusChange([]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isFiltered ? "default" : "outline"} size="sm">
          <ListFilter className="h-4 w-4 mr-2" />
          {isFiltered
            ? `Статус (${selectedStatuses.length})`
            : "Фильтр по статусу"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Статус отклика</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(RESPONSE_STATUS).map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={selectedStatuses.includes(status)}
            onCheckedChange={() => toggleStatus(status)}
          >
            {RESPONSE_STATUS_LABELS[status]}
          </DropdownMenuCheckboxItem>
        ))}
        {isFiltered && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={clearFilters}
            >
              Сбросить фильтры
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
