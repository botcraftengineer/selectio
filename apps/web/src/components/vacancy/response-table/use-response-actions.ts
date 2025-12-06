import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  triggerRefreshVacancyResponses,
  triggerScreenAllResponses,
  triggerScreenNewResponses,
  triggerScreenResponsesBatch,
  triggerSendWelcomeBatch,
} from "~/actions/trigger";
import { useTRPC } from "~/trpc/react";

export function useResponseActions(
  vacancyId: string,
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void,
) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isProcessingNew, setIsProcessingNew] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const handleBulkScreen = async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);

    try {
      const result = await triggerScreenResponsesBatch(Array.from(selectedIds));

      if (!result.success) {
        console.error("Не удалось запустить пакетную оценку:", result.error);
        return;
      }

      console.log("Запущена оценка выбранных откликов");

      setSelectedIds(new Set());

      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter(),
        );
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScreenAll = async () => {
    setIsProcessingAll(true);

    try {
      const result = await triggerScreenAllResponses(vacancyId);

      if (!result.success) {
        console.error("Не удалось запустить оценку всех:", result.error);
        return;
      }

      console.log("Запущена оценка всех откликов");

      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter(),
        );
      }, 2000);
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleScreenNew = async () => {
    setIsProcessingNew(true);

    try {
      const result = await triggerScreenNewResponses(vacancyId);

      if (!result.success) {
        console.error("Не удалось запустить оценку новых:", result.error);
        toast.error("Не удалось запустить оценку откликов");
        return;
      }

      toast.success("Оценка новых откликов запущена");

      // Не сбрасываем isProcessingNew сразу - это будет сделано после закрытия диалога
    } catch (error) {
      console.error("Ошибка запуска оценки новых:", error);
      toast.error("Произошла ошибка");
      setIsProcessingNew(false);
    }
  };

  const handleScreeningDialogClose = () => {
    setIsProcessingNew(false);
    // Обновляем список откликов после закрытия диалога
    void queryClient.invalidateQueries(
      trpc.vacancy.responses.list.pathFilter(),
    );
  };

  const handleRefreshResponses = async () => {
    setIsRefreshing(true);

    try {
      const result = await triggerRefreshVacancyResponses(vacancyId);

      if (!result.success) {
        console.error("Не удалось запустить обновление:", result.error);
        setIsRefreshing(false);
        toast.error("Не удалось запустить обновление откликов");
        return result;
      }

      toast.success("Обновление откликов запущено");
      return result;
    } catch (error) {
      setIsRefreshing(false);
      toast.error("Произошла ошибка");
      throw error;
    }
  };

  const handleRefreshComplete = () => {
    setIsRefreshing(false);
    void queryClient.invalidateQueries(
      trpc.vacancy.responses.list.pathFilter(),
    );
  };

  const handleSendWelcomeBatch = async () => {
    if (selectedIds.size === 0) return;

    setIsSendingWelcome(true);

    try {
      const result = await triggerSendWelcomeBatch(Array.from(selectedIds));

      if (!result.success) {
        console.error(
          "Не удалось запустить пакетную отправку приветствий:",
          result.error,
        );
        return;
      }

      console.log("Запущена массовая отправка приветствий");

      setSelectedIds(new Set());

      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter(),
        );
      }, 3000);
    } finally {
      setIsSendingWelcome(false);
    }
  };

  return {
    isProcessing,
    isProcessingAll,
    isProcessingNew,
    isRefreshing,
    isSendingWelcome,
    handleBulkScreen,
    handleScreenAll,
    handleScreenNew,
    handleScreeningDialogClose,
    handleRefreshResponses,
    handleRefreshComplete,
    handleSendWelcomeBatch,
  };
}
