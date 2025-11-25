import type { Page } from "puppeteer";
import { saveResponseToDb } from "../../services/response-service";
import type { ResponseData } from "../types";
import { HH_CONFIG } from "./config";
import { humanDelay, humanScroll, randomDelay } from "./human-behavior";
import { parseResumeExperience } from "./resume-parser";

export async function parseResponses(
  page: Page,
  url: string,
  vacancyId: string
): Promise<ResponseData[]> {
  console.log(`📄 Переход на страницу откликов: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  // Небольшая пауза после загрузки страницы
  await humanDelay(1000, 2000);

  try {
    await page.waitForSelector("[data-resume-id]", {
      timeout: HH_CONFIG.timeouts.selector,
    });
  } catch (_e) {
    console.log("⚠️ Не найдено резюме на странице (возможно, нет откликов).");
    return [];
  }

  // Скроллим страницу для подгрузки всех откликов (как человек)
  console.log("🔄 Скроллинг страницы для загрузки всех откликов...");
  let previousCount = 0;
  let currentCount = 0;
  let noChangeCount = 0;

  do {
    previousCount = currentCount;

    // Получаем текущее количество откликов
    currentCount = await page.$$eval("[data-resume-id]", (els) => els.length);

    // Скроллим вниз как человек (плавно, с паузами)
    await humanScroll(page);

    // Случайная задержка для подгрузки (имитация чтения)
    await humanDelay(1500, 3000);

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
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (response?.url) {
      try {
        console.log(
          `\n📊 Обработка кандидата ${i + 1}/${responses.length}: ${response.name}`
        );

        // Случайная задержка между просмотром резюме (имитация человека)
        if (i > 0) {
          const delay = randomDelay(3000, 8000);
          console.log(
            `⏳ Пауза ${Math.round(delay / 1000)}с перед следующим резюме...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const experienceData = await parseResumeExperience(page, response.url);

        await saveResponseToDb({
          vacancyId,
          resumeUrl: response.url,
          candidateName: response.name,
          experience: experienceData.experience,
          contacts: experienceData.contacts,
          languages: experienceData.languages,
          about: experienceData.about,
          education: experienceData.education,
          courses: experienceData.courses,
        });
      } catch (error) {
        console.error(`❌ Ошибка обработки отклика ${response.name}:`, error);
        // Пауза после ошибки
        await humanDelay(2000, 4000);
      }
    }
  }

  return responses;
}
