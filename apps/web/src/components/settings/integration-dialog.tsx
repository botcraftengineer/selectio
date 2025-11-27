"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";

interface IntegrationDialogProps {
  open: boolean;
  onClose: () => void;
  editingType: string | null;
}

import { AVAILABLE_INTEGRATIONS } from "~/lib/integrations";

const INTEGRATION_TYPES = AVAILABLE_INTEGRATIONS.map((int) => ({
  value: int.type,
  label: int.name,
  fields: int.fields,
}));

export function IntegrationDialog({
  open,
  onClose,
  editingType,
}: IntegrationDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [type, setType] = useState(editingType || "hh");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: {
      type: string;
      name: string;
      credentials: Record<string, string>;
    }) => trpc.integration.create.mutate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.integration.list.queryKey(),
      });
      handleClose();
    },
  });

  const handleClose = () => {
    setType("hh");
    setName("");
    setCredentials({});
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedType = INTEGRATION_TYPES.find((t) => t.value === type);
    if (!selectedType) return;

    // Проверяем что все поля заполнены
    const allFieldsFilled = selectedType.fields.every((field) =>
      credentials[field]?.trim()
    );

    if (!allFieldsFilled) {
      alert("Заполните все поля");
      return;
    }

    createMutation.mutate({
      type,
      name: name || selectedType.label,
      credentials,
    });
  };

  const selectedType = INTEGRATION_TYPES.find((t) => t.value === type);

  return (
    <Sheet open={open} onOpenChange={(open: boolean) => !open && handleClose()}>
      <SheetContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col h-full gap-6">
          <SheetHeader className="space-y-3">
            <SheetTitle>
              {editingType ? "Редактировать" : "Добавить"} интеграцию
            </SheetTitle>
            <SheetDescription>
              Подключите внешний сервис для автоматизации работы
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              <Label htmlFor="type">Тип интеграции</Label>
              <Select
                value={type}
                onValueChange={setType}
                disabled={!!editingType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="name">Название (опционально)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedType?.label}
              />
            </div>

            {selectedType?.fields.map((field) => (
              <div key={field} className="space-y-3">
                <Label htmlFor={field}>
                  {field === "email"
                    ? "Email"
                    : field === "password"
                      ? "Пароль"
                      : field}
                </Label>
                <Input
                  id={field}
                  type={field === "password" ? "password" : "text"}
                  value={credentials[field] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            ))}
          </div>

          <SheetFooter className="gap-3 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 sm:flex-none"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              {createMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
