import { db } from "@selectio/db";
import { screenResponse } from "../services/response-screening-service";
import { screenNewResponsesChannel } from "./channels";
import { inngest } from "./client";

/**
 * Inngest функция для оценки только новых откликов (без скрининга)
 * Обрабатывает одну вакансию за раз
 */
export const screenNewResponsesFunction = inngest.createFunction(
  {
    id: "screen-new-responses",
    name: "Screen New Responses",
  },
  { event: "response/screen.new" },
  async ({ event, step, publish }) => {
    const { vacancyId } = event.data;

    console.log(`🚀 Запуск оценки новых откликов для вакансии: ${vacancyId}`);

    // Отправляем уведомление о начале
    await publish(
      screenNewResponsesChannel(vacancyId).progress({
        vacancyId,
        status: "started",
        message: "Начинаем поиск новых откликов...",
      }),
    );

    // Получаем новые отклики (без скрининга)
    const responses = await step.run("fetch-new-responses", async () => {
      const allResponses = await db.query.vacancyResponse.findMany({
        where: (vacancyResponse, { eq }) =>
          eq(vacancyResponse.vacancyId, vacancyId),
        columns: {
          id: true,
          vacancyId: true,
        },
        with: {
          screening: true,
        },
      });

      // Фильтруем только отклики без скрининга
      const results = allResponses.filter((r) => !r.screening);

      console.log(`✅ Найдено новых откликов: ${results.length}`);
      return results;
    });

    if (responses.length === 0) {
      console.log("ℹ️ Нет новых откликов для оценки");

      await publish(
        screenNewResponsesChannel(vacancyId).result({
          vacancyId,
          success: true,
          total: 0,
          processed: 0,
          failed: 0,
        }),
      );

      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
      };
    }

    // Отправляем прогресс о найденных откликах
    await publish(
      screenNewResponsesChannel(vacancyId).progress({
        vacancyId,
        status: "processing",
        message: `Найдено ${responses.length} новых откликов. Начинаем оценку...`,
        total: responses.length,
        processed: 0,
        failed: 0,
      }),
    );

    // Обрабатываем каждый отклик
    const results = await Promise.allSettled(
      responses.map(async (response) => {
        return await step.run(`screen-response-${response.id}`, async () => {
          try {
            console.log(`🎯 Скрининг отклика: ${response.id}`);

            const result = await screenResponse(response.id);

            console.log(`✅ Скрининг завершен: ${response.id}`, {
              score: result.score,
              detailedScore: result.detailedScore,
            });

            return {
              responseId: response.id,
              vacancyId: response.vacancyId,
              success: true,
              score: result.score,
            };
          } catch (error) {
            console.error(`❌ Ошибка скрининга для ${response.id}:`, error);
            return {
              responseId: response.id,
              vacancyId: response.vacancyId,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        });
      }),
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `✅ Завершено: успешно ${successful}, ошибок ${failed} из ${responses.length}`,
    );

    // Отправляем финальный результат
    await publish(
      screenNewResponsesChannel(vacancyId).result({
        vacancyId,
        success: true,
        total: responses.length,
        processed: successful,
        failed,
      }),
    );

    return {
      success: true,
      total: responses.length,
      processed: successful,
      failed,
    };
  },
);
