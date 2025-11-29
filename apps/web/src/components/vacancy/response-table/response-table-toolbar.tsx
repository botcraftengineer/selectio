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
import { useCallback, useEffect, useState } from "react";
import {
  fetchRefreshVacancyResponsesToken,
  fetchScreenNewResponsesToken,
} from "~/actions/realtime";
import { getParseResumesToken } from "~/actions/trigger";
import { ResponseFilters, type ScreeningFilter } from "~/components/response";
import { ScreeningProgressDialog } from "../screening-progress-dialog";

// Компонент для подписки на refresh - монтируется только когда нужен
function RefreshSubscription({
  vacancyId,
  onMessage,
}: {
  vacancyId: string;
  onMessage: (message: string) => void;
}) {
  const subscription = useInngestSubscription({
    refreshToken: () => fetchRefreshVacancyResponsesToken(vacancyId),
    enabled: true,
  });

  useEffect(() => {
    if (subscription.latestData) {
      const data = subscription.latestData;
      if (data.kind === "data" && data.topic === "status") {
        const statusData = data.data as {
          status: string;
          message: string;
          vacancyId?: string;
        };
        onMessage(JSON.stringify(statusData));
      }
    }
  }, [subscription.latestData, onMessage]);

  return null;
}

// Компонент для подписки на parse - монтируется только когда нужен
function ParseSubscription({
  onMessage,
}: {
  onMessage: (message: string) => void;
}) {
  const subscription = useInngestSubscription({
    refreshToken: getParseResumesToken,
    enabled: true,
  });

  useEffect(() => {
    if (subscription.latestData) {
      const data = subscription.latestData;
      if (data.kind === "data" && data.topic === "status") {
        const statusData = data.data as {
          status: string;
          message: string;
          total?: number;
          processed?: number;
        };
        onMessage(JSON.stringify(statusData));
      }
    }
  }, [subscription.latestData, onMessage]);

  return null;
}

