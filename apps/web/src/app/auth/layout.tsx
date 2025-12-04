import type { ReactNode } from "react";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Редирект обрабатывается в middleware
  return <>{children}</>;
}
