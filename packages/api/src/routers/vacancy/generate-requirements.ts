import { triggerVacancyRequirementsExtraction } from "@selectio/jobs";
import { z } from "zod/v4";
import { protectedProcedure } from "../../trpc";

export const generateRequirements = protectedProcedure
  .input(z.object({ vacancyId: z.string(), description: z.string() }))
  .mutation(async ({ input }) => {
    await triggerVacancyRequirementsExtraction(
      input.vacancyId,
      input.description
    );

    return { success: true };
  });
