import { getUserIntegrations } from "@selectio/db";
import { protectedProcedure } from "../../trpc";

export const listIntegrations = protectedProcedure.query(async ({ ctx }) => {
  const integrations = await getUserIntegrations(ctx.session.user.id);

  // Не возвращаем credentials на клиент
  return integrations.map((int: (typeof integrations)[number]) => ({
    id: int.id,
    type: int.type,
    name: int.name,
    isActive: int.isActive,
    lastUsedAt: int.lastUsedAt,
    createdAt: int.createdAt,
    updatedAt: int.updatedAt,
    hasCookies: !!int.cookies,
    hasCredentials: !!int.credentials,
  }));
});
