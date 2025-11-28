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
} from "@selectio/ui";
import { FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { ResponseFilters, type ScreeningFilter } from "~/components/response";

interface ResponseTableToolbarProps {
  totalResponses: number;
  filteredCount: number;
  screeningFilter: ScreeningFilter;
  onFilterChange: (filter: ScreeningFilter) => void;
  isRefreshing: boolean;
  isProcessingNew: boolean;
  isProcessingAll: boolean;
  isParsingResumes: boolean;
  onRefresh: () => void;
  onScreenNew: () => void;
  onScreenAll: () => void;
  onParseResumes: () => void;
}

export function ResponseTableToolbar({
  totalResponses,
  filteredCount,
  screeningFilter,
  onFilterChange,
  isRefreshing,
  isProcessingNew,
  isProcessingAll,
  isParsingResumes,
  onRefresh,
  onScreenNew,
  onScreenAll,
  onParseResumes,
}: ResponseTableToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Показано: {filteredCount} из {totalResponses}
        </div>
        <ResponseFilters
          selectedFilter={screeningFilter}
          onFilterChange={onFilterChange}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={onRefresh} disabled={isRefreshing} variant="outline">
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {isRefreshing ? "Обновление..." : "Получить новые отклики"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isParsingResumes} variant="outline">
              {isParsingResumes ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isParsingResumes ? "Парсинг..." : "Распарсить резюме"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Парсинг резюме новых откликов</AlertDialogTitle>
              <AlertDialogDescription>
                Будут распарсены резюме откликов, у которых ещё нет данных
                резюме. Процесс будет выполняться в фоновом режиме.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={onParseResumes}>
                Запустить парсинг
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isProcessingNew} variant="outline">
              {isProcessingNew ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isProcessingNew ? "Запуск оценки..." : "Оценить новые"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Оценка новых откликов</AlertDialogTitle>
              <AlertDialogDescription>
                Будут оценены только отклики без скрининга. Процесс будет
                выполняться в фоновом режиме.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={onScreenNew}>
                Запустить оценку
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isProcessingAll} variant="default">
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isProcessingAll
                ? "Запуск оценки..."
                : `Оценить всех (${totalResponses})`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Подтверждение массовой оценки</AlertDialogTitle>
              <AlertDialogDescription>
                Вы собираетесь запустить оценку для {totalResponses}{" "}
                {totalResponses === 1
                  ? "отклика"
                  : totalResponses < 5
                    ? "откликов"
                    : "откликов"}
                . Это может занять некоторое время.
                <br />
                <br />
                Процесс будет выполняться в фоновом режиме. Вы можете продолжать
                работу, а результаты появятся автоматически.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={onScreenAll}>
                Запустить оценку
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
