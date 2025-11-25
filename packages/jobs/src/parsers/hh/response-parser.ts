import type { Page } from "puppeteer";
import { saveResponseToDb } from "../../services/response-service";
import type { ResponseData } from "../types";
import { HH_CONFIG } from "./config";
import { parseResumeExperience } from "./resume-parser";

export async function parseResponses(
  page: Page,
  url: string,
  vacancyId: string
): Promise<ResponseData[]> {
  console.log(`📄 Переход на страницу откликов: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    await page.waitForSelector("[data-resume-id]", {
      timeout: HH_CONFIG.timeouts.selector,
    });
  } catch (_e) {
    console.log("⚠️ Не найдено резюме на странице (возможно, нет откликов).");
    return [];
  }

  // Скроллим страницу для подгрузки всех откликов
  console.log("🔄 Скроллинг страницы для загрузки всех откликов...");
  let previousCount = 0;
  let currentCount = 0;
  let noChangeCount = 0;

  do {
    previousCount = currentCount;

    // Получаем текущее количество откликов
    currentCount = await page.$$eval("[data-resume-id]", (els) => els.length);

    // Скроллим вниз
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    // Ждем подгрузки новых элементов
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Если количество не изменилось, увеличиваем счетчик
    if (currentCount === previousCount) {
      noChangeCount++;
    } else {
      noChangeCount = 0;
      console.log(`📊 Загружено откликов: ${currentCount}`);
    }

    // Если 3 раза подряд количество не менялось, значит все загружено
  } while (noChangeCount < 3);

  const responses = await page.$$eval(
    "[data-resume-id]",
    (elements: Array<Element>) => {
      return elements.map((el) => {
        const link = el.querySelector('a[data-qa*="serp-item__title"]');
        const url = link ? link.getAttribute("href") : "";
        const nameEl = el.querySelector(
          'span[data-qa="resume-serp__resume-fullname"]'
        );
        const name = nameEl ? nameEl.textContent?.trim() : "";

        return {
          name,
          url: url ? new URL(url, "https://hh.ru").href : "",
        };
      });
    }
  );

  console.log(`✅ Всего найдено откликов: ${responses.length}`);

  // Сохраняем все отклики
  for (const response of responses) {
    if (response?.url) {
      try {
        const experienceData = await parseResumeExperience(page, response.url);
        console.log(`\n📊 Обработка кандидата: ${response.name}`);

        await saveResponseToDb({
          vacancyId,
          resumeUrl: response.url,
          candidateName: response.name,
          experience: experienceData.experience,
          contacts: experienceData.contacts,
        });
      } catch (error) {
        console.error(`❌ Ошибка обработки отклика ${response.name}:`, error);
      }
    }
  }

  return responses;
}
