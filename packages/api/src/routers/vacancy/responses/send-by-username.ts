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
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { responseId, username } = input;

    // Проверяем, что отклик существует
    const response = await ctx.db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.id, responseId),
    });

    if (!response) {
      throw new Error("Отклик не найден");
    }

    // Отправляем событие в Inngest для асинхронной обработки
    await inngest.send({
      name: "candidate/welcome",
      data: {
        responseId,
        username,
      },
    });

    return {
      success: true,
      message: "Приветственное сообщение отправляется в фоновом режиме",
    };
  });
