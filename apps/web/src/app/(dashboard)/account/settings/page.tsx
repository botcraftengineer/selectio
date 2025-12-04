"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@selectio/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "~/auth/client";
import { SiteHeader } from "~/components/layout";
import { DeleteAccountDialog } from "~/components/settings/delete-account-dialog";
import { useTRPC } from "~/trpc/react";

export default function AccountSettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery(trpc.user.me.queryOptions());

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatar(user.image || null);
    }
  }, [user]);

  const handleUpdateName = async () => {
    setIsUpdatingName(true);
    try {
      await authClient.updateUser({ name });
      toast.success("Изменения сохранены");
      await queryClient.invalidateQueries(trpc.user.pathFilter());
    } catch {
      toast.error("Не удалось сохранить изменения");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateAvatar = async () => {
    setIsUpdatingAvatar(true);
    try {
      await authClient.updateUser({ image: avatar });
      toast.success("Изменения сохранены");
      await queryClient.invalidateQueries(trpc.user.pathFilter());
    } catch {
      toast.error("Не удалось сохранить изменения");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const deleteAccount = useMutation(
    trpc.user.deleteAccount.mutationOptions({
      onSuccess: async () => {
        toast.success("Аккаунт успешно удален");
        window.location.href = "/auth/signin";
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось удалить аккаунт");
      },
    }),
  );

  const handleDeleteAccount = () => {
    deleteAccount.mutate();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Размер файла не должен превышать 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <>
        <SiteHeader title="Настройки аккаунта" />
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Настройки аккаунта
            </h1>
            <p className="text-muted-foreground mt-2">
              Управляйте настройками вашего аккаунта
            </p>
          </div>
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader title="Настройки аккаунта" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Настройки аккаунта
          </h1>
          <p className="text-muted-foreground mt-2">
            Управляйте настройками вашего аккаунта
          </p>
        </div>

        {/* Your Name */}
        <Card>
          <CardHeader>
            <CardTitle>Ваше имя</CardTitle>
            <CardDescription>
              Это ваше отображаемое имя на платформе.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите ваше имя"
                maxLength={32}
              />
              <p className="text-sm text-muted-foreground">
                Максимум 32 символа.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button
              onClick={handleUpdateName}
              disabled={isUpdatingName || !name || name === user?.name}
            >
              {isUpdatingName ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </CardFooter>
        </Card>

        {/* Your Email */}
        <Card>
          <CardHeader>
            <CardTitle>Ваш Email</CardTitle>
            <CardDescription>
              Это email, который вы используете для входа и получения
              уведомлений. Для изменения требуется подтверждение.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input
                type="email"
                value={user?.email || ""}
                placeholder="your@email.com"
                disabled
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button disabled>Сохранить изменения</Button>
          </CardFooter>
        </Card>

        {/* Your Avatar */}
        <Card>
          <CardHeader>
            <CardTitle>Ваш аватар</CardTitle>
            <CardDescription>
              Это изображение вашего аватара на платформе.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatar || undefined} />
                <AvatarFallback className="text-2xl">
                  {name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <label htmlFor="avatar-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Загрузить аватар
                    </span>
                  </Button>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Рекомендуется квадратное изображение. Форматы: .png, .jpg,
                  .jpeg. Максимум: 2MB.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button
              onClick={handleUpdateAvatar}
              disabled={isUpdatingAvatar || !avatar || avatar === user?.image}
            >
              {isUpdatingAvatar ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </CardFooter>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Удалить аккаунт</CardTitle>
            <CardDescription>
              Безвозвратно удалить ваш аккаунт, все ваши workspace, ссылки и их
              статистику. Это действие нельзя отменить - пожалуйста, действуйте
              осторожно.
            </CardDescription>
          </CardHeader>
          <CardFooter className="border-t border-destructive/50 px-6 py-4 flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Удалить аккаунт
            </Button>
          </CardFooter>
        </Card>

        <DeleteAccountDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          userAvatar={user?.image}
          onConfirm={handleDeleteAccount}
          isDeleting={deleteAccount.isPending}
        />
      </div>
    </>
  );
}
