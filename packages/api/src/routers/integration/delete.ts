import { deleteIntegration, workspaceRepository } from "@selectio/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const deleteIntegrationProcedure = protectedProcedure
  .input(z.object({ type: z.string(), workspaceId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    // Проверка доступа к workspace
    const access = await workspaceRepository.checkAccess(
      input.workspaceId,
      ctx.session.user.id,
    );

    if (!access || (access.role !== "owner" && access.role !== "admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Недостаточно прав для удаления интеграций",
      });
    }

    await deleteIntegration(input.type, input.workspaceId);
    return { success: true };
  });
