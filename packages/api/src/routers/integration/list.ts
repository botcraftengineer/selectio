import {
  decryptCredentials,
  getIntegrationsByWorkspace,
  workspaceRepository,
} from "@selectio/db";
import { workspaceIdSchema } from "@selectio/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const listIntegrations = protectedProcedure
  .input(z.object({ workspaceId: workspaceIdSchema }))
  .query(async ({ input, ctx }) => {
    // Проверка доступа к workspace
    const access = await workspaceRepository.checkAccess(
      input.workspaceId,
      ctx.session.user.id,
    );

    if (!access) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Нет доступа к workspace",
      });
    }

    const integrations = await getIntegrationsByWorkspace(input.workspaceId);

    // Не возвращаем credentials на клиент, только email
    return integrations.map((int: (typeof integrations)[number]) => {
      let email: string | null = null;

      if (int.credentials) {
        try {
          const decrypted = decryptCredentials(
            int.credentials as Record<string, string>,
          );
          email = decrypted.email || null;
        } catch (error) {
          console.error("Failed to decrypt credentials:", error);
        }
      }

      return {
        id: int.id,
        type: int.type,
        name: int.name,
        isActive: int.isActive,
        lastUsedAt: int.lastUsedAt,
        createdAt: int.createdAt,
        updatedAt: int.updatedAt,
        metadata: int.metadata,
        hasCookies: !!int.cookies,
        hasCredentials: !!int.credentials,
        email,
      };
    });
  });
