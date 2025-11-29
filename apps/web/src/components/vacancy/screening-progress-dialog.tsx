"use client";

import { useInngestSubscription } from "@inngest/realtime/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Progress,
} from "@selectio/ui";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchScreenNewResponsesToken } from "~/actions/realtime";

interface ScreeningProgressDialogProps {
  vacancyId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ScreeningProgressDialog({
  vacancyId,
  isOpen,
  onClose,
}: ScreeningProgressDialogProps) {
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Подписываемся на канал Realtime
  const { data, error } = useInngestSubscription({
    refreshToken: async () => {
      return await fetchScreenNewResponsesToken(vacancyId);
    },
  });

  // Получаем последнее сообщение
  const latestMessage = data[data.length - 1];
  const isCompleted = latestMessage?.topic === "result";
  const progressData =
    latestMessage?.topic === "progress" ? latestMessage.data : null;
  const resultData =
    latestMessage?.topic === "result" ? latestMessage.data : null;

  // Вычисляем прогресс
  const progress = progressData?.total
    ? Math.round(((progressData.processed || 0) / progressData.total) * 100)
    : 0;

  // Автоматически закрываем диалог через 3 секунды после завершения
  useEffect(() => {
    if (isCompleted && resultData) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      setAutoCloseTimer(timer);
    }

    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [isCompleted, resultData, onClose, autoCloseTimer]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Оценка новых откликов</DialogTitle>
          <DialogDescription>
            Отслеживание прогресса обработки откликов
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span>Ошибка подключения к серверу</span>
            </div>
          )}

          {!progressData && !resultData && !error && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Подключение...</span>
            </div>
          )}

          {progressData && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progressData.message}
                  </span>
                  {progressData.total && (
                    <span className="font-medium">
                      {progressData.processed || 0} / {progressData.total}
                    </span>
                  )}
                </div>

                {progressData.total && progressData.total > 0 && (
                  <Progress value={progress} className="h-2" />
                )}
              </div>

              {progressData.status === "processing" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Обработка откликов...</span>
                </div>
              )}
            </>
          )}

          {resultData && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Оценка завершена!</span>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Всего откликов:</span>
                  <span className="font-medium">{resultData.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Обработано:</span>
                  <span className="font-medium text-green-600">
                    {resultData.processed}
                  </span>
                </div>
                {resultData.failed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ошибок:</span>
                    <span className="font-medium text-destructive">
                      {resultData.failed}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Диалог закроется автоматически через 3 секунды
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
