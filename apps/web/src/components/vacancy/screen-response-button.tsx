"use client";

import { Button } from "@selectio/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { triggerScreenResponse } from "~/actions/trigger";
import { useTRPC } from "~/trpc/react";
import { ScreeningResultModal } from "./screening-result-modal";

interface ScreenResponseButtonProps {
  responseId: string;
  accessToken: string | undefined;
  candidateName?: string;
}

export function ScreenResponseButton({
  responseId,
  candidateName,
}: ScreenResponseButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const triggerResult = await triggerScreenResponse(responseId);

      if (!triggerResult.success) {
        console.error("Не удалось запустить оценку:", triggerResult.error);
        return;
      }

      console.log("Запущена оценка отклика");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = (open: boolean) => {
    setShowModal(open);
    if (!open) {
      void queryClient.invalidateQueries(
        trpc.vacancy.responses.list.pathFilter(),
      );
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1" />
        )}
        {isLoading ? "Оценка..." : "Оценить"}
      </Button>

      <ScreeningResultModal
        open={showModal}
        onOpenChange={handleModalClose}
        result={null}
        candidateName={candidateName}
      />
    </>
  );
}
