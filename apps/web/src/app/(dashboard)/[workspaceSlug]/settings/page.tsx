"use client";

import { Skeleton } from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { WorkspaceForm } from "~/components/settings/workspace-form";
import { useTRPC } from "~/trpc/react";

export default function SettingsPage() {
  const trpc = useTRPC();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  const { data, isLoading } = useQuery(
    trpc.workspace.bySlug.queryOptions({ slug: workspaceSlug }),
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-32" />
      </div>
    );
  }

  if (!data?.workspace) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">Workspace не найден</p>
      </div>
    );
  }

  const { workspace, role } = data;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <WorkspaceForm
          initialData={{
            name: workspace.name,
            slug: workspace.slug,
            logo: workspace.logo,
          }}
          workspaceId={workspace.id}
          userRole={role}
        />
      </div>
    </div>
  );
}
