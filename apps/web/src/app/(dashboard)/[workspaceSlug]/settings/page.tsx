import { redirect } from "next/navigation";

export default function SettingsPage({
  params,
}: {
  params: { workspaceSlug: string };
}) {
  redirect(`/${params.workspaceSlug}/settings/profile`);
}
