import { TableCell, TableRow } from "@selectio/ui";

interface EmptyStateProps {
  hasResponses: boolean;
  colSpan: number;
}

export function EmptyState({ hasResponses, colSpan }: EmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-[200px]">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              {hasResponses
                ? "Нет откликов по выбранному фильтру"
                : "Нет откликов"}
            </p>
            {hasResponses && (
              <p className="text-sm text-muted-foreground mt-1">
                Попробуйте изменить фильтр
              </p>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
