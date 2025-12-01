import { db, telegramConversation, telegramMessage } from "@selectio/db";
import { uuidv7Schema } from "@selectio/validators";
import type { TRPCRouterRecord } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getConversationRouter = {
  getAll: protectedProcedure
    .input(
      z
        .object({
          vacancyId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conversations = await db.query.telegramConversation.findMany({
        orderBy: [desc(telegramConversation.updatedAt)],
        with: {
          messages: {
            orderBy: [desc(telegramMessage.createdAt)],
            limit: 1,
          },
        },
      });

      // Если указан vacancyId, фильтруем по нему
      if (input?.vacancyId) {
        return conversations.filter((conv) => {
          if (!conv.metadata) return false;
          try {
            const metadata = JSON.parse(conv.metadata);
            return metadata.vacancyId === input.vacancyId;
          } catch {
            return false;
          }
        });
      }

      return conversations;
    }),

  getById: protectedProcedure
    .input(z.object({ id: uuidv7Schema }))
    .query(async ({ input }) => {
      const conversation = await db.query.telegramConversation.findFirst({
        where: eq(telegramConversation.id, input.id),
      });

      return conversation;
    }),

  getByResponseId: protectedProcedure
    .input(z.object({ responseId: uuidv7Schema }))
    .query(async () => {
      // TODO: Связать conversation с response через metadata или отдельную таблицу
      // Пока возвращаем первую активную беседу
      const conversation = await db.query.telegramConversation.findFirst({
        where: eq(telegramConversation.status, "ACTIVE"),
      });

      return conversation;
    }),

  getByChatId: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ input }) => {
      const conversation = await db.query.telegramConversation.findFirst({
        where: eq(telegramConversation.chatId, input.chatId),
      });

      return conversation;
    }),
} satisfies TRPCRouterRecord;
