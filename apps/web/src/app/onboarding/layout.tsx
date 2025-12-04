import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "~/auth/server";
import { api } from "~/trpc/server";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Проверяем, есть ли у пользователя workspaces
  const caller = await api();
  const userWorkspaces = await caller.workspace.list();

  // Если есть workspaces, редиректим на главную
  if (userWorkspaces.length > 0) {
    redirect("/");
  }

  return <>{children}</>;
}
