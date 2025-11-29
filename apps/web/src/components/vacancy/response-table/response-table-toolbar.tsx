import { useInngestSubscription } from "@inngest/realtime/hooks";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@selectio/ui";
import { FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchRefreshVacancyResponsesToken } from "~/actions/realtime";
import { getParseResumesToken } from "~/actions/trigger";
import { ResponseFilters, type ScreeningFilter } from "~/components/response";
import { ScreeningProgressDialog } from "../screening-progress-dialog";

interface ResponseTableToolbarProps {
  vacancyId: string;
  totalResponses: number;
  filteredCount: number;
  screeningFilter: ScreeningFilter;
  onFilterChange: (filter: ScreeningFilter) => void;
  isRefreshing: boolean;
  isProcessingNew: boolean;
  isProcessingAll: boolean;
  isParsingResumes: boolean;
  onRefresh: () => void;
  onRefreshComplete: () => void;
  onScreenNew: () => void;
  onScreenAll: () => void;
  onParseResumes: () => void;
  onScreeningDialogClose: () => void;
}

export function ResponseTableToolbar({
  vacancyId,
  totalResponses,
  filteredCount,
  screeningFilter,
  onFilterChange,
  isRefreshing,
  isProcessingNew,
  isProcessingAll,
  isParsingResumes,
  onRefresh,
  onRefreshComplete,
  onScreenNew,
  onScreenAll,
  onParseResumes,
  onScreeningDialogClose,
}: ResponseTableToolbarProps) {
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [refreshMessage, setRefreshMessage] = useState<string>("");

  const [parseDialogOpen, setParseDialogOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [parseMessage, setParseMessage] = useState<string>("");

  // Подписка на статус выполнения refresh
  const refreshSubscription = useInngestSubscription({
    refreshToken: () => fetchRefreshVacancyResponsesToken(vacancyId),
    enabled: refreshDialogOpen && refreshStatus === "loading",
  });
  console.log(refreshDialogOpen, refreshStatus);
  // Подписка на статус выполнения parse
  const parseSubscription = useInngestSubscription({
    refreshToken: getParseResumesToken,
    enabled: parseDialogOpen,
  });

  // Обновляем статус на основе данных подписки для refresh
  useEffect(() => {
    if (refreshSubscription.latestData) {
      const data = refreshSubscription.latestData;
      if (data.kind === "data" && data.topic === "status") {
        const statusData = data.data as {
          status: string;
          message: string;
          vacancyId?: string;
        };
        setRefreshMessage(statusData.message);

        if (statusData.status === "completed") {
          setRefreshStatus("success");
          onRefreshComplete();
        } else if (statusData.status === "error") {
          setRefreshStatus("error");
          setRefreshError(statusData.message);
          onRefreshComplete();
        }
      }
    }
  }, [refreshSubscription.latestData, onRefreshComplete]);

  // Обновляем статус на основе данных подписки для parse
  useEffect(() => {
    if (parseSubscription.latestData) {
      const data = parseSubscription.latestData;
      if (data.kind === "data" && data.topic === "status") {
        const statusData = data.data as {
          status: string;
          message: string;
          total?: number;
          processed?: number;
        };
        setParseMessage(statusData.message);

        if (statusData.status === "completed") {
          setParseStatus("success");
        } else if (statusData.status === "error") {
          setParseStatus("error");
          setParseError(statusData.message);
        }
      }
    }
  }, [parseSubscription.latestData]);

  const handleRefreshClick = async () => {
    setRefreshError(null);
    setRefreshMessage("");
    setRefreshStatus("loading");

    try {
      await onRefresh();
    } catch (error) {
      setRefreshStatus("error");
      setRefreshError(
        error instanceof Error ? error.message : "Произошла ошибка",
      );
    }
  };

  const handleRefreshDialogClose = () => {
    if (refreshStatus !== "loading") {
      setRefreshDialogOpen(false);
      setRefreshError(null);
      setRefreshMessage("");
      setRefreshStatus("idle");
    }
  };

  const handleParseClick = async () => {
    setParseError(null);
    setParseMessage("");
    setParseStatus("loading");

    try {
      await onParseResumes();
    } catch (error) {
      setParseStatus("error");
      setParseError(
        error instanceof Error ? error.message : "Произошла ошибка",
      );
    }
  };

  const handleParseDialogClose = () => {
    if (parseStatus !== "loading") {
      setParseDialogOpen(false);
      setParseError(null);
      setParseMessage("");
      setParseStatus("idle");
    }
  };

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
        <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
          <Button
            disabled={isRefreshing}
            variant="outline"
            onClick={() => setRefreshDialogOpen(true)}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRefreshing ? "Обновление..." : "Получить новые отклики"}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Получение новых откликов</DialogTitle>
              <div>
                {refreshStatus === "idle" && (
                  <>
                    Будет запущен процесс получения новых откликов с HeadHunter
                    для этой вакансии. Процесс будет выполняться в фоновом
                    режиме, и новые отклики появятся в таблице автоматически.
                  </>
                )}
                {refreshStatus === "loading" && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {refreshMessage || "Запускаем получение откликов..."}
                    </span>
                  </div>
                )}
                {refreshStatus === "success" && (
                  <div className="text-green-600">
                    ✓{" "}
                    {refreshMessage ||
                      "Процесс успешно завершен! Новые отклики появятся в таблице автоматически."}
                  </div>
                )}
                {refreshStatus === "error" && (
                  <div className="text-red-600">
                    ✗ Ошибка: {refreshError || "Не удалось запустить процесс"}
                  </div>
                )}
              </div>
            </DialogHeader>
            <DialogFooter>
              {refreshStatus === "idle" && (
                <>
                  <Button variant="outline" onClick={handleRefreshDialogClose}>
                    Отмена
                  </Button>
                  <Button onClick={handleRefreshClick}>Получить отклики</Button>
                </>
              )}
              {refreshStatus === "loading" && (
                <Button disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Выполняется...
                </Button>
              )}
              {refreshStatus === "success" && (
                <Button onClick={handleRefreshDialogClose}>Закрыть</Button>
              )}
              {refreshStatus === "error" && (
                <Button
                  variant="destructive"
                  onClick={handleRefreshDialogClose}
                >
                  Закрыть
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={parseDialogOpen} onOpenChange={setParseDialogOpen}>
          <Button
            disabled={isParsingResumes}
            variant="outline"
            onClick={() => setParseDialogOpen(true)}
          >
            {isParsingResumes ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {isParsingResumes ? "Парсинг..." : "Распарсить резюме"}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Парсинг резюме новых откликов</DialogTitle>
              <div>
                {parseStatus === "idle" && (
                  <>
                    Будут распарсены резюме откликов, у которых ещё нет данных
                    резюме. Процесс будет выполняться в фоновом режиме.
                  </>
                )}
                {parseStatus === "loading" && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{parseMessage || "Запускаем парсинг резюме..."}</span>
                  </div>
                )}
                {parseStatus === "success" && (
                  <div className="text-green-600">
                    ✓{" "}
                    {parseMessage ||
                      "Процесс успешно завершен! Данные резюме появятся автоматически."}
                  </div>
                )}
                {parseStatus === "error" && (
                  <div className="text-red-600">
                    ✗ Ошибка: {parseError || "Не удалось запустить процесс"}
                  </div>
                )}
              </div>
            </DialogHeader>
            <DialogFooter>
              {parseStatus === "idle" && (
                <>
                  <Button variant="outline" onClick={handleParseDialogClose}>
                    Отмена
                  </Button>
                  <Button onClick={handleParseClick}>Запустить парсинг</Button>
                </>
              )}
              {parseStatus === "loading" && (
                <Button disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Выполняется...
                </Button>
              )}
              {parseStatus === "success" && (
                <Button onClick={handleParseDialogClose}>Закрыть</Button>
              )}
              {parseStatus === "error" && (
                <Button variant="destructive" onClick={handleParseDialogClose}>
                  Закрыть
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button
          disabled={isProcessingNew}
          variant="outline"
          onClick={onScreenNew}
        >
          {isProcessingNew ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isProcessingNew ? "Оценка..." : "Оценить новые"}
        </Button>

        <ScreeningProgressDialog
          vacancyId={vacancyId}
          isOpen={isProcessingNew}
          onClose={onScreeningDialogClose}
        />
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
