"use client";

import {
  Button,
  DialogFooter,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@selectio/ui";
import { Send } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { Step2Values } from "./types";

interface Step2CodeProps {
  form: UseFormReturn<Step2Values>;
  onSubmit: (data: Step2Values) => void;
  onCancel: () => void;
  onResend: () => void;
  phone: string;
  isLoading: boolean;
  isResending: boolean;
}

export function Step2Code({
  form,
  onSubmit,
  onCancel,
  onResend,
  phone,
  isLoading,
  isResending,
}: Step2CodeProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
        <FormField
          control={form.control}
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
                Код отправлен на {phone}.{" "}
                <button
                  type="button"
                  onClick={onResend}
                  disabled={isResending}
                  className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? "Отправка..." : "Отправить повторно"}
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
            onClick={onCancel}
            className="h-11"
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading} className="h-11">
            {isLoading ? "Проверка..." : "Войти"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
