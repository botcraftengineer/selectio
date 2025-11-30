import {
  CreateTelegramMessageSchema,
  db,
  eq,
  telegramConversation,
  telegramMessage,
} from "@selectio/db";
import { inngest } from "@selectio/jobs/client";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const sendMessageRouter = createTRPCRouter({
  send: protectedProcedure
    .input(
      CreateTelegramMessageSchema.extend({
        sender: z.literal("ADMIN"), // Только админ может отправлять через этот endpoint
      }),
    )
    .mutation(async ({ input }) => {
      const [message] = await db
        .insert(telegramMessage)
        .values({
          conversationId: input.conversationId,
          sender: input.sender,
          contentType: input.contentType,
          content: input.content,
          fileId: input.fileId,
          voiceDuration: input.voiceDuration,
          telegramMessageId: input.telegramMessageId,
        })
        .returning();

      if (!message) {
        throw new Error("Failed to create message");
      }

      // Получаем chatId из conversation
      const conversation = await db.query.telegramConversation.findFirst({
        where: eq(telegramConversation.id, input.conversationId),
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // Отправляем событие в Inngest для отправки сообщения в Telegram
      await inngest.send({
        name: "telegram/message.send",
        data: {
          messageId: message.id,
          chatId: conversation.chatId,
          content: message.content,
        },
      });

      return message;
    }),

  mutate: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        text: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const [message] = await db
        .insert(telegramMessage)
        .values({
          conversationId: input.conversationId,
          sender: "ADMIN",
          contentType: "TEXT",
          content: input.text,
        })
        .returning();

      if (!message) {
        throw new Error("Failed to create message");
      }

      const conversation = await db.query.telegramConversation.findFirst({
        where: eq(telegramConversation.id, input.conversationId),
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      await inngest.send({
        name: "telegram/message.send",
        data: {
          messageId: message.id,
          chatId: conversation.chatId,
          content: message.content,
        },
      });

      return message;
    }),
});
