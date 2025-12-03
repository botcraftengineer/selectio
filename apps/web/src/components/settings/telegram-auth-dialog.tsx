"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
} from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash, Key, Phone, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";

interface TelegramAuthDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

const step1Schema = z.object({
  apiId: z.string().min(1, "API ID обязателен"),
  apiHash: z.string().min(1, "API Hash обязателен"),
  phone: z.string().min(1, "Номер телефона обязателен"),
});

const step2Schema = z.object({
  phoneCode: z.string().min(1, "Код обязателен"),
});

const step3Schema = z.object({
  password: z.string().min(1, "Пароль обязателен"),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

export function TelegramAuthDialog({
  open,
  onClose,
  workspaceId,
}: TelegramAuthDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [apiData, setApiData] = useState<{
    apiId: number;
    apiHash: string;
    phone: string;
  } | null>(null);
  const [sessionData, setSessionData] = useState<string>("");

  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      apiId: "",
      apiHash: "",
      phone: "",
    },
  });

  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      phoneCode: "",
    },
  });

  const form3 = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      password: "",
    },
  });

  const sendCodeMutation = useMutation(
    trpc.telegram.sendCode.mutationOptions({
      onSuccess: (data) => {
        setPhoneCodeHash(data.phoneCodeHash);
        setSessionData(data.sessionData);
        setStep(2);
        toast.success("Код отправлен на ваш телефон");
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось отправить код");
      },
    }),
  );

  const signInMutation = useMutation(
    trpc.telegram.signIn.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Успешная авторизация!");
          queryClient.invalidateQueries({
            queryKey: trpc.telegram.getSessions.queryKey({ workspaceId }),
          });
          handleClose();
        }
      },
      onError: (err) => {
        if (err.message === "SESSION_PASSWORD_NEEDED") {
          // Сохраняем sessionData из ошибки если есть
          const errorData = err.data as { cause?: { sessionData?: string } };
          if (errorData?.cause?.sessionData) {
            setSessionData(errorData.cause.sessionData);
          }
          setStep(3);
          toast.info("Требуется пароль 2FA");
        } else if (
          err.message === "PHONE_CODE_EXPIRED" ||
          err.message === "PHONE_CODE_INVALID"
        ) {
          const errorText =
            err.message === "PHONE_CODE_EXPIRED"
              ? "Код истёк. Отправьте новый код"
              : "Неверный код";
          toast.error(errorText);
          form2.reset();
          setSessionData("");
        } else {
          toast.error(err.message || "Ошибка авторизации");
        }
      },
    }),
  );

  const checkPasswordMutation = useMutation(
    trpc.telegram.checkPassword.mutationOptions({
      onSuccess: () => {
        toast.success("Успешная авторизация!");
        queryClient.invalidateQueries({
          queryKey: trpc.telegram.getSessions.queryKey({ workspaceId }),
        });
        handleClose();
      },
      onError: (err) => {
        toast.error(err.message || "Неверный пароль");
      },
    }),
  );

  const handleClose = () => {
    form1.reset();
    form2.reset();
    form3.reset();
    setStep(1);
    setPhoneCodeHash("");
    setApiData(null);
    setSessionData("");
    onClose();
  };

  const onStep1Submit = (data: Step1Values) => {
    const apiId = Number.parseInt(data.apiId, 10);
    if (Number.isNaN(apiId)) {
      toast.error("API ID должен быть числом");
      return;
    }

    setApiData({
      apiId,
      apiHash: data.apiHash,
      phone: data.phone,
    });

    sendCodeMutation.mutate({
      apiId,
      apiHash: data.apiHash,
      phone: data.phone,
    });
  };

  const onStep2Submit = (data: Step2Values) => {
    if (!apiData) return;

    signInMutation.mutate({
      workspaceId,
      ...apiData,
      phoneCode: data.phoneCode,
      phoneCodeHash,
      sessionData,
    });
  };

  const handleResendCode = () => {
    if (!apiData) return;

    sendCodeMutation.mutate({
      apiId: apiData.apiId,
      apiHash: apiData.apiHash,
      phone: apiData.phone,
    });
  };

  const onStep3Submit = (data: Step3Values) => {
    if (!apiData) return;

    checkPasswordMutation.mutate({
      workspaceId,
      ...apiData,
      password: data.password,
      sessionData,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open: boolean) => !open && handleClose()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-semibold">
            Подключить Telegram
          </DialogTitle>
          <DialogDescription className="text-base">
            {step === 1 && "Введите данные вашего Telegram приложения"}
            {step === 2 && "Введите код из SMS"}
            {step === 3 && "Введите пароль 2FA"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Form {...form1}>
            <form
              onSubmit={form1.handleSubmit(onStep1Submit)}
              className="space-y-6 pt-2"
            >
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <p>
                  Для подключения Telegram нужно создать приложение на{" "}
                  <a
                    href="https://my.telegram.org/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    my.telegram.org/apps
                  </a>
                </p>
              </div>

              <FormField
                control={form1.control}
                name="apiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      API ID
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="123456" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form1.control}
                name="apiHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      API Hash
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0123456789abcdef0123456789abcdef"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form1.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Номер телефона
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+79991234567"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Введите номер в международном формате
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
                  disabled={sendCodeMutation.isPending}
                  className="h-11"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendCodeMutation.isPending ? "Отправка..." : "Отправить код"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...form2}>
            <form
              onSubmit={form2.handleSubmit(onStep2Submit)}
              className="space-y-6 pt-2"
            >
              <FormField
                control={form2.control}
                name="phoneCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      Код из SMS
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345"
                        className="h-11 text-center text-lg tracking-widest"
                        maxLength={5}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-center">
                      Код отправлен на {apiData?.phone}.{" "}
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={sendCodeMutation.isPending}
                        className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendCodeMutation.isPending
                          ? "Отправка..."
                          : "Отправить повторно?"}
                      </button>
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
                  disabled={signInMutation.isPending}
                  className="h-11"
                >
                  {signInMutation.isPending ? "Проверка..." : "Войти"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {step === 3 && (
          <Form {...form3}>
            <form
              onSubmit={form3.handleSubmit(onStep3Submit)}
              className="space-y-6 pt-2"
            >
              <FormField
                control={form3.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      Пароль 2FA
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Введите пароль двухфакторной аутентификации
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
                  disabled={checkPasswordMutation.isPending}
                  className="h-11"
                >
                  {checkPasswordMutation.isPending ? "Проверка..." : "Войти"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
