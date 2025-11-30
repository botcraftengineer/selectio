"use client";

import { Button } from "@selectio/ui";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { triggerGenerateRequirements } from "~/actions/trigger";

interface GenerateRequirementsButtonProps {
  vacancyId: string;
  description: string;
}

export function GenerateRequirementsButton({
  vacancyId,
  description,
}: GenerateRequirementsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await triggerGenerateRequirements(vacancyId, description);
      if (result.success) {
        toast.success("Генерация требований запущена");
      } else {
        toast.error(result.error || "Ошибка запуска генерации");
      }
    } catch (_error) {
      toast.error("Ошибка запуска генерации");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={isLoading || !description}
      variant="outline"
      size="sm"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {isLoading ? "Генерация..." : "Сгенерировать требования"}
    </Button>
  );
}
