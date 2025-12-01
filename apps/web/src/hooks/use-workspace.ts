"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTRPC } from "~/trpc/react";

export function useWorkspace() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string | undefined;
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery({
    ...trpc.workspace.bySlug.queryOptions({ slug: workspaceSlug ?? "" }),
    enabled: !!workspaceSlug,
  });

  return {
    workspace: data?.workspace,
    role: data?.role,
    workspaceSlug,
    isLoading,
    error,
  };
}
