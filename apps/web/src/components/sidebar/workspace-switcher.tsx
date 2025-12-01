"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@selectio/ui";
import { IconBriefcase, IconPlus } from "@tabler/icons-react";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";

type WorkspaceWithRole = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: "owner" | "admin" | "member";
};

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
}: {
  workspaces: WorkspaceWithRole[];
  activeWorkspaceId?: string;
  onWorkspaceChange?: (workspaceId: string) => void;
}) {
  const { isMobile } = useSidebar();
  const [activeWorkspace, setActiveWorkspace] = React.useState(
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0],
  );

  if (!activeWorkspace) {
    return null;
  }

  const handleWorkspaceChange = (workspace: WorkspaceWithRole) => {
    setActiveWorkspace(workspace);
    onWorkspaceChange?.(workspace.id);
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      owner: "Владелец",
      admin: "Администратор",
      member: "Участник",
    };
    return labels[role as keyof typeof labels] ?? role;
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {activeWorkspace.logo ? (
                  <img
                    src={activeWorkspace.logo}
                    alt={activeWorkspace.name}
                    className="size-8 rounded-lg object-cover"
                  />
                ) : (
                  <IconBriefcase className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeWorkspace.name}
                </span>
                <span className="truncate text-xs">
                  {getRoleLabel(activeWorkspace.role)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Рабочие пространства
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleWorkspaceChange(workspace)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {workspace.logo ? (
                    <img
                      src={workspace.logo}
                      alt={workspace.name}
                      className="size-6 rounded-md object-cover"
                    />
                  ) : (
                    <IconBriefcase className="size-3.5 shrink-0" />
                  )}
                </div>
                {workspace.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <IconPlus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">
                Создать workspace
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
