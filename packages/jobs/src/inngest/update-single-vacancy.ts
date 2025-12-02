import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { vacancy } from "@selectio/db/schema";
import puppeteer from "puppeteer";
import { HH_CONFIG } from "../parsers/hh/config";
import { humanBrowse, humanDelay } from "../parsers/hh/human-behavior";
import { updateVacancyDescription } from "../services/vacancy-service";
import { inngest } from "./client";

/**
 * Inngest function for updating a single vacancy
 * Fetches fresh description from HH.ru and triggers requirements generation
 */
export const updateSingleVacancyFunction = inngest.createFunction(
  {
    id: "update-single-vacancy",
    name: "Update Single Vacancy",
    retries: 2,
  },
  { event: "vacancy/update.single" },
  async ({ event, step }) => {
    const { vacancyId } = event.data;

    return await step.run("update-vacancy", async () => {
      console.log(`🚀 Обновление вакансии ${vacancyId}`);

      try {
        // Получаем вакансию из БД
        const existingVacancy = await db.query.vacancy.findFirst({
          where: eq(vacancy.id, vacancyId),
        });

        if (!existingVacancy) {
          throw new Error(`Вакансия ${vacancyId} не найдена`);
        }

        if (!existingVacancy.url) {
          throw new Error(`У вакансии ${vacancyId} нет URL`);
        }

        // Парсим описание с HH.ru
        console.log(`📥 Загрузка описания с ${existingVacancy.url}`);
        const browser = await puppeteer.launch(HH_CONFIG.puppeteer);

        try {
          const page = await browser.newPage();
          await page.setUserAgent({ userAgent: HH_CONFIG.userAgent });

          await page.goto(existingVacancy.url, { waitUntil: "networkidle2" });
          await humanDelay(1000, 2500);

          await page.waitForSelector(".vacancy-section", {
            timeout: HH_CONFIG.timeouts.selector,
          });

          await humanBrowse(page);

          const description = await page.$eval(
            ".vacancy-section",
            (el) => (el as HTMLElement).innerHTML,
          );

          if (!description?.trim()) {
            throw new Error(
              `Не удалось получить описание вакансии ${vacancyId}`,
            );
          }

          // Обновляем описание и запускаем генерацию требований
          await updateVacancyDescription(vacancyId, description.trim());

          console.log(`✅ Вакансия ${vacancyId} успешно обновлена`);
          return { success: true, vacancyId };
        } finally {
          await browser.close();
        }
      } catch (error) {
        console.error(`❌ Ошибка обновления вакансии ${vacancyId}:`, error);
        throw error;
      }
    });
  },
);
