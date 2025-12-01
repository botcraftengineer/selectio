import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "~/auth/server";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <>{children}</>;
}
