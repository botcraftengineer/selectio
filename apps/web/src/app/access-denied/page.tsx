"use client";

import { Button } from "@selectio/ui";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "~/auth/client";

export default function AccessDeniedPage() {
  const router = useRouter();
  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth/signin"); // redirect to login page
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Доступ запрещен</h1>
          <p className="text-muted-foreground">
            У вас нет прав для доступа к этой странице. Только администраторы
            могут просматривать dashboard.
          </p>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSignOut}
            variant="default"
            size="lg"
            className="w-full"
          >
            Выйти из аккаунта
          </Button>
        </div>
      </div>
    </div>
  );
}
