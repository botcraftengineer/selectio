"use client";

import { Skeleton } from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { ProfileForm } from "~/components/settings/profile-form";
import { useTRPC } from "~/trpc/react";

export default function SettingsProfilePage() {
  const trpc = useTRPC();
  const { data: user, isLoading } = useQuery(trpc.user.me.queryOptions());

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <div className="rounded-lg border p-6 space-y-8">
            {/* Avatar skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Username field skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>

            {/* Email field skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-80" />
            </div>

            {/* Bio field skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Button skeleton */}
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <div className="rounded-lg border p-6">
          <ProfileForm
            initialData={{
              username: user?.username || "",
              email: user?.email || "",
              bio: user?.bio || "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
