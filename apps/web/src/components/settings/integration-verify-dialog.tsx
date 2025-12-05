"use client";

import { useInngestSubscription } from "@inngest/realtime/hooks";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  fetchVerifyIntegrationToken,
  triggerVerifyIntegrationHH,
} from "~/actions/realtime";
import { useTRPC } from "~/trpc/react";

interface IntegrationVerifyDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  integrationId: string;
  integrationType: string;
  integrationName: string;
}

type VerificationState = "idle" | "verifying" | "success" | "error";

export function IntegrationVerifyDialog({
  open,
  onClose,
  workspaceId,
  integrationId,
  integrationType,
  integrationName,
}: IntegrationVerifyDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [state, setState] = useState<VerificationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const { latestData } = useInngestSubscription({
    refreshToken: async () => fetchVerifyIntegrationToken(workspaceId),
    enabled: open && state === "verifying",
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      return await triggerVerifyIntegrationHH(workspaceId, integrationId);
    },
    onSuccess: (result) => {
      if (result.success) {
        setState("verifying");
      } else {
        setState("error");
        setErrorMessage(result.error || "Неизвестная ошибка");
        toast.error(`Ошибка: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      setState("error");
      setErrorMessage(error.message);
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  useEffect(() => {
    if (latestData && state === "verifying") {
      // latestData содержит обертку с полем data
      const wrapper = latestData as {
        data?: {
          integrationId: string;
          integrationType: string;
          success: boolean;
          isValid: boolean;
          error?: string;
        };
      };

      const message = wrapper.data;

      if (message && message.integrationType === integrationType) {
        if (message.success && message.isValid) {
          setState("success");
          queryClient.invalidateQueries({
            queryKey: trpc.integration.list.queryKey({ workspaceId }),
          });
          toast.success("Интеграция успешно проверена");
        } else {
          setState("error");
          setErrorMessage(message.error || "Проверка не пройдена");
          toast.error(message.error || "Проверка не пройдена");
        }
      }
    }
  }, [latestData, state, integrationType, queryClient, workspaceId, trpc]);

  const handleVerify = () => {
    setErrorMessage("");
    verifyMutation.mutate();
  };

  const handleClose = () => {
    setState("idle");
    setErrorMessage("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Проверка интеграции</DialogTitle>
          <DialogDescription>
            Проверяем подключение к {integrationName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          {state === "idle" && (
            <>
              <div className="rounded-full bg-muted p-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Нажмите кнопку ниже для проверки реквизитов доступа
              </p>
            </>
          )}

          {state === "verifying" && (
            <>
              <div className="relative">
                <div className="rounded-full bg-primary/10 p-4 animate-pulse">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Проверяем реквизиты доступа…
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Это может занять несколько секунд
              </p>
            </>
          )}

          {state === "success" && (
            <>
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-center">
                Интеграция успешно проверена!
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Все реквизиты доступа действительны
              </p>
            </>
          )}

          {state === "error" && (
            <>
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-medium text-center">
                Проверка не пройдена
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                {errorMessage || "Не удалось проверить реквизиты доступа"}
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          {state === "idle" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifyMutation.isPending}
              >
                Проверить
              </Button>
            </>
          )}

          {state === "verifying" && (
            <Button variant="outline" onClick={handleClose}>
              Отменить
            </Button>
          )}

          {(state === "success" || state === "error") && (
            <>
              {state === "error" && (
                <Button variant="outline" onClick={handleVerify}>
                  Попробовать снова
                </Button>
              )}
              <Button onClick={handleClose}>Закрыть</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
