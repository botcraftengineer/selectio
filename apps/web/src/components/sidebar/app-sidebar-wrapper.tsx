"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { AppSidebar } from "./app-sidebar";

type WorkspaceWithRole = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: "owner" | "admin" | "member";
};

const ACTIVE_WORKSPACE_KEY = "active-workspace-id";

export function AppSidebarWrapper({
  workspaces,
  ...props
}: Omit<ComponentProps<typeof AppSidebar>, "onWorkspaceChange"> & {
  workspaces?: WorkspaceWithRole[];
}) {
  const router = useRouter();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<
    string | undefined
  >(() => {
    if (typeof window === "undefined") return workspaces?.[0]?.id;
    const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (saved) {
      const savedWorkspace = workspaces?.find((w) => w.id === saved);
      if (savedWorkspace) return saved;
    }
    return workspaces?.[0]?.id;
  });

  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const handleWorkspaceChange = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    const workspace = workspaces?.find((w) => w.id === workspaceId);
    if (workspace) {
      router.push(`/workspace/${workspace.slug}`);
    }
  };

  return (
    <AppSidebar
      {...props}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      onWorkspaceChange={handleWorkspaceChange}
    />
  );
}
