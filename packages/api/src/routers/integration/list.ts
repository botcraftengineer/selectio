import { getAllIntegrations } from "@selectio/db";
import { protectedProcedure } from "../../trpc";

export const listIntegrations = protectedProcedure.query(async () => {
  const integrations = await getAllIntegrations();

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
