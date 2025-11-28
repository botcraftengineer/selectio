import { deleteIntegration } from "@selectio/db";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const deleteIntegrationProcedure = protectedProcedure
  .input(z.object({ type: z.string() }))
  .mutation(async ({ input }) => {
    await deleteIntegration(input.type);
    return { success: true };
  });
