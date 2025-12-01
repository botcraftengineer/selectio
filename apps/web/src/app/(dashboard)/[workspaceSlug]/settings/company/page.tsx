"use client";

import { Skeleton } from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { CompanyForm } from "~/components/settings/company-form";
import { useTRPC } from "~/trpc/react";

export default function SettingsCompanyPage() {
  const trpc = useTRPC();
  const { data: company, isLoading } = useQuery(
    trpc.company.get.queryOptions(),
  );

  if (isLoading) {
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
        initialData={{
          name: company?.name || "",
          website: company?.website || "",
          description: company?.description || "",
        }}
      />
    </div>
  );
}
