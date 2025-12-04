import { redirect } from "next/navigation";
import { getSession } from "~/auth/server";
import { api } from "~/trpc/server";
import { InviteAcceptClient } from "./invite-accept-client";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getSession();

  if (!session?.user) {
    // Сохраняем токен в query параметре для редиректа после логина
    redirect(`/auth/signin?redirect=/invite/${token}`);
  }

  try {
    // Получаем информацию о приглашении
    const caller = await api();
    const invite = await caller.workspace.getInviteByToken({ token });

    if (!invite) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Приглашение не найдено</h1>
            <p className="text-muted-foreground">
              Ссылка приглашения недействительна или истекла
            </p>
          </div>
        </div>
      );
    }

    // Проверяем, не истекло ли приглашение
    if (new Date(invite.expiresAt) < new Date()) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Приглашение истекло</h1>
            <p className="text-muted-foreground">
              Срок действия этой ссылки истек. Попросите новую ссылку у
              администратора workspace.
            </p>
          </div>
        </div>
      );
    }

    // Проверяем, не является ли пользователь уже участником
    const userWorkspaces = await caller.workspace.list();
    const isAlreadyMember = userWorkspaces.some(
      (uw) => uw.workspace.id === invite.workspaceId,
    );

    if (isAlreadyMember) {
      // Если уже участник, редиректим в workspace
      redirect(`/${invite.workspace.slug}`);
    }

    return <InviteAcceptClient invite={invite} token={token} />;
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Ошибка</h1>
          <p className="text-muted-foreground">
            Не удалось загрузить информацию о приглашении
          </p>
        </div>
      </div>
    );
  }
}
