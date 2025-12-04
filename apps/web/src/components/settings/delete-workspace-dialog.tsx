"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
} from "@selectio/ui";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface DeleteWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteWorkspaceDialog({
  open,
  onOpenChange,
  workspaceSlug,
  onConfirm,
  isDeleting = false,
}: DeleteWorkspaceDialogProps) {
  const [slugInput, setSlugInput] = useState("");

  const isSlugValid = slugInput === workspaceSlug;
  const canDelete = isSlugValid && !isDeleting;

  const handleConfirm = () => {
    if (canDelete) {
      onConfirm();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Сбросить поле при закрытии
        setSlugInput("");
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Удалить Workspace
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            Внимание: Это безвозвратно удалит ваш workspace, все интеграции
            HH.ru, вакансии, отклики кандидатов и их статистику.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="slug-input" className="text-sm font-medium">
              Введите workspace slug{" "}
              <span className="font-semibold">{workspaceSlug}</span> для
              продолжения:
            </Label>
            <Input
              id="slug-input"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              placeholder={workspaceSlug}
              disabled={isDeleting}
              className={
                slugInput && !isSlugValid
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
            />
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete}
            className="w-full"
          >
            {isDeleting ? "Удаление..." : "Подтвердить удаление workspace"}
          </Button>
          <AlertDialogCancel
            disabled={isDeleting}
            className="w-full mt-0"
            onClick={() => handleOpenChange(false)}
          >
            Отмена
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
