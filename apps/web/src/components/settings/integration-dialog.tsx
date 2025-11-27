"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
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
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AVAILABLE_INTEGRATIONS } from "~/lib/integrations";
import { useTRPC } from "~/trpc/react";

interface IntegrationDialogProps {
  open: boolean;
  onClose: () => void;
  editingType: string | null;
}

const integrationFormSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Пароль обязателен"),
});

type IntegrationFormValues = z.infer<typeof integrationFormSchema>;

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
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      type: editingType || "hh",
      name: "",
      email: "",
      password: "",
    },
  });

  const selectedType = INTEGRATION_TYPES.find(
    (t) => t.value === form.watch("type")
  );

  useEffect(() => {
    if (editingType) {
      form.setValue("type", editingType);
    }
  }, [editingType, form]);

  const createMutation = useMutation(
    trpc.integration.create.mutationOptions({
      onSuccess: () => {
        toast.success("Интеграция успешно создана");
        queryClient.invalidateQueries({
          queryKey: trpc.integration.list.queryKey(),
        });
        handleClose();
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось создать интеграцию");
      },
    })
  );

  const handleClose = () => {
    form.reset();
    setShowPassword(false);
    onClose();
  };

  const onSubmit = (data: IntegrationFormValues) => {
    createMutation.mutate({
      type: data.type,
      name: data.name || selectedType?.label || "",
      credentials: {
        email: data.email,
        password: data.password,
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(open: boolean) => !open && handleClose()}>
      <SheetContent className="sm:max-w-md">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full gap-6"
          >
            <SheetHeader className="space-y-3">
              <SheetTitle>
                {editingType ? "Редактировать" : "Добавить"} интеграцию
              </SheetTitle>
              <SheetDescription>
                Подключите внешний сервис для автоматизации работы
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1 mx-5">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип интеграции</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название (опционально)</FormLabel>
                    <Input placeholder={selectedType?.label} {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
        </Form>
      </SheetContent>
    </Sheet>
  );
}
