import { db, inArray } from "@selectio/db";
import { vacancyResponse } from "@selectio/db/schema";
import { runEnricher } from "../parsers/hh/enricher";
import { inngest } from "./client";

/**
 * Inngest функция для парсинга резюме новых откликов (без детальной информации)
 */
export const parseNewResumesFunction = inngest.createFunction(
  {
    id: "parse-new-resumes",
    name: "Parse New Resumes",
    batchEvents: {
      maxSize: 50,
      timeout: "10s",
    },
  },
  { event: "response/resume.parse-new" },
  async ({ events, step }) => {
    console.log(`🚀 Запуск парсинга резюме для ${events.length} событий`);

    const vacancyIds = events.map((evt) => evt.data.vacancyId);
    console.log(`📋 Вакансии для обработки: ${vacancyIds.join(", ")}`);

    // Получаем отклики без детальной информации
    const responses = await step.run(
      "fetch-responses-without-details",
      async () => {
        const allResponses = await db.query.vacancyResponse.findMany({
          where: inArray(vacancyResponse.vacancyId, vacancyIds),
          columns: {
            id: true,
            vacancyId: true,
            resumeId: true,
            resumeUrl: true,
            candidateName: true,
            experience: true,
            contacts: true,
          },
        });

        // Фильтруем только отклики без детальной информации
        const results = allResponses.filter(
          (r) => !r.experience || r.experience === "",
        );

        console.log(`✅ Найдено откликов без деталей: ${results.length}`);
        return results;
      },
    );

    if (responses.length === 0) {
      console.log("ℹ️ Нет откликов для парсинга");
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
      };
    }

    // Запускаем enricher для парсинга резюме
    await step.run("enrich-resumes", async () => {
      console.log("🚀 Запуск обогащения данных резюме...");
      await runEnricher();
      console.log("✅ Обогащение завершено");
    });

    return {
      success: true,
      total: responses.length,
      processed: responses.length,
      failed: 0,
    };
  },
);
