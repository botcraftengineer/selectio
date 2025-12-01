"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@selectio/ui";
import {
  IconDashboard,
  IconFileDescription,
  IconInnerShadowTop,
  IconMessage,
  IconSettings,
} from "@tabler/icons-react";
import type * as React from "react";
import {
  NavMain,
  NavSecondary,
  NavUser,
  WorkspaceSwitcher,
} from "~/components/sidebar";

const getNavData = (workspaceSlug?: string) => ({
  navMain: [
    {
      title: "Панель управления",
      url: workspaceSlug ? `/${workspaceSlug}` : "/",
      icon: IconDashboard,
    },
    {
      title: "Вакансии",
      url: workspaceSlug ? `/${workspaceSlug}/vacancies` : "/vacancies",
      icon: IconFileDescription,
    },
    {
      title: "Чаты",
      url: workspaceSlug ? `/${workspaceSlug}/chat` : "/chat",
      icon: IconMessage,
    },
  ],
  navSecondary: [
    {
      title: "Настройки",
      url: workspaceSlug ? `/${workspaceSlug}/settings` : "/settings",
      icon: IconSettings,
    },
  ],
});

type WorkspaceWithRole = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: "owner" | "admin" | "member";
};

export function AppSidebar({
  user,
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  workspaces?: WorkspaceWithRole[];
  activeWorkspaceId?: string;
  onWorkspaceChange?: (workspaceId: string) => void;
}) {
  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);
  const data = getNavData(activeWorkspace?.slug);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href={activeWorkspace ? `/${activeWorkspace.slug}` : "/"}>
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">Selectio</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {workspaces && workspaces.length > 0 && (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onWorkspaceChange={onWorkspaceChange}
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
