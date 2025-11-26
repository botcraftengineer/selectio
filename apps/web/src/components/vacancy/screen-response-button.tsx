"use client";

import { Button } from "@selectio/ui";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { triggerScreenResponse } from "~/actions/trigger";
import { ScreeningResultModal } from "./screening-result-modal";

interface ScreenResponseButtonProps {
  responseId: string;
  accessToken: string | undefined;
  candidateName?: string;
}

export function ScreenResponseButton({
  responseId,
  accessToken,
  candidateName,
}: ScreenResponseButtonProps) {
  const [runId, setRunId] = useState<string | undefined>();
  const [isTriggering, setIsTriggering] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { run } = useRealtimeRun(runId, {
    accessToken,
    enabled: !!accessToken && !!runId,
  });

  useEffect(() => {
    if (run?.status === "COMPLETED" && run.output) {
      setShowModal(true);
    }
  }, [run?.status, run?.output]);

  const handleClick = async () => {
    setIsTriggering(true);
    const result = await triggerScreenResponse(responseId);
    setIsTriggering(false);

    if (result.success) {
      setRunId(result.runId);
    }
  };

  const isRunning = isTriggering || run?.status === "EXECUTING";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={!accessToken || isRunning}
      >
        <Sparkles className="h-4 w-4 mr-1" />
        {isRunning ? "Оценка..." : "Оценить"}
      </Button>

      <ScreeningResultModal
        open={showModal}
        onOpenChange={setShowModal}
        result={run?.output?.result || null}
        candidateName={candidateName}
      />
    </>
  );
}
