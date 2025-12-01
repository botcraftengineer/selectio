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
  Separator,
} from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";

const workspaceFormSchema = z.object({
  name: z
    .string()
    .min(1, "Название обязательно")
    .max(32, "Максимум 32 символа"),
  slug: z
    .string()
    .min(1, "Slug обязателен")
    .max(48, "Максимум 48 символов")
    .regex(/^[a-z0-9-]+$/, "Только строчные буквы, цифры и дефисы"),
  logo: z.string().nullable().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export function WorkspaceForm({
  initialData,
  workspaceId,
}: {
  initialData?: Partial<WorkspaceFormValues>;
  workspaceId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData?.logo || null,
  );

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: initialData || {
      name: "",
      slug: "",
      logo: null,
    },
  });

  const updateWorkspace = useMutation(
    trpc.workspace.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Workspace успешно обновлен");
        await queryClient.invalidateQueries(trpc.workspace.pathFilter());
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось обновить workspace");
      },
    }),
  );

  const deleteWorkspace = useMutation(
    trpc.workspace.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Workspace успешно удален");
        window.location.href = "/";
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось удалить workspace");
      },
    }),
  );

  function onSubmit(data: WorkspaceFormValues) {
    updateWorkspace.mutate({
      id: workspaceId,
      ...data,
    });
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Размер файла не должен превышать 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        form.setValue("logo", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteWorkspace = () => {
    if (
      window.confirm(
        "Вы уверены, что хотите удалить этот workspace? Это действие необратимо.",
      )
    ) {
      deleteWorkspace.mutate({ id: workspaceId });
    }
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Workspace Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-medium">
                  Название Workspace
                </FormLabel>
                <Input placeholder="spillwood" {...field} />
                <p className="text-sm text-muted-foreground">
                  Это название вашего workspace на Dub.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Workspace Slug */}
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-medium">
                  Workspace Slug
                </FormLabel>
                <Input placeholder="spillwood" {...field} />
                <p className="text-sm text-muted-foreground">
                  Только строчные буквы, цифры и дефисы. Максимум 48 символов.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Workspace Logo */}
          <FormField
            control={form.control}
            name="logo"
            render={() => (
              <FormItem>
                <FormLabel className="text-foreground font-medium">
                  Логотип Workspace
                </FormLabel>
                <div className="flex items-start gap-4">
                  {logoPreview && (
                    <div className="relative h-20 w-20 rounded-lg overflow-hidden border">
                      <img
                        src={logoPreview}
                        alt="Workspace logo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Загрузить логотип</span>
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Рекомендуется квадратное изображение. Допустимые форматы:
                  .png, .jpg, .jpeg. Максимальный размер: 2MB.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="bg-foreground text-background hover:bg-foreground/90"
            disabled={updateWorkspace.isPending}
          >
            {updateWorkspace.isPending
              ? "Сохранение..."
              : "Сохранить изменения"}
          </Button>
        </form>
      </Form>

      <Separator />

      {/* Delete Workspace Section */}
      <div className="rounded-lg border border-destructive/50 p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Удалить Workspace
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Безвозвратно удалить ваш workspace, пользовательский домен и все
          связанные ссылки + их статистику. Это действие нельзя отменить -
          пожалуйста, действуйте осторожно.
        </p>
        <Button
          variant="destructive"
          onClick={handleDeleteWorkspace}
          disabled={deleteWorkspace.isPending}
        >
          {deleteWorkspace.isPending ? "Удаление..." : "Удалить Workspace"}
        </Button>
      </div>
    </div>
  );
}
