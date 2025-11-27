import { eq } from "@selectio/db";
import { vacancyResponse } from "@selectio/db/schema";
import { inngest } from "@selectio/jobs/client";
import { z } from "zod/v4";
import { protectedProcedure } from "../../../trpc";

export const sendByUsername = protectedProcedure
  .input(
    z.object({
      responseId: z.string(),
      username: z.string().min(1, "Username обязателен"),
      message: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { responseId, username, message } = input;

    // Проверяем, что отклик существует
    const response = await ctx.db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.id, responseId),
    });

    if (!response) {
      throw new Error("Отклик не найден");
    }

    // Отправляем событие в Inngest для асинхронной обработки
    await inngest.send({
      name: "telegram/send-by-username",
      data: {
        responseId,
        username,
        message,
      },
    });

    return {
      success: true,
      message: "Сообщение отправляется в фоновом режиме",
    };
  });
