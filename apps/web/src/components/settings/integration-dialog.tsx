"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
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
} from "@selectio/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Eye, EyeOff, Mail } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  fetchVerifyHHCredentialsToken,
  triggerVerifyHHCredentials,
} from "~/actions/integration";
import { AVAILABLE_INTEGRATIONS } from "~/lib/integrations";
import { useTRPC } from "~/trpc/react";

interface IntegrationDialogProps {
  open: boolean;
  onClose: () => void;
  selectedType: string | null;
  isEditing: boolean;
  onVerify?: (type: string) => void;
}

const integrationFormSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  email: z.email({ error: "Некорректный email" }),
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
  selectedType,
  isEditing,
  onVerify,
}: IntegrationDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const [showPassword, setShowPassword] = useState(false);

  const { data: workspaceData } = useQuery(
    trpc.workspace.bySlug.queryOptions({ slug: workspaceSlug }),
  );

  const { data: integrations } = useQuery({
    ...trpc.integration.list.queryOptions({
      workspaceId: workspaceData?.workspace?.id || "",
    }),
    enabled: !!workspaceData?.workspace?.id && isEditing,
  });

  const existingIntegration = integrations?.find(
    (i) => i.type === selectedType,
  );

  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      type: selectedType || "hh",
      name: "",
      email: "",
      password: "",
    },
  });

  const integrationType = INTEGRATION_TYPES.find(
    (t) => t.value === form.watch("type"),
  );

  useEffect(() => {
    if (selectedType) {
      form.setValue("type", selectedType);
      if (isEditing && existingIntegration) {
        form.setValue("name", existingIntegration.name || "");
        // Backend расшифровывает credentials и возвращает email как отдельное поле
        const email = (existingIntegration as { email?: string | null }).email;
        form.setValue("email", email || "");
      } else if (!isEditing) {
        form.setValue("name", "");
        form.setValue("email", "");
        form.setValue("password", "");
      }
    }
  }, [selectedType, isEditing, existingIntegration, form]);

  const createMutation = useMutation(
    trpc.integration.create.mutationOptions({
      onSuccess: (_, variables) => {
        toast.success("Интеграция успешно создана");
        if (workspaceData?.workspace?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.integration.list.queryKey({
              workspaceId: workspaceData.workspace.id,
            }),
          });
        }
        handleClose();

        // Запускаем проверку после создания
        if (onVerify) {
          setTimeout(() => {
            onVerify(variables.type);
          }, 500);
        }
      },
      onError: (err) => {
        const message = err.message || "Не удалось создать интеграцию";
        if (message.includes("unique") || message.includes("уже существует")) {
          toast.error(
            "Интеграция этого типа уже подключена к workspace. Удалите существующую интеграцию перед добавлением новой.",
          );
        } else {
          toast.error(message);
        }
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.integration.update.mutationOptions({
      onSuccess: () => {
        toast.success("Интеграция успешно обновлена");
        if (workspaceData?.workspace?.id) {
          queryClient.invalidateQueries({
            queryKey: trpc.integration.list.queryKey({
              workspaceId: workspaceData.workspace.id,
            }),
          });
        }
        handleClose();
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось обновить интеграцию");
      },
    }),
  );

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success?: boolean;
    isValid?: boolean;
    error?: string;
  } | null>(null);

  const { data: verifyData } = useInngestSubscription({
    refreshToken: () =>
      fetchVerifyHHCredentialsToken(workspaceData?.workspace?.id || ""),
    enabled: isVerifying && !!workspaceData?.workspace?.id,
  });

  useEffect(() => {
    if (verifyData) {
      const result = verifyData as {
        status?: string;
        success?: boolean;
        isValid?: boolean;
        error?: string;
      };

      if (result.status === "success") {
        setVerificationResult({
          success: true,
          isValid: true,
        });
        setIsVerifying(false);
      } else if (result.status === "error") {
        setVerificationResult({
          success: false,
          isValid: false,
          error: result.error || "Ошибка проверки данных",
        });
        setIsVerifying(false);
        toast.error(result.error || "Ошибка проверки данных");
      }
    }
  }, [verifyData]);

  const handleClose = () => {
    form.reset();
    setShowPassword(false);
    onClose();
  };

  const onSubmit = async (data: IntegrationFormValues) => {
    if (!workspaceData?.workspace?.id) {
      toast.error("Workspace не найден");
      return;
    }

    const payload = {
      workspaceId: workspaceData.workspace.id,
      type: data.type,
      name: data.name || integrationType?.label || "",
      credentials: {
        email: data.email,
        password: data.password,
      },
    };

    if (data.type === "hh") {
      try {
        setIsVerifying(true);
        setVerificationResult(null);

        toast.info(
          "Проверка данных может занять до 2 минут. Пожалуйста, подождите…",
          { duration: 5000 },
        );

        await triggerVerifyHHCredentials(
          data.email,
          data.password,
          workspaceData.workspace.id,
        );

        // Wait for verification result
        await new Promise<void>((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (verificationResult) {
              clearInterval(checkInterval);
              if (verificationResult.success && verificationResult.isValid) {
                resolve();
              } else {
                reject(
                  new Error(
                    verificationResult.error || "Ошибка проверки данных",
                  ),
                );
              }
            }
          }, 100);

          // Timeout after 2 minutes
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!verificationResult) {
              setIsVerifying(false);
              reject(new Error("Превышено время ожидания проверки"));
            }
          }, 120000);
        });
      } catch {
        setIsVerifying(false);
        return;
      }
    }

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open: boolean) => !open && handleClose()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            {isEditing ? "Редактировать" : "Подключить"} интеграцию
          </DialogTitle>
          <DialogDescription className="text-base">
            {isEditing
              ? "Обновите данные интеграции для продолжения работы"
              : "Подключите внешний сервис для автоматизации работы с вакансиями и откликами"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 pt-2"
          >
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
              <p>
                Для подключения HeadHunter используйте учетные данные вашего
                аккаунта работодателя
              </p>
              <p className="text-xs">Проверка данных может занять до 2 минут</p>
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Тип интеграции
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Название (опционально)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={integrationType?.label}
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Используется для идентификации интеграции
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Пароль
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-11 pr-10"
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
                  </FormControl>
                  <FormDescription className="text-xs">
                    Пароль хранится в зашифрованном виде
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-11"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  isVerifying
                }
                className="h-11"
              >
                {isVerifying
                  ? "Проверка данных…"
                  : isEditing
                    ? updateMutation.isPending
                      ? "Обновление…"
                      : "Обновить"
                    : createMutation.isPending
                      ? "Подключение…"
                      : "Подключить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
