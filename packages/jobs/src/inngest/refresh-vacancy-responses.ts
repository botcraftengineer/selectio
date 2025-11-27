import { db } from "@selectio/db/client";
import { vacancy } from "@selectio/db/schema";
import { eq } from "drizzle-orm";
import { refreshVacancyResponses } from "../parsers/hh";
import { inngest } from "./client";

/**
 * Inngest функция для обновления откликов конкретной вакансии
 * Парсит только отклики указанной вакансии через Puppeteer в headless режиме
 */
export const refreshVacancyResponsesFunction = inngest.createFunction(
  {
    id: "refresh-vacancy-responses",
    name: "Refresh Vacancy Responses",
    retries: 1,
    concurrency: 1,
  },
  { event: "vacancy/responses.refresh" },
  async ({ event, step }) => {
    const { vacancyId } = event.data;

    return await step.run("parse-vacancy-responses", async () => {
      console.log(`🚀 Запуск обновления откликов для вакансии ${vacancyId}`);

      const vacancyData = await db.query.vacancy.findFirst({
        where: eq(vacancy.id, vacancyId),
      });

      if (!vacancyData) {
        throw new Error(`Вакансия ${vacancyId} не найдена`);
      }

      try {
        await refreshVacancyResponses(vacancyId);

        console.log(`✅ Отклики для вакансии ${vacancyId} обновлены успешно`);
        return { success: true, vacancyId };
      } catch (error) {
        console.error(
          `❌ Ошибка при обновлении откликов вакансии ${vacancyId}:`,
          error
        );
        throw error;
      }
    });
  }
);
