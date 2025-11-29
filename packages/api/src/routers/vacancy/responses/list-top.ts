import { desc } from "@selectio/db";
import { vacancyResponse } from "@selectio/db/schema";
import { z } from "zod";
import { protectedProcedure } from "../../../trpc";

export const listTop = protectedProcedure
  .input(
    z
      .object({
        limit: z.number().int().min(1).max(20).default(5),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    const limit = input?.limit ?? 5;

    const allResponses = await ctx.db.query.vacancyResponse.findMany({
      orderBy: [desc(vacancyResponse.createdAt)],
      with: {
        vacancy: {
          columns: {
            id: true,
            title: true,
          },
        },
        screening: {
          columns: {
            score: true,
            detailedScore: true,
          },
        },
      },
      columns: {
        id: true,
        candidateName: true,
        createdAt: true,
      },
    });

    return allResponses
      .filter((r) => r.screening?.detailedScore != null)
      .sort(
        (a, b) =>
          (b.screening?.detailedScore ?? 0) - (a.screening?.detailedScore ?? 0),
      )
      .slice(0, limit);
  });
