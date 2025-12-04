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
  Textarea,
} from "@selectio/ui";
import {
  type CompanyFormValues,
  companyFormSchema,
} from "@selectio/validators";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useTRPC } from "~/trpc/react";

export function CompanyForm({
  initialData,
  workspaceId,
  userRole,
}: {
  initialData?: Partial<CompanyFormValues>;
  workspaceId: string;
  userRole?: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const canEdit = userRole === "owner" || userRole === "admin";

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: initialData || {
      name: "",
      website: "",
      description: "",
    },
  });

  const updateCompany = useMutation(
    trpc.company.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Компания успешно обновлена");
        await queryClient.invalidateQueries(trpc.company.pathFilter());
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось обновить компанию");
      },
    }),
  );

  function onSubmit(data: CompanyFormValues) {
    updateCompany.mutate({
      workspaceId,
      data,
    });
  }

  if (!canEdit) {
    return (
      <div className="rounded-lg border border-muted p-6">
        <p className="text-muted-foreground">
          У вас нет прав для изменения настроек компании. Обратитесь к
          администратору.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground font-medium">
                Название компании
              </FormLabel>
              <Input placeholder="ООО Рога и Копыта" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground font-medium">
                Сайт
              </FormLabel>
              <Input placeholder="https://example.com" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground font-medium">
                Описание
              </FormLabel>
              <Textarea
                placeholder="Расскажите о вашей компании..."
                className="min-h-[120px]"
                {...field}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="bg-foreground text-background hover:bg-foreground/90"
          disabled={updateCompany.isPending}
        >
          {updateCompany.isPending ? "Сохранение..." : "Сохранить"}
        </Button>
      </form>
    </Form>
  );
}
