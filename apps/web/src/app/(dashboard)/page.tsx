import { redirect } from "next/navigation";
import { getSession } from "~/auth/server";
import { api } from "~/trpc/server";

export default async function Page() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Получаем workspaces пользователя
  const caller = await api();
  const userWorkspaces = await caller.workspace.list();

  // Редирект на первый workspace
  const firstWorkspace = userWorkspaces[0];
  if (firstWorkspace) {
    redirect(`/${firstWorkspace.workspace.slug}`);
  }

  // Если нет workspaces, редирект на создание
  redirect("/onboarding");
}
