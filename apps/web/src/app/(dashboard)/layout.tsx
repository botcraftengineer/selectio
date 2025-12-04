import { SidebarInset, SidebarProvider } from "@selectio/ui";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "~/auth/server";
import { AppSidebarWrapper } from "~/components/sidebar";
import { api } from "~/trpc/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const caller = await api();
  const userWorkspaces = await caller.workspace.list();

  // Если нет workspaces, редирект на создание
  // (логика с приглашениями обрабатывается на странице /invite/[token])
  if (userWorkspaces.length === 0) {
    redirect("/onboarding");
  }

  // Преобразуем данные для компонента
  const workspaces = userWorkspaces.map((uw) => ({
    id: uw.workspace.id,
    name: uw.workspace.name,
    slug: uw.workspace.slug,
    logo: uw.workspace.logo,
    role: uw.role,
  }));

  return (
    <SidebarProvider>
      <AppSidebarWrapper
        user={{
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image || "",
        }}
        workspaces={workspaces}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
