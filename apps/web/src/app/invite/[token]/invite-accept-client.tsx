"use client";

import { Button } from "@selectio/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTRPC } from "~/trpc/react";

interface InviteAcceptClientProps {
  invite: {
    id: string;
    workspaceId: string;
    role: "owner" | "admin" | "member";
    expiresAt: Date;
    workspace: {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
    };
  };
  token: string;
}

export function InviteAcceptClient({ invite, token }: InviteAcceptClientProps) {
  const trpc = useTRPC();
  const router = useRouter();

  const acceptInvite = useMutation(
    trpc.workspace.acceptInvite.mutationOptions({
      onSuccess: () => {
        toast.success(`Вы присоединились к ${invite.workspace.name}`);
        // Редиректим в workspace и обновляем страницу для загрузки новых данных
        router.push(`/${invite.workspace.slug}`);
        router.refresh();
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось принять приглашение");
      },
    }),
  );

  const handleAccept = () => {
    acceptInvite.mutate({ token });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Владелец";
      case "admin":
        return "Администратор";
      case "member":
        return "Участник";
      default:
        return role;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8">
        <div className="text-center space-y-2">
          {invite.workspace.logo && (
            <div className="flex justify-center mb-4">
              {/* biome-ignore lint/performance/noImgElement: external URL from database */}
              <img
                src={invite.workspace.logo}
                alt={invite.workspace.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold">Приглашение в workspace</h1>
          <p className="text-muted-foreground">
            Вы приглашены присоединиться к
          </p>
          <p className="text-xl font-semibold">{invite.workspace.name}</p>
        </div>

        <div className="space-y-2 rounded-lg bg-muted p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Роль:</span>
            <span className="font-medium">{getRoleLabel(invite.role)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Действительно до:</span>
            <span className="font-medium">
              {new Date(invite.expiresAt).toLocaleDateString("ru-RU")}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleAccept}
            disabled={acceptInvite.isPending}
            className="w-full"
          >
            {acceptInvite.isPending
              ? "Присоединение..."
              : "Принять приглашение"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="w-full"
            disabled={acceptInvite.isPending}
          >
            Отклонить
          </Button>
        </div>
      </div>
    </div>
  );
}
