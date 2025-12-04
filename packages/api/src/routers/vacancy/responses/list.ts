import type { SQL } from "@selectio/db";
import { and, asc, desc, eq, gte, ilike, inArray, lt, sql } from "@selectio/db";
import {
  responseScreening,
  telegramConversation,
  telegramMessage,
  vacancyResponse,
} from "@selectio/db/schema";
import { z } from "zod";
import { protectedProcedure } from "../../../trpc";

export const list = protectedProcedure
  .input(
    z.object({
      vacancyId: z.string(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(50),
      sortField: z
        .enum(["createdAt", "score", "detailedScore", "status", "respondedAt"])
        .nullable()
        .default(null),
      sortDirection: z.enum(["asc", "desc"]).default("desc"),
      screeningFilter: z
        .enum(["all", "evaluated", "not-evaluated", "high-score", "low-score"])
        .default("all"),
      statusFilter: z
        .array(
          z.enum([
            "NEW",
            "EVALUATED",
            "DIALOG_APPROVED",
            "INTERVIEW_HH",
            "INTERVIEW_WHATSAPP",
            "COMPLETED",
            "SKIPPED",
          ]),
        )
        .optional(),
      search: z.string().optional(),
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
      statusFilter,
      search,
    } = input;
    const offset = (page - 1) * limit;

    // Получаем ID откликов с учётом фильтра по скринингу
    let filteredResponseIds: string[] | null = null;

    if (screeningFilter === "evaluated") {
      const screenedResponses = await ctx.db
        .select({ responseId: responseScreening.responseId })
        .from(responseScreening)
        .innerJoin(
          vacancyResponse,
          eq(responseScreening.responseId, vacancyResponse.id),
        )
        .where(eq(vacancyResponse.vacancyId, vacancyId));
      filteredResponseIds = screenedResponses.map((r) => r.responseId);
    } else if (screeningFilter === "not-evaluated") {
      // Оптимизация: используем LEFT JOIN вместо двух запросов
      const notEvaluated = await ctx.db
        .select({ id: vacancyResponse.id })
        .from(vacancyResponse)
        .leftJoin(
          responseScreening,
          eq(vacancyResponse.id, responseScreening.responseId),
        )
        .where(
          and(
            eq(vacancyResponse.vacancyId, vacancyId),
            sql`${responseScreening.responseId} IS NULL`,
          ),
        );
      filteredResponseIds = notEvaluated.map((r) => r.id);
    } else if (screeningFilter === "high-score") {
      const screenedResponses = await ctx.db
        .select({ responseId: responseScreening.responseId })
        .from(responseScreening)
        .innerJoin(
          vacancyResponse,
          eq(responseScreening.responseId, vacancyResponse.id),
        )
        .where(
          and(
            eq(vacancyResponse.vacancyId, vacancyId),
            gte(responseScreening.score, 4),
          ),
        );
      filteredResponseIds = screenedResponses.map((r) => r.responseId);
    } else if (screeningFilter === "low-score") {
      const screenedResponses = await ctx.db
        .select({ responseId: responseScreening.responseId })
        .from(responseScreening)
        .innerJoin(
          vacancyResponse,
          eq(responseScreening.responseId, vacancyResponse.id),
        )
        .where(
          and(
            eq(vacancyResponse.vacancyId, vacancyId),
            lt(responseScreening.score, 4),
          ),
        );
      filteredResponseIds = screenedResponses.map((r) => r.responseId);
    }

    // Базовое условие WHERE
    const whereConditions: SQL[] = [eq(vacancyResponse.vacancyId, vacancyId)];
    if (filteredResponseIds !== null) {
      if (filteredResponseIds.length === 0) {
        return {
          responses: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
      whereConditions.push(inArray(vacancyResponse.id, filteredResponseIds));
    }

    // Добавляем поиск по ФИО кандидата
    if (search?.trim()) {
      whereConditions.push(
        ilike(vacancyResponse.candidateName, `%${search.trim()}%`),
      );
    }

    // Добавляем фильтр по статусу
    if (statusFilter && statusFilter.length > 0) {
      whereConditions.push(inArray(vacancyResponse.status, statusFilter));
    }

    const whereCondition = and(...whereConditions);

    // Определяем сортировку
    let orderByClause: SQL;
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
    } else if (sortField === "respondedAt") {
      orderByClause =
        sortDirection === "asc"
          ? asc(vacancyResponse.respondedAt)
          : desc(vacancyResponse.respondedAt);
    } else {
      orderByClause = desc(vacancyResponse.createdAt);
    }

    // Получаем отфильтрованные данные с пагинацией
    // Оптимизация: загружаем только нужные поля
    const responsesRaw = await ctx.db.query.vacancyResponse.findMany({
      where: whereCondition,
      orderBy: [orderByClause],
      limit,
      offset,
      columns: {
        id: true,
        vacancyId: true,
        candidateName: true,
        status: true,
        hrSelectionStatus: true,
        contacts: true,
        resumeUrl: true,
        telegramUsername: true,
        phone: true,
        respondedAt: true,
        welcomeSentAt: true,
        createdAt: true,
      },
      with: {
        screening: {
          columns: {
            score: true,
            detailedScore: true,
            analysis: true,
          },
        },
        telegramInterviewScoring: {
          columns: {
            score: true,
            detailedScore: true,
            analysis: true,
          },
        },
        conversation: {
          columns: {
            id: true,
            chatId: true,
            candidateName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Получаем количество сообщений для каждой беседы одним запросом
    const conversationIds = responsesRaw
      .filter((r) => r.conversation)
      .map((r) => r.conversation?.id)
      .filter((id): id is string => id !== undefined);

    let messageCountsMap = new Map<string, number>();
    if (conversationIds.length > 0) {
      const messageCounts = await ctx.db
        .select({
          conversationId: telegramMessage.conversationId,
          count: sql<number>`count(*)::int`,
        })
        .from(telegramMessage)
        .where(inArray(telegramMessage.conversationId, conversationIds))
        .groupBy(telegramMessage.conversationId);

      messageCountsMap = new Map(
        messageCounts.map((mc) => [mc.conversationId, mc.count]),
      );
    }

    // Формируем ответ с количеством сообщений
    let responses = responsesRaw.map((r) => ({
      ...r,
      conversation: r.conversation
        ? {
            ...r.conversation,
            messageCount: messageCountsMap.get(r.conversation.id) || 0,
          }
        : null,
    }));

    // Сортировка по score/detailedScore в памяти (только для текущей страницы)
    if (sortField === "score" || sortField === "detailedScore") {
      responses = responses.sort((a, b) => {
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

    // Получаем общее количество для пагинации
    const totalResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(vacancyResponse)
      .where(whereCondition);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      responses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });
