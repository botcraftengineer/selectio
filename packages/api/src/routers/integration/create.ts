import { upsertIntegration, workspaceRepository } from "@selectio/db";
import { workspaceIdSchema } from "@selectio/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const createIntegration = protectedProcedure
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      type: z.string(),
      name: z.string(),
      credentials: z.record(z.string(), z.string()),
      metadata: z.record(z.string(), z.any()).optional(),
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
        message: "Недостаточно прав для создания интеграций",
      });
    }

    const integration = await upsertIntegration({
      workspaceId: input.workspaceId,
      type: input.type,
      name: input.name,
      credentials: input.credentials,
      metadata: input.metadata,
    });

    return {
      id: integration.id,
      type: integration.type,
      name: integration.name,
    };
  });
