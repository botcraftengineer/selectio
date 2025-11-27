import { getUserIntegrations, upsertIntegration } from "@selectio/db";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const updateIntegration = protectedProcedure
  .input(
    z.object({
      type: z.string(),
      name: z.string().optional(),
      credentials: z.record(z.string(), z.string()).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      isActive: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const existing = await getUserIntegrations(ctx.session.user.id);
    const integration = existing.find(
      (i: (typeof existing)[number]) => i.type === input.type
    );

    if (!integration) {
      throw new Error("Интеграция не найдена");
    }

    const updated = await upsertIntegration({
      userId: ctx.session.user.id,
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
