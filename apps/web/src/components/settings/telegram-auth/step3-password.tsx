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
import { Eye, EyeOff, Key } from "lucide-react";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Step3Values } from "./types";

interface Step3PasswordProps {
  form: UseFormReturn<Step3Values>;
  onSubmit: (data: Step3Values) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function Step3Password({
  form,
  onSubmit,
  onCancel,
  isLoading,
}: Step3PasswordProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                Пароль 2FA
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
