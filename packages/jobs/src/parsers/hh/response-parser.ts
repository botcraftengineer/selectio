import type { Page } from "puppeteer";
import {
  checkResponseExists,
  saveResponseToDb,
} from "../../services/response-service";
import type { ResponseData } from "../types";
import { HH_CONFIG } from "./config";
import { humanDelay, humanScroll, randomDelay } from "./human-behavior";
import { parseResumeExperience } from "./resume-parser";

export async function parseResponses(
  page: Page,
  url: string,
  vacancyId: string
): Promise<ResponseData[]> {
  const allResponses: ResponseData[] = [];
  let currentPage = 0;
  let hasMorePages = true;

  // Извлекаем vacancyId из URL если он там есть
  const urlObj = new URL(url, HH_CONFIG.urls.baseUrl);
  const urlVacancyId = urlObj.searchParams.get("vacancyId") || vacancyId;

  while (hasMorePages) {
    // Формируем URL для текущей страницы
    const pageUrl =
      currentPage === 0
        ? `https://hh.ru/employer/vacancyresponses?vacancyId=${urlVacancyId}`
        : `https://hh.ru/employer/vacancyresponses?vacancyId=${urlVacancyId}&page=${currentPage}`;

    console.log(
      `📄 Переход на страницу откликов: ${pageUrl} (страница ${currentPage})`
    );

    try {
      await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 30000 });
    } catch (error) {
      console.error(
        `❌ Ошибка загрузки страницы откликов ${currentPage}:`,
        error
      );
      hasMorePages = false;
      break;
    }

    // Небольшая пауза после загрузки страницы
    await humanDelay(1000, 2000);

    // Проверяем наличие контейнера с откликами
    const hasResponses = await page
      .waitForSelector('div[data-qa="vacancy-real-responses"]', {
        timeout: HH_CONFIG.timeouts.selector,
      })
      .then(() => true)
      .catch(() => false);

    if (!hasResponses) {
      console.log(
        `⚠️ Контейнер с откликами не найден на странице ${currentPage}. Парсинг завершен.`
      );
      hasMorePages = false;
      break;
    }

    // Скроллим страницу для подгрузки всех откликов (как человек)
    console.log("🔄 Скроллинг страницы для загрузки откликов...");
    await humanScroll(page);
    await humanDelay(1500, 3000);

    // Парсим отклики на текущей странице
    const pageResponses = await page.$$eval(
      'div[data-qa="vacancy-real-responses"] [data-resume-id]',
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

    if (pageResponses.length === 0) {
      console.log(
        `⚠️ Не найдено откликов на странице ${currentPage}. Парсинг завершен.`
      );
      hasMorePages = false;
      break;
    }

    console.log(
      `✅ Найдено откликов на странице ${currentPage}: ${pageResponses.length}`
    );
    allResponses.push(...pageResponses);

    // Переходим к следующей странице
    currentPage++;
    await humanDelay(2000, 4000);
  }

  console.log(`✅ Всего найдено откликов: ${allResponses.length}`);

  // Сохраняем все отклики
  let processedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < allResponses.length; i++) {
    const response = allResponses[i];
    if (response?.url) {
      try {
        // Проверяем, существует ли уже отклик в базе
        const exists = await checkResponseExists(response.url);
        if (exists) {
          skippedCount++;
          console.log(
            `⏭️ Пропуск кандидата ${i + 1}/${allResponses.length}: ${
              response.name
            } (уже в базе)`
          );
          continue;
        }

        processedCount++;
        console.log(
          `\n📊 Обработка кандидата ${i + 1}/${allResponses.length}: ${
            response.name
          }`
        );

        // Случайная задержка между просмотром резюме (имитация человека)
        if (processedCount > 1) {
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `❌ Ошибка обработки отклика ${response.name}:`,
          errorMessage
        );

        // Если это ошибка detached frame, пытаемся восстановить страницу
        if (
          errorMessage.includes("detached") ||
          errorMessage.includes("disposed")
        ) {
          console.log(
            "🔄 Попытка восстановления после ошибки detached frame..."
          );
          try {
            // Возвращаемся на страницу откликов
            const recoveryUrl =
              currentPage === 0
                ? `https://hh.ru/employer/vacancyresponses?vacancyId=${urlVacancyId}`
                : `https://hh.ru/employer/vacancyresponses?vacancyId=${urlVacancyId}&page=${currentPage - 1}`;
            await page.goto(recoveryUrl, {
              waitUntil: "networkidle2",
              timeout: 30000,
            });
            await humanDelay(2000, 3000);
          } catch (recoveryError) {
            console.error(
              "❌ Не удалось восстановить страницу:",
              recoveryError
            );
          }
        }

        // Пауза после ошибки
        await humanDelay(3000, 5000);
      }
    }
  }

  console.log(
    `\n📊 Итоговая статистика: Обработано новых: ${processedCount}, Пропущено (уже в базе): ${skippedCount}, Всего: ${allResponses.length}`
  );

  return allResponses;
}
