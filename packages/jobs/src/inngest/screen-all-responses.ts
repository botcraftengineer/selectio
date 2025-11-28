import { db, eq } from "@selectio/db";
import { vacancyResponse } from "@selectio/db/schema";
import { screenResponse } from "../services/response-screening-service";
import { inngest } from "./client";

/**
 * Inngest функция для оценки всех откликов вакансии
 */
export const screenAllResponsesFunction = inngest.createFunction(
  {
    id: "screen-all-responses",
    name: "Screen All Responses",
    batchEvents: {
      maxSize: 50,
      timeout: "10s",
    },
  },
  { event: "response/screen.all" },
  async ({ events, step }) => {
    console.log(`🚀 Запуск оценки всех откликов для ${events.length} событий`);

    // Собираем все vacancyIds из всех событий
    const vacancyIds = events.map((evt) => evt.data.vacancyId);

    console.log(`📋 Вакансии для обработки: ${vacancyIds.join(", ")}`);

    // Получаем все отклики
    const responses = await step.run("fetch-all-responses", async () => {
      const allResponses = await Promise.all(
        vacancyIds.map((vacancyId) =>
          db.query.vacancyResponse.findMany({
            where: eq(vacancyResponse.vacancyId, vacancyId),
            columns: {
              id: true,
              vacancyId: true,
            },
          }),
        ),
      );

      const results = allResponses.flat();

      console.log(`✅ Найдено откликов: ${results.length}`);
      return results;
    });

    if (responses.length === 0) {
      console.log("ℹ️ Нет откликов для оценки");
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
      };
    }

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
              success: true,
              score: result.score,
            };
          } catch (error) {
            console.error(`❌ Ошибка скрининга для ${response.id}:`, error);
            return {
              responseId: response.id,
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

    return {
      success: true,
      total: responses.length,
      processed: successful,
      failed,
    };
  },
);
