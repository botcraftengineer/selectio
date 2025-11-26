"use client";

import { Button, toast } from "@selectio/ui";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useTRPC } from "~/trpc/react";

interface GenerateRequirementsButtonProps {
  vacancyId: string;
  description: string;
}

export function GenerateRequirementsButton({
  vacancyId,
  description,
}: GenerateRequirementsButtonProps) {
  const trpc = useTRPC();

  const generateMutation = useMutation(
    trpc.vacancy.generateRequirements.mutationOptions({
      onSuccess: () => {
        toast.success("Генерация требований запущена");
      },
      onError: () => {
        toast.error("Ошибка запуска генерации");
      },
    })
  );

  const handleGenerate = () => {
    generateMutation.mutate({ vacancyId, description });
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={generateMutation.isPending || !description}
      variant="outline"
      size="sm"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {generateMutation.isPending ? "Генерация..." : "Сгенерировать требования"}
    </Button>
  );
}
