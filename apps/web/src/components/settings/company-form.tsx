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
import { toast } from "sonner";
import {
  type CompanyFormValues,
  companyFormSchema,
} from "@selectio/validators";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { useTRPC } from "~/trpc/react";

export function CompanyForm({
  initialData,
}: {
  initialData?: Partial<CompanyFormValues>;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

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
    })
  );

  function onSubmit(data: CompanyFormValues) {
    updateCompany.mutate(data);
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
              <p className="text-sm text-amber-700/70">
                Название вашей компании
              </p>
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
              <p className="text-sm text-amber-700/70">
                Веб-сайт вашей компании
              </p>
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
              <p className="text-sm text-amber-700/70">
                Краткое описание вашей компании
              </p>
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
