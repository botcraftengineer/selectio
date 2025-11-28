import { asc, count, desc, eq } from "@selectio/db";
import { vacancyResponse } from "@selectio/db/schema";
import { z } from "zod/v4";
import { protectedProcedure } from "../../../trpc";

export const list = protectedProcedure
  .input(
    z.object({
      vacancyId: z.string(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
      sortField: z
        .enum(["createdAt", "score", "detailedScore", "status"])
        .nullable()
        .default(null),
      sortDirection: z.enum(["asc", "desc"]).default("desc"),
      screeningFilter: z
        .enum(["all", "evaluated", "not-evaluated", "high-score", "low-score"])
        .default("all"),
    }),
  )
  .query(async ({ ctx, input }) => {
    const {
      vacancyId,
      page,
      limit,
      sortField,
      sortDirection,
      screeningFilter,
    } = input;
    const offset = (page - 1) * limit;

    const whereCondition = eq(vacancyResponse.vacancyId, vacancyId);

    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(vacancyResponse)
      .where(whereCondition);

    const total = totalResult?.count ?? 0;

    let orderByClause;
    if (sortField === "createdAt") {
      orderByClause =
        sortDirection === "asc"
          ? asc(vacancyResponse.createdAt)
          : desc(vacancyResponse.createdAt);
    } else if (sortField === "status") {
      orderByClause =
        sortDirection === "asc"
          ? asc(vacancyResponse.status)
          : desc(vacancyResponse.status);
    } else {
      orderByClause = desc(vacancyResponse.createdAt);
    }

    const allResponses = await ctx.db.query.vacancyResponse.findMany({
      where: whereCondition,
      orderBy: [orderByClause],
      with: {
        screening: true,
        conversation: {
          with: {
            messages: true,
          },
        },
      },
    });

    let filteredResponses = allResponses;
    if (screeningFilter !== "all") {
      filteredResponses = allResponses.filter((response) => {
        switch (screeningFilter) {
          case "evaluated":
            return response.screening !== null;
          case "not-evaluated":
            return response.screening === null;
          case "high-score":
            return response.screening && response.screening.score >= 4;
          case "low-score":
            return response.screening && response.screening.score < 4;
          default:
            return true;
        }
      });
    }

    if (sortField === "score" || sortField === "detailedScore") {
      filteredResponses.sort((a, b) => {
        const scoreA =
          sortField === "score"
            ? (a.screening?.score ?? -1)
            : (a.screening?.detailedScore ?? -1);
        const scoreB =
          sortField === "score"
            ? (b.screening?.score ?? -1)
            : (b.screening?.detailedScore ?? -1);
        return sortDirection === "asc" ? scoreA - scoreB : scoreB - scoreA;
      });
    }

    const paginatedResponses = filteredResponses.slice(offset, offset + limit);

    return {
      responses: paginatedResponses,
      total: filteredResponses.length,
      page,
      limit,
      totalPages: Math.ceil(filteredResponses.length / limit),
    };
  });
