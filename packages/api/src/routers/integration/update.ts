import {
  getIntegration,
  upsertIntegration,
  workspaceRepository,
} from "@selectio/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const updateIntegration = protectedProcedure
  .input(
    z.object({
      workspaceId: z.string(),
      type: z.string(),
      name: z.string().optional(),
      credentials: z.record(z.string(), z.string()).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    // Проверка доступа к workspace
    const access = await workspaceRepository.checkAccess(
      input.workspaceId,
      ctx.session.user.id,
    );

    if (!access || (access.role !== "owner" && access.role !== "admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Недостаточно прав для изменения интеграций",
      });
    }

    const integration = await getIntegration(input.type, input.workspaceId);

    if (!integration) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Интеграция не найдена",
      });
    }

    const updated = await upsertIntegration({
      workspaceId: input.workspaceId,
      type: input.type,
      name: input.name ?? integration.name,
      credentials: input.credentials ?? integration.credentials,
      metadata: input.metadata ?? integration.metadata,
      isActive: input.isActive ?? integration.isActive,
    });

    return {
      id: updated.id,
      type: updated.type,
      name: updated.name,
    };
  });
