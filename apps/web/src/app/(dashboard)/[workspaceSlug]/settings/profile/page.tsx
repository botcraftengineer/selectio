"use client";

import { Skeleton } from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { AccountForm } from "~/components/settings/account-form";
import { useTRPC } from "~/trpc/react";

export default function SettingsProfilePage() {
  const trpc = useTRPC();
  const { data: user, isLoading } = useQuery(trpc.user.me.queryOptions());

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <AccountForm
        initialData={{
          name: user?.name || "",
          language: user?.language || "en",
        }}
      />
    </div>
  );
}
