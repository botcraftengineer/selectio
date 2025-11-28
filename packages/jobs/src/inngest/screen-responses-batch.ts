import { db, inArray } from "@selectio/db";
import { vacancyResponse } from "@selectio/db/schema";
import { screenResponse } from "../services/response-screening-service";
import { inngest } from "./client";

/**
 * Inngest функция для batch оценки выбранных откликов
 */
export const screenResponsesBatchFunction = inngest.createFunction(
  {
    id: "screen-responses-batch",
    name: "Screen Responses Batch",
    batchEvents: {
      maxSize: 50,
      timeout: "10s",
    },
  },
  { event: "response/screen.batch" },
  async ({ events, step }) => {
    console.log(`🚀 Запуск batch оценки для ${events.length} событий`);

    // Собираем все responseIds из всех событий
    const allResponseIds = events.flatMap((evt) => evt.data.responseIds);

    console.log(`📋 Всего откликов для оценки: ${allResponseIds.length}`);

    // Получаем отклики
    const responses = await step.run("fetch-responses", async () => {
      const results = await db.query.vacancyResponse.findMany({
        where: inArray(vacancyResponse.id, allResponseIds),
        columns: {
          id: true,
        },
      });

      console.log(`✅ Найдено откликов в БД: ${results.length}`);
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
