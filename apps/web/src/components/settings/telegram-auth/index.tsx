"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "~/trpc/react";
import { Step1Credentials } from "./step1-credentials";
import { Step2Code } from "./step2-code";
import { Step3Password } from "./step3-password";
import {
  type ApiData,
  type Step1Values,
  type Step2Values,
  type Step3Values,
  step1Schema,
  step2Schema,
  step3Schema,
} from "./types";

interface TelegramAuthDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function TelegramAuthDialog({
  open,
  onClose,
  workspaceId,
}: TelegramAuthDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [sessionData, setSessionData] = useState<string>("");

  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { apiId: "", apiHash: "", phone: "" },
  });

  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { phoneCode: "" },
  });

  const form3 = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: { password: "" },
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
        } else if ("requiresPassword" in data && data.requiresPassword) {
          if (data.sessionData) {
            setSessionData(data.sessionData);
          }
          setStep(3);
          toast.info("Требуется пароль 2FA");
        }
      },
      onError: (err) => {
        if (
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

    setApiData({ apiId, apiHash: data.apiHash, phone: data.phone });
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

  const stepDescriptions = {
    1: "Введите данные вашего Telegram приложения",
    2: "Введите код из SMS",
    3: "Введите пароль 2FA",
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-semibold">
            Подключить Telegram
          </DialogTitle>
          <DialogDescription className="text-base">
            {stepDescriptions[step]}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <Step1Credentials
            form={form1}
            onSubmit={onStep1Submit}
            onCancel={handleClose}
            isLoading={sendCodeMutation.isPending}
          />
        )}

        {step === 2 && (
          <Step2Code
            form={form2}
            onSubmit={onStep2Submit}
            onCancel={handleClose}
            onResend={handleResendCode}
            phone={apiData?.phone || ""}
            isLoading={signInMutation.isPending}
            isResending={sendCodeMutation.isPending}
          />
        )}

        {step === 3 && (
          <Step3Password
            form={form3}
            onSubmit={onStep3Submit}
            onCancel={handleClose}
            isLoading={checkPasswordMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
