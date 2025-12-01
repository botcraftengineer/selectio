import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "~/auth/server";
import { api } from "~/trpc/server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { workspaceSlug } = await params;

  // Получаем workspaces пользователя
  const caller = await api();
  const userWorkspaces = await caller.workspace.list();

  // Находим workspace по slug
  const currentWorkspace = userWorkspaces.find(
    (uw) => uw.workspace.slug === workspaceSlug,
  );

  if (!currentWorkspace) {
    redirect("/access-denied");
  }

  return <>{children}</>;
}
