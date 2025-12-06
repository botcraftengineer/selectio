import { useInngestSubscription } from "@inngest/realtime/hooks";
import type { ResponseStatus } from "@selectio/db/schema";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@selectio/ui";
import { Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  fetchRefreshVacancyResponsesToken,
  fetchScreenAllResponsesToken,
  fetchScreenNewResponsesToken,
} from "~/actions/realtime";

import {
  ResponseFilters,
  ResponseStatusFilter,
  type ScreeningFilter,
} from "~/components/response";

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

// Компонент для подписки на screen all - монтируется только когда нужен
function ScreenAllSubscription({
  vacancyId,
  onMessage,
}: {
  vacancyId: string;
  onMessage: (message: string) => void;
}) {
  const subscription = useInngestSubscription({
    refreshToken: () => fetchScreenAllResponsesToken(vacancyId),
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
  screeningFilter: ScreeningFilter;
  onFilterChange: (filter: ScreeningFilter) => void;
  statusFilter: ResponseStatus[];
  onStatusFilterChange: (statuses: ResponseStatus[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isRefreshing: boolean;
  isProcessingNew: boolean;
  isProcessingAll: boolean;
  onRefresh: () => void;
  onRefreshComplete: () => void;
  onScreenNew: () => void;
  onScreenAll: () => void;
  onScreeningDialogClose: () => void;
}

export function ResponseTableToolbar({
  vacancyId,
  totalResponses,
  screeningFilter,
  onFilterChange,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  isRefreshing,
  isProcessingNew,
  isProcessingAll,
  onRefresh,
  onRefreshComplete,
  onScreenNew,
  onScreenAll,
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

  const [screenAllDialogOpen, setScreenAllDialogOpen] = useState(false);
  const [screenAllError, setScreenAllError] = useState<string | null>(null);
  const [screenAllStatus, setScreenAllStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [screenAllMessage, setScreenAllMessage] = useState<string>("");
  const [screenAllProgress, setScreenAllProgress] = useState<{
    total: number;
    processed: number;
    failed: number;
  } | null>(null);
  const [screenAllSubscriptionActive, setScreenAllSubscriptionActive] =
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
        data: unknown;
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

  // Обработчик закрытия диалога screen all
  const handleScreenAllDialogClose = useCallback(() => {
    setScreenAllDialogOpen(false);
    setScreenAllError(null);
    setScreenAllMessage("");
    setScreenAllProgress(null);
    setScreenAllStatus("idle");
    setScreenAllSubscriptionActive(false);
    onScreeningDialogClose();
  }, [onScreeningDialogClose]);

  // Обработчик сообщений от screen all подписки
  const handleScreenAllMessage = useCallback(
    (messageStr: string) => {
      const message = JSON.parse(messageStr) as {
        topic: string;
        data: unknown;
      };

      if (message.topic === "progress") {
        const progressData = message.data as {
          status: string;
          message: string;
          total?: number;
          processed?: number;
          failed?: number;
        };
        setScreenAllMessage(progressData.message);
        if (progressData.total !== undefined) {
          setScreenAllProgress({
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
        setScreenAllProgress({
          total: resultData.total,
          processed: resultData.processed,
          failed: resultData.failed,
        });
        if (resultData.success) {
          setScreenAllStatus("success");
          setScreenAllMessage(
            `Оценка завершена! Обработано: ${resultData.processed} из ${resultData.total}`,
          );
        } else {
          setScreenAllStatus("error");
          setScreenAllError("Процесс завершился с ошибками");
        }

        // Автоматически закрываем диалог через 3 секунды после завершения
        setTimeout(() => {
          handleScreenAllDialogClose();
        }, 3000);
      }
    },
    [handleScreenAllDialogClose],
  );

  const handleScreenAllClick = async () => {
    setScreenAllError(null);
    setScreenAllMessage("");
    setScreenAllProgress(null);
    setScreenAllStatus("loading");
    setScreenAllSubscriptionActive(true); // Активируем подписку один раз

    try {
      await onScreenAll();
    } catch (error) {
      setScreenAllStatus("error");
      setScreenAllError(
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

      {screenNewSubscriptionActive && (
        <ScreenNewSubscription
          vacancyId={vacancyId}
          onMessage={handleScreenNewMessage}
        />
      )}
      {screenAllSubscriptionActive && (
        <ScreenAllSubscription
          vacancyId={vacancyId}
          onMessage={handleScreenAllMessage}
        />
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-4 md:px-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="text-sm text-muted-foreground">
            Всего откликов: {totalResponses}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <ResponseFilters
              selectedFilter={screeningFilter}
              onFilterChange={onFilterChange}
            />
            <ResponseStatusFilter
              selectedStatuses={statusFilter}
              onStatusChange={onStatusFilterChange}
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-full md:w-64 min-h-[44px] md:min-h-0 text-base md:text-sm"
              style={{ fontSize: "16px" }}
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
            <Button
              disabled={isRefreshing}
              variant="outline"
              onClick={() => setRefreshDialogOpen(true)}
              className="min-h-[44px] md:min-h-0 whitespace-nowrap flex-shrink-0"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">
                {isRefreshing ? "Обновление..." : "Получить новые отклики"}
              </span>
              <span className="sm:hidden">
                {isRefreshing ? "Обновление..." : "Получить"}
              </span>
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
              className="min-h-[44px] md:min-h-0 whitespace-nowrap flex-shrink-0"
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
          <Dialog
            open={screenAllDialogOpen}
            onOpenChange={(open) => {
              if (!open && screenAllStatus !== "loading") {
                handleScreenAllDialogClose();
              }
            }}
          >
            <Button
              disabled={isProcessingAll}
              variant="default"
              onClick={() => setScreenAllDialogOpen(true)}
              className="min-h-[44px] md:min-h-0 whitespace-nowrap flex-shrink-0"
            >
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">
                {isProcessingAll
                  ? "Оценка..."
                  : `Оценить всех (${totalResponses})`}
              </span>
              <span className="sm:hidden">
                {isProcessingAll ? "Оценка..." : "Оценить всех"}
              </span>
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Оценка всех откликов</DialogTitle>
                <div>
                  {screenAllStatus === "idle" && (
                    <>
                      Вы собираетесь запустить оценку для {totalResponses}{" "}
                      {totalResponses === 1
                        ? "отклика"
                        : totalResponses < 5
                          ? "откликов"
                          : "откликов"}
                      . Процесс будет выполняться в фоновом режиме, и результаты
                      появятся в таблице автоматически.
                    </>
                  )}
                  {screenAllStatus === "loading" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {screenAllMessage || "Запускаем оценку откликов..."}
                        </span>
                      </div>
                      {screenAllProgress && screenAllProgress.total > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Прогресс:
                            </span>
                            <span className="font-medium">
                              {screenAllProgress.processed} /{" "}
                              {screenAllProgress.total}
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.round((screenAllProgress.processed / screenAllProgress.total) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {screenAllStatus === "success" && (
                    <div className="space-y-4">
                      <div className="text-green-600">
                        ✓ {screenAllMessage || "Процесс успешно завершен!"}
                      </div>
                      {screenAllProgress && (
                        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-foreground">
                              {screenAllProgress.total}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Всего
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {screenAllProgress.processed}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Успешно
                            </div>
                          </div>
                          {screenAllProgress.failed > 0 && (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-destructive">
                                {screenAllProgress.failed}
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
                  {screenAllStatus === "error" && (
                    <div className="text-red-600">
                      ✗ Ошибка:{" "}
                      {screenAllError || "Не удалось запустить процесс"}
                    </div>
                  )}
                </div>
              </DialogHeader>
              <DialogFooter>
                {screenAllStatus === "idle" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleScreenAllDialogClose}
                    >
                      Отмена
                    </Button>
                    <Button onClick={handleScreenAllClick}>
                      Оценить отклики
                    </Button>
                  </>
                )}
                {screenAllStatus === "loading" && (
                  <Button disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Выполняется...
                  </Button>
                )}
                {screenAllStatus === "success" && (
                  <Button onClick={handleScreenAllDialogClose}>Закрыть</Button>
                )}
                {screenAllStatus === "error" && (
                  <Button
                    variant="destructive"
                    onClick={handleScreenAllDialogClose}
                  >
                    Закрыть
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
