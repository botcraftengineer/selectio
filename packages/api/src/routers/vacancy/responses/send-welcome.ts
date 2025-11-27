import { eq } from "@selectio/db";
import { telegramConversation, vacancyResponse } from "@selectio/db/schema";
import { inngest } from "@selectio/jobs/client";
import { z } from "zod/v4";
import { protectedProcedure } from "../../../trpc";

export const sendWelcome = protectedProcedure
  .input(
    z.object({
      responseId: z.string(),
      chatId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { responseId, chatId } = input;

    // Получаем данные отклика
    const response = await ctx.db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.id, responseId),
    });

    if (!response) {
      throw new Error("Отклик не найден");
    }

    // Создаем или обновляем запись в telegram_conversations
    await ctx.db
      .insert(telegramConversation)
      .values({
        chatId,
        candidateName: response.candidateName,
        status: "ACTIVE",
        metadata: JSON.stringify({
          responseId,
          vacancyId: response.vacancyId,
        }),
      })
      .onConflictDoUpdate({
        target: telegramConversation.chatId,
        set: {
          candidateName: response.candidateName,
          status: "ACTIVE",
          metadata: JSON.stringify({
            responseId,
            vacancyId: response.vacancyId,
          }),
        },
      });

    // Отправляем событие через Inngest клиент
    await inngest.send({
      name: "candidate/welcome",
      data: {
        responseId,
        chatId,
      },
    });

    return {
      success: true,
      message: "Приветственное сообщение отправлено",
    };
  });
