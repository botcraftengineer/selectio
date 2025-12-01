import { db, telegramMessage } from "@selectio/db";
import type { TRPCRouterRecord } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getMessagesRouter = {
  getByConversationId: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input }) => {
      const messages = await db.query.telegramMessage.findMany({
        where: eq(telegramMessage.conversationId, input.conversationId),
        orderBy: [telegramMessage.createdAt],
        with: {
          file: true,
        },
      });

      // Генерируем presigned URLs для файлов
      const { getDownloadUrl } = await import("@selectio/lib");

      const messagesWithUrls = await Promise.all(
        messages.map(async (msg) => {
          if (msg.file?.key) {
            const fileUrl = await getDownloadUrl(msg.file.key);
            return {
              ...msg,
              fileUrl,
              fileId: msg.fileId,
            };
          }
          return {
            ...msg,
            fileUrl: null,
            fileId: msg.fileId,
          };
        }),
      );

      return messagesWithUrls;
    }),

  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const messages = await db.query.telegramMessage.findMany({
        orderBy: [desc(telegramMessage.createdAt)],
        limit: input.limit,
        with: {
          conversation: true,
        },
      });

      return messages;
    }),
} satisfies TRPCRouterRecord;
