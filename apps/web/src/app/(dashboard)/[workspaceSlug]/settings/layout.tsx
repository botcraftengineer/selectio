import type { ReactNode } from "react";
import { SiteHeader } from "~/components/layout";
import { SettingsSidebar } from "~/components/settings/settings-sidebar";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  return (
    <>
      <SiteHeader title="" />
      <div className="space-y-6 p-10 pb-16 max-w-5xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">
            Управляйте настройками workspace и интеграциями.
          </p>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-[240px] shrink-0">
            <div className="rounded-lg border p-2">
              <SettingsSidebar workspaceSlug={workspaceSlug} />
            </div>
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}
