import { upsertIntegration } from "@selectio/db";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const createIntegration = protectedProcedure
  .input(
    z.object({
      type: z.string(),
      name: z.string(),
      credentials: z.record(z.string(), z.string()),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const integration = await upsertIntegration({
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
