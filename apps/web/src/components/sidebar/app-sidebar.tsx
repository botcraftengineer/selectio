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
  IconListDetails,
  IconMessage,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import type * as React from "react";
import { NavMain, NavSecondary, NavUser } from "~/components/sidebar";

const data = {
  navMain: [
    {
      title: "Панель управления",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Вакансии",
      url: "/vacancies",
      icon: IconFileDescription,
    },
    {
      title: "Отклики",
      url: "/responses",
      icon: IconListDetails,
    },
    {
      title: "Кандидаты",
      url: "/candidates",
      icon: IconUsers,
    },
    {
      title: "Чаты",
      url: "/chat",
      icon: IconMessage,
    },
  ],
  navSecondary: [
    {
      title: "Настройки",
      url: "/settings",
      icon: IconSettings,
    },
  ],
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Selectio Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