// Компонент для подписки на screen new - монтируется только когда нужен
function ScreenNewSubscription({
  vacancyId,
  onMessage,
}: {
  vacancyId: string;
  onMessage: (message: string) => void;
}) {
  const subscription = useInngestSubscription({
    refreshToken: () => fetchScreenNewResponsesToken(vacancyId),
    enabled: true,
  });

  useEffect(() => {
    if (subscription.latestData) {
      const data = subscription.latestData;
      if (data.kind === "data") {
        onMessage(JSON.stringify({ topic: data.topic, data: data.data }));
      }
    }
  }, [subscription.latestData, onMessage]);

  return null;
}

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
  const [refreshSubscriptionActive, setRefreshSubscriptionActive] =
    useState(false);

  const [parseDialogOpen, setParseDialogOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [parseMessage, setParseMessage] = useState<string>("");
  const [parseSubscriptionActive, setParseSubscriptionActive] = useState(false);

  const [screenNewDialogOpen, setScreenNewDialogOpen] = useState(false);
  const [screenNewError, setScreenNewError] = useState<string | null>(null);
  const [screenNewStatus, setScreenNewStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [screenNewMessage, setScreenNewMessage] = useState<string>("");
  const [screenNewProgress, setScreenNewProgress] = useState<{
    total: number;
    processed: number;
    failed: number;
  } | null>(null);
  const [screenNewSubscriptionActive, setScreenNewSubscriptionActive] =
    useState(false);

  // Обработчик сообщений от refresh подписки
  const handleRefreshMessage = (messageStr: string) => {
    const statusData = JSON.parse(messageStr) as {
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
  };

  // Обработчик сообщений от parse подписки
  const handleParseMessage = (messageStr: string) => {
    const statusData = JSON.parse(messageStr) as {
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
  };

  // Обработчик закрытия диалога screen new
  const handleScreenNewDialogClose = useCallback(() => {
    setScreenNewDialogOpen(false);
    setScreenNewError(null);
    setScreenNewMessage("");
    setScreenNewProgress(null);
    setScreenNewStatus("idle");
    setScreenNewSubscriptionActive(false);
    onScreeningDialogClose();
  }, [onScreeningDialogClose]);

  // Обработчик сообщений от screen new подписки
  const handleScreenNewMessage = useCallback(
    (messageStr: string) => {
      const message = JSON.parse(messageStr) as {
        topic: string;
        data: any;
      };

      if (message.topic === "progress") {
        const progressData = message.data as {
          status: string;
          message: string;
          total?: number;
          processed?: number;
          failed?: number;
        };
        setScreenNewMessage(progressData.message);
        if (progressData.total !== undefined) {
          setScreenNewProgress({
            total: progressData.total,
            processed: progressData.processed || 0,
            failed: progressData.failed || 0,
          });
        }
      } else if (message.topic === "result") {
        const resultData = message.data as {
          success: boolean;
          total: number;
          processed: number;
          failed: number;
        };
        setScreenNewProgress({
          total: resultData.total,
          processed: resultData.processed,
          failed: resultData.failed,
        });
        if (resultData.success) {
          setScreenNewStatus("success");
          setScreenNewMessage(
            `Оценка завершена! Обработано: ${resultData.processed} из ${resultData.total}`,
          );
        } else {
          setScreenNewStatus("error");
          setScreenNewError("Процесс завершился с ошибками");
        }

        // Автоматически закрываем диалог через 3 секунды после завершения
        setTimeout(() => {
          handleScreenNewDialogClose();
        }, 3000);
      }
    },
    [handleScreenNewDialogClose],
  );

  const handleRefreshClick = async () => {
    setRefreshError(null);
    setRefreshMessage("");
    setRefreshStatus("loading");
    setRefreshSubscriptionActive(true); // Активируем подписку один раз

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
      setRefreshSubscriptionActive(false); // Деактивируем подписку
    }
  };

  const handleParseClick = async () => {
    setParseError(null);
    setParseMessage("");
    setParseStatus("loading");
    setParseSubscriptionActive(true); // Активируем подписку один раз

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
      setParseSubscriptionActive(false); // Деактивируем подписку
    }
  };

  const handleScreenNewClick = async () => {
    setScreenNewError(null);
    setScreenNewMessage("");
    setScreenNewProgress(null);
    setScreenNewStatus("loading");
    setScreenNewSubscriptionActive(true); // Активируем подписку один раз

    try {
      await onScreenNew();
    } catch (error) {
      setScreenNewStatus("error");
      setScreenNewError(
        error instanceof Error ? error.message : "Произошла ошибка",
      );
    }
  };

  return (
    <>
      {/* Условный рендеринг подписок - монтируются один раз при запуске процесса */}
      {refreshSubscriptionActive && (
        <RefreshSubscription
          vacancyId={vacancyId}
          onMessage={handleRefreshMessage}
        />
      )}
      {parseSubscriptionActive && (
        <ParseSubscription onMessage={handleParseMessage} />
      )}
      {screenNewSubscriptionActive && (
        <ScreenNewSubscription
          vacancyId={vacancyId}
          onMessage={handleScreenNewMessage}
        />
      )}

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
                      Будет запущен процесс получения новых откликов с
                      HeadHunter для этой вакансии. Процесс будет выполняться в
                      фоновом режиме, и новые отклики появятся в таблице
                      автоматически.
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
                    <Button
                      variant="outline"
                      onClick={handleRefreshDialogClose}
                    >
                      Отмена
                    </Button>
                    <Button onClick={handleRefreshClick}>
                      Получить отклики
                    </Button>
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
                      <span>
                        {parseMessage || "Запускаем парсинг резюме..."}
                      </span>
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
                    <Button onClick={handleParseClick}>
                      Запустить парсинг
                    </Button>
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
                  <Button
                    variant="destructive"
                    onClick={handleParseDialogClose}
                  >
                    Закрыть
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={screenNewDialogOpen}
            onOpenChange={(open) => {
              if (!open && screenNewStatus !== "loading") {
                handleScreenNewDialogClose();
              }
            }}
          >
            <Button
              disabled={isProcessingNew}
              variant="outline"
              onClick={() => setScreenNewDialogOpen(true)}
            >
              {isProcessingNew ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isProcessingNew ? "Оценка..." : "Оценить новые"}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Оценка новых откликов</DialogTitle>
                <div>
                  {screenNewStatus === "idle" && (
                    <>
                      Будет запущен процесс оценки новых откликов (без
                      скрининга). Процесс будет выполняться в фоновом режиме, и
                      результаты появятся в таблице автоматически.
                    </>
                  )}
                  {screenNewStatus === "loading" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {screenNewMessage || "Запускаем оценку откликов..."}
                        </span>
                      </div>
                      {screenNewProgress && screenNewProgress.total > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Прогресс:
                            </span>
                            <span className="font-medium">
                              {screenNewProgress.processed} /{" "}
                              {screenNewProgress.total}
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.round((screenNewProgress.processed / screenNewProgress.total) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {screenNewStatus === "success" && (
                    <div className="space-y-4">
                      <div className="text-green-600">
                        ✓ {screenNewMessage || "Процесс успешно завершен!"}
                      </div>
                      {screenNewProgress && (
                        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-foreground">
                              {screenNewProgress.total}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Всего
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {screenNewProgress.processed}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Успешно
                            </div>
                          </div>
                          {screenNewProgress.failed > 0 && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-destructive">
                                {screenNewProgress.failed}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Ошибок
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {screenNewStatus === "error" && (
                    <div className="text-red-600">
                      ✗ Ошибка:{" "}
                      {screenNewError || "Не удалось запустить процесс"}
                    </div>
                  )}
                </div>
              </DialogHeader>
              <DialogFooter>
                {screenNewStatus === "idle" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleScreenNewDialogClose}
                    >
                      Отмена
                    </Button>
                    <Button onClick={handleScreenNewClick}>
                      Оценить отклики
                    </Button>
                  </>
                )}
                {screenNewStatus === "loading" && (
                  <Button disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Выполняется...
                  </Button>
                )}
                {screenNewStatus === "success" && (
                  <Button onClick={handleScreenNewDialogClose}>Закрыть</Button>
                )}
                {screenNewStatus === "error" && (
                  <Button
                    variant="destructive"
                    onClick={handleScreenNewDialogClose}
                  >
                    Закрыть
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <AlertDialogTitle>
                  Подтверждение массовой оценки
                </AlertDialogTitle>
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
                  Процесс будет выполняться в фоновом режиме. Вы можете
                  продолжать работу, а результаты появятся автоматически.
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
    </>
  );
}
