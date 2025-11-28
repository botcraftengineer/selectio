import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  triggerParseNewResumes,
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
  const [isParsingResumes, setIsParsingResumes] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const handleBulkScreen = async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);

    try {
      const result = await triggerScreenResponsesBatch(Array.from(selectedIds));

      if (!result.success) {
        console.error("Failed to trigger batch screening:", result.error);
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
        console.error("Failed to trigger screen all:", result.error);
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
        console.error("Failed to trigger screen new:", result.error);
        return;
      }

      console.log("Запущена оценка новых откликов");

      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter(),
        );
      }, 2000);
    } finally {
      setIsProcessingNew(false);
    }
  };

  const handleRefreshResponses = async () => {
    setIsRefreshing(true);

    try {
      const result = await triggerRefreshVacancyResponses(vacancyId);

      if (!result.success) {
        console.error("Failed to trigger refresh:", result.error);
        return;
      }

      console.log("Запущено обновление откликов для вакансии");

      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter(),
        );
      }, 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendWelcomeBatch = async () => {
    if (selectedIds.size === 0) return;

    setIsSendingWelcome(true);

    try {
      const result = await triggerSendWelcomeBatch(Array.from(selectedIds));

      if (!result.success) {
        console.error("Failed to trigger welcome batch:", result.error);
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

  const handleParseNewResumes = async () => {
    setIsParsingResumes(true);

    try {
      const result = await triggerParseNewResumes(vacancyId);

      if (!result.success) {
        console.error("Failed to trigger parse resumes:", result.error);
        toast.error("Не удалось запустить парсинг резюме");
        return;
      }

      toast.success("Парсинг резюме запущен");

      setTimeout(() => {
        void queryClient.invalidateQueries(
          trpc.vacancy.responses.list.pathFilter(),
        );
      }, 3000);
    } finally {
      setIsParsingResumes(false);
    }
  };

  return {
    isProcessing,
    isProcessingAll,
    isProcessingNew,
    isRefreshing,
    isSendingWelcome,
    isParsingResumes,
    handleBulkScreen,
    handleScreenAll,
    handleScreenNew,
    handleRefreshResponses,
    handleSendWelcomeBatch,
    handleParseNewResumes,
  };
}
