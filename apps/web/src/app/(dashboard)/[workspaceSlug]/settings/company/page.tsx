"use client";

import { Skeleton } from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { CompanyForm } from "~/components/settings/company-form";
import { useTRPC } from "~/trpc/react";

export default function SettingsCompanyPage() {
  const trpc = useTRPC();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;

  // Получаем workspace по slug
  const { data: workspaceData } = useQuery(
    trpc.workspace.bySlug.queryOptions({ slug: workspaceSlug }),
  );

  const workspaceId = workspaceData?.workspace.id;
  const userRole = workspaceData?.role;

  // Получаем настройки компании
  const { data: company, isLoading } = useQuery({
    ...trpc.company.get.queryOptions({
      workspaceId: workspaceId || "",
    }),
    enabled: !!workspaceId,
  });

  if (isLoading || !workspaceId) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <CompanyForm
        workspaceId={workspaceId}
        initialData={{
          name: company?.name || "",
          website: company?.website || "",
          description: company?.description || "",
        }}
        userRole={userRole}
      />
    </div>
  );
}
